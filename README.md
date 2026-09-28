# stevelin-notes

個人筆記庫。筆記以 Markdown / MDX 撰寫，由 [NoteCraftApp](https://www.npmjs.com/package/notecraftapp) 呈現；
筆記內的 `@ai-visualize` 標記交給 Claude Code 生成可互動的 React 視覺化元件（圖表、示意圖為主），
也能把筆記轉成簡報播放。

## 內容

| 系列 / 筆記 | 路徑 | 說明 |
| :--- | :--- | :--- |
| 開始使用這個筆記庫 | `docs/getting-started.mdx` | 寫作流程：先寫文字，需要時下標記，由 AI 生成互動圖表 |
| 專案管理筆記（第零～五章） | `docs/knowledge/project/` | 專案 vs 產品、Waterfall vs Agile、R&R、Waterfall SDLC、專案管理工具 |
| ER Diagram 範例 | `docs/sample/` | 示範 `er-diagram-renderer` plugin，以 `*.erd.json` 描述資料表 |

## 快速開始

需求：Node.js ≥ 22（notecraftapp ≥ 1.2.1）。

```bash
npm install
```

```bash
npm run dev
```

首次執行會把 viewer app 複製到 `~/.notecraft/app-<version>/` 並安裝相依套件，約需 3 分鐘。

## 常用指令

| 指令 | 作用 |
| :--- | :--- |
| `npm run dev` | 開發模式（HMR，可在 UI 新增／編輯筆記） |
| `npm run dev:lan` | 同上，綁 `0.0.0.0` 讓區網裝置瀏覽 |
| `npm run serve` | build 後靜態服務，背景 rebuild 並自動刷新（AI 生成元件時建議用這個觀察） |
| `npm run serve:static` | 純靜態、唯讀，不監看 |
| `npm run build` / `build:force` | build 靜態站到 `~/.notecraft/cache/<hash>/dist/`（`force` 忽略快取） |
| `npm run skill:install` / `skill:check` / `skill:update` | 安裝、檢查、升級 Claude Code skill 到 `.claude/` |
| `npm run plugin:list` / `plugin:install` / `plugin:remove <id>` | 管理結構化 JSON 渲染 plugin |

額外參數用 `--` 傳入，例如 `npm run dev -- --port 5000`。

## 專案結構

```
stevelin-notes/
├─ docs/                          筆記根目錄（slug = 相對路徑去副檔名）
│  ├─ <主題>/<筆記>.mdx
│  └─ assets/illustrations/       筆記用的獨立插圖（SVG）
├─ .notecraft/
│  ├─ components/<id>.tsx         AI 生成的視覺化元件
│  ├─ components/<slug>.deck.tsx  筆記轉簡報產物
│  ├─ plugins/                    已安裝的渲染 plugin
│  ├─ series.json                 系列閱讀路徑
│  └─ plugins.json                plugin 映射
├─ .claude/                       skill 與 subagent（由 skill:install 安裝）
├─ CLAUDE.md                      撰寫與視覺化規範
└─ package.json
```

viewer app 與 build 快取放在 `~/.notecraft/`，不在專案內。

## 寫作流程

1. 在 `docs/` 下新增筆記：有互動元件用 `.mdx`，純文字可用 `.md`；檔名 kebab-case，frontmatter 建議寫 `title`、`description`、`tags`。
2. 內容有變化、取捨、流程或比較時，插入 `@ai-visualize` 標記：

   ```mdx
   {/* @ai-visualize
   id: rate-limit-token-bucket
   type: motion
   prompt: |
     核心洞察：token bucket 允許短暫爆量，但長期速率被固定。
     互動：slider 調整請求速率，按鈕「突發 20 個請求」。
     圖形：bucket 容量示意 + 請求時間軸 + token 數折線圖。
   caption: 拖動速率，看 bucket 何時被耗盡
   status: pending
   */}
   ```

3. 對 Claude Code 說「處理 `docs/xxx.mdx` 的視覺化標記」，content-visualize skill 會生成元件並寫回筆記。
4. 想轉成簡報時說「把 `docs/xxx.mdx` 轉成簡報」（content-present），或「用 note-deck 做 `docs/xxx.mdx` 的簡報」（先出設計構想再實作），於 `/present/<slug>` 播放。

完整的撰寫規範、視覺風格與 NoteCraft Markdown 擴充語法（Admonition、Tabs、Steps、Badge 等），請見 [CLAUDE.md](./CLAUDE.md)。

## 疑難排解

- 找不到 `node`：本機以 nvm 管理，先執行 `nvm use 22.16.0`。
- build 異常或想重來：刪除 `~/.notecraft/cache/`；舊版的 `~/.notecraft/app-<舊版>/` 可直接刪除。
- 新增的 `.deck.tsx` 需重啟 `npm run dev` 才會被收錄。
