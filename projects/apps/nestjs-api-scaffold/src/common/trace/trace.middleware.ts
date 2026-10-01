import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { TraceContext } from "./trace.context";

/**
 * UUID v4 格式驗證正規表達式。
 *
 * 格式：`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
 * 其中 `y` 為 `[89ab]`（RFC 4122 variant）。
 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Request-scoped Trace ID Middleware。
 *
 * 在 NestJS request pipeline **最外層**（Middleware 層）建立 `AsyncLocalStorage` context，
 * 確保後續所有 Guard / Interceptor / Filter 均在同一 context 內執行，
 * 可透過 `TraceContext.get()` 讀取相同的 `traceId`。
 *
 * **為何在 Middleware 層而非 Interceptor 層建立 context？**
 * - Middleware 執行順序早於所有 Interceptor 與 Filter
 * - `AllExceptionsFilter` 在 Interceptor 之外執行，若 context 在 Interceptor 建立，
 *   Filter 將無法讀取同一個 `traceId`，導致 error log 與 request log 的 traceId 不同
 *
 * **traceId 解析策略（FR-002、NFR-006）**：
 * 1. 讀取 `X-Trace-Id` request header
 * 2. 驗證是否符合 UUID v4 格式（`/^[0-9a-f]{8}-...-4...-[89ab]...-...$/i`）
 * 3. 符合 → 使用 header 值（允許分散式系統的 trace propagation）
 * 4. 不符合或無 header → 呼叫 `crypto.randomUUID()` 生成新 traceId
 */
@Injectable()
export class TraceMiddleware implements NestMiddleware {
  /**
   * 從 request header 解析或生成 traceId，建立 AsyncLocalStorage context，
   * 然後在 context 內呼叫 `next()` 讓後續 pipeline 繼續執行。
   *
   * @param req Express Request 物件
   * @param _res Express Response 物件（本 middleware 不修改 response）
   * @param next Express NextFunction，呼叫後將控制權傳遞給下一個 middleware
   */
  use(req: Request, _res: Response, next: NextFunction): void {
    const headerValue = req.headers["x-trace-id"];
    const rawId = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    // 驗證 header 值是否為合法 UUID v4；不合法或無 header 則自動生成
    const traceId =
      rawId && UUID_V4_REGEX.test(rawId) ? rawId : crypto.randomUUID();

    // 以此 traceId 建立 ALS context，並在 context 內執行 next()
    // 後續所有 Guard / Interceptor / Filter 均在此 context 內，
    // 可透過 TraceContext.get() 取得相同的 traceId
    TraceContext.run(traceId, () => next());
  }
}
