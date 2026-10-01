# nestjs-api-scaffold

NestJS 11 後端 API 腳手架（Node.js 22+ / TypeScript 5+），內建 health、Prometheus metrics、Swagger、rate limit、helmet 與 graceful shutdown。

> 來源：[SteveLin100132/ai-sdd-todo-app/backend](https://github.com/SteveLin100132/ai-sdd-todo-app/tree/main/backend)。從筆記專案根目錄可直接執行 `npm run api:dev`。

## 開發環境啟動

```bash
npm install        # 首次安裝（含 allure v3 CLI）
npm run migration:run
npm run start:dev
```

## 測試

```bash
npm test                # 執行 unit tests，清空並重建 allure-results/
npm run test:e2e        # 執行 e2e tests，清空並重建 allure-results/
npm run test:all        # 依序執行 unit + e2e（allure-results/ 含兩者結果，共 50 個）
npm run test:cov        # 執行 unit tests + 覆蓋率報告（輸出至 coverage/）
```

## Allure 測試報告

> `allure-jest` v3.x + `allure` v3（純 TypeScript CLI，**無需安裝 Java**）

### 使用方式

**1. 執行測試**，產生原始結果（輸出至 `allure-results/`）：

```bash
npm test              # unit tests（清空後寫入）
npm run test:e2e      # e2e tests（清空後寫入）
npm run test:all      # unit + e2e 聯合結果（先清空寫入 unit，再追加 e2e）
```

**2. 生成 HTML 報告**（輸出至 `allure-report/`）：

```bash
npm run report:generate
```

**3. 開啟已生成的報告**（靜態，需先執行步驟 2）：

```bash
npm run report:open
```

**4. 即時監控模式**（自動偵測 `allure-results/` 變化，`Ctrl+C` 關閉）：

```bash
npm run report:watch
```

### 注意事項

- `allure-results/` 與 `allure-report/` 已列入 `.gitignore`，不會提交至版本庫
- `npm test` 與 `npm run test:e2e` 各自執行前會**清空** `allure-results/`（嚴格清空策略）
- `npm run test:all` 先跑 unit（清空後寫入）再追加 e2e，`allure-results/` 最終**同時包含兩者結果**
- `allure` v3 CLI 為純 Node.js 工具，已列為 devDependency，**無需系統 Java 環境**
- MVP 階段不保存歷史趨勢；每次報告僅反映最近一次執行結果
