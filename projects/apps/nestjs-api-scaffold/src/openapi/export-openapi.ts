import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { buildOpenApiDocument } from "./openapi-document";

/**
 * 把 OpenAPI spec 輸出成靜態檔 `openapi.json`（app 根目錄），作為前端 codegen 的輸入。
 *
 * 不啟動 HTTP server：只建立 Nest 應用實例取得 document 後即關閉。
 * DB 改用記憶體，避免輸出 spec 時建立或改動 `data/*.sqlite`。
 *
 * 用法：`npm run openapi:export`；可傳入輸出路徑覆寫預設位置。
 */
async function exportOpenApi(): Promise<void> {
  process.env.DATABASE_PATH = ":memory:";

  const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] });
  const document = buildOpenApiDocument(app);
  await app.close();

  const outputPath = resolve(process.argv[2] ?? "openapi.json");
  writeFileSync(outputPath, JSON.stringify(document, null, 2) + "\n");
  process.stdout.write(`OpenAPI spec written to ${outputPath}\n`);
}

exportOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
