import { Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { HelmetMiddleware } from "./helmet.middleware";

/**
 * HelmetMiddleware 單元測試
 *
 * 驗證四條核心業務邏輯分支（FR-002、FR-004、FR-005、FR-009）：
 * 1. production（或 test）環境 → 完整 Helmet 標頭策略（含 HSTS）
 * 2. development 環境 → CSP 略過，其餘標頭照常
 * 3. NODE_ENV 缺失或無效 → WARN log + production 等級策略
 * 4. helmet() 初始化丟出例外 → WARN log + no-op fallback（bootstrap 不中斷）
 */
describe("HelmetMiddleware", () => {
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // 攔截 Logger 輸出，避免污染測試 console，並可斷言 log 呼叫內容
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
  });

  afterEach(() => {
    // 恢復 NODE_ENV 與 Logger mock，確保測試間隔離
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  // ─── 輔助工具 ────────────────────────────────────────────────────────────────

  /**
   * 建立最小 Express mock 物件，足以讓 helmet() middleware fn 正常執行
   * （helmet 僅需 res.setHeader / res.removeHeader 與 req 物件）
   */
  function makeMocks(): {
    req: Partial<Request>;
    res: Partial<Response> & {
      setHeader: jest.Mock;
      removeHeader: jest.Mock;
      getHeader: jest.Mock;
    };
    next: jest.Mock;
  } {
    return {
      req: { headers: {} } as Partial<Request>,
      res: {
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
        getHeader: jest.fn().mockReturnValue(undefined),
      },
      next: jest.fn(),
    };
  }

  // ─── 測試：production 策略（NODE_ENV=test，等同 production 等級）────────────

  describe("production / test 環境（完整 Helmet 預設策略）", () => {
    it("應成功初始化，且 logger.log 記錄 policy=production（FR-002）", () => {
      process.env.NODE_ENV = "production";
      // eslint-disable-next-line no-new
      new HelmetMiddleware();

      // NODE_ENV=production 是明確有效值，不應觸發 fallback WARN
      expect(warnSpy).not.toHaveBeenCalled();
      // 應記錄成功掛載訊息並標示 production 策略
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("policy=production"),
      );
    });

    it("use() 應呼叫 next() 並不拋出例外（FR-002 middleware 可正常執行）", () => {
      process.env.NODE_ENV = "production";
      const middleware = new HelmetMiddleware();
      const { req, res, next } = makeMocks();

      // 不應拋出例外；helmet middleware fn 完成後必須呼叫 next
      expect(() =>
        middleware.use(req as Request, res as unknown as Response, next),
      ).not.toThrow();
      expect(next).toHaveBeenCalled();
    });
  });

  // ─── 測試：development 策略（NODE_ENV=development）───────────────────────────

  describe("development 環境（CSP 略過策略）", () => {
    it("應成功初始化，且 logger.log 記錄 policy=development（FR-004）", () => {
      process.env.NODE_ENV = "development";
      // eslint-disable-next-line no-new
      new HelmetMiddleware();

      expect(warnSpy).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("policy=development"),
      );
    });

    it("use() 應呼叫 next() 並不拋出例外（FR-004 middleware 可正常執行）", () => {
      process.env.NODE_ENV = "development";
      const middleware = new HelmetMiddleware();
      const { req, res, next } = makeMocks();

      expect(() =>
        middleware.use(req as Request, res as unknown as Response, next),
      ).not.toThrow();
      expect(next).toHaveBeenCalled();
    });
  });

  // ─── 測試：NODE_ENV 缺失或無效 → WARN + production 等級策略（FR-005）─────────

  describe("NODE_ENV 缺失或無效（safe default fallback）", () => {
    it("NODE_ENV=undefined 時應記錄 WARN 並仍成功初始化（FR-005）", () => {
      delete process.env.NODE_ENV;
      // eslint-disable-next-line no-new
      new HelmetMiddleware();

      // MUST 記錄 WARN，提示維運人員環境配置異常
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("NODE_ENV is"),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("safe default fallback"),
      );
      // 仍應成功初始化（記錄 policy=production）
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("policy=production"),
      );
    });

    it("NODE_ENV 為未知值時應記錄 WARN 並採用 production 策略（FR-005）", () => {
      process.env.NODE_ENV = "staging";
      // eslint-disable-next-line no-new
      new HelmetMiddleware();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"staging"'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("policy=production"),
      );
    });
  });

  // ─── 測試：helmet() 初始化丟出例外 → no-op fallback，bootstrap 不中斷（FR-009）

  describe("helmet() 初始化失敗（no-op fallback）", () => {
    it("helmet 丟出例外時應記錄 WARN，use() 仍呼叫 next() 不拋出例外（FR-009）", () => {
      process.env.NODE_ENV = "production";

      // 在 HelmetMiddleware constructor 執行前，以 spy 替換 helmet default export。
      // require() 取得已快取的模組物件後 spy 其屬性，使同一模組實例的 helmet 呼叫被攔截。
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const helmetMod = require("helmet") as {
        default: typeof import("helmet").default;
      };
      const helmetSpy = jest
        .spyOn(helmetMod, "default")
        .mockImplementationOnce(() => {
          throw new Error("helmet init failed (injected fault)");
        });

      // HelmetMiddleware 使用同一模組快取，constructor 中呼叫 helmet() 將觸發 spy
      const middleware = new HelmetMiddleware();
      const { req, res, next } = makeMocks();

      // no-op fallback：MUST 仍呼叫 next()，不拋出例外（FR-009）
      expect(() =>
        middleware.use(req as Request, res as unknown as Response, next),
      ).not.toThrow();
      expect(next).toHaveBeenCalled();

      // MUST 記錄 WARN（讓 on-call 工程師識別）
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Helmet middleware initialization failed"),
      );

      helmetSpy.mockRestore();
    });
  });
});
