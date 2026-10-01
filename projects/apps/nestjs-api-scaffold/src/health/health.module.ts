import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

/**
 * 健康檢查模組。
 *
 * 引入 `TerminusModule` 以保留未來擴充至標準 Terminus 健康指標（記憶體、磁碟等）的能力，
 * 但 MVP 階段僅使用自定義的 `HealthService` 進行 DB deep check。
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
