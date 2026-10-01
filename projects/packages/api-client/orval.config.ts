import { defineConfig } from "orval";

/**
 * 輸入：nestjs-api-scaffold 以 `npm run openapi:export` 輸出的靜態 spec。
 * 輸出：依 Swagger tag 拆檔的 TanStack Query hooks、共用 model 型別與 MSW mock handlers。
 */
export default defineConfig({
  scaffold: {
    input: {
      target: "../../apps/nestjs-api-scaffold/openapi.json",
    },
    output: {
      mode: "tags-split",
      target: "src/generated/endpoints",
      schemas: "src/generated/model",
      client: "react-query",
      httpClient: "fetch",
      mock: true,
      clean: true,
      override: {
        mutator: {
          path: "src/http/custom-fetch.ts",
          name: "customFetch",
        },
        fetch: {
          // hook 的 data 直接是後端回傳的 body（ApiResponseDto 包裝），不再多包一層 { data, status, headers }
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
