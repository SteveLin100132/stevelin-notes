import { Module } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import { MetricsController } from "./metrics.controller";

/**
 * Prometheus 指標模組，提供 `MetricsService`（供 LoggingInterceptor、AllExceptionsFilter 注入）
 * 與 `MetricsController`（`GET /metrics` 端點）。
 *
 * **exports `MetricsService`**：允許 `AppModule` 中以 APP_INTERCEPTOR / APP_FILTER
 * 提供的 LoggingInterceptor、AllExceptionsFilter 透過 NestJS DI 注入 MetricsService。
 */
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
