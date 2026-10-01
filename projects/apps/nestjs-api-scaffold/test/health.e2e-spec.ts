import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { DataSource } from "typeorm";

/** UUID v4 正規表達式 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("HealthController (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Filter / Interceptor 已由 AppModule APP_FILTER / APP_INTERCEPTOR provider 管理，
    // 無需在此手動掛載（DI container 自動注入 MetricsService、Reflector 等依賴）

    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    // T013 情境 1：DB 連線正常，回應 200 統一格式
    it("should return 200 with unified format when DB is connected", async () => {
      await request(app.getHttpServer())
        .get("/health")
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: true,
            code: 200,
            message: "OK",
            data: { status: "ok" },
            timestamp: expect.any(String),
            traceId: expect.stringMatching(UUID_V4_REGEX),
          });
        });
    });

    // T013 情境 2：DB 連線失敗，回應 503 統一格式
    it("should return 503 with unified error format when DB is disconnected", async () => {
      await dataSource.destroy();

      await request(app.getHttpServer())
        .get("/health")
        .expect(503)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            code: 503,
            message: "db unreachable",
            data: null,
            timestamp: expect.any(String),
            traceId: expect.stringMatching(UUID_V4_REGEX),
          });
        });
    });
  });

  // T013 情境 3：不存在的路由，回應 404 統一格式
  describe("GET /not-found", () => {
    it("should return 404 with unified error format for unknown routes", async () => {
      await request(app.getHttpServer())
        .get("/not-found")
        .expect(404)
        .expect((res) => {
          expect(res.body).toMatchObject({
            success: false,
            code: 404,
            data: null,
            traceId: expect.stringMatching(UUID_V4_REGEX),
          });
        });
    });
  });

  describe("Helmet security headers（HTTP 安全標頭）", () => {
    it("應包含 x-content-type-options: nosniff", async () => {
      const res = await request(app.getHttpServer()).get("/health");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });

    it("應包含 x-frame-options", async () => {
      const res = await request(app.getHttpServer()).get("/health");
      expect(res.headers["x-frame-options"]).toBeDefined();
    });

    it("應包含 x-dns-prefetch-control: off", async () => {
      const res = await request(app.getHttpServer()).get("/health");
      expect(res.headers["x-dns-prefetch-control"]).toBe("off");
    });

    it("應包含 strict-transport-security", async () => {
      const res = await request(app.getHttpServer()).get("/health");
      expect(res.headers["strict-transport-security"]).toBeDefined();
    });

    it("應包含 x-download-options", async () => {
      const res = await request(app.getHttpServer()).get("/health");
      expect(res.headers["x-download-options"]).toBeDefined();
    });

    it("應包含 x-permitted-cross-domain-policies", async () => {
      const res = await request(app.getHttpServer()).get("/health");
      expect(res.headers["x-permitted-cross-domain-policies"]).toBeDefined();
    });

    it("不應包含 x-powered-by", async () => {
      const res = await request(app.getHttpServer()).get("/health");
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });
  });
});
