import { AsyncLocalStorage } from "async_hooks";

/**
 * Request-scoped Trace ID 的 AsyncLocalStorage 封裝。
 *
 * 以 **module-level singleton** 實作（非 NestJS DI），確保整個 Node.js process
 * 生命週期中共享同一個 `AsyncLocalStorage` 實例。若改用 DI 注入，每次建立新實例
 * 都會是不同的 ALS，導致 Middleware 設定的 context 無法在 Interceptor / Filter 中讀取。
 *
 * 使用方式：
 * - `TraceMiddleware` 呼叫 `TraceContext.run(traceId, () => next())` 建立 context
 * - `LoggingInterceptor`、`ResponseInterceptor`、`AllExceptionsFilter` 呼叫
 *   `TraceContext.get()` 讀取同一筆請求的 traceId
 *
 * @example
 * ```typescript
 * // 在 Middleware 中建立 context
 * TraceContext.run(traceId, () => next());
 *
 * // 在 Interceptor / Filter 中讀取
 * const traceId = TraceContext.get() ?? crypto.randomUUID();
 * ```
 */
const asyncLocalStorage = new AsyncLocalStorage<string>();

export const TraceContext = {
  /**
   * 以指定的 `traceId` 建立 AsyncLocalStorage context，並在此 context 中執行 `fn`。
   *
   * 所有在 `fn` 執行期間（包含 async 子呼叫）的 `TraceContext.get()` 均會回傳此 `traceId`。
   *
   * @param traceId 此 request 的唯一識別碼（UUID v4）
   * @param fn 需要在此 context 內執行的函式（如 NestJS middleware 的 `next`）
   */
  run(traceId: string, fn: () => void): void {
    asyncLocalStorage.run(traceId, fn);
  },

  /**
   * 讀取目前 async context 中儲存的 `traceId`。
   *
   * 若在 `run()` 的 callback 外部呼叫（例如全域 context、測試環境未設定 context），
   * 則回傳 `undefined`。呼叫方應以 `?? crypto.randomUUID()` 提供備援值。
   *
   * @returns 目前 context 的 traceId，或 `undefined`（不在任何 ALS context 內）
   */
  get(): string | undefined {
    return asyncLocalStorage.getStore();
  },
};
