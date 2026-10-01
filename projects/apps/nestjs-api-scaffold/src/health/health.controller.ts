import { Controller, Get } from "@nestjs/common";
import { ServiceUnavailableException } from "@nestjs/common";
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { HealthService } from "./health.service";
import { HealthStatusDto } from "./dto/health-status.dto";
import { ApiResponseDto } from "../common/dto/api-response.dto";

/**
 * 處理應用程式健康檢查相關的 HTTP 請求。
 *
 * 移除 `@Res()` 手動回應模式（FR-011），改用 NestJS 標準例外機制：
 * - DB 正常時直接回傳 DTO，由 `ResponseInterceptor` 自動包裝為統一格式
 * - DB 異常時拋出 `ServiceUnavailableException`，由 `AllExceptionsFilter` 統一處理 503 回應
 *
 * 這樣設計讓 `LoggingInterceptor` 可在 RxJS pipeline 末端正確取得狀態碼。
 */
@ApiTags("health")
// Kubernetes liveness/readiness probe 高頻請求不應受 Rate Limit 影響（FR-012）
@SkipThrottle()
@Controller()
export class HealthController {
  /**
   * @param healthService 健康狀態業務邏輯服務，由 NestJS DI 容器注入。
   *   測試時可替換為 mock，以驗證各種 DB 狀態下的回應行為。
   */
  constructor(private readonly healthService: HealthService) {}

  /**
   * `GET /health` — 回傳服務與資料庫的健康狀態。
   *
   * 狀態碼語意：
   * - `200 OK`：服務就緒，DB 連線正常，Load Balancer 可路由流量至此實例。
   * - `503 Service Unavailable`：DB 不可用，Load Balancer 應停止路由，
   *   監控系統應觸發告警。
   *
   * @returns DB 正常時回傳 `HealthStatusDto`，由 `ResponseInterceptor` 包裝為統一格式
   * @throws {ServiceUnavailableException} 當 DB 連線失敗或不可用時拋出，
   *   由 `AllExceptionsFilter` 捕捉並格式化為 503 統一錯誤回應
   */
  @Get("health")
  @ApiOperation({
    summary: "App 健康狀態檢查",
    description: "檢查服務與 DB 連線狀態",
  })
  @ApiResponse({
    status: 200,
    description: "服務正常",
    schema: ApiResponseDto.of(HealthStatusDto),
  })
  @ApiResponse({
    status: 503,
    description: "DB 不可用",
    schema: {
      // 503 時 data 固定為 null，不包含 HealthStatusDto 結構，
      // 使用 allOf 覆寫 data 欄位以正確描述契約（非 ApiResponseDto.of(HealthStatusDto)）
      allOf: [
        { $ref: getSchemaPath(ApiResponseDto) },
        {
          properties: {
            data: { nullable: true, type: "object", example: null },
          },
        },
      ],
    },
  })
  async getHealth(): Promise<HealthStatusDto> {
    const result = await this.healthService.checkHealth();

    // DB 異常時拋出標準例外，使用 503 而非 500：
    // 503 語意為「服務暫時不可用」，表示服務本身正常但依賴（DB）暫時故障，
    // 與 500（服務內部錯誤）有明確語意區別，Load Balancer 可據此判斷路由策略。
    if (result.status !== "ok") {
      throw new ServiceUnavailableException(result.details ?? "db unreachable");
    }

    return result;
  }
}
