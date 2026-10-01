import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Optional,
  Logger,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { Request, Response } from "express";
import { TraceContext } from "../trace/trace.context";
import { MetricsService } from "../../metrics/metrics.service";

/** Log level 對應 NestJS Logger 方法名稱。 */
type LogLevel = "info" | "warn" | "error";

/**
 * 全域 HTTP 請求日誌攔截器。
 *
 * 在每筆請求完成後（RxJS pipeline 末端）透過 NestJS `Logger` 輸出 HTTP log，
 * 輸出格式由 NestJS 原生 logger 負責排版（含 `[Nest]`、PID、timestamp、context 標籤），
 * 主訊息格式為：
 * ```
 * GET /path 200 +2ms | traceId=<uuid>
 * ```
 * NestJS logger 會自動附加 `[HTTP]` context 前綴，最終呈現：
 * ```
 * [Nest] 60808  - 03/26/2026, 12:47:22 PM     LOG [HTTP] GET /path 200 +2ms | traceId=<uuid>
 * ```
 * 錯誤 log（5xx）以 `logger.error()` 輸出，stack trace 作為第二參數傳入：
 * ```
 * [Nest] 60808  - 03/26/2026, 12:47:22 PM     ERROR [HTTP] GET /path 500 +2ms | traceId=<uuid>
 *     Error: Unexpected failure
 *         at ...
 * ```
 *
 * Log level 依 HTTP 狀態碼分級（FR-004）：
 * - 2xx/3xx → `logger.log()`（`LOG`）
 * - 4xx → `logger.warn()`（`WARN`）
 * - 5xx → `logger.error()`（`ERROR`，附加 stack）
 *
 * `traceId` 從 `TraceContext.get()` 讀取（由 `TraceMiddleware` 建立的 ALS context），
 * 確保同一筆請求的所有 log 擁有相同的 traceId（FR-003）。
 *
 * `NODE_ENV=test` 時靜默，不輸出任何 log（NFR-004）。
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  /**
   * NestJS Logger 實例，context 固定為 `"HTTP"`，
   * 輸出行中會顯示為 `[HTTP]` 標籤，對齊 NestJS 原生 logger 格式。
   */
  private readonly logger = new Logger("HTTP");

  /**
   * 建立 LoggingInterceptor。
   *
   * @param metricsService（可選）Prometheus 指標服務，注入後自動記錄
   *   `http_requests_total` 與 `http_errors_total`；
   *   未注入時指標功能靜默略過，不影響 log 輸出。
   *   測試時以 `new LoggingInterceptor(new MetricsService())` 傳入 mock。
   */
  constructor(@Optional() private readonly metricsService?: MetricsService) {}

  /**
   * 攔截 HTTP 請求，在 RxJS pipeline 完成後透過 NestJS Logger 記錄 HTTP log。
   *
   * 成功路徑（`tap`）：從 response 物件取得最終狀態碼，呼叫 `logger.log()` 或 `logger.warn()`。
   * 例外路徑（`catchError`）：從 `HttpException.getStatus()` 或預設 500 取得狀態碼，
   * 呼叫 `logger.error()`（含 stack），再 re-throw，讓 `AllExceptionsFilter` 接手。
   *
   * @param context NestJS ExecutionContext，用於取得 HTTP request/response 物件
   * @param next CallHandler，代表後續的 Interceptor 鏈與 Controller handler
   * @returns 透傳原始 Observable，不修改回傳值
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // NODE_ENV=test 時靜默：直接透傳，避免測試輸出被 request log 污染（NFR-004）
    if (process.env.NODE_ENV === "test") {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        // 成功路徑：從 response 物件取得 NestJS 設定的最終狀態碼
        const statusCode = context
          .switchToHttp()
          .getResponse<Response>().statusCode;
        const duration = Date.now() - start;
        this.writeLog(
          this.levelByStatus(statusCode),
          `${method} ${url} ${statusCode} +${duration}ms`,
        );
        const route = (req as { route?: { path?: string } }).route?.path ?? url;
        this.metricsService?.recordRequest(method, route, statusCode, duration);
      }),
      catchError((err: unknown) => {
        // 例外路徑：從 HttpException 取得狀態碼，否則預設 500
        const statusCode = err instanceof HttpException ? err.getStatus() : 500;
        const duration = Date.now() - start;
        const stack = err instanceof Error ? err.stack : undefined;
        const route = (req as { route?: { path?: string } }).route?.path ?? url;
        this.writeLog(
          this.levelByStatus(statusCode),
          `${method} ${url} ${statusCode} +${duration}ms`,
          stack,
        );
        this.metricsService?.recordRequest(method, route, statusCode, duration);
        if (statusCode >= 400) {
          this.metricsService?.recordError(method, route, statusCode);
        }
        return throwError(() => err);
      }),
    );
  }

  /**
   * 依 HTTP 狀態碼決定 log level。
   *
   * @param statusCode HTTP 狀態碼
   * @returns `"error"` | `"warn"` | `"info"`
   */
  private levelByStatus(statusCode: number): LogLevel {
    if (statusCode >= 500) return "error";
    if (statusCode >= 400) return "warn";
    return "info";
  }

  /**
   * 透過 NestJS Logger 輸出 HTTP log。
   *
   * - `info`  → `logger.log(message)`
   * - `warn`  → `logger.warn(message)`
   * - `error` → `logger.error(message, stack)`（stack 由 NestJS logger 自動排版於次行）
   *
   * `traceId` 以 `| traceId=<uuid>` 格式附加於訊息尾端，
   * 讓 log aggregator 可用 `traceId=` 關鍵字解析，無需完整 JSON 解析。
   *
   * @param level log 等級
   * @param message 主訊息（如 `GET /health 200 +2ms`）
   * @param stack （可選）Error stack trace，僅 5xx 例外路徑提供
   */
  private writeLog(level: LogLevel, message: string, stack?: string): void {
    const traceId = TraceContext.get() ?? "unknown";
    const msg = `${message} | traceId=${traceId}`;
    if (level === "error") {
      this.logger.error(msg, stack);
    } else if (level === "warn") {
      this.logger.warn(msg);
    } else {
      this.logger.log(msg);
    }
  }
}
