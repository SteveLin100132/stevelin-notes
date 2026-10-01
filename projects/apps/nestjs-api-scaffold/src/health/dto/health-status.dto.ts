import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RegisterDto } from "../../common/decorators/register-dto.decorator";

/**
 * 健康檢查端點的標準化回應結構。
 *
 * `status` 用於機器判讀（監控系統、Load Balancer 健康探針）；
 * `details` 僅在異常時填入，提供人類可讀的診斷資訊。
 *
 * `@RegisterDto()` 會將此 class 自動加入 Swagger extraModels registry，
 * 使 `ApiResponseDto.of(HealthStatusDto)` 在 Swagger UI 中能展開 `data` 欄位的巢狀結構。
 */
@RegisterDto()
export class HealthStatusDto {
  /**
   * 服務整體健康狀態。
   * - `"ok"`：所有依賴（含 DB）正常
   * - `"error"`：至少一個依賴異常
   */
  @ApiProperty({
    enum: ["ok", "error"],
    description: "服務整體健康狀態",
    example: "ok",
  })
  status!: "ok" | "error";

  /**
   * 異常時的補充說明（選填）。
   * 正常情況下 MUST NOT 填入此欄位，以避免在健康回應中洩漏內部資訊。
   */
  @ApiPropertyOptional({
    description: "異常時的補充說明",
    example: "db unreachable",
  })
  details?: string;
}
