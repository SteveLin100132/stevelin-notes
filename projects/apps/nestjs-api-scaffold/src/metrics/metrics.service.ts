import { Injectable } from "@nestjs/common";
import { Counter, Histogram, Registry } from "prom-client";

/**
 * Prometheus 指標服務，管理獨立的 Registry 與三個 HTTP 指標（FR-013~FR-015）。
 *
 * **使用獨立 Registry**（非 prom-client 預設全域 Registry）：
 * - 避免測試間指標互相污染（每次 `new MetricsService()` 均得到乾淨的 Registry）
 * - 不呼叫 `collectDefaultMetrics()`（MVP/YAGNI，避免 Node.js 系統指標雜訊）
 *
 * **三個指標：**
 * | 指標名稱 | 型別 | 說明 |
 * |---|---|---|
 * | `http_requests_total` | Counter | 所有 HTTP 請求總數（FR-013） |
 * | `http_errors_total` | Counter | HTTP 錯誤請求總數（4xx/5xx）（FR-014） |
 * | `http_request_duration_seconds` | Histogram | HTTP 請求耗時分佈（FR-015） |
 *
 * **Labels**：`method`、`route`、`status_code`（三個指標一致）
 */
@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  private readonly requestsTotal: Counter<string>;
  private readonly errorsTotal: Counter<string>;
  private readonly durationSeconds: Histogram<string>;

  /**
   * 建立 MetricsService，初始化獨立的 prom-client Registry 與三個 HTTP 指標。
   *
   * 每個 `MetricsService` 實例擁有獨立 Registry（非全域），
   * 確保測試間不互相污染（`afterEach` 呼叫 `getRegistry().clear()` 即可重置）。
   */
  constructor() {
    this.registry = new Registry();

    this.requestsTotal = new Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry],
    });

    this.errorsTotal = new Counter({
      name: "http_errors_total",
      help: "Total number of HTTP error requests (4xx/5xx)",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry],
    });

    this.durationSeconds = new Histogram({
      name: "http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });
  }

  /**
   * 取得此 Service 使用的 prom-client Registry 實例。
   * 測試用途：呼叫 `registry.clear()` 清除指標，避免重複註冊。
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * 取得 Prometheus 文字格式的指標輸出（用於 `GET /metrics` 端點）。
   *
   * @returns Prometheus exposition format 字串（`Content-Type: text/plain; version=0.0.4`）
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * 記錄一筆 HTTP 請求至 `http_requests_total` counter。
   *
   * @param method HTTP 方法（如 `"GET"`）
   * @param route 路由路徑（如 `"/health"`）
   * @param statusCode HTTP 狀態碼（如 `200`）
   * @param durationMs 請求耗時（毫秒），供 Histogram 換算後呼叫 observeDuration()
   */
  recordRequest(
    method: string,
    route: string,
    statusCode: number,
    durationMs: number,
  ): void {
    const labels = {
      method,
      route,
      status_code: String(statusCode),
    };
    this.requestsTotal.inc(labels);
    this.durationSeconds.observe(labels, durationMs / 1000);
  }

  /**
   * 記錄一筆 HTTP 錯誤請求至 `http_errors_total` counter（4xx / 5xx）。
   *
   * @param method HTTP 方法
   * @param route 路由路徑
   * @param statusCode HTTP 狀態碼（應為 4xx 或 5xx）
   */
  recordError(method: string, route: string, statusCode: number): void {
    this.errorsTotal.inc({
      method,
      route,
      status_code: String(statusCode),
    });
  }

  /**
   * 觀測一筆請求耗時至 `http_request_duration_seconds` histogram。
   *
   * @param method HTTP 方法
   * @param route 路由路徑
   * @param statusCode HTTP 狀態碼
   * @param durationSeconds 耗時（秒）
   */
  observeDuration(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    this.durationSeconds.observe(
      { method, route, status_code: String(statusCode) },
      durationSeconds,
    );
  }
}
