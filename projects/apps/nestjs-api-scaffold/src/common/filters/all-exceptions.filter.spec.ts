import { AllExceptionsFilter } from "./all-exceptions.filter";
import {
  HttpException,
  HttpStatus,
  ArgumentsHost,
  ServiceUnavailableException,
  Logger,
} from "@nestjs/common";
import { TraceContext } from "../trace/trace.context";
import { MetricsService } from "../../metrics/metrics.service";

/**
 * 建立 mock ArgumentsHost，模擬 HTTP context。
 *
 * @returns mock host 與 json spy 的配對物件
 */
function createMockHost(): {
  host: ArgumentsHost;
  jsonSpy: jest.Mock;
  statusSpy: jest.Mock;
} {
  const jsonSpy = jest.fn();
  const statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status: statusSpy }),
      getRequest: () => ({
        method: "GET",
        url: "/health",
        route: { path: "/health" },
      }),
    }),
  } as unknown as ArgumentsHost;
  return { host, jsonSpy, statusSpy };
}

/** UUID v4 正規表達式 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    errorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("HttpException(503) 應回傳 { success: false, code: 503, message, data: null }（情境 1）", () => {
    const { host, statusSpy, jsonSpy } = createMockHost();
    const err = new HttpException(
      "db unreachable",
      HttpStatus.SERVICE_UNAVAILABLE,
    );

    filter.catch(err, host);

    expect(statusSpy).toHaveBeenCalledWith(503);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 503,
        message: "db unreachable",
        data: null,
        traceId: expect.stringMatching(UUID_V4_REGEX),
      }),
    );
  });

  it("HttpException(404) 應回傳 code: 404（情境 2）", () => {
    const { host, statusSpy, jsonSpy } = createMockHost();
    const err = new HttpException("Not Found", HttpStatus.NOT_FOUND);

    filter.catch(err, host);

    expect(statusSpy).toHaveBeenCalledWith(404);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 404,
        message: "Not Found",
        data: null,
      }),
    );
  });

  it("非 HttpException 應回傳 code: 500, message: 'Internal Server Error'（情境 3）", () => {
    const { host, statusSpy, jsonSpy } = createMockHost();
    const err = new Error("Something broke");

    filter.catch(err, host);

    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 500,
        message: "Internal Server Error",
        data: null,
      }),
    );
  });

  it("回應 body 不應包含 stack 欄位（情境 4）", () => {
    const { host, jsonSpy } = createMockHost();
    const err = new Error("Unexpected");

    filter.catch(err, host);

    const body = jsonSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(body).not.toHaveProperty("stack");
  });

  it("traceId 應符合 UUID v4 格式", () => {
    const { host, jsonSpy } = createMockHost();
    filter.catch(new Error("test"), host);

    const body = jsonSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(body.traceId).toMatch(UUID_V4_REGEX);
  });

  it("HttpException(503) 應輸出主行 + detail block（line2 為 ErrorName: message）", () => {
    const { host } = createMockHost();
    const err = new ServiceUnavailableException("db unreachable");

    const testTraceId = "550e8400-e29b-41d4-a716-446655440000";
    TraceContext.run(testTraceId, () => {
      filter.catch(err, host);
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const mainLine = errorSpy.mock.calls[0][0] as string;
    const detail = errorSpy.mock.calls[0][1] as string;

    expect(mainLine).toContain("GET /health 503 +0ms");
    expect(mainLine).toContain(`traceId=${testTraceId}`);

    const detailLines = detail.split("\n");
    expect(detailLines[0]).toBe("ServiceUnavailableException: db unreachable");
    expect(detail).toContain("at");
  });

  it("非 HttpException 的 detail line2 應為 Error: 原始訊息，response message 固定", () => {
    const { host, jsonSpy } = createMockHost();
    const err = new Error("Something internal broke");

    filter.catch(err, host);

    const detail = errorSpy.mock.calls[0][1] as string;
    expect(detail.split("\n")[0]).toBe("Error: Something internal broke");

    const body = jsonSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(body.message).toBe("Internal Server Error");
  });

  it("response body 的 traceId 應與 error 主行 traceId 相同", () => {
    const { host, jsonSpy } = createMockHost();
    const testTraceId = "3f6c4d2e-5a1b-4c8d-9e7f-0a1b2c3d4e5f";

    TraceContext.run(testTraceId, () => {
      filter.catch(new HttpException("oops", 500), host);
    });

    const mainLine = errorSpy.mock.calls[0][0] as string;
    const body = jsonSpy.mock.calls[0][0] as Record<string, unknown>;

    expect(mainLine).toContain(`traceId=${testTraceId}`);
    expect(body["traceId"]).toBe(testTraceId);
  });
});

describe("AllExceptionsFilter + MetricsService 整合", () => {
  it("注入 MetricsService 後，例外捕捉應呼叫 recordError()（情境 8）", () => {
    const metricsService = new MetricsService();
    const recordErrorSpy = jest.spyOn(metricsService, "recordError");
    const filter = new AllExceptionsFilter(metricsService);

    const { host } = createMockHost();
    filter.catch(new HttpException("oops", 503), host);

    expect(recordErrorSpy).toHaveBeenCalledWith("GET", "/health", 503);
    metricsService.getRegistry().clear();
  });
});
