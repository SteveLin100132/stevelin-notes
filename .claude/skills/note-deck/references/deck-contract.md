# Deck 技術契約

產物被 viewer app 以 `import.meta.glob("@notes/components/*.deck.tsx")` 收錄，
型別與元件來自 viewer app（`~/.notecraft/app-<version>/src/`）。這些規則違反的話，輕則被裁切、重則整站編譯失敗。
細節有疑問時，以 `.claude/skills/content-present/SKILL.md` 與 viewer app 原始碼為準。

## 檔案與匯出

- 路徑：`.notecraft/components/<筆記檔名>.deck.tsx`（專案根，攤平命名）
- `export default` 一個 `Deck`：

```ts
import type { CustomSlideProps, Deck } from "@/lib/decks";

const deck: Deck = {
  slug: "knowledge/project/pm-00-learning-map", // 相對 docs/ 去副檔名，決定 /present/<slug>
  title: "…",
  eyebrow: "…",            // 英文大寫 kicker
  generatedAt: "YYYY-MM-DD",
  source: "knowledge/project/pm-00-learning-map.mdx",
  slides: [ /* … */ ],
};
export default deck;
```

- 每頁都要 `nav`（縮覽與大綱的短標題）。

## 版型

| layout | 用途 | 欄位 |
| --- | --- | --- |
| `cover` | 封面（純資料、不能加圖） | `eyebrow` `title` `subtitle` `meta[]` `agenda[{n,title,sub}]` |
| `section` | 章節分隔（純資料） | `num` `eyebrow` `title` `subtitle` `tone`("dark" 預設) `align` `numScale` |
| `custom` | 內容頁主力 | chrome 欄位 + `render: ComponentType<CustomSlideProps>` + `chrome?`(預設 true) |
| `full-visual` | 嵌入筆記既有互動元件 | chrome 欄位 + `title` `viz` `viz2` `vizLabel` |
| `quote` / `closing` | 引言 / 回顧（本 skill 較少用） | 見 content-present |

chrome 欄位：`num` `eyebrow` `title` `titleNote` `pill{text,tone}` `legend[]` `callout{icon,text|items,tone,chip}` `footnotes[]`。
`custom` 頁**不准自己畫**這些（編號徽章、標題、橘色底線、頁碼、callout）。

## 內容區尺寸（1600×900 座標系）

`area.w = 1392`。`area.h = 900 − 58 − 表頭 − 20 − 表尾 − 46`：

| 組合 | area.h |
| --- | --- |
| num/eyebrow + title（標準內容頁） | **620** |
| 再加單句 callout | **538** |
| 再加多段 callout（items） | 508 |
| 每 3 條 footnote 一列 | −26 |
| 加 legend | −44 |

溢出不報錯、只會被靜靜裁掉。設計時就用這個預算逐區塊加總高度（`字級 × 行高 × 行數 + padding + gap`）。

## 樣式規則

- **字級**只用 `DS`（`@/components/deck/scale`）：`mega 216` `hero 116` `h1 62` `h2 40` `h3 30` `h4 24` `body 20` `small 17` `micro 14` `eyebrow 13`。不寫字面數字字級。
- **間距**用 `DGAP`：`xs 8` `sm 16` `md 24` `lg 40` `xl 64`（小於 8 的微調可直接寫數字）。字距用 `DTRACK.tight` / `DTRACK.label`。
- **顏色**不寫死色碼：
  - 語意色：`const c = dkt(dark)`（`@/components/deck/theme`）→ `c.ink` `c.body` `c.muted` `c.brand` `c.brandInk` `c.brandSoft` `c.accent` `c.accentSoft` `c.good` … `c.slide` `c.sunken` `c.border` `c.shadow`。**會隨亮暗主題切換**，卡片底、文字一律用這些。
  - 色階：trendlink token 的 CSS 變數，如 `var(--blue-100)` … `var(--blue-900)`、`var(--orange-50)` … `var(--orange-500)`、`var(--neutral-0)` … `var(--neutral-900)`、`var(--gradient-header)`、`var(--font-mono)`、`var(--radius-lg)`。**不隨主題切換**，只用在自帶底色的色塊與其上的文字（例：藍底節點 + 白字）。
  - 半透明白（`rgba(255,255,255,0.72)`）只用在深色漸層區塊上的次要文字。
- 生成元件沒有 Tailwind，一律 inline `style`。
- 元件內的按鈕列、選項群不用 `<ol>` / `<ul>`（prose 樣式會加編號），用 `<div role="group">`。

## SVG 插圖

- **填色與描邊寫在 `style`**：`style={{ fill: "var(--blue-700)" }}`。`fill="var(--x)"` 這種 presentation attribute 不支援 `var()`，會畫成黑色。
- 給 `viewBox` 與 `width`，加 `role="img"` 與描述畫面的 `aria-label`；純裝飾的箭頭用 `aria-hidden="true"`。
- 圖內原則上不放 `<text>`，標籤用 HTML；例外是版本號這類 ≤ 6 字元的短標籤（插圖工具組的 `Chip`）。
- 需要旋轉的圓弧用 `transform` **屬性**（例：`transform="rotate(-90 80 70)"`），不要用 motion 做 SVG 位移。

## icon

- chrome 欄位與 callout 的 `icon` 只能用 21 個 `IconName`：`alert check x info lightbulb target clock user users database lock gauge layers file folder link cloud plug git-branch settings trend-up`。
- `custom` 頁內直接 `import { … } from "lucide-react"`，不受上表限制。尺寸 22–32，顏色取 `c.*` 或 CSS 變數。

## import 白名單

`@/lib/decks`（型別）、`@/components/deck/*`、`@notes/components/<id>`（筆記既有元件），以及 `react` `react-dom` `motion` `recharts` `d3` `lucide-react` `clsx` `tailwind-merge`。其他套件先問作者。
**不要**從其他生成元件 import 零件；共用零件寫在 deck 檔內。

## 動畫與縮覽

- `CustomSlideProps`：`{ dark, live, play, area, outerScale }`。
- 縮覽側欄會同時掛所有頁（`live === false`）：動畫、計時器只在 `live === true` 時啟動；尊重 `useReducedMotion()`，200–400ms ease-out。
- 本 skill 的內容頁預設靜態；真的需要漸進揭露再加。

## 嵌入既有互動元件

- 原樣嵌入 → `full-visual`（`viz: Component`）。
- 要搭配簡報排版 → `custom` 頁內用 `<CanvasViewport>`（`@/components/deck/CanvasViewport`），`mode` 依 `live`/`play` 給 `"thumb" | "view" | "play"`，並把 `outerScale` 往下傳；縮覽時不掛真元件。詳見 content-present SKILL.md〈嵌入既有元件〉。

## 版面技巧

- 用 flex / grid + `gap`，避免逐元素 margin。
- 要在 flex 列中穿插「欄 + 箭頭 + 欄」又想讓 map 產生的片段不多一層 div：外層用 `<div style={{ display: "contents" }}>`。
- 需要跨欄對齊的元素（例：箭頭對準節點中線），把上方元素設**固定高度**，再用常數算出 `paddingTop`。
- `minWidth: 0` 加在 `flex: 1` 的欄上，避免長字撐破欄寬。

## 常見錯誤（實測踩過）

- **lucide 與插圖工具組同名**：工具組有 `Calendar`、`Check`、`Package`、`Lock`、`Monitor`、`Laptop`、`Stamp` 等元件，
  從 `lucide-react` 匯入同名 icon 會編譯失敗（Duplicate declaration）。改用別名：`import { Package as PackageIcon, Lock as LockIcon } from "lucide-react"`。
- **複製工具組要整段**：少複製一個元件（例如 `Chip`）會在執行期丟 `ReferenceError`，**整份簡報變成空白頁**。
  寫完先用 `/@fs/` 載入模組，再開 `/present/<slug>` 看 console 有沒有 `not defined`。
- **不要用負 margin 讓底色外擴**：`margin: "0 -8px"` 會讓內容寬度超出 1392，觸發溢出（寬度方向）。改用列內 `padding`。
- **footnotes 的 `n` 要唯一**：系統拿它當 React key，重複會報 duplicate key。
- **SVG 尺寸不可為負**：小尺寸的 `Board`、`Doc` 等物件內部計算可能變負值（console 會出現 `attribute height: A negative value`），畫小圖時給夠大的尺寸，工具組已對 `Board` 加下限。
- **決策卡、定義卡用 `flex: 1` 撐高時**，內容加總要算進欄高，否則卡片底部被裁（外層不會報溢出，要用 JS 檢查 `scrollHeight > clientHeight`）。
