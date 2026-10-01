import { SetMetadata } from "@nestjs/common";

/**
 * Reflector metadata key，供 `ResponseInterceptor` 在 `intercept()` 開頭偵測
 * 目標 Controller class 或 handler method 是否已標記為跳過 response 包裝。
 */
export const SKIP_RESPONSE_WRAPPER = "skip_response_wrapper";

/**
 * 標記 Controller class 或 handler method 跳過 `ResponseInterceptor` 的包裝。
 *
 * 當 `ResponseInterceptor` 偵測到此 metadata 時，會直接 pass-through（`return next.handle()`），
 * 不將 response data 包裝為 `ApiResponseDto`。
 *
 * **主要使用場景**：
 * - `MetricsController`（`GET /metrics`）：Prometheus exposition 格式不使用 JSON wrapper
 * - 未來任何需要回傳 raw response 的端點
 *
 * @example
 * ```typescript
 * // 整個 Controller 跳過包裝
 * @Controller()
 * @SkipResponseWrapper()
 * export class MetricsController { ... }
 *
 * // 單一 handler 跳過包裝
 * @Get('raw')
 * @SkipResponseWrapper()
 * getRaw() { ... }
 * ```
 */
export function SkipResponseWrapper(): ClassDecorator & MethodDecorator {
  return SetMetadata(SKIP_RESPONSE_WRAPPER, true);
}
