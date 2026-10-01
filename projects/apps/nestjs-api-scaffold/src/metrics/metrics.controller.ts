import { Controller, Get, Header } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { MetricsService } from "./metrics.service";
import { SkipResponseWrapper } from "../common/decorators/skip-response-wrapper.decorator";

/**
 * Prometheus 指標端點 Controller。
 *
 * `GET /metrics` 直接回傳 prom-client Registry 的 Prometheus 文字格式，
 * **不經過** `ResponseInterceptor` 包裝（透過 `@SkipResponseWrapper()` 標記）。
 *
 * **Content-Type**: `text/plain; version=0.0.4; charset=utf-8`
 * （Prometheus 標準 exposition format）
 */
@ApiTags("metrics")
// Prometheus scraper 高頻拉取指標不應受 Rate Limit 影響（FR-012）
@SkipThrottle()
@Controller("metrics")
@SkipResponseWrapper()
export class MetricsController {
  /**
   * 建立 MetricsController，注入 MetricsService 取得 prom-client Registry 資料。
   *
   * @param metricsService 指標服務，提供 Prometheus 格式的 metrics 輸出；
   *   測試時以 `new MetricsService()` 直接注入（不需要 NestJS Testing Module）
   */
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * 回傳 Prometheus 文字格式的指標資料。
   *
   * @returns Prometheus exposition format 字串
   */
  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  @ApiOperation({
    summary: "取得 Prometheus 指標",
    description:
      "回傳 prom-client 指標（http_requests_total、http_errors_total、http_request_duration_seconds）",
  })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
