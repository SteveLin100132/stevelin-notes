# api-client

由 [`nestjs-api-scaffold`](../../apps/nestjs-api-scaffold) 的 OpenAPI spec，以 [Orval](https://orval.dev) 產生的 React API client：

- `useGetPing()`、`useGetHealth()` 等 TanStack Query hooks，以及對應的純函式（`getPing()`）與 query key
- 共用 model 型別（`PingDto`、`ApiResponseDto`…）
- MSW handlers + faker 假資料（`api-client/mocks`），後端還沒好時可先用 mock 開發

## 產生流程

```
後端 controller / DTO（@nestjs/swagger 裝飾器）
  → npm run openapi:export   （nestjs-api-scaffold，輸出 openapi.json，不啟動 server）
  → orval                    （讀 openapi.json，輸出 src/generated/）
```

```bash
npm run generate        # 先輸出 spec 再產生 client（後端有改動時用這個）
npm run generate:only   # 只重跑 Orval
npm run typecheck       # 檢查產出在 React 端的型別
```

> Orval 8 要求 **Node ≥ 22.18**。`src/generated/` 與 `openapi.json` 都納入版本控制，
> 改後端 API 後重新產生並一起提交，review 時就能直接看出前端型別的變化。

## 使用方式

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClient, useGetPing, ApiError } from "api-client";

configureApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL });

function PingStatus() {
  const { data, error, isPending } = useGetPing();
  if (isPending) return <span>檢查中</span>;
  if (error) return <span>{error instanceof ApiError ? error.status : "網路錯誤"}</span>;
  return <span>{data.data?.pong ? "可連線" : "無回應"}</span>;
}
```

- hook 的 `data` 是後端的統一包裝 `ApiResponseDto`，實際資料在 `data.data`
- 非 2xx 回應會拋出 `ApiError`（`status`、`headers`、`body`），網路錯誤則是 fetch 原生的 `TypeError`
- 需要帶 token 時：``configureApiClient({ headers: () => ({ Authorization: `Bearer ${token}` }) })``

Mock（例如在 Vite dev 或測試中）：

```ts
import { setupWorker } from "msw/browser";
import { getPingMock, getHealthMock } from "api-client/mocks";

await setupWorker(...getPingMock(), ...getHealthMock()).start();
```

## 檔案

| 路徑 | 說明 |
| :-- | :-- |
| `orval.config.ts` | Orval 設定：`tags-split` 依 Swagger tag 拆檔、`react-query` + `fetch`、開啟 mock |
| `src/http/custom-fetch.ts` | 所有請求共用的 mutator：base URL、body 解析、`ApiError` |
| `src/generated/` | Orval 產出，**不要手改**（每次產生會清空重建） |
| `src/index.ts` / `src/mocks.ts` | 對外 entry；mocks 獨立，避免 msw / faker 進正式 bundle |
