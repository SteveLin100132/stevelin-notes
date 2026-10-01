import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "../src/app.module";
import { buildOpenApiDocument } from "../src/openapi/openapi-document";

describe("OpenAPI JSON endpoint (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Swagger 設定需在 app.init() 前完成（鏡像 main.ts bootstrap() 邏輯）
    // 原因：NestJS Test.createTestingModule 不執行 main.ts bootstrap()，
    // 因此必須在測試環境中手動重現 Swagger document 建立與 Express route 掛載流程，
    // 以確保測試環境與正式環境行為一致（environment parity）。
    const document = buildOpenApiDocument(app);
    SwaggerModule.setup("api-docs", app, document);

    // 掛載 /openapi.json Express route（鏡像 main.ts bootstrap() 邏輯）
    // 使用 HTTP adapter 直接掛載，不建立新的 NestJS controller 或 module（FR-005）
    const expressApp = app
      .getHttpAdapter()
      .getInstance() as import("express").Application;
    expressApp.get("/openapi.json", (_req, res) => {
      res.json(document);
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /openapi.json", () => {
    it("應回傳 HTTP 200（FR-001）", async () => {
      await request(app.getHttpServer()).get("/openapi.json").expect(200);
    });

    it("Content-Type 應包含 application/json（FR-002）", async () => {
      const res = await request(app.getHttpServer()).get("/openapi.json");
      expect(res.headers["content-type"]).toMatch(/application\/json/);
    });

    it("response body 應為合法 JSON（FR-003）", async () => {
      const res = await request(app.getHttpServer()).get("/openapi.json");
      expect(() => JSON.stringify(res.body)).not.toThrow();
      expect(typeof res.body).toBe("object");
    });

    it("response body 應包含 openapi 頂層欄位（FR-003）", async () => {
      const res = await request(app.getHttpServer()).get("/openapi.json");
      expect(res.body).toHaveProperty("openapi");
    });

    it("response body 應包含 info 頂層欄位（FR-003）", async () => {
      const res = await request(app.getHttpServer()).get("/openapi.json");
      expect(res.body).toHaveProperty("info");
    });

    it("response body 應包含 paths 頂層欄位（FR-003）", async () => {
      const res = await request(app.getHttpServer()).get("/openapi.json");
      expect(res.body).toHaveProperty("paths");
    });
  });
});
