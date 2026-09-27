# 版面與插圖配方

以下都取自範例 `.notecraft/components/pm-00-learning-map.deck.tsx`，完整程式碼請直接看該檔。
配方是起點不是模板：依內容調整欄數、尺寸與圖形，但同一份 deck 內的零件尺寸要一致。

## 共用零件（每份 deck 都值得有）

```tsx
const V = { blue100: "var(--blue-100)", /* … */ blue900: "var(--blue-900)", orange400: "var(--orange-400)", n0: "var(--neutral-0)" };
const MONO = "var(--font-mono)";
const fill = (color: string): CSSProperties => ({ fill: color });
const stroke = (color: string, width: number, extra: CSSProperties = {}): CSSProperties =>
  ({ fill: "none", stroke: color, strokeWidth: width, ...extra });

/** icon 圓章：44–52px，淺底 + 品牌色 icon；深底版本用 V.blue700 + 白 icon */
function Medallion({ Icon, size, bg, fg }: { Icon: LucideIcon; size: number; bg: string; fg: string }) { … }

/** 流程箭頭（30×16 實心），顏色用 V.blue200 */
function ArrowGlyph({ color }: { color: string }) { … }
```

內容若是「N 個章節 / 步驟」，把資料抽成檔內陣列（`CHAPTERS`），多頁共用同一份資料，確保各頁用詞一致。

## 1. 疊塔（底層支撐上層）

右側一塊 `c.brandSoft` 面板，由上到下是寬度遞增的色塊，最底層（地基）最寬、用橘色：

- 寬度：330 / 400 / 470 / 540；高 68（地基 78）
- 色階：blue-200 → blue-300 → blue-500 → orange-400；文字色依底色深淺選 blue-900 / 白 / neutral-900
- 每塊：icon + 主詞（`DS.h4` 粗體，地基用 `DS.h3` 900）+ 副詞（`DS.body`）
- 面板底部一句說明，點出「上層都站在地基之上」
- 左側配 3 列「icon 圓章 + 小標 + 一句」交代背景

## 2. 階梯（每一步建立在前一步上）

`display: flex; alignItems: flex-end` 的五欄，每欄 = 卡片 + 台階：

- 台階高度 `60 × (i + 1)`，色階由淺到深（blue-100 → blue-700），上面標 `CH 0n`（mono）
- 卡片：`c.slide` 底、`c.shadow`、`borderTop: 4px`（第一階橘色、其餘 `c.brand`），內含 icon 圓章 + 問題（`c.accent`）+ 名稱（`DS.h4`）+ 一句（`DS.small`）
- 各卡片字數相近，台階頂端才會形成整齊的斜線
- 高度預算：卡片約 190 + 最高台階 300 ≤ 620

## 3. 名詞卡 2×2（定義 + 小示意圖）

`grid 2×2`，每張卡 `c.sunken` 底：左邊 190×150 的 `c.slide` 小框放示意圖，右邊名詞（`DS.h3`）+ 英文（`c.accent`）+ 定義（`DS.body`，約 45 字內）。

示意圖例：
- 瀑布：四段色塊由左上往右下遞降，段間折線
- 敏捷：`strokeDasharray` 留缺口的圓 + 三角形箭頭
- 權責：2×2 色塊（拍板 / 執行 / 諮詢 / 通知），這種可直接用 HTML
- 生命週期：橫軸 + 五個節點 + 每節點下一份文件

## 4. 欄位路線圖（序列 + 每欄多層資訊）

五欄之間穿插箭頭欄，每欄由上而下：問題 pill → 深藍節點 → 示意圖 → 狀態 → 一句洞察。

- **pill 與節點用固定高度**（`PILL_H = 44`、`NODE_H = 106`），箭頭欄 `paddingTop = PILL_H + gap + NODE_H / 2 − 8`，箭頭才會對準節點中線
- 節點：`V.blue700` 底、白字、`CH 0n` 用 `V.orange300`、名稱 `whiteSpace: nowrap`
- 示意圖區：高 90、`c.sunken` 底，SVG 寬 200（viewBox 240×90）
- 狀態：`CheckCircle2` + 「已完成」（`c.good`），icon 與文字並行
- 有「前置閱讀」這類補充時，交給 chrome 的 `callout`（`icon: "lightbulb", tone: "orange"`），內容區高度變 538

## 5. 列表列（N 項 × 固定欄位）

表頭一列小灰字標籤，下面每項一列（`flex: 1` 平分高度，`c.sunken` 底、圓角 12）：

- 第一欄固定寬 300：icon 圓章（深藍底）+ `CH 0n`（mono、`c.accent`）+ 名稱（`DS.h4`）
- 其餘欄 `flex: 1`：內容 `DS.body`；「結果」欄前加 `Check` icon，文字用 `c.brandInk`
- 每格文字控制在 2 行內

## 6. 判斷流程（輸入 → 依序判斷 → 結論）

- 左側「輸入物件」：手繪 SVG 文件（折角 + 幾條橫線 + 一條橘色標題線）+ 名稱 + 一句
- 中間 4 張判斷卡，卡間 `ArrowGlyph`：`borderTop: 4px` 橘、icon 圓章 + `判斷 n`（mono）+ 問題（`DS.h4`）+ 選項 pill（`c.brandSoft` 底）+ 依據（`c.muted`）
- 底部一條 `V.blue900` 結論帶：`BadgeCheck`（`V.orange300`）+ 一句白字結論
- 外層 `flex column; justify-content: space-between`，結論帶貼底

## 7. 直向時間軸 + 行動區塊（收尾頁）

- 左：每項 = 46px 編號圓（第一項橘、其餘深藍）+ 3px 連接線（最後一項不畫）+ 標題（`DS.h4`）+ 一句
- 右：寬 480 的 `var(--gradient-header)` 面板，icon（`GraduationCap`，orange-300）+ `NEXT STEP` kicker + 下一步標題（`DS.h3` 900）+ 說明 + 細分隔線 + 後續延伸說明
- 整份 deck 只有這裡和封面用漸層

## 插圖手繪 SVG 要點

- viewBox 取好算的尺寸（240×90、180×130），元素座標用整數
- 顏色只用 `V.*` 色階 + `style={{ fill }}`；灰色輔助線用 `V.n300` / `var(--neutral-400)`，虛線 `strokeDasharray: "4 5"`
- 圓弧箭頭：圓用 `strokeDasharray` 留缺口、`transform="rotate(-90 cx cy)"` 讓起點在 12 點鐘，箭頭三角形放在缺口端，切線方向為 `(cos θ, sin θ)`（θ 為從 12 點鐘順時針的角度）
- 中性人物剪影：`<circle r=6>` 頭 + `<path d="M x-10 y+15 Q x y+6 x+10 y+15 Z">` 身體
- 表示「瓶頸 / 重點」時，只把一個元素換成橘色，其餘保持藍色
