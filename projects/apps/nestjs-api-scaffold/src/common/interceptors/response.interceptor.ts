import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Response } from "express";
import { ApiResponseDto } from "../dto/api-response.dto";
import { SKIP_RESPONSE_WRAPPER } from "../decorators/skip-response-wrapper.decorator";
import { TraceContext } from "../trace/trace.context";

/**
 * 全域成功回應包裝攔截器。
 *
 * 透過 RxJS `map()` 運算子，將 Controller 的回傳值自動包裝為
 * `ApiResponseDto<T>` 統一結構（FR-007）。
 *
 * Controller 層不需手動建立此物件，只需回傳原始資料即可。
 *
 * **@SkipResponseWrapper 支援（FR-008）**：
 * 若 Controller class 或 handler method 標記了 `@SkipResponseWrapper()`，
 * 此攔截器會直接 pass-through，不包裝回應（例如 `GET /metrics` 直接回傳 Prometheus 文字格式）。
 *
 * **traceId 來源**：從 `TraceContext.get()`（AsyncLocalStorage）讀取，
 * 確保與同筆 request 的 LoggingInterceptor log 使用相同 traceId（FR-011）。
 *
 * ⚠️ 注意：此攔截器僅處理成功路徑（`success: true`）。
 * 錯誤路徑由 `AllExceptionsFilter` 負責，直接呼叫 `response.json()`，
 * 不經過此攔截器的 `map()`，因此不會有雙重包裝問題。
 *
 * @template T Controller 回傳值的型別
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponseDto<T>
> {
  /**
   * 建立 ResponseInterceptor。
   *
   * @param reflector NestJS Reflector，用於讀取 `@SkipResponseWrapper()` metadata；
   *   測試時以 `new ResponseInterceptor(new Reflector())` 傳入，
   *   並以 `jest.spyOn(reflector, 'get')` mock 回傳值。
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * 攔截成功回應並包裝為統一格式。
   * 若 handler 或 class 標記 `@SkipResponseWrapper()`，直接 pass-through。
   *
   * @param context NestJS ExecutionContext，用於取得 HTTP response 物件以讀取狀態碼
   * @param next CallHandler，代表後續的 Controller handler
   * @returns 包裝後的 `Observable<ApiResponseDto<T>>`，或 pass-through `Observable<T>`
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponseDto<T>> {
    // 優先檢查 handler method，再退回 class 層級
    const skip =
      this.reflector.get<boolean>(
        SKIP_RESPONSE_WRAPPER,
        context.getHandler(),
      ) ??
      this.reflector.get<boolean>(SKIP_RESPONSE_WRAPPER, context.getClass());

    if (skip) {
      return next.handle() as unknown as Observable<ApiResponseDto<T>>;
    }

    return next.handle().pipe(
      map((data: T) => {
        // 從 response 物件取得 NestJS 設定的狀態碼（預設 200，POST 可能為 201）
        const statusCode = context
          .switchToHttp()
          .getResponse<Response>().statusCode;

        // traceId 從 ALS 讀取，確保與同筆 request log 一致（FR-011）
        const traceId = TraceContext.get() ?? crypto.randomUUID();

        return {
          success: true,
          code: statusCode,
          message: "OK",
          data,
          timestamp: new Date().toISOString(),
          traceId,
        };
      }),
    );
  }
}
