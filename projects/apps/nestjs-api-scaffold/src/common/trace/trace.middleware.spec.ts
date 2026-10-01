import { TraceMiddleware } from "./trace.middleware";
import { TraceContext } from "./trace.context";
import { Request, Response } from "express";

/** UUID v4 正規表達式 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 建立 mock Request 物件。
 *
 * @param xTraceId 可選的 X-Trace-Id header 值
 * @returns mock Express Request
 */
function createMockRequest(xTraceId?: string): Request {
  return {
    headers: xTraceId ? { "x-trace-id": xTraceId } : {},
  } as unknown as Request;
}

describe("TraceMiddleware", () => {
  let middleware: TraceMiddleware;
  const mockResponse = {} as Response;

  beforeEach(() => {
    middleware = new TraceMiddleware();
  });

  it("有效的 X-Trace-Id header → TraceContext.get() 回傳 header 值（情境 1）", (done) => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const req = createMockRequest(validUuid);

    const next = () => {
      expect(TraceContext.get()).toBe(validUuid);
      done();
    };

    middleware.use(req, mockResponse, next);
  });

  it("無效格式的 X-Trace-Id → 生成新 UUID，不使用 header 值（情境 2）", (done) => {
    const invalidId = "not-a-valid-uuid";
    const req = createMockRequest(invalidId);

    const next = () => {
      const traceId = TraceContext.get();
      expect(traceId).toMatch(UUID_V4_REGEX);
      expect(traceId).not.toBe(invalidId);
      done();
    };

    middleware.use(req, mockResponse, next);
  });

  it("無 X-Trace-Id header → 生成合法 UUID v4（情境 3）", (done) => {
    const req = createMockRequest();

    const next = () => {
      expect(TraceContext.get()).toMatch(UUID_V4_REGEX);
      done();
    };

    middleware.use(req, mockResponse, next);
  });

  it("next() 在 ALS context 內被呼叫（情境 4）", (done) => {
    const req = createMockRequest("3f6c4d2e-5a1b-4c8d-9e7f-0a1b2c3d4e5f");

    const next = () => {
      // next() 被呼叫時應已在 ALS context 內，get() 不回傳 undefined
      expect(TraceContext.get()).toBeDefined();
      done();
    };

    middleware.use(req, mockResponse, next);
  });
});
