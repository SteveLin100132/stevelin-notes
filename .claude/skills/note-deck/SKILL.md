---
name: note-deck
description: 以「先設計、再實作」的方式把一篇 NoteCraft 筆記做成簡報 deck（.notecraft/components/<檔名>.deck.tsx）。先讀筆記、以簡報設計師的角度產出整份設計構想（每頁版面、icon、插圖，套 trendlink-design），停下來給作者確認，確認後才寫成 deck 並逐頁驗證。當作者說「用 note-deck 做簡報」「幫我設計 xxx 的簡報」「把 docs/xxx.mdx 設計成 deck」「重新設計 xxx 的簡報」時使用。與 content-present（原子模板填字）並存、互不修改。
---

# note-deck：設計導向的筆記簡報

content-present 讓每個內容頁「從 29 個原子挑一個填字」，保證下限但版面生硬。
note-deck 反過來：**先像簡報設計師一樣把整份 deck 構想出來，每頁依內容的形狀設計版面與插圖，再實作成 deck**。
產物格式與 content-present 相同（同一套 `Deck` 契約、同一個播放器 `/present/<slug>`），只是內容頁不受原子限制。

範例（照這份的寫法與密度）：
- `.notecraft/components/pm-01-project-vs-product.deck.tsx`：**首選**，報告式版面 + 完整插圖工具組、概念小圖、版面零件
- `.notecraft/components/pm-00-learning-map.deck.tsx`：以幾何示意為主的較早版本

## 流程總覽

```
1. 讀筆記      → 抽出標題結構、主線、可用素材、既有互動元件
2. 設計構想    → 依 design-principles.md + trendlink-design 規劃每一頁
3. 輸出想法總結 → 停下來，等作者確認或修改            ← 必停
4. 實作 deck   → 依 deck-contract.md + visual-recipes.md 寫 .deck.tsx
5. 驗證        → 瀏覽器逐頁截圖（亮 / 暗），修到沒有裁切與碰撞
6. 回報
```

**第 3 步一定要停。** 作者沒確認前不寫 `.deck.tsx`。作者要求修改構想時，只改被點名的頁，再輸出一次總結。

## 1. 讀筆記

- 筆記在 `docs/` 底下。記下兩個識別字：
  - **slug** = 相對 `docs/` 的路徑去副檔名（例：`knowledge/project/pm-00-learning-map`）→ 填進 `deck.slug`，決定 `/present/<slug>`
  - **檔名** = 筆記檔名去副檔名（例：`pm-00-learning-map`）→ 產物 `.notecraft/components/<檔名>.deck.tsx`（攤平、不建子資料夾）
- **標題結構對應（作者指定的規則）**：
  - `#`（heading 1）→ 封面 `title`；frontmatter `description` → 封面 `subtitle`
  - 章節分隔頁的標題**逐字取自 heading**：筆記有多個 `#` 時每個 `#` 一個章節頁；只有一個 `#` 時，改用其下的 `##` 當章節頁
  - 章節頁的 `subtitle` 取該節第一句的結論（40–60 字內），不自己發明
- 蒐集素材：段落主張、清單、表格、Admonition、`:tip[]` 的定義、`::::steps`、筆記連結、既有 `@ai-visualize` 元件（`import ... from '@notes/components/<id>'`）與其 `.tsx` 內的資料陣列（常是現成的結構化內容）。
- 不要引入筆記裡沒有的事實、數字或引言。

## 2. 設計構想

先讀：
- `references/design-principles.md`（本 skill 的設計原則，必讀）
- `references/report-layout.md`（報告式版面：一頁一份報告，必讀）
- `references/illustration-kit.md`（情境插圖的使用時機與畫法，必讀）
- `.claude/skills/trendlink-design/readme.md` 的 CONTENT / VISUAL FOUNDATIONS / ICONOGRAPHY 三節
- 專案 `CLAUDE.md` 的〈視覺化與插圖規範〉（不畫 Q 版人物、不加裝飾、細線、藍橘灰）

然後依序決定：
1. **主線**：整份 deck 想讓人帶走的一句話 → 封面副標與最後一頁
2. **標題序列**：先寫出全部頁標題，只讀標題也要能讀懂故事；文法一致；標題引出主題，不下戲劇化結論
3. **每頁構想**：這頁要講的一件事、內容的「形狀」（序列 / 層級 / 對照 / 矩陣 / 循環 / 流程 / 清單）、對應的版面、icon、插圖。
   插圖要寫成**具體畫面**（「準時交付的包裹，螢幕前卻是空椅子」），不是「一個示意圖」；只有幾何色塊的內容頁要先想能不能改成情境插圖或插圖卡
4. **節奏**：封面（深）→ 內容頁（淺）→ 章節頁（深）交錯；一般 8–14 頁；同類頁共用同一套版面骨架

## 3. 輸出想法總結（停）

照 `references/brief-template.md` 的格式在對話中輸出，然後停下來等作者回覆。
作者說「OK / 可以 / 開始做」才進入第 4 步。

## 4. 實作 deck

先讀 `references/deck-contract.md`（技術契約，違反會編譯失敗或被裁切）、`references/report-layout.md`（報告式版面）、`references/illustration-kit.md`（插圖），並打開範例 deck 對照。
從 `pm-01-project-vs-product.deck.tsx` 整段複製 `── 插圖工具組 ──`、`── 概念小圖 ──`、`── 版面零件 ──` 三段進新 deck（`pm-02-waterfall-vs-agile.deck.tsx` 另有 `Stamp`、`Diamond`、`StackRow`、`CaseRow`、`DefCard`、`NextBand` 可用）。
複製後先看 deck-contract.md〈常見錯誤〉：lucide icon 與工具組元件同名時要用別名匯入。
**範例 deck 仍留有舊寫法，複製時要改掉**（作者明確回饋，兩條都是硬規則）：
- 不帶 `Blob` 元件、刪掉所有 `<Blob />`：插圖底下不墊淺藍橢圓或任何大色塊。
- `Panel` 等放插圖的區塊底色改 `c.slide`（+ 1px `c.border` 細框），不用 `c.sunken` 或灰／灰藍底，讓區塊保持乾淨、插圖對比清楚。
`references/visual-recipes.md` 是較早的單一大圖版面，只在頁面內容真的只有一件事時參考。

- 內容頁預設採**報告式版面**：右上 `pill` 放一句結論、內容分 2–3 個編號小節、欄間細線、頁底說明帶或結論條（見 report-layout.md）
- 封面 / 章節頁用系統固定版型（`cover` / `section`），只填資料
- 內容頁一律 `custom`：頁首頁尾（編號、kicker、標題、底線、頁碼、callout）由系統 `SlideChrome` 畫，`render` 只負責內容區
- 內容區可用尺寸通常是 **1392 × 620**（有單句 callout 時 1392 × 538），設計時就用這個預算排
- 既有互動元件若是某頁的最佳呈現，用 `full-visual` 嵌入，不要重畫成靜態圖
- 同一檔內把重複的零件（icon 圓章、箭頭、欄位）抽成小函式元件，全 deck 共用，確保頁與頁一致

## 5. 驗證

**`tsc` 與 build 抓不到被裁掉的內容**，截圖是唯一可靠的一層。

1. 找作者開著的 dev server（`npm run dev`，預設 4321）。
   - **新建的 deck 檔需要重啟 dev server 才會被收錄**（`import.meta.glob` 不會在 dev 中途收新檔）；覆寫既有 deck 則 HMR 即可。需要重啟時請作者自己重啟，不要替他殺掉程序。
   - dev 開著時**不要**跑 `npm run build`（共用 data-store，會讓 dev 全站 500）。
   - 重啟前可先確認模組能編譯：在瀏覽器執行 `await import('/@fs/<絕對路徑>.deck.tsx')`，檢查 `default.slides.length`。
2. 開 `/present/<slug>`，讀 console 的 `[deck]` 警告（溢出 / 項數超標；縮覽側欄會渲染每一頁，一次載入就涵蓋全部）。
3. 逐頁截圖，亮色與暗色主題各一輪。檢查：裁切、文字碰撞、換行斷在怪位置、大片空白、暗色下看不見的色塊或文字，
   以及插圖底下是否殘留墊底橢圓、插圖面板是否誤用灰底（`grep -n "Blob\|c.sunken"` 應查無插圖相關用法）。
4. 修完再截一次，直到全數通過。

Browser pane 操作要點（實測）：
- 先 `resize_window` 1600×1000，否則面板太小看不清；HMR 或頁面重整後模擬尺寸常被清掉，截圖只拍到左上角時先切回 `desktop` 再重新設定。
- 進頁後執行 `window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16)`，否則畫布可能不繪製、截圖逾時。
- 換頁用畫布下方的「下一頁／上一頁」按鈕；改網址 `#n` 不會換頁，方向鍵一次只能翻一頁。截圖前等 1 秒。
- 模擬 1600×1000 後截圖持續逾時時，改回 `desktop` 預設尺寸再截（面板 800×500 仍看得清版面）。
- 亮暗切換用頁首的「亮色／暗色」按鈕（`find("亮色")`）。
- 常見問題不只溢出，還有「內容只填到 60–70% 高」：把主要區塊改成 `flex: 1` / `alignItems: stretch` 撐滿，或放大字級與圖。

## 6. 回報

頁數、每頁版面、用到的插圖、嵌入的互動元件、截圖檢查中修掉的問題，以及與構想不同之處與理由。

## 與其他 skill 的關係

- **content-present / content-visualize / trendlink-design**：由 `npm run skill:install` 安裝，**不要修改**。本 skill 只讀它們的內容。
- 同一篇筆記只能有一份 deck。已有 deck（不論哪個 skill 產的）時，先問作者是否覆寫。
