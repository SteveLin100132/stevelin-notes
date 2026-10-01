import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import helmet from "helmet";

/** express-compatible middleware 型別 */
type ExpressMiddlewareFn = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

/**
 * HTTP 安全標頭中介層（Helmet）。
 *
 * 封裝 helmet() 初始化邏輯，使測試與生產環境均可透過 AppModule.configure() 自動載入，
 * 無需在 bootstrap() 或測試 beforeEach 手動呼叫 app.use()（FR-003）。
 *
 * 環境策略（FR-004 / FR-005）：
 * - `development`：停用 CSP（contentSecurityPolicy: false），避免阻擋 Swagger UI 等開發工具
 * - `production` 及其他（含 `test`）：使用完整 Helmet 預設值（含 HSTS）
 *
 * 若 NODE_ENV 缺失或非明確的 production/development，以 WARN 記錄後採用最嚴格預設策略（FR-005）。
 * 若 helmet() 初始化丟出例外，以 WARN 記錄後改用 no-op 中介層，確保 bootstrap 不中斷（FR-009）。
 */
@Injectable()
export class HelmetMiddleware implements NestMiddleware {
  private readonly middleware: ExpressMiddlewareFn;

  /**
   * 在 NestJS DI 建構階段初始化 helmet middleware fn。
   * 將邏輯集中於此處而非 `use()` 方法，確保策略判斷、WARN log 與 no-op fallback
   * 僅在廣用自動載入時執行一次，而非每個請求都重複評估（效能 + 確定性）。
   */
  constructor() {
    // 使用 [Bootstrap] context 以利 on-call 工程師區分啟動期與請求期日誌（FR-005/FR-009）
    const logger = new Logger("Bootstrap");

    // 直接讀取 process.env.NODE_ENV，不依賴 ConfigModule 或任何 NestJS 模組，
    // 確保在模組初始化期間即可正確判斷環境（FR-003）。
    const nodeEnv = process.env.NODE_ENV;
    const isDevelopment = nodeEnv === "development";

    // 當 NODE_ENV 缺失或為非預期值，記錄 WARN 並採用生產等級策略（FR-005）。
    if (!nodeEnv || (nodeEnv !== "production" && nodeEnv !== "development")) {
      logger.warn(
        `NODE_ENV is "${
          nodeEnv ?? "undefined"
        }" — applying production-equivalent Helmet security policy (safe default fallback)`,
      );
    }

    try {
      // development：停用 CSP；production/其他：完整預設值（FR-002/FR-004）。
      const helmetOptions = isDevelopment
        ? { contentSecurityPolicy: false }
        : {};
      this.middleware = helmet(helmetOptions) as ExpressMiddlewareFn;
      logger.log(
        `Helmet security headers applied [policy=${
          isDevelopment ? "development" : "production"
        }]`,
      );
    } catch (err) {
      // 初始化失敗不中斷 bootstrap，改用 no-op 中介層（FR-009）。
      logger.warn(
        `Helmet middleware initialization failed — security headers NOT applied: ${
          (err as Error).message
        }`,
      );
      this.middleware = (_req: Request, _res: Response, next: NextFunction) =>
        next();
    }
  }

  /**
   * 將已在 constructor 初始化的 helmet middleware fn 代理至 Express request 處理堆疊。
   * 所有環境策略判斷均在建構階段完成，此方法僅負責轉發呼叫。
   *
   * @param req - Express Request 物件
   * @param res - Express Response 物件（helmet 會對其設定安全標頭）
   * @param next - Express NextFunction，會在 helmet middleware 完成後被呼叫
   */
  use(req: Request, res: Response, next: NextFunction): void {
    this.middleware(req, res, next);
  }
}
