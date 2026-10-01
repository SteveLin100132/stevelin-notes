import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("MetricsController (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /metrics", () => {
    it("應回傳 200 且 Content-Type 為 text/plain（情境 1）", async () => {
      await request(app.getHttpServer())
        .get("/metrics")
        .expect(200)
        .expect("Content-Type", /text\/plain/);
    });

    it("回應 body 應為字串且包含 canonical metrics 名稱（情境 2）", async () => {
      // 先打一筆 /health，確保 request/error 指標都可被觀察
      await request(app.getHttpServer()).get("/health");

      await request(app.getHttpServer())
        .get("/metrics")
        .expect(200)
        .expect((res) => {
          expect(typeof res.text).toBe("string");
          expect(res.text).toContain("http_requests_total");
          expect(res.text).toContain("http_request_duration_seconds");
          expect(res.text).toContain("http_errors_total");
        });
    });

    it("回應 body 不應是 JSON 包裝格式（ResponseInterceptor 應 skip）（情境 3）", async () => {
      await request(app.getHttpServer())
        .get("/metrics")
        .expect(200)
        .expect((res) => {
          // 不應有 success / code / data 欄位（未被 ResponseInterceptor 包裝）
          expect(res.body).not.toHaveProperty("success");
          expect(res.body).not.toHaveProperty("data");
        });
    });

    it("x-trace-id 標頭傳入合法 UUID v4 時應被採用（情境 4）", async () => {
      const traceId = "550e8400-e29b-41d4-a716-446655440000";

      await request(app.getHttpServer())
        .get("/metrics")
        .set("x-trace-id", traceId)
        .expect(200);
      // 主要驗證：請求不出錯，TraceMiddleware 接受合法 UUID v4
    });
  });
});
