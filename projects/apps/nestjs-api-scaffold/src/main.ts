// Node.js v16 polyfill：必須在任何使用 globalThis.crypto 的模組載入前執行。
// 使用 require() 而非 import，因為 TypeScript 靜態 import 的執行順序由編譯器決定，
// 無法保證在其他 import 之前完成；require() 則是同步且立即執行。
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { webcrypto } = require("node:crypto") as typeof import("node:crypto");
if (!globalThis.crypto) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).crypto = webcrypto;
}

import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { buildOpenApiDocument } from "./openapi/openapi-document";
import { Logger } from "@nestjs/common";
import * as http from "node:http";
import { createShutdownHandler } from "./shutdown";

const logger = new Logger("Bootstrap");

/**
 * 應用程式進入點，負責建立 NestJS 應用實例並開始監聽 HTTP 連接埠。
 *
 * 啟動流程：
 * 1. 建立 NestJS 應用實例
 * 2. AppModule 已透過 `NestModule.configure()` 以 `HelmetMiddleware`（HTTP 安全標頭）最優先載入，
 *    確保安全標頭先於所有 NestJS 自訂中介層執行（FR-003）
 * 3. AppModule 已透過 APP_FILTER / APP_INTERCEPTOR provider 掛載全域 Filter 與 Interceptor
 *    （AllExceptionsFilter、LoggingInterceptor、ResponseInterceptor）
 * 4. AppModule 已透過 NestModule.configure() 掛載 TraceMiddleware
 * 5. 設定 Swagger UI（/api-docs）
 * 6. 挂載 `/openapi.json` route（FR-001）
 * 7. 監聴 HTTP 連接埠
 * 8. 啟用 NestJS shutdown hooks，並纁定 SIGTERM / SIGINT 的 graceful shutdown handler
 *    （預設 timeout 10 秒，可透過環境變數 SHUTDOWN_TIMEOUT_MS 覆蓋）
 * 9. 在 bootstrap() 頂層註冊 uncaughtException / unhandledRejection 監聴，
 *    確保未攔截的例外以結構化 JSON log 記錄後安全退出（exit code 1）
 *
 * @returns 無回傳值（程序持續執行直到收到終止訊號）
 */
async function bootstrap() {
  process.on("uncaughtException", (error: Error) => {
    process.stdout.write(
      JSON.stringify({
        event: "uncaught_exception",
        message: error.message,
        stack: error.stack,
        exit_code: 1,
        timestamp: new Date().toISOString(),
      }) + "\n",
    );
    process.exit(1);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    process.stdout.write(
      JSON.stringify({
        event: "unhandled_rejection",
        message: error.message,
        stack: error.stack,
        exit_code: 1,
        timestamp: new Date().toISOString(),
      }) + "\n",
    );
    process.exit(1);
  });

  const app = await NestFactory.create(AppModule);

  // Swagger UI 設定（FR-001、FR-002）
  // 文件路徑：GET /api-docs（UI）、GET /api-docs-json（OpenAPI JSON）
  const document = buildOpenApiDocument(app);
  SwaggerModule.setup("api-docs", app, document);

  // 直接取得底層 Express Application 實例，掛載 /openapi.json raw JSON route。
  // 使用 HTTP adapter 直接掛載而非 @Controller，確保不建立任何新的 NestJS
  // controller 或 module（FR-005）。此 route 在 document 生成後立即掛載，
  // 無競爭狀態風險；res.json() 自動設定 Content-Type: application/json（FR-002）。
  const expressApp = app
    .getHttpAdapter()
    .getInstance() as import("express").Application;
  expressApp.get("/openapi.json", (_req, res) => {
    // 直接序列化 bootstrap 期間已生成的 document 物件，無 I/O 或業務邏輯（FR-008）
    res.json(document);
  });
  logger.log("OpenAPI JSON available at: /openapi.json");

  // 優先使用環境變數 PORT，未設定則預設 3000；
  // parseInt 確保型別正確，避免 NestJS 在 TypeScript strict 模式下報型別錯誤
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  await app.listen(port);

  app.enableShutdownHooks();
  const server = app.getHttpServer() as http.Server;
  const parsedTimeoutMs = Number.parseInt(
    process.env.SHUTDOWN_TIMEOUT_MS ?? "10000",
    10,
  );
  const shutdownTimeoutMs = Number.isNaN(parsedTimeoutMs)
    ? 10000
    : parsedTimeoutMs;
  const shutdownHandler = createShutdownHandler(app, {
    server,
    timeoutMs: shutdownTimeoutMs,
  });
  process.on("SIGTERM", () => void shutdownHandler("SIGTERM"));
  process.on("SIGINT", () => void shutdownHandler("SIGINT"));

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger UI available at: http://localhost:${port}/api-docs`);
}

bootstrap();
