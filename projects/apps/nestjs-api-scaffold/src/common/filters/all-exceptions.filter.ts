import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Optional,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { TraceContext } from "../trace/trace.context";
import { MetricsService } from "../../metrics/metrics.service";

/**
 * 全域例外過濾器，捕捉所有未處理例外並統一格式化回應（FR-009、FR-010）。
 *
 * 處理策略：
 * - `HttpException`（含 NestJS 內建的 `NotFoundException`、`ServiceUnavailableException` 等）：
 *   保留原始 HTTP 狀態碼與 exception.message（FR-010）
 * - 非 `HttpException`（未預期例外、原始 Error 等）：
 *   統一回傳 500，response body message 固定為 `"Internal Server Error"`，
 *   MUST NOT 暴露原始錯誤訊息或 stack trace 至 response（FR-010）
 *
 * **Error Logging（FR-005、FR-012）**：
 * 每次捕捉例外時，輸出與 `LoggingInterceptor` 一致的 HTTP 主行，
 * 並遵守 detail block 契約：
 * - line 2: `ErrorName: message`
 * - line 3+: full stack trace
 * 禁止 silent failure（catch without log）。
 *
 * **traceId 來源**：從 `AsyncLocalStorage`（TraceContext.get()）讀取，
 * 確保 error log 的 traceId 與同筆 request log 的 traceId 完全相同（FR-011）。
 *
 * 此 filter 直接呼叫 `response.json()`，**繞過** `ResponseInterceptor`，
 * 因此不會有雙重包裝問題（Exception Filter 在 Interceptor 外層執行）。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("HTTP");

  /**
   * 建立 AllExceptionsFilter。
   *
   * @param metricsService（可選）Prometheus 指標服務，注入後自動呼叫 `recordError()`
   *   記錄 `http_errors_total`；未注入時指標功能靜默略過。
   *   測試時以 `new AllExceptionsFilter(new MetricsService())` 傳入 mock。
   */
  constructor(@Optional() private readonly metricsService?: MetricsService) {}

  /**
   * 捕捉例外，輸出收斂後的 error log（主行 + detail block），並回傳統一格式的 JSON 錯誤回應。
   *
   * @param exception 捕捉到的例外（可能是 `HttpException` 或任意 Error）
   * @param host NestJS ArgumentsHost，用於取得 HTTP request/response 物件
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // HttpException：保留原始狀態碼與訊息，讓呼叫方了解業務錯誤原因
    // 非 HttpException：統一 500，不暴露內部錯誤細節，防止資訊洩漏
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // log 中記錄原始訊息；response body 對非 HttpException 固定為 'Internal Server Error'
    const logMessage =
      exception instanceof Error ? exception.message : String(exception);
    const responseMessage =
      exception instanceof HttpException
        ? exception.message
        : "Internal Server Error";

    // traceId 從 ALS 讀取，確保與同筆 request log 一致（FR-011）
    const traceId = TraceContext.get() ?? crypto.randomUUID();
    const stack = exception instanceof Error ? exception.stack : undefined;
    const route =
      (request as { route?: { path?: string } }).route?.path ?? request.url;
    const method = request.method;
    const path = request.url;
    let errorName = "Error";
    if (exception instanceof Error) {
      errorName = exception.name;
    } else if (exception instanceof HttpException) {
      errorName = exception.constructor.name;
    }

    const mainLine = `${method} ${path} ${status} +0ms | traceId=${traceId}`;
    const line2 = `${errorName}: ${logMessage}`;
    let detailBlock = line2;
    if (stack) {
      detailBlock = stack.startsWith(line2) ? stack : `${line2}\n${stack}`;
    }

    this.logger.error(mainLine, detailBlock);

    // 錯誤指標（FR-014）：所有例外（4xx / 5xx）均計入 http_errors_total
    this.metricsService?.recordError(
      method ?? "unknown",
      route ?? "unknown",
      status,
    );

    response.status(status).json({
      success: false,
      code: status,
      message: responseMessage,
      data: null,
      timestamp: new Date().toISOString(),
      traceId,
    });
  }
}
