// 專案 V.S 產品 —— 簡報（note-deck）
//
// 版面採「一頁一份報告」：右上 pill 是這頁的一句結論；內容區分成 2–3 個編號小節
// （一、二、三 + icon 章），欄與欄用細線分隔，不把每區都包成卡片；每節用最適合的形式呈現
// （流程帶、細線清單、決策卡、泳道、對照表），並以情境插圖／概念小圖輔助；頁底放「為什麼」說明帶或結論條。
// 專案一律用藍、產品一律用橘。顏色取自 dkt() 與 trendlink token 的 CSS 變數，不硬編色碼。
// 人物只用中性剪影（無五官、無膚色），不加星光類裝飾（專案 CLAUDE.md 規範）。

import type { CSSProperties, ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CalendarClock,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Code,
  Coins,
  Compass,
  Filter,
  Flag,
  Gauge,
  GitPullRequest,
  Hammer,
  Heart,
  Hourglass,
  Infinity as InfinityIcon,
  Layers,
  Lightbulb,
  ListChecks,
  ListPlus,
  PackageCheck,
  RefreshCw,
  Rocket,
  Scale,
  ShieldAlert,
  Stamp as StampIcon,
  Target,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import { DGAP, DS, DTRACK } from "@/components/deck/scale";
import PmLifecycle from "@notes/components/pm-lifecycle";

// ── token（CSS 變數，不隨主題切換的色階）────────────────────────

const V = {
  blue200: "var(--blue-200)",
  blue300: "var(--blue-300)",
  blue500: "var(--blue-500)",
  blue700: "var(--blue-700)",
  blue900: "var(--blue-900)",
  orange200: "var(--orange-200)",
  orange300: "var(--orange-300)",
  orange400: "var(--orange-400)",
  n0: "var(--neutral-0)",
  n900: "var(--neutral-900)",
  gradHeader: "var(--gradient-header)",
};

const MONO = "var(--font-mono)";

/** 專案 = 藍、產品 = 橘（全 deck 固定） */
function sides(c: DeckThemeTokens) {
  return {
    project: { fg: c.brand, ink: c.brandInk, soft: c.brandSoft, solid: V.blue700, onSolid: V.n0 },
    product: { fg: c.accent, ink: c.accent, soft: c.accentSoft, solid: V.orange400, onSolid: V.n900 },
  };
}
type Tone = ReturnType<typeof sides>["project"];

// ── 插圖工具組 ───────────────────────────────────────────────
// 扁平雙色 + 細描邊。物件都吃同一組色票 P，亮暗主題各一套。
// 短標籤（版本號）可以直接用 <text>，其餘說明文字一律放 HTML。

function ilPalette(dark: boolean) {
  return {
    sky: dark ? "var(--blue-900)" : "var(--blue-50)",
    sky2: dark ? "var(--blue-800)" : "var(--blue-100)",
    paper: dark ? "var(--neutral-100)" : "var(--neutral-0)",
    ink: dark ? "var(--blue-950)" : "var(--blue-800)",
    grey: dark ? "var(--neutral-400)" : "var(--neutral-300)",
    desk: dark ? "var(--neutral-600)" : "var(--neutral-200)",
    navy: "var(--blue-700)",
    blue: "var(--blue-500)",
    lblue: "var(--blue-300)",
    gold: "var(--orange-400)",
    orange: "var(--orange-500)",
    green: "var(--success-500)",
    head: dark ? "var(--blue-200)" : "var(--blue-300)",
    shirt: "var(--blue-400)",
    white: "var(--neutral-0)",
  };
}
type P = ReturnType<typeof ilPalette>;

const fill = (color: string): CSSProperties => ({ fill: color });
const line = (color: string, width = 2, extra: CSSProperties = {}): CSSProperties => ({
  fill: "none",
  stroke: color,
  strokeWidth: width,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...extra,
});
const fs = (f: string, s: string, w = 1.5): CSSProperties => ({ fill: f, stroke: s, strokeWidth: w, strokeLinejoin: "round" });

/** 文件：紙張、摺角、色條、內文線 */
function Doc({ p, x, y, w, h, acc, rot = 0 }: { p: P; x: number; y: number; w: number; h: number; acc: string; rot?: number }) {
  const rows: number[] = [];
  for (let ly = y + 22; ly < y + h - 8; ly += 9) rows.push(ly);
  return (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>
      <path d={`M${x} ${y + 4}a4 4 0 0 1 4-4h${w - 16}l12 12v${h - 16}a4 4 0 0 1-4 4h${-(w - 8)}a4 4 0 0 1-4-4z`} style={fs(p.paper, p.ink)} />
      <path d={`M${x + w - 12} ${y}v8a4 4 0 0 0 4 4h8`} style={line(p.ink, 1.5)} />
      <rect x={x + 7} y={y + 10} width={w * 0.42} height={5} rx={2.5} style={fill(acc)} />
      {rows.map((ly, i) => (
        <rect key={ly} x={x + 7} y={ly} width={w - 16 - (i % 3) * 6} height={3} rx={1.5} style={fill(p.grey)} />
      ))}
    </g>
  );
}

/** 勾選清單文件 */
function ChecklistDoc({ p, x, y, w, h }: { p: P; x: number; y: number; w: number; h: number }) {
  const rows = [0, 1, 2];
  const gap = (h - 34) / 3;
  return (
    <g>
      <path d={`M${x} ${y + 4}a4 4 0 0 1 4-4h${w - 16}l12 12v${h - 16}a4 4 0 0 1-4 4h${-(w - 8)}a4 4 0 0 1-4-4z`} style={fs(p.paper, p.ink)} />
      <path d={`M${x + w - 12} ${y}v8a4 4 0 0 0 4 4h8`} style={line(p.ink, 1.5)} />
      <rect x={x + 8} y={y + 10} width={w * 0.42} height={5} rx={2.5} style={fill(p.navy)} />
      {rows.map((r) => {
        const ry = y + 28 + r * gap;
        return (
          <g key={r}>
            <rect x={x + 9} y={ry} width={12} height={12} rx={3} style={fs(p.paper, p.navy, 1.5)} />
            <path d={`M${x + 11.5} ${ry + 6}l3 3 5-6`} style={line(p.green, 2)} />
            <rect x={x + 27} y={ry + 4} width={w - 40 - r * 6} height={3.5} rx={1.75} style={fill(p.grey)} />
          </g>
        );
      })}
    </g>
  );
}

/** 中性人形剪影（無五官、無膚色） */
function Person({ p, x, y, s = 1, color }: { p: P; x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-25 56Q-25 20 0 18Q25 20 25 56Z" style={fill(color ?? p.shirt)} />
      <circle cx={0} cy={0} r={13} style={fill(color ?? p.head)} />
    </g>
  );
}

function Laptop({ p, x, y, w, bar, children }: { p: P; x: number; y: number; w: number; bar: string; children?: ReactNode }) {
  const h = w * 0.62;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} style={fill(p.ink)} />
      <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={3} style={fill(p.paper)} />
      <rect x={x + 5} y={y + 5} width={w - 10} height={8} rx={3} style={fill(bar)} />
      {children ?? (
        <>
          <rect x={x + 11} y={y + 20} width={w * 0.5} height={3.5} rx={1.75} style={fill(p.grey)} />
          <rect x={x + 11} y={y + 28} width={w * 0.35} height={3.5} rx={1.75} style={fill(p.grey)} />
        </>
      )}
      <path d={`M${x - 10} ${y + h}h${w + 20}l-6 7h${-(w + 8)}z`} style={fs(p.grey, p.ink)} />
    </g>
  );
}

function Monitor({ p, x, y, w, h, bar, children }: { p: P; x: number; y: number; w: number; h: number; bar: string; children?: ReactNode }) {
  return (
    <g>
      <rect x={x + w / 2 - 7} y={y + h} width={14} height={11} style={fill(p.ink)} />
      <rect x={x + w / 2 - 28} y={y + h + 10} width={56} height={6} rx={3} style={fill(p.ink)} />
      <rect x={x} y={y} width={w} height={h} rx={8} style={fill(p.ink)} />
      <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={4} style={fill(p.paper)} />
      <rect x={x + 6} y={y + 6} width={w - 12} height={11} rx={4} style={fill(bar)} />
      {children}
    </g>
  );
}

function Check({ p, x, y, r = 11 }: { p: P; x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={fill(p.green)} />
      <path d={`M${x - r * 0.45} ${y}l${r * 0.3} ${r * 0.32} ${r * 0.55}-${r * 0.6}`} style={line(p.white, r / 4.5)} />
    </g>
  );
}

/** 延遲徽章：橘色圓 + 時鐘指針 */
function Late({ p, x, y, r = 11 }: { p: P; x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={fill(p.orange)} />
      <path d={`M${x} ${y - r * 0.55}V${y}l${r * 0.45} ${r * 0.3}`} style={line(p.white, r / 5)} />
    </g>
  );
}

/** 警示徽章：橘色圓 + 驚嘆號 */
function Alert({ p, x, y, r = 11 }: { p: P; x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={fill(p.orange)} />
      <path d={`M${x} ${y - r * 0.5}V${y + r * 0.12}`} style={line(p.white, r / 4.5)} />
      <circle cx={x} cy={y + r * 0.48} r={r * 0.12} style={fill(p.white)} />
    </g>
  );
}

function QMark({ p, x, y, r = 14 }: { p: P; x: number; y: number; r?: number }) {
  const k = r / 14;
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={fill(p.gold)} />
      <path d={`M${x - 4.5 * k} ${y - 4 * k}a4.6 4.6 0 1 1 6.2 4.3c-1.3.6-1.7 1.4-1.7 2.9`} style={line(p.white, 2.8 * k)} />
      <circle cx={x} cy={y + 7 * k} r={1.7 * k} style={fill(p.white)} />
    </g>
  );
}

function PlusBadge({ p, x, y, r = 12 }: { p: P; x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={fill(p.orange)} />
      <path d={`M${x - r * 0.45} ${y}h${r * 0.9}M${x} ${y - r * 0.45}v${r * 0.9}`} style={line(p.white, r / 4.5)} />
    </g>
  );
}

function Chip({ x, y, w, text, color, p }: { x: number; y: number; w: number; text: string; color: string; p: P }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={18} rx={9} style={fill(color)} />
      <text x={x + w / 2} y={y + 13} textAnchor="middle" style={{ fill: p.white, fontFamily: MONO, fontSize: 10.5, fontWeight: 700 }}>
        {text}
      </text>
    </g>
  );
}

/** 二次曲線箭頭（起點 → 控制點 → 終點），箭頭依終點切線方向 */
function Arrow({
  x1,
  y1,
  x2,
  y2,
  cx,
  cy,
  color,
  w = 2.5,
  dash,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx?: number;
  cy?: number;
  color: string;
  w?: number;
  dash?: string;
}) {
  const qx = cx ?? (x1 + x2) / 2;
  const qy = cy ?? (y1 + y2) / 2;
  const len = Math.hypot(x2 - qx, y2 - qy) || 1;
  const dx = (x2 - qx) / len;
  const dy = (y2 - qy) / len;
  const hl = 5 + w * 2.4;
  const hw = 3 + w * 1.4;
  const bx = x2 - dx * hl;
  const by = y2 - dy * hl;
  return (
    <g>
      <path d={`M${x1} ${y1}Q${qx} ${qy} ${bx} ${by}`} style={line(color, w, dash ? { strokeDasharray: dash } : {})} />
      <polygon points={`${x2},${y2} ${bx - dy * hw},${by + dx * hw} ${bx + dy * hw},${by - dx * hw}`} style={fill(color)} />
    </g>
  );
}

function Calendar({ p, x, y, w, h, mark }: { p: P; x: number; y: number; w: number; h: number; mark?: "circle" | "check" | "late" }) {
  const head = h * 0.24;
  const cw = (w - 16) / 4;
  const ch = (h - head - 14) / 3;
  const cells: { cx: number; cy: number; k: string }[] = [];
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) cells.push({ cx: x + 8 + k * cw, cy: y + head + 7 + r * ch, k: `${r}-${k}` });
  const target = cells[6];
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} style={fs(p.paper, p.ink)} />
      <path d={`M${x} ${y + head}V${y + 6}a6 6 0 0 1 6-6h${w - 12}a6 6 0 0 1 6 6V${y + head}Z`} style={fill(p.navy)} />
      <rect x={x + w * 0.28 - 2} y={y - 5} width={4} height={10} rx={2} style={fill(p.ink)} />
      <rect x={x + w * 0.72 - 2} y={y - 5} width={4} height={10} rx={2} style={fill(p.ink)} />
      {cells.map((cell) => (
        <rect key={cell.k} x={cell.cx + 2} y={cell.cy + 2} width={cw - 4} height={ch - 4} rx={2} style={fill(p.grey)} opacity={0.55} />
      ))}
      {mark === "circle" && <ellipse cx={target.cx + cw / 2} cy={target.cy + ch / 2} rx={cw * 0.62} ry={ch * 0.72} style={line(p.orange, 2.5)} />}
      {mark === "check" && <Check p={p} x={x + w} y={y + h} r={11} />}
      {mark === "late" && <Late p={p} x={x + w} y={y + h} r={11} />}
    </g>
  );
}

/** 包裹（底部對齊 y + s） */
function Package({ p, x, y, s }: { p: P; x: number; y: number; s: number }) {
  return (
    <g>
      <rect x={x} y={y + s * 0.22} width={s} height={s * 0.78} rx={4} style={fs(p.gold, p.ink, 1.2)} />
      <rect x={x - 4} y={y + s * 0.08} width={s + 8} height={s * 0.2} rx={4} style={fs(p.orange, p.ink, 1.2)} />
      <rect x={x + s * 0.42} y={y + s * 0.08} width={s * 0.16} height={s * 0.92} style={fill(p.paper)} opacity={0.55} />
      <rect x={x + s * 0.12} y={y + s * 0.5} width={s * 0.22} height={s * 0.16} rx={2} style={fill(p.paper)} />
    </g>
  );
}

function FlagPole({ p, x, y, h, color }: { p: P; x: number; y: number; h: number; color: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + h} style={line(p.ink, 3)} />
      <polygon points={`${x},${y} ${x + h * 0.48},${y + h * 0.16} ${x},${y + h * 0.32}`} style={fill(color)} />
    </g>
  );
}

function Board({ p, x, y, w, h, cols, hi }: { p: P; x: number; y: number; w: number; h: number; cols: number[]; hi?: [number, number] }) {
  const cw = (w - 8 * (cols.length + 1)) / cols.length;
  const ch = Math.max(4, Math.min(15, (h - 30) / Math.max(...cols) - 5));
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} style={fs(p.paper, p.ink)} />
      {cols.map((n, k) => {
        const cx = x + 8 + k * (cw + 8);
        return (
          <g key={k}>
            <rect x={cx} y={y + 8} width={cw} height={7} rx={3} style={fill(p.navy)} />
            {Array.from({ length: n }).map((_, j) => (
              <rect key={j} x={cx} y={y + 22 + j * (ch + 5)} width={cw} height={ch} rx={3} style={fill(hi && hi[0] === k && hi[1] === j ? p.gold : p.lblue)} />
            ))}
          </g>
        );
      })}
    </g>
  );
}

function Chair({ p, x, y, s = 1 }: { p: P; x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-4} y={0} width={8} height={38} rx={3} style={fill(p.grey)} />
      <rect x={-4} y={30} width={38} height={8} rx={3} style={fill(p.grey)} />
      <line x1={2} y1={38} x2={2} y2={62} style={line(p.grey, 4)} />
      <line x1={28} y1={38} x2={28} y2={62} style={line(p.grey, 4)} />
    </g>
  );
}

function LoopArrow({ x, y, r, color, w = 5 }: { x: number; y: number; r: number; color: string; w?: number }) {
  const circ = 2 * Math.PI * r;
  const endDeg = 300;
  const a = (endDeg * Math.PI) / 180;
  const ex = x + r * Math.sin(a);
  const ey = y - r * Math.cos(a);
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const hl = w * 2.6;
  const hw = w * 1.8;
  return (
    <g>
      <circle cx={x} cy={y} r={r} transform={`rotate(-90 ${x} ${y})`} style={line(color, w, { strokeDasharray: `${(circ * (endDeg - 8)) / 360} ${circ}` })} />
      <polygon points={`${ex + dx * hl},${ey + dy * hl} ${ex - dy * hw},${ey + dx * hw} ${ex + dy * hw},${ey - dx * hw}`} style={fill(color)} />
    </g>
  );
}

function Lock({ p, x, y, r = 13 }: { p: P; x: number; y: number; r?: number }) {
  const k = r / 13;
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={fill(p.gold)} />
      <rect x={x - 6 * k} y={y - 1 * k} width={12 * k} height={9 * k} rx={2} style={fill(p.white)} />
      <path d={`M${x - 4 * k} ${y - 1 * k}v${-3 * k}a${4 * k} ${4 * k} 0 0 1 ${8 * k} 0v${3 * k}`} style={line(p.white, 2 * k)} />
    </g>
  );
}

function CreditCard({ p, x, y, w }: { p: P; x: number; y: number; w: number }) {
  const h = w * 0.62;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} style={fill(p.navy)} />
      <rect x={x} y={y + h * 0.2} width={w} height={h * 0.16} style={fill(p.ink)} />
      <rect x={x + w * 0.1} y={y + h * 0.5} width={w * 0.2} height={h * 0.2} rx={2} style={fill(p.gold)} />
    </g>
  );
}

function Ground({ p, x, y, w }: { p: P; x: number; y: number; w: number }) {
  return <rect x={x} y={y} width={w} height={7} rx={3.5} style={fill(p.desk)} />;
}

function Svg({ vb, label, children, width = "100%" }: { vb: [number, number]; label: string; children: ReactNode; width?: string | number }) {
  return (
    <svg viewBox={`0 0 ${vb[0]} ${vb[1]}`} width={width} role="img" aria-label={label} style={{ display: "block", maxHeight: "100%", flex: "none" }}>
      {children}
    </svg>
  );
}

// ── 概念小圖（64px，放在決策卡、定義卡、說明帶）─────────────────────

function MiniDeliver({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={64} label="小圖：日曆與準時交付的包裹">
      <Calendar p={p} x={4} y={10} w={38} h={36} />
      <Package p={p} x={32} y={32} s={40} />
      <Check p={p} x={70} y={34} r={9} />
    </Svg>
  );
}

function MiniValue({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={64} label="小圖：螢幕上的指標持續上升">
      <Monitor p={p} x={6} y={8} w={68} h={48} bar={p.orange}>
        <path d="M16 48L28 40 38 44 50 30 62 24" style={line(p.orange, 3)} />
      </Monitor>
    </Svg>
  );
}

function MiniRisk({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={64} label="小圖：需求文件上掛著警示徽章">
      <Doc p={p} x={14} y={6} w={44} h={60} acc={p.navy} />
      <Alert p={p} x={60} y={56} r={13} />
    </Svg>
  );
}

function MiniBacklog({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={64} label="小圖：新卡片加進 Backlog 看板">
      <Board p={p} x={4} y={18} w={72} h={56} cols={[2, 1, 1]} hi={[0, 0]} />
      <PlusBadge p={p} x={66} y={16} r={11} />
    </Svg>
  );
}

function MiniWhy({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={64} label="小圖：待判斷的清單">
      <ChecklistDoc p={p} x={10} y={6} w={50} h={68} />
      <QMark p={p} x={62} y={16} r={12} />
    </Svg>
  );
}

// ── 版面零件 ─────────────────────────────────────────────────

/** 小節標題：編號 + 圓角方形 icon 章 + 藍色粗體 */
function SecHead({ n, Icon, title, c, note }: { n: string; Icon: LucideIcon; title: string; c: DeckThemeTokens; note?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
      <div
        style={{
          width: 34,
          height: 34,
          flex: "none",
          borderRadius: 10,
          background: c.brandSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={18} color={c.brand} strokeWidth={2.2} />
      </div>
      <span style={{ fontSize: DS.body, fontWeight: 900, color: c.brandInk, whiteSpace: "nowrap" }}>
        {n}　{title}
      </span>
      {note && <span style={{ fontSize: DS.micro, color: c.muted }}>{note}</span>}
    </div>
  );
}

/** 欄分隔：左細線 */
const divider = (c: DeckThemeTokens): CSSProperties => ({ borderLeft: `1px solid ${c.border}`, paddingLeft: 28 });

/** 結論條：左藍粗線 */
function Concl({ c, children }: { c: DeckThemeTokens; children: ReactNode }) {
  return (
    <div
      style={{
        flex: "none",
        background: c.brandSoft,
        borderLeft: `5px solid ${c.brand}`,
        padding: "10px 18px",
        fontSize: DS.body,
        fontWeight: 700,
        lineHeight: 1.5,
        color: c.brandInk,
      }}
    >
      {children}
    </div>
  );
}

/** 橘色附註膠囊 */
function Note({ c, children }: { c: DeckThemeTokens; children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        padding: "3px 12px",
        borderRadius: 999,
        background: c.accentSoft,
        border: `1px solid ${V.orange200}`,
        fontSize: DS.micro,
        fontWeight: 700,
        color: c.accent,
      }}
    >
      {children}
    </span>
  );
}

/** 插圖／說明面板 */
function Panel({ c, children, style }: { c: DeckThemeTokens; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 14, background: c.slide, ...style }}>
      {children}
    </div>
  );
}

function SideTag({ text, tone, Icon }: { text: string; tone: Tone; Icon: LucideIcon }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 999,
        background: tone.solid,
        color: tone.onSolid,
        fontSize: DS.small,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={16} color={tone.onSolid} />
      {text}
    </span>
  );
}

/** 細線清單的一列 */
function ListRow({ Icon, k, v, tone, c, kw = 88 }: { Icon: LucideIcon; k: string; v: string; tone: Tone; c: DeckThemeTokens; kw?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: `1px solid ${c.border}` }}>
      <Icon size={22} color={tone.fg} style={{ flex: "none" }} />
      <span style={{ width: kw, flex: "none", fontSize: DS.body, fontWeight: 700, color: c.ink }}>{k}</span>
      <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{v}</span>
    </div>
  );
}

/** 橫向流程帶 */
function Flow({ label, tone, steps, c }: { label: ReactNode; tone: Tone; steps: { Icon: LucideIcon; t: string; hi?: boolean }[]; c: DeckThemeTokens }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 150, flex: "none" }}>{label}</div>
      {steps.map((s, i) => (
        <div key={s.t} style={{ display: "contents" }}>
          {i > 0 && (
            <svg viewBox="0 0 20 14" width={20} height={14} aria-hidden="true" style={{ flex: "none" }}>
              <path d="M1 7H14M10 3L14 7 10 11" style={line(s.hi ? tone.fg : V.blue300, 2)} />
            </svg>
          )}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 12px",
              borderRadius: 10,
              background: s.hi ? tone.soft : c.slide,
              border: s.hi ? `1.5px solid ${tone.fg}` : `1px solid ${c.border}`,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                flex: "none",
                borderRadius: 8,
                background: s.hi ? c.slide : tone.soft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <s.Icon size={16} color={tone.fg} />
            </div>
            <span style={{ fontSize: DS.small, fontWeight: 700, color: c.ink, whiteSpace: "nowrap" }}>{s.t}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 決策卡：概念小圖 + 問題 + 大字答案 + 補充 */
function FocusCard({ c, art, q, answer, note, hi }: { c: DeckThemeTokens; art: ReactNode; q: string; answer: string; note: string; hi?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        padding: "14px 18px",
        borderRadius: 14,
        border: hi ? `1.5px solid ${V.orange400}` : `1px solid ${c.border}`,
        background: hi ? c.accentSoft : c.slide,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {art}
        <span style={{ fontSize: DS.small, lineHeight: 1.4, color: c.muted }}>{q}</span>
      </div>
      <div style={{ marginTop: "auto", paddingTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.ink }}>{answer}</span>
        <span style={{ fontSize: DS.small, color: c.muted }}>{note}</span>
      </div>
    </div>
  );
}

/** 頁底「為什麼」說明帶 */
function WhyBand({ c, art, title, children }: { c: DeckThemeTokens; art: ReactNode; title: string; children: ReactNode }) {
  return (
    <Panel c={c} style={{ flex: "none", display: "flex", alignItems: "center", gap: 20, padding: "12px 22px" }}>
      {art}
      <div style={{ flex: 1, borderLeft: `1px solid ${c.border}`, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: DS.body, fontWeight: 900, color: c.brandInk }}>{title}</span>
        <span style={{ fontSize: DS.small, lineHeight: 1.6, color: c.body }}>{children}</span>
      </div>
    </Panel>
  );
}

// ── P2 動工前：四個判斷 + 兩條路 ───────────────────────────────

function ForkScene({ p }: { p: P }) {
  return (
    <Svg vb={[700, 450]} label="插圖：一份掛著問號的新任務文件，路分成兩條；左邊走到終點旗，交付打勾的包裹；右邊進入螢幕上持續上升的曲線與循環箭頭">
      <Doc p={p} x={310} y={18} w={80} h={100} acc={p.gold} />
      <QMark p={p} x={392} y={22} r={16} />
      <Arrow x1={316} y1={124} cx={226} cy={140} x2={196} y2={206} color={p.navy} w={3} />
      <Arrow x1={384} y1={124} cx={474} cy={140} x2={504} y2={206} color={p.orange} w={3} />
      <line x1={350} y1={170} x2={350} y2={440} style={line(p.grey, 2, { strokeDasharray: "3 8" })} />
      <Ground p={p} x={34} y={398} w={296} />
      <FlagPole p={p} x={66} y={306} h={92} color={p.grey} />
      <path d="M78 380H270" style={line(p.navy, 3, { strokeDasharray: "2 9" })} />
      <Package p={p} x={140} y={320} s={78} />
      <Check p={p} x={222} y={330} r={15} />
      <FlagPole p={p} x={292} y={262} h={136} color={p.gold} />
      <Ground p={p} x={370} y={398} w={296} />
      <Monitor p={p} x={404} y={228} w={200} h={134} bar={p.orange}>
        <path d="M424 336L462 318 500 326 540 290 578 268" style={line(p.orange, 4)} />
        <Arrow x1={560} y1={279} x2={586} y2={262} color={p.orange} w={4} />
        <rect x={424} y={346} width={150} height={3} rx={1.5} style={fill(p.grey)} />
      </Monitor>
      <LoopArrow x={636} y={236} r={24} color={p.orange} w={5} />
    </Svg>
  );
}

function DecisionPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const rows: { Icon: LucideIcon; q: string; project: string; product: string }[] = [
    { Icon: CalendarClock, q: "有預設的結束日期嗎？", project: "有，有交付期限", product: "沒有，持續經營" },
    { Icon: ClipboardCheck, q: "做完就能驗收結案嗎？", project: "能，做完即驗收", product: "不能，持續迭代與交付" },
    { Icon: RefreshCw, q: "需求會一直變嗎？", project: "相對明確，原則上凍結", product: "會，隨市場與用戶調整" },
    { Icon: Target, q: "成功怎麼算？", project: "如期、如質、如預算", product: "有沒有帶來用戶／商業價值" },
  ];
  const cols = "1.15fr 1fr 1fr";
  const answer = (t: Tone, text: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: t.fg, flex: "none" }} />
      <span style={{ fontSize: DS.small, lineHeight: 1.45, color: c.ink }}>{text}</span>
    </div>
  );
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1.35, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <SecHead n="一" Icon={ListChecks} title="四個判斷問題" c={c} note="依答案偏向哪一邊來判斷" />
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 16, alignItems: "center", padding: "4px 0" }}>
            <span style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: ".1em", color: c.muted }}>判斷問題</span>
            <div>
              <SideTag text="偏向專案" tone={s.project} Icon={Flag} />
            </div>
            <div>
              <SideTag text="偏向產品" tone={s.product} Icon={RefreshCw} />
            </div>
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateRows: "repeat(4, 1fr)", borderBottom: `1px solid ${c.border}` }}>
            {rows.map((r) => (
              <div key={r.q} style={{ display: "grid", gridTemplateColumns: cols, gap: 16, alignItems: "center", borderTop: `1px solid ${c.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, flex: "none", borderRadius: 10, background: c.sunken, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <r.Icon size={19} color={c.ink} />
                  </div>
                  <span style={{ fontSize: DS.body, fontWeight: 700, color: c.ink }}>{r.q}</span>
                </div>
                {answer(s.project, r.project)}
                {answer(s.product, r.product)}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
          <SecHead n="二" Icon={GitPullRequest} title="兩條不同的路" c={c} />
          <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px 0" }}>
              <ForkScene p={p} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${c.border}` }}>
              <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: DS.small, fontWeight: 900, color: s.project.ink }}>專案：一次性交付</span>
                <span style={{ fontSize: DS.micro, color: c.muted }}>有起點、有終點，做完即驗收</span>
              </div>
              <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 2, borderLeft: `1px solid ${c.border}` }}>
                <span style={{ fontSize: DS.small, fontWeight: 900, color: s.product.ink }}>產品：持續經營</span>
                <span style={{ fontSize: DS.micro, color: c.muted }}>沒有預設終點，持續迭代</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
      <WhyBand c={c} art={<MiniWhy p={p} />} title="為什麼動工前要先判斷">
        這個判斷會一路影響後續的資源調度與管理模式：專案要如期、如質、如預算地交付，產品要持續為用戶與商業創造價值，兩者的思考重點截然不同。
      </WhyBand>
    </div>
  );
}

// ── P4 專案與產品的本質差異 ───────────────────────────────────

function FeaturesPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel c={c} style={{ flex: "none", display: "flex", flexDirection: "column", gap: 8, padding: "10px 16px" }}>
        <Flow
          c={c}
          tone={s.project}
          label={
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: DS.small, fontWeight: 900, color: s.project.ink }}>專案：有終點</span>
              <span style={{ fontSize: DS.micro, color: c.muted }}>一次性的任務</span>
            </div>
          }
          steps={[
            { Icon: Flag, t: "啟動" },
            { Icon: ClipboardList, t: "規劃" },
            { Icon: Hammer, t: "執行" },
            { Icon: PackageCheck, t: "結案・驗收", hi: true },
          ]}
        />
        <Flow
          c={c}
          tone={s.product}
          label={
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: DS.small, fontWeight: 900, color: s.product.ink }}>產品：沒有終點</span>
              <span style={{ fontSize: DS.micro, color: c.muted }}>長期的經營</span>
            </div>
          }
          steps={[
            { Icon: ClipboardList, t: "規劃" },
            { Icon: Code, t: "開發" },
            { Icon: Rocket, t: "發佈" },
            { Icon: ChartColumn, t: "量測" },
            { Icon: RefreshCw, t: "下一輪", hi: true },
          ]}
        />
      </Panel>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <SecHead n="一" Icon={Flag} title="專案的五個特徵" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            <ListRow c={c} tone={s.project} Icon={ListChecks} k="需求" v="相對明確、可被界定" />
            <ListRow c={c} tone={s.project} Icon={Clock} k="時間" v="有限，有交付期限" />
            <ListRow c={c} tone={s.project} Icon={Users} k="資源" v="有限，人力與預算固定" />
            <ListRow c={c} tone={s.project} Icon={PackageCheck} k="交付物" v="明確，做完即驗收" />
            <ListRow c={c} tone={s.project} Icon={Hourglass} k="生命週期" v="有限，專案結束，任務就結束" />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
          <SecHead n="二" Icon={RefreshCw} title="產品的四個特徵" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            <ListRow c={c} tone={s.product} Icon={RefreshCw} k="需求" v="變化頻繁，隨市場與用戶調整" />
            <ListRow c={c} tone={s.product} Icon={TrendingUp} k="節奏" v="持續迭代、持續交付" />
            <ListRow c={c} tone={s.product} Icon={Compass} k="方向" v="不斷優化與改進" />
            <ListRow c={c} tone={s.product} Icon={InfinityIcon} k="生命週期" v="沒有明確結束時間" />
          </div>
          <Note c={c}>PO：Product Owner，產品負責人，定義產品方向、排定 Backlog 優先順序</Note>
        </div>
        <div style={{ width: 360, flex: "none", display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
          <SecHead n="三" Icon={Target} title="PM 關注什麼" c={c} />
          <FocusCard c={c} art={<MiniDeliver p={p} />} q="在專案中，PM 關注" answer="如期・如質・如預算" note="把東西交出去" />
          <FocusCard c={c} art={<MiniValue p={p} />} q="在產品中，PM（或 PO）關注" answer="這輪有沒有帶來價值" note="為用戶／商業帶來價值" hi />
          <Concl c={c}>專案看重成果，產品看重價值。</Concl>
        </div>
      </div>
    </div>
  );
}

// ── P5 成果 × 價值四象限 ──────────────────────────────────────

function QuadScene({ p, onTime, used, label }: { p: P; onTime: boolean; used: boolean; label: string }) {
  return (
    <Svg vb={[400, 104]} label={label} width="84%">
      <Calendar p={p} x={10} y={14} w={74} h={70} mark={onTime ? "check" : "late"} />
      <Arrow x1={98} y1={52} x2={128} y2={52} color={p.grey} w={2.5} />
      <Package p={p} x={140} y={26} s={62} />
      <Arrow x1={216} y1={52} x2={246} y2={52} color={p.grey} w={2.5} />
      <Ground p={p} x={256} y={92} w={136} />
      {used ? <Person p={p} x={284} y={30} s={0.9} /> : <Chair p={p} x={268} y={30} s={1} />}
      <Laptop p={p} x={318} y={46} w={70} bar={used ? p.orange : p.grey}>
        {used ? <path d="M326 82L340 74 352 78 366 64 380 58" style={line(p.orange, 2.5)} /> : <rect x={330} y={68} width={46} height={3.5} rx={1.75} style={fill(p.grey)} />}
      </Laptop>
    </Svg>
  );
}

function QuadrantPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  type Cell = { k: string; v: string; onTime: boolean; used: boolean; bg: string; border?: string; danger?: boolean };
  const cells: Cell[] = [
    { k: "延期超支，但做對了東西", v: "專案指標難看，但用戶與商業價值有出來。", onTime: false, used: true, bg: c.slide },
    { k: "理想：準時交付，也有人用", v: "鐵三角守住，上線後指標也有起色。", onTime: true, used: true, bg: c.brandSoft },
    { k: "兩頭落空", v: "沒如期交付，交付的也沒人要。", onTime: false, used: false, bg: c.slide },
    { k: "專案成功、產品失敗", v: "如期如質如預算上線，但沒人用、留不住人。", onTime: true, used: false, bg: c.accentSoft, border: V.orange400, danger: true },
  ];
  const axis: CSSProperties = { fontSize: DS.micro, fontWeight: 700, color: c.muted };
  const reads: { n: string; k: string; v: string }[] = [
    { n: "01", k: "兩條獨立的軸", v: "橫軸是專案看的成果（如期、如質、如預算），縱軸是產品看的價值。" },
    { n: "02", k: "右上是理想", v: "準時交付，上線後也有人用，兩種眼光都滿意。" },
    { n: "03", k: "左上不算失敗", v: "指標難看但做對了東西；下一輪要補的是規劃與估時。" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <SecHead n="一" Icon={Scale} title="成果 × 價值：四種結局" c={c} />
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 10 }}>
          <div style={{ width: 30, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", paddingBottom: 34 }}>
            <span style={axis}>高</span>
            <span style={{ writingMode: "vertical-rl", fontSize: DS.small, fontWeight: 700, letterSpacing: ".2em", color: s.product.fg }}>產品看的：價值</span>
            <span style={axis}>低</span>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 10 }}>
              {cells.map((cell) => (
                <div
                  key={cell.k}
                  style={{
                    minHeight: 0,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: cell.bg,
                    border: cell.border ? `2px solid ${cell.border}` : `1px solid ${c.border}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <QuadScene p={p} onTime={cell.onTime} used={cell.used} label={`插圖：${cell.onTime ? "日曆打勾準時交付" : "日曆顯示延遲"}，包裹交出後${cell.used ? "有人在用產品" : "螢幕前的椅子是空的"}`} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {cell.danger && <TriangleAlert size={22} color={c.accent} style={{ flex: "none" }} />}
                    <span style={{ fontSize: DS.body, fontWeight: 900, color: c.ink }}>{cell.k}</span>
                  </div>
                  <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{cell.v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 26, lineHeight: 1.2 }}>
              <span style={axis}>低</span>
              <span style={{ fontSize: DS.small, fontWeight: 700, letterSpacing: ".06em", color: s.project.fg }}>專案看的：成果（如期、如質、如預算）</span>
              <span style={axis}>高</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ width: 360, flex: "none", display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
        <SecHead n="二" Icon={Lightbulb} title="怎麼判讀" c={c} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          {reads.map((r) => (
            <div key={r.n} style={{ display: "flex", gap: 14, padding: "12px 0", borderTop: `1px solid ${c.border}` }}>
              <span style={{ fontFamily: MONO, fontSize: DS.h4, fontWeight: 900, color: c.brand, width: 34, flex: "none" }}>{r.n}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: DS.body, fontWeight: 700, color: c.ink }}>{r.k}</span>
                <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{r.v}</span>
              </div>
            </div>
          ))}
        </div>
        <Concl c={c}>最危險的是右下角：鐵三角全部守住，上線後卻沒人用。</Concl>
        <Note c={c}>只看鐵三角，會把右下角誤判成成功</Note>
      </div>
    </div>
  );
}

// ── P8 需求變動：定義卡 + 雙泳道 + CR 評估 ───────────────────────

interface Step {
  label: string;
  who: string;
  days: number;
}

const PROJECT_STEPS: Step[] = [
  { label: "評估影響", who: "PM · 技術負責人", days: 5 },
  { label: "撰寫 CR 文件", who: "PM", days: 5 },
  { label: "多層簽核", who: "客戶 · 變更委員會", days: 15 },
  { label: "執行變更", who: "開發團隊", days: 10 },
];
const PRODUCT_STEPS: Step[] = [
  { label: "加入 Backlog", who: "PO", days: 1 },
  { label: "排序優先級", who: "PO · 團隊", days: 2 },
  { label: "下個 Sprint", who: "開發團隊", days: 10 },
];
const total = (steps: Step[]) => steps.reduce((sum, x) => sum + x.days, 0);
const PROJECT_TOTAL = total(PROJECT_STEPS);
const PRODUCT_TOTAL = total(PRODUCT_STEPS);

const LANE = { labelW: 190, rowH: 34, rowGap: 4, headH: 30, laneGap: 12, axisH: 26 };

function DefCard({ c, art, tag, title, desc, tone }: { c: DeckThemeTokens; art: ReactNode; tag: ReactNode; title: string; desc: string; tone: Tone }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "12px 20px",
        borderRadius: 14,
        border: `1px solid ${c.border}`,
        borderTop: `4px solid ${tone.fg}`,
        background: c.slide,
      }}
    >
      {art}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {tag}
          <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.ink }}>{title}</span>
        </div>
        <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{desc}</span>
      </div>
    </div>
  );
}

function Lane({ steps, W, title, Icon, tone, c }: { steps: Step[]; W: number; title: string; Icon: LucideIcon; tone: Tone; c: DeckThemeTokens }) {
  const x = (d: number) => (d / PROJECT_TOTAL) * W;
  let acc = 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: LANE.rowGap }}>
      <div style={{ height: LANE.headH, display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={20} color={tone.fg} />
        <span style={{ fontSize: DS.small, fontWeight: 900, color: tone.ink }}>{title}</span>
      </div>
      {steps.map((st) => {
        const start = acc;
        acc += st.days;
        const w = x(st.days);
        const inside = w >= 64;
        return (
          <div key={st.label} style={{ height: LANE.rowH, display: "flex", alignItems: "center" }}>
            <div style={{ width: LANE.labelW, flex: "none", display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: DS.small, fontWeight: 700, color: c.ink, whiteSpace: "nowrap" }}>{st.label}</span>
              <span style={{ fontSize: DS.micro, color: c.muted, whiteSpace: "nowrap" }}>{st.who}</span>
            </div>
            <div style={{ position: "relative", width: W, height: LANE.rowH }}>
              <div
                style={{
                  position: "absolute",
                  left: x(start),
                  top: 6,
                  width: Math.max(w - 3, 4),
                  height: LANE.rowH - 12,
                  borderRadius: 5,
                  background: tone.solid,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: DS.micro,
                  fontWeight: 700,
                  color: tone.onSolid,
                }}
              >
                {inside ? `${st.days} 天` : ""}
              </div>
              {!inside && (
                <span style={{ position: "absolute", left: x(start) + w + 6, top: 7, fontSize: DS.micro, fontWeight: 700, color: c.muted }}>{st.days} 天</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CHANGE_RIGHT = 330;

function ChangePage({ dark, area }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const leftW = area.w - CHANGE_RIGHT - 28 - 28;
  const W = leftW - LANE.labelW - 16;
  const x = (d: number) => LANE.labelW + (d / PROJECT_TOTAL) * W;
  const ticks = [0, 5, 10, 15, 20, 25, 30, 35];
  const evals: { Icon: LucideIcon; k: string; v: string }[] = [
    { Icon: Layers, k: "範疇", v: "要做的東西變多少" },
    { Icon: CalendarClock, k: "時程", v: "交期因此延多久" },
    { Icon: Coins, k: "成本", v: "要加多少人力與預算" },
    { Icon: StampIcon, k: "簽核", v: "取得相關方批准" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: "none", display: "flex", gap: 20 }}>
        <DefCard
          c={c}
          tone={s.project}
          art={<MiniRisk p={p} />}
          tag={<SideTag text="專案" tone={s.project} Icon={ShieldAlert} />}
          title="需求變動是風險"
          desc="原則上凍結需求；任何變更都走 CR，評估對範疇、時間、成本的影響並取得批准。"
        />
        <DefCard
          c={c}
          tone={s.product}
          art={<MiniBacklog p={p} />}
          tag={<SideTag text="產品" tone={s.product} Icon={ListPlus} />}
          title="需求變動是常態"
          desc="本來就預期會變；擁抱變化，快速回應市場與用戶反饋，持續優化產品。"
        />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ width: leftW, flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          <SecHead n="一" Icon={Clock} title="同一份變更要走多久" c={c} note="共用天數軸" />
          <div
            role="img"
            aria-label={`需求變更的雙泳道：專案走 CR 流程四步共 ${PROJECT_TOTAL} 天，產品走 Backlog 三步共 ${PRODUCT_TOTAL} 天，相差 ${PROJECT_TOTAL - PRODUCT_TOTAL} 天`}
            style={{ position: "relative", display: "flex", flexDirection: "column", gap: LANE.laneGap }}
          >
            <Lane steps={PROJECT_STEPS} W={W} title="專案：正式變更流程（CR）" Icon={ShieldAlert} tone={s.project} c={c} />
            <Lane steps={PRODUCT_STEPS} W={W} title="產品：Backlog 流程" Icon={ListPlus} tone={s.product} c={c} />
            <div style={{ position: "relative", height: LANE.axisH }}>
              <div style={{ position: "absolute", left: LANE.labelW, width: W, top: 0, height: 2, background: c.border }} />
              {ticks.map((t) => (
                <span key={t} style={{ position: "absolute", left: x(t) - 20, width: 40, top: 5, textAlign: "center", fontFamily: MONO, fontSize: DS.micro, color: c.muted }}>
                  {t}
                </span>
              ))}
              <span style={{ position: "absolute", left: 0, top: 3, fontSize: DS.micro, fontWeight: 700, color: c.muted }}>天數</span>
            </div>
            {[
              { d: PRODUCT_TOTAL, color: s.product.fg },
              { d: PROJECT_TOTAL, color: s.project.fg },
            ].map((m) => (
              <div key={m.d} style={{ position: "absolute", left: x(m.d) - 1, top: LANE.headH, bottom: LANE.axisH + LANE.laneGap, borderLeft: `2px dashed ${m.color}` }} />
            ))}
            <div style={{ position: "absolute", left: x(PRODUCT_TOTAL) + 10, right: 0, bottom: LANE.axisH + LANE.laneGap + 8, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 2, background: c.accent }} />
              <span style={{ padding: "2px 12px", borderRadius: 999, background: c.accentSoft, fontSize: DS.small, fontWeight: 700, color: c.accent, whiteSpace: "nowrap" }}>
                產品早 {PROJECT_TOTAL - PRODUCT_TOTAL} 天上線
              </span>
              <div style={{ flex: 1, height: 2, background: c.accent }} />
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
          <SecHead n="二" Icon={ClipboardCheck} title="CR 要評估什麼" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            {evals.map((e) => (
              <ListRow key={e.k} c={c} tone={s.project} Icon={e.Icon} k={e.k} v={e.v} kw={52} />
            ))}
          </div>
          <Concl c={c}>產品只要加進 Backlog、排好優先順序，下個 Sprint 就做。</Concl>
        </div>
      </div>
    </div>
  );
}

// ── P10 衡量指標：鐵三角、四要素、成熟框架 ───────────────────────

interface Vertex {
  label: string;
  x: number;
  y: number;
  up?: boolean;
  lx: number;
  ly: number;
}

function TradeoffShape({ vertices, center, tone, c, label, size }: { vertices: Vertex[]; center?: string; tone: Tone; c: DeckThemeTokens; label: string; size: number }) {
  const k = size / 300;
  const pts = vertices.map((v) => `${v.x},${v.y}`).join(" ");
  return (
    <div role="img" aria-label={label} style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg viewBox="0 0 300 300" width={size} height={size} aria-hidden="true">
        <polygon points={pts} style={{ fill: tone.soft, stroke: tone.solid, strokeWidth: 2.5, strokeLinejoin: "round" }} />
        {vertices.map((v) => (
          <circle key={v.label} cx={v.x} cy={v.y} r={11} style={fill(v.up ? V.orange400 : tone.solid)} />
        ))}
      </svg>
      {vertices.map((v) => (
        <div
          key={v.label}
          style={{
            position: "absolute",
            left: v.lx * k,
            top: v.ly * k,
            transform: "translate(-50%, -50%)",
            whiteSpace: "nowrap",
            fontSize: DS.small,
            fontWeight: 700,
            color: v.up ? c.accent : c.ink,
          }}
        >
          {v.label}
          {v.up ? " ↑" : ""}
        </div>
      ))}
      {center && (
        <div
          style={{
            position: "absolute",
            left: 150 * k,
            top: 180 * k,
            transform: "translate(-50%, -50%)",
            padding: "2px 10px",
            borderRadius: 999,
            background: c.slide,
            border: `1px solid ${c.border}`,
            fontSize: DS.micro,
            fontWeight: 700,
            color: c.body,
          }}
        >
          {center}
        </div>
      )}
    </div>
  );
}

function ScopeCreepArt({ p }: { p: P }) {
  return (
    <Svg vb={[320, 150]} label="插圖：客戶剪影遞出多一項功能的需求文件，把日曆的截止日與預算表往外推">
      <Person p={p} x={46} y={52} s={1} />
      <Ground p={p} x={10} y={114} w={120} />
      <Doc p={p} x={80} y={30} w={62} h={80} acc={p.gold} />
      <PlusBadge p={p} x={140} y={34} r={14} />
      <Arrow x1={152} y1={60} cx={180} cy={32} x2={210} y2={32} color={p.orange} w={2.5} />
      <Arrow x1={152} y1={90} cx={180} cy={116} x2={210} y2={114} color={p.orange} w={2.5} />
      <Calendar p={p} x={220} y={8} w={62} h={56} mark="late" />
      <Doc p={p} x={222} y={84} w={54} h={60} acc={p.navy} />
      <PlusBadge p={p} x={274} y={88} r={11} />
    </Svg>
  );
}

function PaywallArt({ p }: { p: P }) {
  return (
    <Svg vb={[320, 150]} label="插圖：螢幕跳出上鎖的付費牆，兩個淡色剪影轉身離開">
      <Monitor p={p} x={20} y={14} w={150} h={100} bar={p.gold}>
        <rect x={40} y={42} width={110} height={52} rx={6} style={fill(p.gold)} opacity={0.25} />
        <Lock p={p} x={95} y={68} r={18} />
      </Monitor>
      <Ground p={p} x={196} y={120} w={116} />
      <Person p={p} x={222} y={62} s={0.95} color={p.grey} />
      <Person p={p} x={276} y={68} s={0.85} color={p.grey} />
      <Arrow x1={200} y1={140} x2={306} y2={140} color={p.grey} w={2.5} dash="5 6" />
    </Svg>
  );
}

function TradeoffColumn({
  c,
  n,
  Icon,
  title,
  note,
  shape,
  trigger,
  effects,
  art,
  foot,
  style,
}: {
  c: DeckThemeTokens;
  n: string;
  Icon: LucideIcon;
  title: string;
  note: string;
  shape: ReactNode;
  trigger: string;
  effects: string[];
  art: ReactNode;
  foot: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...style }}>
      <SecHead n={n} Icon={Icon} title={title} c={c} note={note} />
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {shape}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted, paddingBottom: 6 }}>例如</span>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderTop: `1px solid ${c.border}` }}>
            <ArrowUp size={20} color={c.accent} style={{ flex: "none", marginTop: 1 }} />
            <span style={{ fontSize: DS.small, fontWeight: 700, lineHeight: 1.45, color: c.ink }}>{trigger}</span>
          </div>
          {effects.map((e) => (
            <div key={e} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: `1px solid ${c.border}` }}>
              <ArrowDown size={18} color={c.muted} style={{ flex: "none" }} />
              <span style={{ fontSize: DS.small, color: c.body }}>{e}</span>
            </div>
          ))}
        </div>
      </div>
      <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
        {art}
      </Panel>
      {foot}
    </div>
  );
}

function MetricsPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const triangle: Vertex[] = [
    { label: "範疇", x: 150, y: 50, up: true, lx: 150, ly: 16 },
    { label: "時程", x: 40, y: 250, lx: 44, ly: 284 },
    { label: "成本", x: 260, y: 250, lx: 256, ly: 284 },
  ];
  const diamond: Vertex[] = [
    { label: "商業價值", x: 150, y: 46, up: true, lx: 150, ly: 12 },
    { label: "用戶價值", x: 256, y: 150, lx: 262, ly: 192 },
    { label: "留存率", x: 150, y: 254, lx: 150, ly: 288 },
    { label: "黏著度", x: 44, y: 150, lx: 38, ly: 192 },
  ];
  const frames: { Icon: LucideIcon; k: string; v: string }[] = [
    { Icon: Heart, k: "HEART 框架", v: "Happiness、Engagement、Adoption、Retention、Task success，衡量使用者體驗" },
    { Icon: Filter, k: "AARRR 模型", v: "獲取、啟用、留存、營收、推薦，俗稱海盜指標，描述使用者漏斗" },
    { Icon: Compass, k: "北極星指標", v: "一個最能代表產品核心價值的單一指標，全公司對齊它" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <TradeoffColumn
        c={c}
        n="一"
        Icon={Flag}
        title="專案：鐵三角"
        note="業界公認的約束模型"
        shape={<TradeoffShape size={190} vertices={triangle} center="品質" tone={s.project} c={c} label="鐵三角：範疇、時程、成本三個頂點，中央是品質；範疇被拉高" />}
        trigger="客戶臨時要加功能（範疇上升）"
        effects={["延後交期（時間上升）", "加人加錢（成本上升）", "犧牲其他功能或品質"]}
        art={<ScopeCreepArt p={p} />}
        foot={<Concl c={c}>動一個，就會影響另外兩個。</Concl>}
      />
      <TradeoffColumn
        c={c}
        n="二"
        Icon={RefreshCw}
        title="產品：四要素"
        note="借鐵三角形狀的示意"
        shape={<TradeoffShape size={190} vertices={diamond} tone={s.product} c={c} label="四要素菱形：商業價值、用戶價值、留存率、黏著度；商業價值被拉高" />}
        trigger="強推付費牆或廣告（商業價值上升）"
        effects={["使用者體驗下降", "使用者不再回訪", "回訪頻率降低"]}
        art={<PaywallArt p={p} />}
        foot={<Note c={c}>四要素是作者自己湊的示意，不是正式框架</Note>}
        style={divider(c)}
      />
      <div style={{ width: 340, flex: "none", display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
        <SecHead n="三" Icon={Gauge} title="成熟的衡量框架" c={c} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          {frames.map((f) => (
            <div key={f.k} style={{ display: "flex", gap: 14, padding: "14px 0", borderTop: `1px solid ${c.border}` }}>
              <div style={{ width: 40, height: 40, flex: "none", borderRadius: 11, background: c.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <f.Icon size={20} color={c.accent} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: DS.body, fontWeight: 900, color: c.ink }}>{f.k}</span>
                <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{f.v}</span>
              </div>
            </div>
          ))}
        </div>
        <Concl c={c}>不同公司、不同產品，依情境挑選即可。</Concl>
      </div>
    </div>
  );
}

// ── P12 小結：四個面向對照 + 產品裡包著專案 ───────────────────────

function NestedMini({ c, p }: { c: DeckThemeTokens; p: P }) {
  const projects = [
    { k: "v1.0 開發上線", from: 2, to: 32 },
    { k: "金流串接", from: 36, to: 62 },
    { k: "v2.0 改版", from: 66, to: 96 },
  ];
  return (
    <div
      role="img"
      aria-label="巢狀時間軸：上排是沒有終點的產品，下排是 v1.0 開發上線、金流串接、v2.0 改版三個有起訖的專案，各自驗收後往上併入產品"
      style={{ position: "relative", height: 184, flex: "none" }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 44,
          background: V.orange400,
          clipPath: "polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingLeft: 16,
          color: V.n900,
        }}
      >
        <RefreshCw size={18} color={V.n900} />
        <span style={{ fontSize: DS.small, fontWeight: 900 }}>產品：持續迭代，沒有終點</span>
      </div>
      {projects.map((pr) => (
        <div key={pr.k}>
          <div style={{ position: "absolute", left: `calc(${pr.to}% - 18px)`, top: 50, width: 3, height: 50, background: V.blue500 }} />
          <div
            style={{
              position: "absolute",
              left: `calc(${pr.to}% - 24px)`,
              top: 46,
              width: 0,
              height: 0,
              borderLeft: "7.5px solid transparent",
              borderRight: "7.5px solid transparent",
              borderBottom: `10px solid ${V.blue500}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `${pr.from}%`,
              width: `${pr.to - pr.from}%`,
              top: 100,
              height: 40,
              borderRadius: 8,
              background: V.blue700,
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              fontSize: DS.small,
              fontWeight: 700,
              color: V.n0,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {pr.k}
          </div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 0, right: 16, top: 156, height: 2, background: c.border }} />
      <svg viewBox="0 0 12 10" width={12} height={10} style={{ position: "absolute", right: 4, top: 152 }} aria-hidden="true">
        <polygon points="0,0 12,5 0,10" style={fill(p.grey)} />
      </svg>
      <span style={{ position: "absolute", right: 24, top: 158, fontSize: DS.micro, color: c.muted }}>時間</span>
      <span style={{ position: "absolute", left: "33%", top: 66, fontSize: DS.micro, fontWeight: 700, color: c.brandInk, paddingLeft: 6 }}>驗收後併入產品</span>
    </div>
  );
}

function SummaryPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const rows: { Icon: LucideIcon; k: string; project: string; product: string }[] = [
    { Icon: Hourglass, k: "生命週期", project: "有明確結束", product: "持續迭代，沒有結束" },
    { Icon: Gauge, k: "衡量標準", project: "範疇、時程、成本（鐵三角，品質為其結果）", product: "用戶價值、商業價值、留存" },
    { Icon: GitPullRequest, k: "需求變動", project: "盡量凍結，變更需走 CR", product: "預期會變，擁抱變化" },
    { Icon: Lightbulb, k: "思考方式", project: "以終為始，規劃導向", product: "假設驗證，持續學習" },
  ];
  const cols = "150px 1fr 1fr";
  const projectsInfo: { art: ReactNode; k: string; v: string }[] = [
    { art: <Package p={p} x={6} y={6} s={30} />, k: "v1.0 開發上線", v: "有期限、有預算，驗收後結案" },
    { art: <CreditCard p={p} x={4} y={10} w={34} />, k: "金流串接", v: "一次性的整合任務" },
    { art: <Doc p={p} x={8} y={2} w={28} h={38} acc={p.gold} />, k: "v2.0 改版", v: "範疇明確的大改版" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1.25, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <SecHead n="一" Icon={Scale} title="四個面向對照" c={c} />
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 14, alignItems: "center", padding: "4px 0" }}>
            <span style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: ".1em", color: c.muted }}>比較項目</span>
            <div>
              <SideTag text="專案" tone={s.project} Icon={Flag} />
            </div>
            <div>
              <SideTag text="產品" tone={s.product} Icon={RefreshCw} />
            </div>
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateRows: "repeat(4, 1fr)", borderBottom: `1px solid ${c.border}` }}>
            {rows.map((r) => (
              <div key={r.k} style={{ display: "grid", gridTemplateColumns: cols, gap: 14, alignItems: "center", borderTop: `1px solid ${c.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, flex: "none", borderRadius: 10, background: c.sunken, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <r.Icon size={18} color={c.ink} />
                  </div>
                  <span style={{ fontSize: DS.body, fontWeight: 700, color: c.ink }}>{r.k}</span>
                </div>
                <div style={{ padding: "8px 14px", borderRadius: 10, background: s.project.soft, fontSize: DS.small, lineHeight: 1.5, color: c.ink }}>{r.project}</div>
                <div style={{ padding: "8px 14px", borderRadius: 10, background: s.product.soft, fontSize: DS.small, lineHeight: 1.5, color: c.ink }}>{r.product}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
          <SecHead n="二" Icon={Layers} title="產品裡包著好幾個專案" c={c} />
          <NestedMini c={c} p={p} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            {projectsInfo.map((pi) => (
              <div key={pi.k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0", borderTop: `1px solid ${c.border}` }}>
                <svg viewBox="0 0 44 44" width={40} height={40} aria-hidden="true" style={{ flex: "none" }}>
                  {pi.art}
                </svg>
                <span style={{ width: 120, flex: "none", fontSize: DS.small, fontWeight: 700, color: c.ink }}>{pi.k}</span>
                <span style={{ fontSize: DS.small, color: c.body }}>{pi.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Panel c={c} style={{ flex: "none", display: "flex", alignItems: "stretch", gap: 20, padding: 12 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 18, paddingLeft: 10 }}>
          <Users size={36} color={c.brand} style={{ flex: "none" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: DS.body, fontWeight: 900, color: c.brandInk }}>不是二選一</span>
            <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>
              結案之後，專案成果併回產品繼續經營。同一個 PM 可能這個月用專案的眼光管交付，下個月用產品的眼光看價值。
            </span>
          </div>
        </div>
        <div style={{ width: 440, flex: "none", display: "flex", alignItems: "center", gap: 16, padding: "12px 22px", borderRadius: 12, background: V.gradHeader }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: DTRACK.label, color: V.orange300 }}>NEXT</span>
            <span style={{ fontSize: DS.body, fontWeight: 900, color: V.n0 }}>第二章：Waterfall 還是 Agile</span>
            <span style={{ fontSize: DS.micro, color: "rgba(255,255,255,0.8)" }}>依「在管什麼」挑選方法論</span>
          </div>
          <ArrowUpRight size={34} color={V.orange300} style={{ flex: "none" }} />
        </div>
      </Panel>
    </div>
  );
}

// ── deck ────────────────────────────────────────────────────

const deck: Deck = {
  slug: "knowledge/project/pm-01-project-vs-product",
  title: "專案 V.S 產品",
  eyebrow: "PROJECT MANAGEMENT",
  generatedAt: "2026-09-26",
  source: "knowledge/project/pm-01-project-vs-product.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "PROJECT MANAGEMENT · 第一章",
      title: "專案 V.S 產品",
      subtitle: "動工前先分清手上的項目是「專案」還是「產品」：專案看重成果（鐵三角取捨），產品看重價值（四要素取捨）。",
      meta: ["2026-09-26", "專案管理基礎系列", "第 1 章"],
      agenda: [
        { n: "01", title: "專案（Project）與產品（Product）", sub: "專案看重成果，產品看重價值" },
        { n: "02", title: "需求變動", sub: "同樣是需求變了，意義完全相反" },
        { n: "03", title: "衡量指標", sub: "鐵三角與四要素的取捨" },
        { n: "04", title: "小結", sub: "兩者不是二選一" },
      ],
    },
    {
      layout: "custom",
      nav: "動工前的判斷",
      eyebrow: "BEFORE YOU START",
      title: "動工前，先判斷手上是專案還是產品",
      pill: { text: "先分清，再決定怎麼管", tone: "blue" },
      render: DecisionPage,
    },
    {
      layout: "section",
      nav: "專案與產品",
      num: "01",
      eyebrow: "PROJECT & PRODUCT",
      title: "專案（Project）與產品（Product）",
      subtitle: "專案為了交付特定成果而存在，產品持續為用戶與商業創造價值",
    },
    {
      layout: "custom",
      nav: "本質差異",
      num: "01",
      eyebrow: "PROJECT & PRODUCT",
      title: "專案與產品的本質差異",
      pill: { text: "專案看重成果，產品看重價值", tone: "blue" },
      render: FeaturesPage,
    },
    {
      layout: "custom",
      nav: "成果 × 價值",
      num: "01",
      eyebrow: "OUTCOME × VALUE",
      title: "成果與價值是兩條獨立的軸",
      pill: { text: "交付成功 ≠ 產品成功", tone: "orange" },
      render: QuadrantPage,
    },
    {
      layout: "full-visual",
      nav: "同一個時鐘",
      num: "01",
      eyebrow: "LIFECYCLE",
      title: "同一個時鐘下，專案停下來，產品繼續走",
      pill: { text: "專案會結案，產品不會", tone: "blue" },
      viz: PmLifecycle,
      vizLabel: "@ai-visualize · pm-lifecycle",
    },
    {
      layout: "section",
      nav: "需求變動",
      num: "02",
      eyebrow: "CHANGING REQUIREMENTS",
      title: "需求變動",
      subtitle: "同樣是「需求變了」，在兩種情境下的意義完全相反",
    },
    {
      layout: "custom",
      nav: "CR 與 Backlog",
      num: "02",
      eyebrow: "CHANGING REQUIREMENTS",
      title: "同一份需求變更，兩種處理方式",
      pill: { text: "時間尺度差一個量級", tone: "orange" },
      footnotes: [{ n: "*", text: "天數沿用筆記互動元件 pm-change-request 的示意值。" }],
      render: ChangePage,
    },
    {
      layout: "section",
      nav: "衡量指標",
      num: "03",
      eyebrow: "METRICS",
      title: "衡量指標",
      subtitle: "兩者對「成功長什麼樣子」的衡量標準也不同",
    },
    {
      layout: "custom",
      nav: "鐵三角與四要素",
      num: "03",
      eyebrow: "TRADE-OFFS",
      title: "鐵三角與四要素：成功的衡量方式不同",
      pill: { text: "資源有限，只能取捨", tone: "blue" },
      render: MetricsPage,
    },
    {
      layout: "section",
      nav: "小結",
      num: "04",
      eyebrow: "SUMMARY",
      title: "小結",
      subtitle: "同樣是 PM 的角色，在專案與產品的情境下，思考重點截然不同",
    },
    {
      layout: "custom",
      nav: "小結",
      num: "04",
      eyebrow: "SUMMARY",
      title: "同樣是 PM，思考重點截然不同",
      pill: { text: "不是二選一", tone: "orange" },
      render: SummaryPage,
    },
  ],
};

export default deck;
