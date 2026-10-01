# projects

stevelin-notes 的程式範例、腳手架與服務，以 [Turborepo](https://turborepo.com/) + npm workspaces 管理。

```
projects/
├─ apps/        ← 可獨立執行的應用（範例、腳手架、服務）
│  └─ nestjs-api-scaffold/   NestJS 後端 API 腳手架
├─ packages/    ← 共用套件（設定、工具庫），目前為空
├─ turbo.json
└─ package.json
```

## 常用指令（在 `projects/` 底下執行）

```bash
npm install                                        # 安裝所有 workspace 依賴
npm run dev                                        # 啟動所有 app 的 dev 模式
npm run dev -- --filter=nestjs-api-scaffold        # 只啟動指定 app
npm run build                                      # build 全部
npm test                                           # 跑全部 unit tests
```

專案根目錄的 `package.json` 另有 `api:*` 捷徑指令，可不進 `projects/` 直接操作。

## 新增 app

1. 在 `projects/apps/<kebab-case-name>/` 建立專案，`package.json` 的 `name` 與資料夾同名
2. 提供 `dev`、`build`、`test`、`lint` 等 script，turbo 會自動納入
3. 回到 `projects/` 執行 `npm install` 更新 lockfile
