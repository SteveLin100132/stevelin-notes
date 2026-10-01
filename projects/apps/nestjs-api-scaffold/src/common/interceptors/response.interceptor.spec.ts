import { ResponseInterceptor } from "./response.interceptor";
import { ExecutionContext, CallHandler } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { of } from "rxjs";
import { ApiResponseDto } from "../dto/api-response.dto";
import { TraceContext } from "../trace/trace.context";
import { SKIP_RESPONSE_WRAPPER } from "../decorators/skip-response-wrapper.decorator";

/**
 * 建立 mock ExecutionContext，固定回傳 statusCode。
 *
 * @param statusCode HTTP 回應狀態碼
 * @returns mock ExecutionContext
 */
function createMockContext(statusCode: number): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

/**
 * 建立 mock CallHandler，回傳指定資料。
 *
 * @param data controller 回傳的原始資料
 * @returns mock CallHandler
 */
function createMockHandler(data: unknown): CallHandler {
  return { handle: () => of(data) } as unknown as CallHandler;
}

/** UUID v4 正規表達式 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** ISO 8601 UTC 正規表達式 */
const ISO8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("ResponseInterceptor", () => {
  let interceptor: ResponseInterceptor<unknown>;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new ResponseInterceptor(reflector);
  });

  it("應將 controller 回傳值包裝為 ApiResponseDto（情境 1）", (done) => {
    jest.spyOn(reflector, "get").mockReturnValue(undefined);
    const ctx = createMockContext(200);
    const handler = createMockHandler({ status: "ok" });

    interceptor.intercept(ctx, handler).subscribe({
      next: (result: ApiResponseDto<unknown>) => {
        expect(result).toMatchObject({
          success: true,
          code: 200,
          message: "OK",
          data: { status: "ok" },
          timestamp: expect.any(String),
          traceId: expect.any(String),
        });
        done();
      },
    });
  });

  it("timestamp 應符合 ISO 8601 UTC 格式（情境 2）", (done) => {
    jest.spyOn(reflector, "get").mockReturnValue(undefined);
    const ctx = createMockContext(200);
    const handler = createMockHandler({ status: "ok" });

    interceptor.intercept(ctx, handler).subscribe({
      next: (result: ApiResponseDto<unknown>) => {
        expect(result.timestamp).toMatch(ISO8601_REGEX);
        done();
      },
    });
  });

  it("traceId 應符合 UUID v4 格式（情境 3）", (done) => {
    jest.spyOn(reflector, "get").mockReturnValue(undefined);
    const ctx = createMockContext(200);
    const handler = createMockHandler({ status: "ok" });

    interceptor.intercept(ctx, handler).subscribe({
      next: (result: ApiResponseDto<unknown>) => {
        expect(result.traceId).toMatch(UUID_V4_REGEX);
        done();
      },
    });
  });

  it("201 回應的 code 應為 201", (done) => {
    jest.spyOn(reflector, "get").mockReturnValue(undefined);
    const ctx = createMockContext(201);
    const handler = createMockHandler({ id: 1 });

    interceptor.intercept(ctx, handler).subscribe({
      next: (result: ApiResponseDto<unknown>) => {
        expect(result.code).toBe(201);
        expect(result.success).toBe(true);
        done();
      },
    });
  });

  it(`Reflector 回傳 true（${SKIP_RESPONSE_WRAPPER}）→ pass-through，data 未被包裝（情境 1 補充）`, (done) => {
    jest.spyOn(reflector, "get").mockReturnValue(true);
    const ctx = createMockContext(200);
    const rawData = { prometheus: "metrics" };
    const handler = createMockHandler(rawData);

    interceptor.intercept(ctx, handler).subscribe({
      next: (result: unknown) => {
        // pass-through 時 data 不應有 ApiResponseDto 的 success 欄位
        expect(result).toEqual(rawData);
        expect((result as Record<string, unknown>).success).toBeUndefined();
        done();
      },
    });
  });

  it("Reflector 回傳 undefined（未標記）→ traceId 等於 TraceContext.get()（情境 2 補充）", (done) => {
    jest.spyOn(reflector, "get").mockReturnValue(undefined);
    const testTraceId = "550e8400-e29b-41d4-a716-446655440000";
    const ctx = createMockContext(200);
    const handler = createMockHandler({ ok: true });

    TraceContext.run(testTraceId, () => {
      interceptor.intercept(ctx, handler).subscribe({
        next: (result: ApiResponseDto<unknown>) => {
          expect(result.traceId).toBe(testTraceId);
          done();
        },
      });
    });
  });
});
