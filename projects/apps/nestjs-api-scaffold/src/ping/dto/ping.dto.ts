import { ApiProperty } from "@nestjs/swagger";
import { RegisterDto } from "../../common/decorators/register-dto.decorator";

/**
 * `GET /ping` 的回應資料（`ApiResponseDto.data`）。
 *
 * `@RegisterDto()` 讓 `ApiResponseDto.of(PingDto)` 能在 OpenAPI 中展開，
 * 前端 codegen 才拿得到具體型別。
 */
@RegisterDto()
export class PingDto {
  /** 固定為 `true`，代表服務可連線 */
  @ApiProperty({ description: "固定為 true", example: true })
  pong!: boolean;
}
