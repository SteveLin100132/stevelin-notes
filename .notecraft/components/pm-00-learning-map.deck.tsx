// 專案管理系列：學習地圖 —— 簡報（content-present）
//
// 版面沿用作者確認過的 Artifact 簡報設計：封面 / 章節頁用系統固定版型，
// 內容頁為 custom 自寫版面（階梯、路線圖、判斷流程都是「形狀即論點」，
// 拆進通用原子會弄丟形狀）。顏色一律取自 dkt() 與 trendlink token 的 CSS 變數，不硬編色碼。

import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  GraduationCap,
  Home,
  MessagesSquare,
  Search,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import { DGAP, DS, DTRACK } from "@/components/deck/scale";

// ── token（CSS 變數，亮暗主題共用的色階）────────────────────────

const V = {
  blue100: "var(--blue-100)",
  blue200: "var(--blue-200)",
  blue300: "var(--blue-300)",
  blue400: "var(--blue-400)",
  blue500: "var(--blue-500)",
  blue700: "var(--blue-700)",
  blue900: "var(--blue-900)",
  orange200: "var(--orange-200)",
  orange300: "var(--orange-300)",
  orange400: "var(--orange-400)",
  orange500: "var(--orange-500)",
  orange50: "var(--orange-50)",
  n0: "var(--neutral-0)",
  n200: "var(--neutral-200)",
  n300: "var(--neutral-300)",
  n400: "var(--neutral-400)",
  n900: "var(--neutral-900)",
  gradHeader: "var(--gradient-header)",
};

const MONO = "var(--font-mono)";

/** SVG 填色 / 描邊走 style（presentation attribute 不吃 var()） */
const fill = (color: string): CSSProperties => ({ fill: color });
const stroke = (color: string, width: number, extra: CSSProperties = {}): CSSProperties => ({
  fill: "none",
  stroke: color,
  strokeWidth: width,
  ...extra,
});

// ── 共用小零件 ───────────────────────────────────────────────

function Medallion({ Icon, size, bg, fg }: { Icon: LucideIcon; size: number; bg: string; fg: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: 999,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={Math.round(size * 0.52)} color={fg} strokeWidth={2} />
    </div>
  );
}

function ArrowGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 30 16" width={30} height={16} aria-hidden="true">
      <path d="M0 5 H18 V0 L30 8 L18 16 V11 H0 Z" style={fill(color)} />
    </svg>
  );
}

// ── 五章資料 ─────────────────────────────────────────────────

interface Chapter {
  no: string;
  question: string;
  short: string;
  Icon: LucideIcon;
  why: string;
  insight: string;
  point: string;
  outcome: string;
}

const CHAPTERS: Chapter[] = [
  {
    no: "01",
    question: "在管什麼？",
    short: "專案 vs 產品",
    Icon: Search,
    why: "決定之後該用哪一套管理模式，是一切的地基。",
    insight: "判斷手上是專案還是產品，是後面所有選擇的地基。",
    point: "專案重成果、傾向凍結需求；產品重價值、持續迭代。",
    outcome: "判斷一件新工作是一次性交付，還是持續經營。",
  },
  {
    no: "02",
    question: "怎麼做？",
    short: "方法論",
    Icon: BookOpen,
    why: "知道管什麼，才依內容選 Waterfall 或 Agile。",
    insight: "方法論不是信仰，而是依「在管什麼」挑出的工具箱。",
    point: "Waterfall 適合需求穩定；Agile 適合需求會變、需快速回饋。",
    outcome: "替項目選出合適的方法論，並說得出理由。",
  },
  {
    no: "03",
    question: "誰來做？",
    short: "R&R 權責",
    Icon: Users,
    why: "同一群人換了方法論，權責流向完全不同。",
    insight: "同一群人在不同方法論底下，權責流向完全不同。",
    point: "用 RACI 界定誰拍板、誰執行、誰被諮詢、誰被通知。",
    outcome: "替團隊畫出一張說得清楚的權責表。",
  },
  {
    no: "04",
    question: "經典怎麼跑？",
    short: "Waterfall SDLC",
    Icon: Activity,
    why: "看階段、會議、交付物如何環環相扣。",
    insight: "前一階段的產出，就是下一階段的輸入。",
    point: "九個階段單向推進，會議守閘門；越晚變更，成本越高。",
    outcome: "說出每個階段該產出什麼、由誰驗收。",
  },
  {
    no: "05",
    question: "用什麼做？",
    short: "工具落地",
    Icon: Wrench,
    why: "把前面的觀念落地執行的載體。",
    insight: "工具是觀念落地的載體，不是觀念本身。",
    point: "WBS 拆範圍、Gantt 排時程、Kanban 看流動找瓶頸。",
    outcome: "規劃範圍與時程，追蹤執行並找出瓶頸。",
  },
];

// ── P2 開始之前：四個問題的地基塔 ──────────────────────────────

function IntroPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const sources: { Icon: LucideIcon; k: string; v: string }[] = [
    { Icon: Home, k: "實務經驗", v: "內容多半來自老東家的專案實務。" },
    { Icon: MessagesSquare, k: "顧問校準", v: "與顧問 Danny 核對概念，並收進他的建議。" },
    { Icon: BarChart3, k: "互動圖解", v: "每章搭配可互動的視覺化元件幫助理解。" },
  ];
  const tower: { w: number; h: number; bg: string; fg: string; Icon: LucideIcon; k: string; v: string; strong?: boolean }[] = [
    { w: 330, h: 68, bg: V.blue200, fg: V.blue900, Icon: Wrench, k: "用什麼做", v: "工具" },
    { w: 400, h: 68, bg: V.blue300, fg: V.blue900, Icon: Users, k: "誰來做", v: "R&R" },
    { w: 470, h: 68, bg: V.blue500, fg: V.n0, Icon: BookOpen, k: "怎麼做", v: "方法論" },
    { w: 540, h: 78, bg: V.orange400, fg: V.n900, Icon: Search, k: "在管什麼", v: "專案 vs 產品・地基", strong: true },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: DGAP.xl }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: DGAP.lg }}>
        <p style={{ margin: 0, fontSize: DS.h4, lineHeight: 1.7, color: c.body }}>
          這系列把以前學到的專案管理整理下來。我不是 PM 背景出身，所以每一章都由淺入深、循序漸進。
        </p>
        {sources.map((s) => (
          <div key={s.k} style={{ display: "flex", alignItems: "flex-start", gap: DGAP.sm }}>
            <Medallion Icon={s.Icon} size={52} bg={c.brandSoft} fg={c.brand} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: DS.h4, fontWeight: 700, color: c.ink }}>{s.k}</div>
              <div style={{ fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{s.v}</div>
            </div>
          </div>
        ))}
      </div>
      <div
        role="img"
        aria-label="四個問題疊成一座塔：最底層是「在管什麼」，往上依序是怎麼做、誰來做、用什麼做"
        style={{
          width: 630,
          flex: "none",
          boxSizing: "border-box",
          padding: DGAP.lg,
          borderRadius: "var(--radius-lg)",
          background: c.brandSoft,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <div style={{ fontSize: DS.body, fontWeight: 700, letterSpacing: ".12em", color: c.brandInk, marginBottom: 4 }}>
          專案管理的四個問題
        </div>
        {tower.map((t) => (
          <div
            key={t.k}
            style={{
              width: t.w,
              height: t.h,
              borderRadius: 12,
              background: t.bg,
              color: t.fg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <t.Icon size={t.strong ? 28 : 26} color={t.fg} />
            <span style={{ fontSize: t.strong ? DS.h3 : DS.h4, fontWeight: t.strong ? 900 : 700 }}>{t.k}</span>
            <span style={{ fontSize: DS.body }}>{t.v}</span>
          </div>
        ))}
        <div style={{ fontSize: DS.body, lineHeight: 1.5, color: c.body, marginTop: 4 }}>
          上層的每個選擇，都站在「在管什麼」之上
        </div>
      </div>
    </div>
  );
}

// ── P4 階梯：每一章都站在前一章之上 ────────────────────────────

const STEP_BG = [V.blue100, V.blue200, V.blue300, V.blue500, V.blue700];
const STEP_FG = [V.blue900, V.blue900, V.blue900, V.n0, V.n0];

function StairsPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  return (
    <div
      role="img"
      aria-label="五章排成往右升高的階梯：專案 vs 產品、方法論、R&R 權責、Waterfall SDLC、工具，每一階都踩在前一階上"
      style={{ height: "100%", display: "flex", alignItems: "flex-end", gap: DGAP.md }}
    >
      {CHAPTERS.map((ch, i) => (
        <div key={ch.no} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 20,
              borderRadius: "var(--radius-lg)",
              background: c.slide,
              borderTop: `4px solid ${i === 0 ? V.orange400 : c.brand}`,
              boxShadow: c.shadow,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Medallion
                Icon={ch.Icon}
                size={44}
                bg={i === 0 ? c.accentSoft : c.brandSoft}
                fg={i === 0 ? c.accent : c.brand}
              />
              <span style={{ fontSize: DS.body, fontWeight: 700, color: c.accent }}>{ch.question}</span>
            </div>
            <div style={{ fontSize: DS.h4, fontWeight: 700, lineHeight: 1.3, color: c.ink }}>{ch.short}</div>
            <div style={{ fontSize: DS.small, lineHeight: 1.6, color: c.body }}>{ch.why}</div>
          </div>
          <div
            style={{
              height: 60 * (i + 1),
              borderRadius: "12px 12px 0 0",
              background: STEP_BG[i],
              display: "flex",
              justifyContent: "center",
              paddingTop: 12,
              boxSizing: "border-box",
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: DS.body, fontWeight: 700, color: STEP_FG[i] }}>CH {ch.no}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── P5 四個關鍵名詞 ──────────────────────────────────────────

function WaterfallMini() {
  return (
    <svg viewBox="0 0 180 130" width={150} role="img" aria-label="四個階段色塊由左上往右下逐級遞降">
      <rect x={0} y={4} width={84} height={22} rx={6} style={fill(V.blue700)} />
      <rect x={32} y={38} width={84} height={22} rx={6} style={fill(V.blue500)} />
      <rect x={64} y={72} width={84} height={22} rx={6} style={fill(V.blue400)} />
      <rect x={96} y={106} width={84} height={22} rx={6} style={fill(V.blue300)} />
      <polyline points="88,15 104,15 104,34" style={stroke(V.n400, 2)} />
      <polyline points="120,49 136,49 136,68" style={stroke(V.n400, 2)} />
      <polyline points="152,83 168,83 168,102" style={stroke(V.n400, 2)} />
    </svg>
  );
}

function AgileMini() {
  return (
    <svg viewBox="0 0 160 140" width={140} role="img" aria-label="一個帶箭頭的循環圈，代表短週期反覆迭代">
      <circle cx={80} cy={70} r={22} style={fill(V.orange50)} />
      <circle
        cx={80}
        cy={70}
        r={50}
        transform="rotate(-90 80 70)"
        style={stroke(V.orange400, 8, { strokeLinecap: "round", strokeDasharray: "262 52" })}
      />
      <polygon points="52,24 50,46 32,34" style={fill(V.orange400)} />
      <circle cx={80} cy={70} r={6} style={fill(V.orange500)} />
    </svg>
  );
}

function RaciMini() {
  const chips: { k: string; bg: string; fg: string }[] = [
    { k: "拍板", bg: V.blue700, fg: V.n0 },
    { k: "執行", bg: V.orange400, fg: V.n900 },
    { k: "諮詢", bg: V.blue100, fg: V.blue900 },
    { k: "通知", bg: V.n200, fg: V.n900 },
  ];
  return (
    <div role="group" aria-label="權責四種角色" style={{ width: 150, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {chips.map((x) => (
        <div
          key={x.k}
          style={{
            padding: "8px 0",
            borderRadius: 8,
            background: x.bg,
            color: x.fg,
            fontSize: DS.body,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {x.k}
        </div>
      ))}
    </div>
  );
}

function SdlcMini() {
  const xs = [10, 52, 95, 137, 180];
  return (
    <svg viewBox="0 0 190 100" width={160} role="img" aria-label="一條時間軸上有五個階段節點，每個節點下方掛著一份交付文件">
      <line x1={10} y1={24} x2={180} y2={24} style={stroke(V.n300, 4)} />
      {xs.map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={24} r={9} style={fill(i === 4 ? V.orange400 : V.blue700)} />
          <rect
            x={x - 9}
            y={50}
            width={18}
            height={24}
            rx={3}
            style={{ fill: i === 4 ? V.orange50 : V.blue100, stroke: i === 4 ? V.orange200 : V.blue200, strokeWidth: 2 }}
          />
        </g>
      ))}
    </svg>
  );
}

function TermsPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const terms: { k: string; en: string; v: string; art: ReactNode }[] = [
    {
      k: "瀑布式",
      en: "Waterfall",
      v: "以階段推進的線性開發：需求、設計、開發、測試、上線依序進行，前一階段完成才進入下一階段。",
      art: <WaterfallMini />,
    },
    { k: "敏捷式", en: "Agile", v: "以短週期迭代為核心：小步交付、持續回饋、擁抱需求變動。", art: <AgileMini /> },
    {
      k: "R&R 角色與職責",
      en: "Role & Responsibility",
      v: "界定每件事誰拍板、誰執行、誰被諮詢、誰只是被通知，也是日後釐清爭議的依據。",
      art: <RaciMini />,
    },
    {
      k: "SDLC 軟體開發生命週期",
      en: "Software Development Life Cycle",
      v: "把專案從構思到退役，拆解成數個明確階段。",
      art: <SdlcMini />,
    },
  ];
  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: DGAP.md,
      }}
    >
      {terms.map((t) => (
        <div
          key={t.k}
          style={{
            display: "flex",
            alignItems: "center",
            gap: DGAP.md,
            padding: 28,
            borderRadius: "var(--radius-lg)",
            background: c.slide,
            border: `1px solid ${c.border}`,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 190,
              height: 150,
              flex: "none",
              borderRadius: 12,
              background: c.slide,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {t.art}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: DS.h3, fontWeight: 700, lineHeight: 1.3, color: c.ink }}>{t.k}</div>
            <div style={{ fontSize: DS.body, fontWeight: 700, color: c.accent }}>{t.en}</div>
            <div style={{ fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{t.v}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── P7 路線圖：五章一條線 + 每章示意圖 ─────────────────────────

function ProjectVsProductArt() {
  return (
    <svg viewBox="0 0 240 90" width={228} role="img" aria-label="左邊一條線走到終點旗代表一次性交付的專案，右邊一個循環箭頭代表持續經營的產品">
      <circle cx={14} cy={45} r={6} style={fill(V.blue700)} />
      <line x1={14} y1={45} x2={96} y2={45} style={stroke(V.blue700, 4, { strokeLinecap: "round" })} />
      <line x1={98} y1={18} x2={98} y2={70} style={stroke(V.blue700, 4, { strokeLinecap: "round" })} />
      <polygon points="98,18 124,27 98,36" style={fill(V.orange400)} />
      <line x1={138} y1={12} x2={138} y2={78} style={stroke(V.n300, 2, { strokeDasharray: "4 5" })} />
      <circle
        cx={190}
        cy={45}
        r={28}
        transform="rotate(-90 190 45)"
        style={stroke(V.blue700, 5, { strokeLinecap: "round", strokeDasharray: "146 30" })}
      />
      <polygon points="170,23 171,37 158,30" style={fill(V.blue700)} />
      <circle cx={190} cy={45} r={7} style={fill(V.orange400)} />
    </svg>
  );
}

function MethodologyArt() {
  return (
    <svg viewBox="0 0 240 90" width={228} role="img" aria-label="左邊三段逐級遞降的瀑布式階段，右邊一串相連的迭代圈代表敏捷式">
      <rect x={8} y={14} width={56} height={16} rx={5} style={fill(V.blue700)} />
      <rect x={30} y={38} width={56} height={16} rx={5} style={fill(V.blue500)} />
      <rect x={52} y={62} width={56} height={16} rx={5} style={fill(V.blue300)} />
      <line x1={124} y1={12} x2={124} y2={78} style={stroke(V.n300, 2, { strokeDasharray: "4 5" })} />
      <line x1={150} y1={45} x2={222} y2={45} style={stroke(V.orange200, 3)} />
      {[150, 186, 222].map((x) => (
        <circle key={x} cx={x} cy={45} r={14} style={{ fill: "var(--neutral-50)", stroke: V.orange400, strokeWidth: 4 }} />
      ))}
      <circle cx={222} cy={45} r={5} style={fill(V.orange500)} />
    </svg>
  );
}

function RaciArt() {
  const grid = [
    [V.blue700, V.orange400, V.blue100, V.n200],
    [V.blue100, V.blue700, V.orange400, V.blue100],
    [V.n200, V.blue100, V.blue700, V.orange400],
  ];
  return (
    <svg viewBox="0 0 240 90" width={228} role="img" aria-label="左側三個角色剪影，右側一張權責矩陣，每格以不同色塊標示拍板、執行、諮詢或通知">
      {[15, 41, 67].map((y) => (
        <g key={y}>
          <circle cx={24} cy={y} r={6} style={fill(V.blue300)} />
          <path d={`M14 ${y + 15} Q24 ${y + 6} 34 ${y + 15} Z`} style={fill(V.blue300)} />
        </g>
      ))}
      {grid.map((row, r) =>
        row.map((col, k) => (
          <rect key={`${r}-${k}`} x={56 + k * 44} y={10 + r * 26} width={38} height={18} rx={4} style={fill(col)} />
        )),
      )}
    </svg>
  );
}

function SdlcArt() {
  const bars = [V.blue700, V.blue500, V.blue400, V.blue300, V.blue200];
  return (
    <svg viewBox="0 0 240 90" width={228} role="img" aria-label="五段由左上往右下遞降的階段色塊，階段之間的橘色菱形代表把關的會議">
      {bars.map((b, i) => (
        <rect key={b} x={4 + i * 46} y={6 + i * 16} width={44} height={14} rx={4} style={fill(b)} />
      ))}
      <polygon points="49,8 55,14 49,20 43,14" style={fill(V.orange400)} />
      <polygon points="141,40 147,46 141,52 135,46" style={fill(V.orange400)} />
      <polygon points="233,72 239,78 233,84 227,78" style={fill(V.orange400)} />
    </svg>
  );
}

function KanbanArt() {
  const cols: string[][] = [
    [V.blue300, V.blue300],
    [V.blue500, V.blue500, V.blue500, V.orange400],
    [V.blue700],
  ];
  return (
    <svg viewBox="0 0 240 90" width={228} role="img" aria-label="三欄看板，中間那欄卡片堆積最多，最下方一張標成橘色，代表流程瓶頸">
      {cols.map((cards, k) => (
        <g key={k}>
          <rect
            x={12 + k * 76}
            y={4}
            width={64}
            height={82}
            rx={6}
            style={{ fill: "var(--neutral-0)", stroke: V.n300, strokeWidth: 2 }}
          />
          {cards.map((col, j) => (
            <rect key={j} x={20 + k * 76} y={12 + j * 18} width={48} height={13} rx={3} style={fill(col)} />
          ))}
        </g>
      ))}
    </svg>
  );
}

const CHAPTER_ART = [ProjectVsProductArt, MethodologyArt, RaciArt, SdlcArt, KanbanArt];

const PILL_H = 48;
const NODE_H = 116;
const COL_GAP = 12;

function RoadmapColumn({ ch, i, c }: { ch: Chapter; i: number; c: DeckThemeTokens }) {
  const Art = CHAPTER_ART[i];
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: COL_GAP }}>
      <div
        style={{
          height: PILL_H,
          borderRadius: 999,
          background: c.accentSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: DS.body,
          fontWeight: 700,
          color: c.accent,
        }}
      >
        {ch.question}
      </div>
      <div
        style={{
          height: NODE_H,
          boxSizing: "border-box",
          padding: "18px 20px",
          borderRadius: "var(--radius-lg)",
          background: V.blue700,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: MONO, fontSize: DS.small, fontWeight: 700, color: V.orange300 }}>CH {ch.no}</span>
          <ch.Icon size={26} color={V.n0} />
        </div>
        <div style={{ fontSize: DS.h4, fontWeight: 700, lineHeight: 1.3, whiteSpace: "nowrap", color: V.n0 }}>{ch.short}</div>
      </div>
      <div
        style={{
          height: 140,
          borderRadius: 12,
          background: c.slide,
          border: `1px solid ${c.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Art />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <CheckCircle2 size={22} color={c.good} />
        <span style={{ fontSize: DS.small, fontWeight: 700, color: c.good }}>已完成</span>
      </div>
      <div style={{ fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{ch.insight}</div>
    </div>
  );
}

function RoadmapPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const arrowTop = PILL_H + COL_GAP + NODE_H / 2 - 8;
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "flex-start", gap: 8 }}>
      {CHAPTERS.map((ch, i) => (
        <div key={ch.no} style={{ display: "contents" }}>
          {i > 0 && (
            <div style={{ width: 30, flex: "none", paddingTop: arrowTop }}>
              <ArrowGlyph color={V.blue200} />
            </div>
          )}
          <RoadmapColumn ch={ch} i={i} c={c} />
        </div>
      ))}
    </div>
  );
}

// ── P8 每章讀完多一項判斷能力 ──────────────────────────────────

function OutcomesPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const label: CSSProperties = { fontSize: DS.small, fontWeight: 700, letterSpacing: ".08em", color: c.muted };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: DGAP.md, padding: "0 20px" }}>
        <div style={{ ...label, width: 300, flex: "none" }}>章節</div>
        <div style={{ ...label, flex: 1 }}>學習重點</div>
        <div style={{ ...label, flex: 1 }}>讀完你會</div>
      </div>
      {CHAPTERS.map((ch) => (
        <div
          key={ch.no}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: DGAP.md,
            padding: "0 20px",
            borderRadius: 12,
            background: c.sunken,
          }}
        >
          <div style={{ width: 300, flex: "none", display: "flex", alignItems: "center", gap: DGAP.sm }}>
            <Medallion Icon={ch.Icon} size={44} bg={V.blue700} fg={V.n0} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: MONO, fontSize: DS.small, fontWeight: 700, color: c.accent }}>CH {ch.no}</span>
              <span style={{ fontSize: DS.h4, fontWeight: 700, lineHeight: 1.3, color: c.ink }}>{ch.short}</span>
            </div>
          </div>
          <div style={{ flex: 1, fontSize: DS.body, lineHeight: 1.5, color: c.body }}>{ch.point}</div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Check size={24} color={c.brand} style={{ flex: "none", marginTop: 2 }} />
            <span style={{ fontSize: DS.body, lineHeight: 1.5, color: c.brandInk }}>{ch.outcome}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── P10 面對新任務的四個判斷 ──────────────────────────────────

function TaskDocArt({ c }: { c: DeckThemeTokens }) {
  return (
    <svg viewBox="0 0 120 150" width={96} role="img" aria-label="一份剛交到手上的任務文件">
      <path d="M8 4 H84 L112 32 V146 H8 Z" style={{ fill: c.slide, stroke: V.blue700, strokeWidth: 3, strokeLinejoin: "round" }} />
      <path d="M84 4 V32 H112" style={{ fill: c.brandSoft, stroke: V.blue700, strokeWidth: 3, strokeLinejoin: "round" }} />
      <rect x={24} y={30} width={40} height={8} rx={4} style={fill(V.orange400)} />
      {[
        [58, 72],
        [76, 80],
        [94, 60],
        [112, 70],
      ].map(([y, w]) => (
        <rect key={y} x={24} y={y} width={w} height={6} rx={3} style={fill(V.blue200)} />
      ))}
    </svg>
  );
}

function JudgmentsPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const steps: { Icon: LucideIcon; q: string; opts: string[]; basis: string }[] = [
    { Icon: Search, q: "它是專案，還是產品？", opts: ["一次性交付", "持續經營"], basis: "依據：第 1 章" },
    { Icon: BookOpen, q: "適合哪種方法論？", opts: ["Waterfall", "Agile"], basis: "依據：第 2、4 章" },
    { Icon: Users, q: "團隊權責怎麼分？", opts: ["拍板・執行", "諮詢・通知"], basis: "依據：第 3 章" },
    { Icon: Wrench, q: "該用什麼工具承接？", opts: ["WBS・Gantt", "Kanban・Task"], basis: "依據：第 5 章" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: DGAP.md }}>
      <div style={{ flex: 1, display: "flex", alignItems: "stretch", gap: 12 }}>
        <div style={{ width: 150, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <TaskDocArt c={c} />
          <div style={{ fontSize: DS.h4, fontWeight: 700, color: c.ink }}>新任務</div>
          <div style={{ fontSize: DS.small, color: c.muted, textAlign: "center" }}>剛交到手上的工作</div>
        </div>
        {steps.map((s, i) => (
          <div key={s.q} style={{ display: "contents" }}>
            <div style={{ flex: "none", alignSelf: "center" }}>
              <ArrowGlyph color={V.blue200} />
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: DGAP.md,
                padding: 24,
                borderRadius: "var(--radius-lg)",
                borderTop: `4px solid ${V.orange400}`,
                background: c.slide,
                boxShadow: c.shadow,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Medallion Icon={s.Icon} size={46} bg={c.brandSoft} fg={c.brand} />
                <span style={{ fontFamily: MONO, fontSize: DS.small, fontWeight: 700, color: c.accent }}>判斷 {i + 1}</span>
              </div>
              <div style={{ fontSize: DS.h3, fontWeight: 700, lineHeight: 1.35, color: c.ink }}>{s.q}</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
                {s.opts.map((o) => (
                  <span
                    key={o}
                    style={{
                      fontSize: DS.body,
                      color: c.brandInk,
                      background: c.brandSoft,
                      padding: "6px 16px",
                      borderRadius: 999,
                    }}
                  >
                    {o}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: "auto", fontSize: DS.small, color: c.muted }}>{s.basis}</div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: DGAP.sm,
          padding: "20px 28px",
          borderRadius: "var(--radius-lg)",
          background: V.blue900,
        }}
      >
        <BadgeCheck size={32} color={V.orange300} style={{ flex: "none" }} />
        <span style={{ fontSize: DS.h4, fontWeight: 700, lineHeight: 1.5, color: V.n0 }}>
          四個判斷做完，這件任務就有了管理模式、權責表與追蹤工具。
        </span>
      </div>
    </div>
  );
}

// ── P11 閱讀順序 + 下一步 ─────────────────────────────────────

function ReadingPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const list: { k: string; v: string }[] = [
    { k: "第一章：專案 V.S 產品", v: "先分清手上的項目是一次性交付，還是持續經營。" },
    { k: "第二章：專案管理方法與精神", v: "Waterfall 與 Agile 的差別與適用情境。" },
    { k: "第三章：Role & Responsibility", v: "誰拍板、誰執行、誰被諮詢、誰被通知。" },
    { k: "第四章：Waterfall SDLC", v: "階段、會議、交付物如何環環相扣。" },
    { k: "第五章：專案管理工具", v: "把觀念落地的載體。" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: DGAP.xl }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {list.map((it, i) => (
          <div key={it.k} style={{ display: "flex", alignItems: "flex-start", gap: DGAP.md }}>
            <div style={{ width: 46, flex: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  background: i === 0 ? V.orange400 : V.blue700,
                  color: i === 0 ? V.n900 : V.n0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontSize: DS.body,
                  fontWeight: 800,
                }}
              >
                {i + 1}
              </div>
              {i < list.length - 1 && <div style={{ width: 3, height: 42, background: V.blue200 }} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 4 }}>
              <div style={{ fontSize: DS.h4, fontWeight: 700, lineHeight: 1.3, color: c.ink }}>{it.k}</div>
              <div style={{ fontSize: DS.body, lineHeight: 1.5, color: c.body }}>{it.v}</div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          width: 480,
          flex: "none",
          boxSizing: "border-box",
          padding: DGAP.lg,
          borderRadius: 20,
          background: V.gradHeader,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: DGAP.sm,
        }}
      >
        <GraduationCap size={52} color={V.orange300} />
        <div style={{ fontSize: DS.small, fontWeight: 700, letterSpacing: DTRACK.label, color: V.orange300 }}>NEXT STEP</div>
        <div style={{ fontSize: DS.h3, fontWeight: 900, lineHeight: 1.3, color: V.n0 }}>下一篇：專案 V.S 產品</div>
        <div style={{ fontSize: DS.body, lineHeight: 1.6, color: "rgba(255,255,255,0.86)" }}>
          先判斷手上的工作是一次性交付還是持續經營，後面每一章的選擇都從這裡出發。
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.24)" }} />
        <div style={{ fontSize: DS.small, lineHeight: 1.6, color: "rgba(255,255,255,0.72)" }}>
          之後若有延伸主題（例如需求分析、規格撰寫），會接在這條路徑後面。
        </div>
      </div>
    </div>
  );
}

// ── deck ────────────────────────────────────────────────────

const deck: Deck = {
  slug: "knowledge/project/pm-00-learning-map",
  title: "專案管理系列：學習地圖",
  eyebrow: "PROJECT MANAGEMENT",
  generatedAt: "2026-09-26",
  source: "knowledge/project/pm-00-learning-map.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "PROJECT MANAGEMENT · 第零章",
      title: "專案管理系列：學習地圖",
      subtitle: "先搞懂在管什麼，再決定怎麼做、誰來做、如何落地。",
      meta: ["2026-09-26", "專案管理基礎系列", "共 5 章"],
      agenda: [
        { n: "01", title: "為什麼是這個順序？", sub: "每一章都建立在前一章的結論之上" },
        { n: "02", title: "學習路徑一覽", sub: "五章一條線，每章回答一個問題" },
        { n: "03", title: "讀完這系列之後", sub: "面對新任務的四個判斷" },
      ],
    },
    {
      layout: "custom",
      nav: "開始之前",
      eyebrow: "BEFORE WE START",
      title: "先釐清在管什麼，才談得上怎麼做",
      render: IntroPage,
    },
    {
      layout: "section",
      nav: "為什麼是這個順序？",
      num: "01",
      eyebrow: "WHY THIS ORDER",
      title: "為什麼是這個順序？",
      subtitle: "每一章都建立在前一章的結論之上",
    },
    {
      layout: "custom",
      nav: "五章環環相扣",
      num: "01",
      eyebrow: "WHY THIS ORDER",
      title: "五章環環相扣，每一章都站在前一章之上",
      render: StairsPage,
    },
    {
      layout: "custom",
      nav: "四個關鍵名詞",
      num: "01",
      eyebrow: "KEY TERMS",
      title: "開讀之前，先認得四個名詞",
      render: TermsPage,
    },
    {
      layout: "section",
      nav: "學習路徑一覽",
      num: "02",
      eyebrow: "LEARNING PATH",
      title: "學習路徑一覽",
      subtitle: "五章一條線，每章回答一個問題",
    },
    {
      layout: "custom",
      nav: "五章路線圖",
      num: "02",
      eyebrow: "LEARNING PATH",
      title: "五章一條線，各章回答一個問題",
      callout: {
        icon: "lightbulb",
        tone: "orange",
        text: "讀任一章之前，建議先讀完它左邊的所有章節；越往右，需要的前置觀念越多。",
      },
      render: RoadmapPage,
    },
    {
      layout: "custom",
      nav: "每章帶走什麼",
      num: "02",
      eyebrow: "WHAT YOU GAIN",
      title: "每讀完一章，多一項判斷能力",
      render: OutcomesPage,
    },
    {
      layout: "section",
      nav: "讀完這系列之後",
      num: "03",
      eyebrow: "AFTER THE SERIES",
      title: "讀完這系列之後",
      subtitle: "面對一件全新任務，能快速做出四個判斷",
    },
    {
      layout: "custom",
      nav: "四個判斷",
      num: "03",
      eyebrow: "FOUR DECISIONS",
      title: "面對新任務，依序做出四個判斷",
      render: JudgmentsPage,
    },
    {
      layout: "custom",
      nav: "閱讀順序",
      num: "03",
      eyebrow: "READING ORDER",
      title: "從第一章開始，照順序讀完五章",
      render: ReadingPage,
    },
  ],
};

export default deck;
