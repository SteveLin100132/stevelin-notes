# CLAUDE.md

> **回覆語言：一律用繁體中文回答使用者**（包含說明、總結、提問；程式碼、指令、檔名、專有名詞維持原文）。

個人筆記專案。筆記以 md / mdx 撰寫，由 [NoteCraftApp](https://www.npmjs.com/package/notecraftapp) 呈現；
筆記內的 `@ai-visualize` 標記交給 Claude Code 生成可互動的 React 視覺化元件（圖表、示意圖為主）。

## 專案結構

```
stevelin-notes/
├─ docs/                          ← 筆記根目錄（notesDir），所有筆記都放這裡
│  ├─ <主題>/<筆記>.mdx            ← 支援巢狀資料夾，slug = 相對路徑去副檔名
│  └─ assets/illustrations/       ← 筆記用的獨立插圖（選用，SVG 優先）
├─ .notecraft/                    ← 放在「專案根」，不是 docs/ 底下
│  ├─ components/<id>.tsx         ← AI 生成的視覺化元件（content-visualize 產出）
│  ├─ components/<slug>.deck.tsx  ← 筆記轉簡報產物（content-present 產出）
│  ├─ series.json                 ← （選用）系列閱讀路徑
│  └─ plugins.json                ← （選用）plugin 映射
├─ .claude/                       ← `npm run skill:install` 安裝的 skill 與 subagent（勿手改）
├─ projects/                      ← 程式範例／腳手架／服務（Turborepo + npm workspaces，獨立於筆記）
│  ├─ apps/<kebab-case-name>/     ← 各 app，package name 與資料夾同名
│  │  └─ nestjs-api-scaffold/     ← NestJS 後端 API 腳手架
│  ├─ packages/                   ← 共用套件（目前空）
│  └─ package.json / turbo.json   ← monorepo 根，有自己的 node_modules 與 lockfile
└─ package.json
```

viewer app 與 build 快取在 `~/.notecraft/`（`app-<version>/`、`cache/<hash>/`），不在專案內。

> skill 文件寫 `<notesDir>/.notecraft/components/`，但 notecraftapp 實際把 `@notes` alias
> 指向**執行指令的目錄（專案根）/.notecraft/**。生成元件一律寫到 `stevelin-notes/.notecraft/components/`。

## 常用指令

| 指令                         | 作用                                                                |
| :--------------------------- | :------------------------------------------------------------------ |
| `npm run dev`                | `notecraftapp view ./docs`：Astro dev server，HMR + 可在 UI 新增／編輯筆記 |
| `npm run dev:lan`            | 同上，綁 `0.0.0.0` 讓區網裝置可看                                   |
| `npm run serve`              | `notecraftapp serve ./docs`：build 後靜態服務，背景 rebuild + SSE 自動刷新（**AI 生成元件時開這個觀察**） |
| `npm run serve:static`       | 純靜態、唯讀，不監看                                                |
| `npm run build`              | build 靜態站到 `~/.notecraft/cache/<hash>/dist/`（也是驗證生成元件的方式） |
| `npm run build:force`        | 忽略快取強制 rebuild                                                |
| `npm run skill:install`      | 安裝 content-visualize / content-present / trendlink-design skill 到 `.claude/` |
| `npm run skill:check`        | 比對已安裝 skill 與套件內版本                                       |
| `npm run skill:update`       | 強制覆寫升級 skill                                                  |
| `npm run plugin:list` / `plugin:install` / `plugin:remove <id>` | 管理結構化 JSON 渲染 plugin |
| `npm run projects:install`   | 安裝 `projects/` monorepo 依賴（首次或新增 app 後）                  |
| `npm run api:dev`            | 以 watch 模式啟動 `nestjs-api-scaffold`（`http://localhost:3000`，Swagger 在 `/api-docs`） |
| `npm run api:build` / `api:start` / `api:test` | build／build 後以正式模式啟動／跑 unit tests          |

`projects/` 底下的專案是一般 Node 專案，可以正常跑 `tsc`、`nest build`、jest 等工具（下方的驗證規則只適用於筆記）。
進 `projects/` 後用 `npm run <task> -- --filter=<app>` 操作單一 app。

額外 flag 用 `--` 傳：`npm run dev -- --port 5000`。npm scripts 只是捷徑，
也可以直接 `npx notecraftapp <子命令> ./docs`。

**驗證規則**：不要在本專案跑 `tsc` 或 `astro build`（這裡沒有 astro 專案設定）。生成元件後用 `npm run build`
驗證，或觀察使用者開著的 `npm run serve`。skill / subagent 文件中寫的 `npx notecraftapp build ./notes`，
在本專案的筆記目錄是 `./docs`。

## 撰寫筆記的規範

- 一律放在 `docs/` 底下；有互動元件的筆記用 `.mdx`，純文字可用 `.md`
- 檔名用 kebab-case（可含中文）；依主題分資料夾，例如 `docs/frontend/react-hooks.mdx`
- Frontmatter 全部選用，但建議至少寫 `title`、`description`、`tags`：

```yaml
---
title: React Hooks 心智模型
description: 用「每次 render 都是一張快照」理解 useState 與 useEffect。
tags: [react, frontend]
category: 前端
createdAt: '2026-09-25'
updatedAt: '2026-09-25'
---
```

- 圖片、筆記互連都用**相對路徑**：`![說明](./assets/illustrations/x.svg)`、`[另一篇](../other/note.mdx)`
  （會自動轉成 `/notes-assets/*` 與 `/notes/<slug>`）
- 內文不使用 emoji；需要語意標示時用 `:badge[]`、Admonition 或元件內的 lucide icon

## 視覺化與插圖規範（本專案核心規範）

目標是**幫助理解**，不是每篇都要堆滿圖。整體調性：**專業、克制、像技術文件或顧問報告裡的圖**，不走 Q 版／卡通路線。

### 1. 互動元件：有助理解才加

- 內容有「變化、取捨、流程、比較」時才下 `@ai-visualize`；純觀念或查表型筆記可以只有文字與表格
- 依 content-visualize skill 的「互動優先原則」：slider、stepper / tab 走查、並排模擬、逐步揭露動畫。
  純靜態圖只在內容本質靜態（查表、結構快照）時才用

### 2. 元件內的圖：以圖表與示意圖為主，插圖選用

- 首選**資訊圖形**：時間軸、甘特圖、流程圖、泳道圖、狀態機、雷達圖、座標圖、架構圖、看板
- 真的需要具象畫面時，可以畫**物件或場景的簡化示意**（伺服器、文件、佇列），但：
  - **不畫 Q 版人物**：不要大頭、腮紅、表情、冒汗、舉手歡呼；需要表示「人／角色」時用中性的角色標籤或簡單剪影
  - 不加裝飾性元素：星光、彩帶、太陽、樹、金幣堆之類
- 圖要**參與互動**：隨 state 改變位置／長度／數量／顏色（例：拖 slider 時多邊形變形、時間游標推進），
  而非放一張裝飾圖在旁邊
- 視覺風格：
  - 細線（1–2px）、無粗黑外框；以面積、色塊與留白區分層次
  - 主色藍 + 輔色橘 + 中性灰（trendlink-design token），語意色只用在狀態（完成、警示）
  - 文字標籤清楚、對齊整齊；有數值就標數值與單位；有軸就畫刻度與格線
  - **底要乾淨**：圖的整塊背景用白底 `#ffffff` + 1px `#e1e6ee` 細框
    （SVG 背景 rect 寫 `x="0.5" y="0.5"`、寬高各減 1，框線才不會被裁半），**不用** `#f6f8fb` 等灰／灰藍底整塊墊底；
    物件底下不墊淺色橢圓或大色塊。這兩種都會壓低插圖對比（互動元件、獨立插圖、簡報一體適用）
- 圖直接寫在該元件的 `.tsx` 內（SVG JSX，拆成檔內的小函式元件）；**不要**從別的生成元件 import
- 顏色：生成元件的 Tailwind class 不會被編譯，一律用檔內常數對應 trendlink-design token 值，再以 inline style / SVG 屬性套用
- SVG 要有 `viewBox`、`width="100%"`，並加 `role="img"` 與 `aria-label` 描述畫面
- **元件要滿版**：根元素用 `width: "100%"`，不要設 `maxWidth` + `margin: auto`（寬版面會兩側留白）。
  橫向延展的圖（時間軸、甘特圖、路線圖、並排面板）用 ResizeObserver 量測 SVG 實際寬度，
  讓 `viewBox` 寬 = 像素寬（設最小設計寬度，窄螢幕才等比縮小），座標依寬度計算；
  這樣文字維持 1:1、不會在寬版被放大。量測 hook 直接寫在該元件檔內
- 元件內的按鈕列、選項等 UI 不要用 `<ol>` / `<ul>`：筆記頁的 prose 樣式會替清單加上編號／圓點，
  改用 `<div role="group">`
- 其餘元件規則照 `.claude/skills/content-visualize/SKILL.md`：default export、無 required props、
  import 白名單 `react` / `react-dom` / `motion` / `recharts` / `d3` / `lucide-react` / `clsx` / `tailwind-merge`、
  根元素不自帶卡片外框、禁止 emoji、尊重 `useReducedMotion()`

### 3. 筆記內文的獨立插圖：選用

- 只有在一張圖能明顯幫助理解某個概念時才放（例：業界公認的模型圖、架構圖）；
  若緊接著已有互動元件表達同一件事，就不要再放靜態插圖
- 路徑：`docs/assets/illustrations/<筆記slug>-<主題>.svg`，由 Claude 手寫 SVG（同上風格），
  用 `![描述性 alt](../assets/illustrations/xxx.svg)` 嵌入
- 插圖要傳達概念，不是 logo、裝飾邊框或情境漫畫
- **插圖要滿版**：`<svg>` 根元素的 `width` / `height` 設為 viewBox 尺寸的 **2 倍**
  （例：`viewBox="0 0 760 320" width="1520" height="640"`）。`![]()` 會變成 `<img>`，內在寬度大於內文欄寬時
  才會被 `max-width: 100%` 縮到剛好滿版；寫成與 viewBox 同寬（760）會在寬版面兩側留白。
  統一用 2 倍寫法，不用 `width="100%"`（在 `<img>` 裡沒有固定內在尺寸，會退回瀏覽器預設 300px 再靠樣式撐開，
  行為依賴 viewer CSS）。範例見 `pm-04-waterfall-sdlc-*.svg`

### 4. 撰寫 `@ai-visualize` prompt 的格式

prompt 裡寫「互動」與「圖形」兩段，讓生成元件有明確依據（圖形段描述要畫的圖表／示意圖）：

```mdx
{/* @ai-visualize
id: rate-limit-token-bucket
type: motion
prompt: |
  核心洞察：token bucket 允許短暫爆量，但長期速率被固定。
  互動：slider 調整請求速率，按鈕「突發 20 個請求」。
  圖形：左側是容量刻度的 bucket 示意（token 數量以格子填滿表示），右側是請求時間軸，
        通過的請求標藍、被拒絕的標橘；下方折線圖顯示 bucket 內 token 數隨時間變化。
  資料/數值：容量 10、補充速率 2/s。
caption: 拖動速率，看 bucket 何時被耗盡
status: pending
*/}
```

請 Claude 處理時說：「處理 `docs/xxx.mdx` 的視覺化標記」，content-visualize skill 會自動掃描、生成、寫回。

## NoteCraftApp Markdown 擴充語法速查

### AI 視覺化標記（MDX 註解）

```mdx
{/* @ai-visualize
id: <kebab-case-id>                 ← 同時是元件檔名 .notecraft/components/<id>.tsx
type: diagram | chart | timeline | table | motion | free   ← 只是提示
prompt: |
  <自然語言描述>
caption: <選用，外框底部說明>
status: pending | generated | locked | failed
*/}
```

- `pending` 待生成；`generated` 已生成（明確要求才重生）；`locked` 永遠跳過；`failed` 生成失敗
- 生成後 skill 會在標記正下方寫入（不要手動改格式）：

```mdx
import GeneratedFrame from '@/components/GeneratedFrame.astro'
import RateLimitTokenBucket from '@notes/components/rate-limit-token-bucket'

<GeneratedFrame id="rate-limit-token-bucket" type="motion" prompt={"..."} caption="...">
  <RateLimitTokenBucket client:visible />
</GeneratedFrame>
```

- 有互動／動畫才加 `client:visible`；外框只由 `GeneratedFrame` 提供
- 標記**不要**包在 ```` ``` ```` 圍欄裡（會把 prompt 顯示給讀者）

### Admonitions（提示框）

類型：`note` / `info` / `tip` / `success` / `warning` / `danger`

```md
:::note
一般提示。
:::

:::warning{title="自訂標題"}
帶 title 屬性。也可寫 :::warning[自訂標題]
:::

:::tip{collapsible}
預設收合的 <details>；加 `open` 旗標則預設展開：{collapsible open}
:::
```

### Content tabs（分頁）

外層冒號要比內層**多一個**：

```md
::::tabs
:::tab{label="npm"}
內容 A
:::
:::tab{label="pnpm"}
內容 B
:::
::::
```

### Tooltip（行內提示）

```md
:tip[OAuth]{content="一種授權框架，讓第三方在不取得密碼的情況下存取資源。"}
```

### Badge（行內標籤）

```md
:badge[新]{variant="success"}
:badge[Beta]{variant="warning" outline}
:badge[必填]{variant="danger" size="sm"}
:badge[新功能]{variant="success" icon="sparkle"}
:badge[GitHub]{variant="neutral" icon="star" href="https://github.com/"}
```

- `variant`：`note` / `info` / `tip` / `success` / `warning` / `danger` / `neutral`（預設）
- `size`：`sm` / `md`（預設）；`outline` 為旗標
- `icon`：`sparkle` / `check` / `star` / `bolt` / `flag` / `info` / `warning` / `danger` / `note` / `success`
- `href` 為外部網址時自動 `target="_blank"`

### Steps（步驟）

```md
::::steps{layout="horizontal" start=1}
:::step{title="計劃" status="done"}
說明…
:::
:::step{title="實作" status="current"}
說明…
:::
:::step{title="驗收"}
status 預設 todo
:::
::::
```

- `layout`：`vertical`（預設）/ `horizontal`（< 640px 自動轉 vertical）
- `status`：`done` / `current` / `todo`
- step 內要再放 Admonition 等容器時，外層再各加一個冒號（`:::::steps` > `::::step` > `:::tip`）

### 程式碼區塊增強

````md
```ts title="src/lib/auth.ts" {2,5-6}
// title 顯示檔名；{…} 為 1-indexed 整行高亮
```
````

Code annotations（程式碼中 `(n)!` 對應下方編號清單，數量要一致）：

````md
:::annotate
```ts
function handler(req: Request) { // (1)!
  return ok(req); // (2)!
}
```

1. 進入點，先校驗請求格式。
2. 回傳標準化的成功包裝物件。
:::
````

### 其他

- **注意**：啟用 remark-directive 後，`:` 緊接文字（如 `風險:需求`）可能被當指令解析；
  NoteCraft 會還原成原文，但中文冒號建議用全形「：」
- 嵌入 plugin 資料檔：`<PluginView src="path/to/data.er.json" />`
- 系列：`.notecraft/series.json`（專案根；`docs/.notecraft/series.json` 也會讀、且優先），`slugs` 為相對 docs 的路徑去副檔名（資料檔寫 `view:<路徑>`）

```jsonc
{
  "series": [
    {
      "id": "react-basics",
      "title": "React 基礎",
      "eyebrow": "REACT",
      "description": "…",
      "accent": "blue",        // blue | orange | navy
      "icon": "code",          // target | code | layers | bookOpen | bolt
      "slugs": ["frontend/react-hooks", "frontend/react-effects"]
    }
  ]
}
```

## 筆記轉簡報

對 Claude 說「把 `docs/xxx.mdx` 轉成簡報」→ content-present skill 產出 deck，於 `/present/<slug>` 播放；
筆記中的互動元件會原樣嵌入投影片。

偏好設計導向的版面時，說「用 note-deck 做 `docs/xxx.mdx` 的簡報」→ 專案自有的 note-deck skill
（`.claude/skills/note-deck/`）先輸出整份設計構想、確認後才寫 deck，內容頁依內容形狀自由設計並配插圖。
產物與播放路徑同上。新建的 deck 檔要重啟 `npm run dev` 才會被收錄。

## 環境備註（Windows）

- Node ≥ 22。本機 Node 由 nvm 管理（`v22.16.0`），若終端機找不到 `node`，先執行 `nvm use 22.16.0`
- notecraftapp 需 ≥ 1.2.1：1.2.0 在 Windows 有跨磁碟 build 失敗（筆記在 D:、`~/.notecraft` 在 C:）、
  首次安裝失敗、serve 開瀏覽器崩潰等問題，1.2.1 已修正，不需任何包裝腳本
- 首次執行或升級 notecraftapp 版本後，會複製到 `~/.notecraft/app-<version>/` 並 `npm install`（約 3 分鐘）
- 清快取：刪除 `~/.notecraft/cache/`；舊版本的 `~/.notecraft/app-<舊版>/` 可直接刪除
