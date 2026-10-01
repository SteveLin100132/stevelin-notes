import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiResponseDto } from "../common/dto/api-response.dto";
import { PingDto } from "./dto/ping.dto";

/**
 * 連通性測試端點。
 *
 * 與 `HealthController` 不同，此 Controller **不加** `@SkipThrottle()`，
 * 會經過全域 `ThrottlerGuard`，用於手動驗證 Rate Limit 行為
 * （觀察 `X-RateLimit-*` 標頭與超限後的 429 + `Retry-After`）。
 */
@ApiTags("ping")
@Controller()
export class PingController {
  /**
   * `GET /ping` — 回傳固定的 `{ pong: true }`，由 `ResponseInterceptor` 包裝為統一格式。
   *
   * @returns 固定物件 `{ pong: true }`
   */
  @Get("ping")
  @ApiOperation({
    summary: "連通性測試",
    description: "受全域 Rate Limit 限制，可用於驗證 THROTTLE_TTL / THROTTLE_LIMIT 設定",
  })
  @ApiResponse({
    status: 200,
    description: "服務可連線",
    schema: ApiResponseDto.of(PingDto),
  })
  @ApiResponse({ status: 429, description: "超過 Rate Limit" })
  getPing(): PingDto {
    return { pong: true };
  }
}
