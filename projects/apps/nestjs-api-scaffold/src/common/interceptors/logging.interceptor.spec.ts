import { LoggingInterceptor } from "./logging.interceptor";
import { ExecutionContext, CallHandler, Logger } from "@nestjs/common";
import { Observable, of, throwError } from "rxjs";
import { HttpException, HttpStatus } from "@nestjs/common";
import { TraceContext } from "../trace/trace.context";
import { MetricsService } from "../../metrics/metrics.service";

/**
 * 建立 mock ExecutionContext，模擬 HTTP 請求與回應物件。
 *
 * @param method HTTP 方法（如 "GET"）
 * @param url 請求路徑（如 "/health"）
 * @param statusCode 回應狀態碼（如 200）
 * @returns mock ExecutionContext
 */
function createMockContext(
  method: string,
  url: string,
  statusCode: number,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, url, route: { path: url } }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

/**
 * 建立 mock CallHandler，回傳指定的 Observable。
 *
 * @param value$ 要由 handle() 發射的 Observable
 * @returns mock CallHandler
 */
function createMockHandler(value$: Observable<unknown>): CallHandler {
  return { handle: () => value$ } as unknown as CallHandler;
}

describe("LoggingInterceptor", () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    // spy NestJS Logger 方法，避免實際輸出污染測試
    logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  describe("NODE_ENV=test 靜默模式", () => {
    it("不應呼叫 Logger，直接透傳資料（情境 5）", (done) => {
      process.env.NODE_ENV = "test";
      const ctx = createMockContext("GET", "/health", 200);
      const handler = createMockHandler(of({ status: "ok" }));

      interceptor.intercept(ctx, handler).subscribe({
        next: (value: unknown) => {
          expect(value).toEqual({ status: "ok" });
          expect(logSpy).not.toHaveBeenCalled();
          expect(warnSpy).not.toHaveBeenCalled();
          expect(errorSpy).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe("非 test 環境", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("2xx 請求 → logger.log() 被呼叫，訊息以 NestJS 風格呈現（情境 1）", (done) => {
      const ctx = createMockContext("GET", "/health", 200);
      const handler = createMockHandler(of({ status: "ok" }));

      interceptor.intercept(ctx, handler).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });

    it("log 訊息包含 method/path/status/duration 與 traceId=<uuid>（情境 2）", (done) => {
      const testTraceId = "550e8400-e29b-41d4-a716-446655440000";
      const ctx = createMockContext("GET", "/health", 200);
      const handler = createMockHandler(of({ status: "ok" }));

      TraceContext.run(testTraceId, () => {
        interceptor.intercept(ctx, handler).subscribe({
          next: () => {
            const msg = logSpy.mock.calls[0][0] as string;
            expect(msg).toContain("GET");
            expect(msg).toContain("/health");
            expect(msg).toContain("200");
            expect(msg).toMatch(/\+\d+ms/);
            expect(msg).toContain(`traceId=${testTraceId}`);
            done();
          },
        });
      });
    });

    it("4xx 例外路徑 → logger.warn() 被呼叫（情境 3）", (done) => {
      const err = new HttpException("Not Found", HttpStatus.NOT_FOUND);
      const ctx = createMockContext("GET", "/not-found", 404);
      const handler = createMockHandler(throwError(() => err));

      interceptor.intercept(ctx, handler).subscribe({
        error: (e: unknown) => {
          expect(e).toBe(err);
          expect(warnSpy).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });

    it("5xx 例外路徑 → logger.error() 被呼叫，含 stack，re-throw 原始例外（情境 4）", (done) => {
      const err = new Error("Unexpected failure");
      const ctx = createMockContext("GET", "/health", 500);
      const handler = createMockHandler(throwError(() => err));

      interceptor.intercept(ctx, handler).subscribe({
        error: (e: unknown) => {
          expect(e).toBe(err);
          expect(errorSpy).toHaveBeenCalledTimes(1);
          // 第二引數應為 stack trace 字串
          const stack = errorSpy.mock.calls[0][1] as string;
          expect(typeof stack).toBe("string");
          expect(stack).toContain("Error: Unexpected failure");
          done();
        },
      });
    });
  });

  describe("MetricsService 整合", () => {
    it("注入 MetricsService 後，成功請求應呼叫 recordRequest()（情境 6）", (done) => {
      const metricsService = new MetricsService();
      const recordSpy = jest.spyOn(metricsService, "recordRequest");
      interceptor = new LoggingInterceptor(metricsService);

      const ctx = createMockContext("GET", "/health", 200);
      const handler = createMockHandler(of({ status: "ok" }));

      interceptor.intercept(ctx, handler).subscribe({
        next: () => {
          expect(recordSpy).toHaveBeenCalledTimes(1);
          expect(recordSpy).toHaveBeenCalledWith(
            "GET",
            "/health",
            200,
            expect.any(Number),
          );
          metricsService.getRegistry().clear();
          done();
        },
      });
    });

    it("注入 MetricsService 後，4xx 請求應同時呼叫 recordRequest() 與 recordError()（情境 7）", (done) => {
      const metricsService = new MetricsService();
      const recordRequestSpy = jest.spyOn(metricsService, "recordRequest");
      const recordErrorSpy = jest.spyOn(metricsService, "recordError");
      interceptor = new LoggingInterceptor(metricsService);

      const err = new HttpException("Not Found", HttpStatus.NOT_FOUND);
      const ctx = createMockContext("GET", "/not-found", 404);
      const handler = createMockHandler(throwError(() => err));

      interceptor.intercept(ctx, handler).subscribe({
        error: () => {
          expect(recordRequestSpy).toHaveBeenCalledWith(
            "GET",
            "/not-found",
            404,
            expect.any(Number),
          );
          expect(recordErrorSpy).toHaveBeenCalledWith("GET", "/not-found", 404);
          metricsService.getRegistry().clear();
          done();
        },
      });
    });
  });
});
