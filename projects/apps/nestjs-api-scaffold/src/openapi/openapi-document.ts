import { INestApplication } from "@nestjs/common";
import {
  DocumentBuilder,
  OpenAPIObject,
  SwaggerModule,
} from "@nestjs/swagger";
import { ApiResponseDto } from "../common/dto/api-response.dto";
import { getRegisteredDtos } from "../common/decorators/register-dto.decorator";

/**
 * 建立 OpenAPI document，供 `main.ts`（Swagger UI、`/openapi.json`）、
 * e2e 測試與 `export-openapi.ts`（codegen 用的靜態 spec）共用，確保三者產出一致。
 *
 * `operationIdFactory` 只取 method 名稱：預設的 `PingController_getPing`
 * 經 codegen 會變成 `usePingControllerGetPing` 這類冗長名稱，改為 `getPing` 後
 * Orval 產生的 hook 即為 `useGetPing`。因此 **handler method 名稱在全專案內必須唯一**，
 * 重名時請以 `@ApiOperation({ operationId })` 明確指定。
 *
 * @param app 已建立（`NestFactory.create` / `createNestApplication`）的應用實例
 * @returns 完整的 OpenAPI 3 document 物件
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const swaggerConfig = new DocumentBuilder()
    .setTitle("API")
    .setDescription("REST API\n\n📄 [OpenAPI JSON Spec](/openapi.json)")
    .setVersion("1.0")
    .build();
  return SwaggerModule.createDocument(app, swaggerConfig, {
    // ApiResponseDto 永遠需要（wrapper schema）；其餘 DTO 由 @RegisterDto() 自動收集
    extraModels: [ApiResponseDto, ...getRegisteredDtos()],
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  });
}
