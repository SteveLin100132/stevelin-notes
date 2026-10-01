import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from "@nestjs/swagger";
import { Type } from "@nestjs/common";

/**
 * 統一 HTTP 回應包裝結構，成功與錯誤路徑共用此 DTO。
 *
 * 由 `ResponseInterceptor`（成功路徑）與 `AllExceptionsFilter`（錯誤路徑）
 * 自動填充，Controller 層不需手動建立此物件。
 *
 * ⚠️ Swagger 泛型限制：`@nestjs/swagger` 無法在執行期自動解析泛型 `T` 的 schema。
 * 請使用 `ApiResponseDto.of(DataDto)` 工廠方法搭配 `@ApiExtraModels` 裝飾器，
 * 讓 Swagger 正確顯示 `data` 欄位的巢狀結構。
 *
 * @template T 原始回應資料的型別；錯誤路徑時固定為 `null`
 *
 * @example
 * // 在 Controller 的 class 上加：
 * \@ApiExtraModels(ApiResponseDto, HealthStatusDto)
 *
 * // 在 method 的 \@ApiResponse 上加：
 * \@ApiResponse({
 *   status: 200,
 *   schema: ApiResponseDto.of(HealthStatusDto),
 * })
 */
export class ApiResponseDto<T = unknown> {
  /**
   * 是否成功。
   * - `true`：由 `ResponseInterceptor` 設定（成功路徑）
   * - `false`：由 `AllExceptionsFilter` 設定（錯誤路徑）
   */
  @ApiProperty({
    description: "是否成功",
    example: true,
  })
  success!: boolean;

  /**
   * HTTP 狀態碼數字（如 200、201、400、404、500、503）。
   */
  @ApiProperty({
    description: "HTTP 狀態碼",
    example: 200,
  })
  code!: number;

  /**
   * 成功或錯誤訊息。
   * - 成功時固定為 `"OK"`
   * - 錯誤時為 `HttpException.message`，非 HttpException 則為 `"Internal Server Error"`
   */
  @ApiProperty({
    description: "成功或錯誤訊息",
    example: "OK",
  })
  message!: string;

  /**
   * 原始回應資料。
   * - 成功時為 Controller 回傳值（型別為 `T`）
   * - 錯誤時固定為 `null`
   *
   * Swagger 中此欄位的實際 schema 由 `ApiResponseDto.of()` 工廠方法注入。
   */
  @ApiPropertyOptional({
    description: "原始回應資料（錯誤時為 null）",
    nullable: true,
  })
  data!: T | null;

  /**
   * 回應產生時的 ISO 8601 UTC 時間字串。
   * 使用 `new Date().toISOString()` 生成。
   */
  @ApiProperty({
    description: "回應產生的 ISO 8601 UTC 時間字串",
    example: "2026-03-25T12:00:00.000Z",
  })
  timestamp!: string;

  /**
   * UUID v4 請求追蹤碼，可用於關聯同筆請求的 log 與回應。
   * 使用 `crypto.randomUUID()` 生成（Node.js v16 需 polyfill，已在 main.ts 頂部處理）。
   */
  @ApiProperty({
    description: "請求追蹤 UUID v4，可用於日誌關聯",
    example: "a3bb189e-8bf9-3888-9912-ace4e6543002",
  })
  traceId!: string;

  /**
   * 產生帶有具體 `data` schema 的 OpenAPI inline schema 物件。
   *
   * 由於 `@nestjs/swagger` 無法在編譯期解析泛型參數，
   * 必須透過此工廠方法在 Controller 的 `@ApiResponse({ schema })` 中
   * 明確指定 `data` 欄位的實際型別，Swagger UI 才能顯示巢狀欄位。
   *
   * 使用方式：
   * 1. 在 Controller class 加上 `@ApiExtraModels(ApiResponseDto, YourDataDto)`
   * 2. 在 `@ApiResponse` 中改用 `schema: ApiResponseDto.of(YourDataDto)` 取代 `type`
   *
   * @param DataClass 要填入 `data` 欄位的 DTO class（須已被 `@ApiExtraModels` 註冊）
   * @returns OpenAPI Schema Object（inline $ref 結構）
   */
  static of<D>(DataClass: Type<D>): Record<string, unknown> {
    return {
      allOf: [
        { $ref: getSchemaPath(ApiResponseDto) },
        {
          properties: {
            data: {
              nullable: true,
              allOf: [{ $ref: getSchemaPath(DataClass) }],
            },
          },
        },
      ],
    };
  }
}
