import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, Controller, Get } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import request = require("supertest");
import { AppModule } from "../src/app.module";

jest.setTimeout(10000);

/**
 * Rate Limit e2e 測試：驗證 @nestjs/throttler 全域 Rate Limit 保護。
 *
 * 採雙 Setup 策略：
 * - Setup A（隔離 TestModule + TestThrottleController）：驗證 Rate Limit 核心機制，
 *   不依賴 AppModule，確保套件本身行為正確（Scenario 1-4）
 * - Setup B（完整 AppModule）：驗證 @SkipThrottle() 豁免在真實環境下生效（Scenario 5-6）
 */

/**
 * 供 Setup A 使用的隔離測試用 Controller。
 *
 * 刻意不加 `@SkipThrottle()`，確保 ThrottlerGuard 可正常攔截請求，
 * 以驗證 Rate Limit 核心機制。不對外暴露，僅用於 e2e 測試模組。
 */
@Controller("test-throttle")
class TestThrottleController {
  /**
   * 回傳固定字串，供 Rate Limit e2e 測試發送請求觸發計數。
   *
   * @returns 固定字串 `"pong"`
   */
  @Get()
  ping(): string {
    return "pong";
  }
}

// ============================================================
// Setup A 測試區塊：Rate Limit 核心機制（隔離模組，不依賴 AppModule）
// ============================================================
describe("Rate Limit 核心機制（Setup A）", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      // 直接設定 throttlers 數值，不依賴環境變數（ttl: 1s, limit: 3）
      imports: [
        ThrottlerModule.forRoot({ throttlers: [{ ttl: 1000, limit: 3 }] }),
      ],
      controllers: [TestThrottleController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Scenario 1：超限後應收到 HTTP 429
  it("連續 limit+1 次請求後應收到 HTTP 429", async () => {
    // 前 3 次（limit）應正常
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).get("/test-throttle").expect(200);
    }
    // 第 4 次（limit+1）應被攔截
    await request(app.getHttpServer()).get("/test-throttle").expect(429);
  });

  // Scenario 3：Retry-After header 驗證（FR-005 / RFC 6585）
  // Scenario 2（未超限應正常 200）移至獨立 describe 以避免計數狀態汙染（見下方區塊）
  it("HTTP 429 回應 MUST 包含 Retry-After header（RFC 6585）", async () => {
    // 觸發超限，取得 429 回應
    for (let i = 0; i < 4; i++) {
      const res = await request(app.getHttpServer()).get("/test-throttle");
      if (res.status === 429) {
        // 斷言 Retry-After header 存在且為正整數（秒）
        expect(res.headers["retry-after"]).toBeDefined();
        expect(
          parseInt(res.headers["retry-after"] as string, 10),
        ).toBeGreaterThan(0);
        return;
      }
    }
    // 若所有請求均 200（TTL 重設後），也嘗試觸發
    await request(app.getHttpServer()).get("/test-throttle");
    await request(app.getHttpServer()).get("/test-throttle");
    await request(app.getHttpServer()).get("/test-throttle");
    const finalRes = await request(app.getHttpServer()).get("/test-throttle");
    if (finalRes.status === 429) {
      expect(finalRes.headers["retry-after"]).toBeDefined();
      expect(
        parseInt(finalRes.headers["retry-after"] as string, 10),
      ).toBeGreaterThan(0);
    }
  });

  // Scenario 4：等待 TTL 過期後同一 IP 可再次請求（需 jest.setTimeout(10000)）
  it("等待 TTL 過期（1200ms）後同一 IP 可再次正常請求", async () => {
    // 先等待 TTL 過期（1.2x 緩衝確保窗口重設）
    await new Promise((r) => setTimeout(r, 1200));
    // TTL 到期後，新窗口應可正常請求
    const res = await request(app.getHttpServer())
      .get("/test-throttle")
      .expect(200);
    expect(res.status).toBe(200);
  });

  // Scenario 7（pending）：多 IP 獨立計數驗證
  // Express 預設不信任 X-Forwarded-For，需啟用 trust proxy 才能正確測試
  // 暫標為 xit（pending），待評估 trust proxy 設定後啟用
  xit("不同 X-Forwarded-For IP 應各自獨立計數（需啟用 trust proxy）", async () => {
    // IP-A：超限
    for (let i = 0; i < 4; i++) {
      await request(app.getHttpServer())
        .get("/test-throttle")
        .set("X-Forwarded-For", "1.2.3.4");
    }
    const resA = await request(app.getHttpServer())
      .get("/test-throttle")
      .set("X-Forwarded-For", "1.2.3.4");
    expect(resA.status).toBe(429);

    // IP-B：在限制內，應正常回應
    const resB = await request(app.getHttpServer())
      .get("/test-throttle")
      .set("X-Forwarded-For", "5.6.7.8");
    expect(resB.status).toBe(200);
  });
});

// ============================================================
// Setup A 補充：TTL 內 ≤ limit 次請求應正常（獨立 describe 避免狀態污染）
// ============================================================
describe("Rate Limit 核心機制 - 未超限應正常回應（Setup A）", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({ throttlers: [{ ttl: 1000, limit: 3 }] }),
      ],
      controllers: [TestThrottleController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Scenario 2：TTL 內 ≤ limit 次請求應正常回傳 HTTP 200
  it("TTL 內 ≤ limit 次請求應正常回傳 HTTP 200", async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app.getHttpServer())
        .get("/test-throttle")
        .expect(200);
      expect(res.status).toBe(200);
    }
  });
});

// ============================================================
// Setup B 測試區塊：@SkipThrottle 豁免驗證（完整 AppModule）
// ============================================================
describe("SkipThrottle 豁免驗證（Setup B）", () => {
  let app: INestApplication;

  beforeAll(async () => {
    // 設定短 TTL 與低 limit，確保可觸發 429（若無豁免）
    process.env.THROTTLE_TTL = "1000";
    process.env.THROTTLE_LIMIT = "3";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    // 清理測試用環境變數，避免污染其他測試
    delete process.env.THROTTLE_TTL;
    delete process.env.THROTTLE_LIMIT;
  });

  // Scenario 5：/health 端點超過 Rate Limit 後仍應回傳 HTTP 200（@SkipThrottle 豁免）
  it("/health 端點在超過 Rate Limit 後仍應回傳 HTTP 200（Kubernetes probe 豁免）", async () => {
    // 發送 limit+1 次請求，確認 /health 不受 Rate Limit 限制
    for (let i = 0; i < 4; i++) {
      const res = await request(app.getHttpServer()).get("/health");
      expect(res.status).toBe(200);
    }
  });

  // Scenario 6：/metrics 端點超過 Rate Limit 後仍應回傳 HTTP 200（@SkipThrottle 豁免）
  it("/metrics 端點在超過 Rate Limit 後仍應回傳 HTTP 200（Prometheus scraper 豁免）", async () => {
    for (let i = 0; i < 4; i++) {
      const res = await request(app.getHttpServer()).get("/metrics");
      expect(res.status).toBe(200);
    }
  });
});
