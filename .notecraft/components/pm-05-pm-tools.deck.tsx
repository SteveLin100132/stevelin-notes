// Mgmt. Tool（管理工具）—— 簡報（note-deck）
//
// 報告式版面：右上 pill 是這頁的一句結論；內容區分成 2–3 個編號小節，欄與欄用細線分隔。
// 規劃期工具（WBS、工作包、Gantt）用藍，執行期工具（Kanban、Task）用橘；瓶頸、警戒用橘色強調；
// 狀態色只用在 8/80 粒度（理想／太細太大）與早期示警（介入選項多寡）。
// 插圖工具組、概念小圖、版面零件整段複製自 pm-04-waterfall-sdlc.deck.tsx（源自 pm-01～pm-03）。
// 顏色取自 dkt() 與 trendlink token 的 CSS 變數，不硬編色碼；人物只用中性剪影，不加星光類裝飾。

import type { CSSProperties, ReactNode } from "react";
import {
  AlarmClock,
  ArrowUpRight,
  Calculator,
  CalendarClock,
  ChartGantt,
  CircleCheck,
  ClipboardList,
  Eye,
  Gauge,
  GitBranch,
  Kanban,
  Layers,
  LayoutGrid,
  ListTree,
  MessagesSquare,
  Network,
  Package as PackageIcon,
  RefreshCw,
  Route,
  Ruler,
  ScrollText,
  ShieldAlert,
  Target,
  TrendingUp,
  TriangleAlert,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import { DGAP, DS, DTRACK } from "@/components/deck/scale";
import PmWbsGantt from "@notes/components/pm-wbs-gantt";
import PmKanbanFlow from "@notes/components/pm-kanban-flow";
import PmTaskBottleneck from "@notes/components/pm-task-bottleneck";

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

// ── pm-02 專用小圖 ───────────────────────────────────────────

function Stamp({ p, x, y, r, rot = 0 }: { p: P; x: number; y: number; r: number; rot?: number }) {
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <circle cx={x} cy={y} r={r} style={line(p.orange, 3)} />
      <circle cx={x} cy={y} r={r - 5} style={line(p.orange, 1.2)} />
      <path d={`M${x - r * 0.4} ${y}l${r * 0.28} ${r * 0.3} ${r * 0.5}-${r * 0.55}`} style={line(p.orange, 3)} />
    </g>
  );
}

function Diamond({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return <polygon points={`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`} style={fill(color)} />;
}

function MiniSdlc({ p }: { p: P }) {
  const xs = [10, 30, 50, 70, 90];
  return (
    <Svg vb={[100, 80]} width={80} label="小圖：一條從構思到退役的時間軸，每個階段掛著一份文件">
      <line x1={10} y1={22} x2={90} y2={22} style={line(p.grey, 3)} />
      {xs.map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={22} r={6} style={fill(i === 4 ? p.gold : p.navy)} />
          <rect x={x - 7} y={38} width={14} height={20} rx={2} style={{ fill: p.paper, stroke: p.lblue, strokeWidth: 1.5 }} />
          <rect x={x - 4} y={43} width={8} height={2} rx={1} style={fill(p.grey)} />
        </g>
      ))}
    </Svg>
  );
}

function MiniDocsWait({ p }: { p: P }) {
  return (
    <Svg vb={[100, 80]} width={80} label="小圖：一疊交接文件旁，客戶的螢幕還是空白、畫著問號">
      <Doc p={p} x={4} y={18} w={34} h={46} acc={p.lblue} rot={-8} />
      <Doc p={p} x={14} y={12} w={34} h={46} acc={p.navy} rot={4} />
      <Monitor p={p} x={52} y={14} w={44} h={36} bar={p.grey} />
      <QMark p={p} x={74} y={34} r={9} />
    </Svg>
  );
}

function MiniMilestones({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={96} label="小圖：一條時間軸上排著菱形里程碑，終點是旗子">
      <line x1={6} y1={48} x2={66} y2={48} style={line(p.lblue, 3)} />
      {[16, 32, 48].map((x) => (
        <Diamond key={x} x={x} y={48} r={7} color={p.gold} />
      ))}
      <FlagPole p={p} x={66} y={20} h={36} color={p.gold} />
    </Svg>
  );
}

function MiniLoopBoard({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={96} label="小圖：循環箭頭包著一塊小看板">
      <LoopArrow x={40} y={40} r={32} color={p.orange} w={4} />
      <Board p={p} x={20} y={24} w={40} h={32} cols={[2, 1]} hi={[0, 0]} />
    </Svg>
  );
}

function MiniRebuild({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={96} label="小圖：整份模組文件被打叉，旁邊蓋上 CR 簽核印章">
      <Doc p={p} x={8} y={8} w={40} h={54} acc={p.navy} />
      <path d="M14 20L42 52M42 20L14 52" style={line(p.orange, 4)} />
      <Stamp p={p} x={58} y={56} r={16} rot={-12} />
    </Svg>
  );
}

function BigFrozen({ p }: { p: P }) {
  return (
    <Svg vb={[160, 90]} width={230} label="小圖：一份上鎖的規格文件，接著交出一個打勾的包裹">
      <Doc p={p} x={8} y={10} w={50} h={68} acc={p.navy} />
      <Lock p={p} x={56} y={16} r={12} />
      <Arrow x1={70} y1={50} x2={96} y2={50} color={p.navy} w={2.5} />
      <Package p={p} x={104} y={28} s={46} />
      <Check p={p} x={150} y={32} r={10} />
    </Svg>
  );
}

function BigAdapt({ p }: { p: P }) {
  return (
    <Svg vb={[160, 90]} width={230} label="小圖：循環箭頭旁，螢幕上的指標持續往上">
      <LoopArrow x={36} y={46} r={26} color={p.orange} w={5} />
      <Monitor p={p} x={76} y={12} w={78} h={56} bar={p.orange}>
        <path d="M86 58L100 50 112 54 126 38 142 30" style={line(p.orange, 3)} />
      </Monitor>
    </Svg>
  );
}

// ── pm-02 版面零件 ───────────────────────────────────────────

/** 兩行清單列：icon + 粗體標題 + 說明（不固定標題寬） */
function StackRow({ Icon, k, v, tone, c }: { Icon: LucideIcon; k: string; v: string; tone: Tone; c: DeckThemeTokens }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderTop: `1px solid ${c.border}` }}>
      <Icon size={22} color={tone.fg} style={{ flex: "none", marginTop: 2 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: DS.body, fontWeight: 700, color: c.ink }}>{k}</span>
        <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{v}</span>
      </div>
    </div>
  );
}

/** 情境：一個 icon 章 + 名稱 */
function CaseRow({ Icon, k, tone, c }: { Icon: LucideIcon; k: string; tone: Tone; c: DeckThemeTokens }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 0", borderTop: `1px solid ${c.border}` }}>
      <div style={{ width: 40, height: 40, flex: "none", borderRadius: 11, background: tone.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={20} color={tone.fg} />
      </div>
      <span style={{ fontSize: DS.body, fontWeight: 700, color: c.ink }}>{k}</span>
    </div>
  );
}

/** 定義卡（直式）：小圖 + 標籤 + 標題 + 說明 */
function DefCard({ c, art, tag, title, desc, tone }: { c: DeckThemeTokens; art: ReactNode; tag: ReactNode; title: string; desc: string; tone: Tone }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 18px",
        borderRadius: 14,
        border: `1px solid ${c.border}`,
        borderTop: `4px solid ${tone.fg}`,
        background: c.slide,
      }}
    >
      {art}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        {tag}
        <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.ink }}>{title}</span>
        <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{desc}</span>
      </div>
    </div>
  );
}

function NextBand({ c, lead, title, sub }: { c: DeckThemeTokens; lead: ReactNode; title: string; sub: string }) {
  return (
    <Panel c={c} style={{ flex: "none", display: "flex", alignItems: "stretch", gap: 20, padding: 12 }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 18, paddingLeft: 10 }}>{lead}</div>
      <div style={{ width: 460, flex: "none", display: "flex", alignItems: "center", gap: 16, padding: "12px 22px", borderRadius: 12, background: V.gradHeader }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: DTRACK.label, color: V.orange300 }}>NEXT</span>
          <span style={{ fontSize: DS.body, fontWeight: 900, color: V.n0 }}>{title}</span>
          <span style={{ fontSize: DS.micro, color: "rgba(255,255,255,0.8)" }}>{sub}</span>
        </div>
        <ArrowUpRight size={34} color={V.orange300} style={{ flex: "none" }} />
      </div>
    </Panel>
  );
}

// ── pm-05 插圖 ─────────────────────────────────────────────

function LayersScene({ p }: { p: P }) {
  const leaves = [
    { t: "1.1", x: 24 },
    { t: "1.2", x: 96 },
    { t: "2.1", x: 186 },
    { t: "2.2", x: 258 },
  ];
  const gantt = [
    { t: "1.1", from: 0, to: 1 },
    { t: "1.2", from: 1, to: 2 },
    { t: "2.1", from: 1.5, to: 3 },
    { t: "2.2", from: 3, to: 4 },
  ];
  const cols = [
    { t: "待辦", n: 1 },
    { t: "進行", n: 2 },
    { t: "待驗", n: 4 },
    { t: "結案", n: 1 },
  ];
  return (
    <Svg vb={[720, 390]} label="插圖：規劃期把專案拆成交付物與 1.1、1.2、2.1、2.2 工作包，再排上 W1 到 W4 的甘特時間軸；執行期用四欄看板追蹤卡片流動，待驗欄堆積最多，旁邊一張 Task 卡記錄預計、實際、驗收日期與執行人、驗收人">
      <Chip p={p} x={86} y={6} w={170} text="規劃期：範圍與時程" color={p.navy} />
      <Chip p={p} x={464} y={6} w={170} text="執行期：流動與紀錄" color={p.orange} />
      <line x1={360} y1={20} x2={360} y2={380} style={line(p.grey, 2, { strokeDasharray: "3 8" })} />
      {/* WBS 樹 */}
      <path d="M170 64V76M84 76H258M84 76V92M258 76V92M84 116V128M50 128H122M50 128V142M122 128V142M258 116V128M222 128H294M222 128V142M294 128V142" style={line(p.navy, 2)} />
      <Chip p={p} x={140} y={42} w={60} text="專案" color={p.navy} />
      <Chip p={p} x={48} y={96} w={72} text="交付物 1" color={p.blue} />
      <Chip p={p} x={222} y={96} w={72} text="交付物 2" color={p.blue} />
      {leaves.map((l) => (
        <Chip key={l.t} p={p} x={l.x + 8} y={146} w={52} text={l.t} color={p.lblue} />
      ))}
      <Arrow x1={170} y1={176} x2={170} y2={206} color={p.navy} w={2.5} />
      {/* Gantt */}
      <rect x={30} y={214} width={300} height={150} rx={8} style={fs(p.paper, p.ink)} />
      {["W1", "W2", "W3", "W4"].map((w, i) => (
        <text key={w} x={96 + i * 58 + 29} y={234} textAnchor="middle" style={{ fill: p.ink, fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>
          {w}
        </text>
      ))}
      {gantt.map((g, i) => (
        <g key={g.t}>
          <text x={46} y={264 + i * 26} style={{ fill: p.ink, fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>
            {g.t}
          </text>
          <rect x={96 + g.from * 58} y={253 + i * 26} width={(g.to - g.from) * 58 - 4} height={14} rx={4} style={fill(i % 2 ? p.blue : p.navy)} />
        </g>
      ))}
      {/* Kanban */}
      <rect x={384} y={42} width={318} height={196} rx={8} style={fs(p.paper, p.ink)} />
      {cols.map((col, k) => {
        const x = 394 + k * 77;
        return (
          <g key={col.t}>
            <Chip p={p} x={x} y={52} w={68} text={col.t} color={k === 2 ? p.orange : p.navy} />
            {Array.from({ length: col.n }).map((_, j) => (
              <rect key={j} x={x + 4} y={80 + j * 36} width={60} height={28} rx={4} style={fill(k === 2 ? p.gold : k === 3 ? p.green : p.lblue)} />
            ))}
          </g>
        );
      })}
      {/* Task 卡 */}
      <rect x={430} y={258} width={250} height={112} rx={8} style={fs(p.paper, p.ink)} />
      <rect x={430} y={258} width={250} height={22} rx={8} style={fill(p.orange)} />
      <rect x={430} y={270} width={250} height={10} style={fill(p.orange)} />
      <text x={444} y={274} style={{ fill: p.white, fontSize: 12, fontWeight: 700 }}>Task · Verified</text>
      {[
        ["預計", "03/02 – 03/05"],
        ["實際", "03/02 – 03/08"],
        ["驗收", "03/09 – 03/16"],
        ["人員", "執行人・驗收人"],
      ].map(([k, v], i) => (
        <g key={k}>
          <text x={446} y={300 + i * 19} style={{ fill: p.ink, fontSize: 12, fontWeight: 700 }}>
            {k}
          </text>
          <text x={490} y={300 + i * 19} style={{ fill: p.ink, fontFamily: MONO, fontSize: 12 }}>
            {v}
          </text>
        </g>
      ))}
    </Svg>
  );
}

function KanbanScene({ p }: { p: P }) {
  const cols = ["To Do", "In Progress", "Review", "Done"];
  const lanes = [
    { t: "新功能", y: 74, n: [2, 1, 3, 1] },
    { t: "Bug", y: 204, n: [1, 1, 2, 0] },
  ];
  const pin = (n: number, x: number, y: number) => (
    <g key={`pin${n}`}>
      <circle cx={x} cy={y} r={12} style={fill(p.orange)} />
      <text x={x} y={y + 4.5} textAnchor="middle" style={{ fill: p.white, fontFamily: MONO, fontSize: 13, fontWeight: 900 }}>
        {n}
      </text>
    </g>
  );
  return (
    <Svg vb={[640, 350]} label="插圖：一塊看板，四欄 To Do、In Progress、Review、Done，兩條泳道分別是新功能與 Bug；Review 欄卡片堆積最多並標橘，欄頭標出 WIP 上限；編號 1 到 5 標出看板、欄位、卡片、WIP Limit、泳道">
      <rect x={16} y={16} width={610} height={322} rx={12} style={fs(p.paper, p.ink)} />
      {cols.map((c, k) => {
        const x = 110 + k * 128;
        return (
          <g key={c}>
            <rect x={x} y={28} width={118} height={300} rx={8} style={fill(k === 2 ? p.sky2 : p.sky)} />
            <Chip p={p} x={x + 6} y={36} w={106} text={c} color={k === 2 ? p.orange : p.navy} />
            {(k === 1 || k === 2) && <Chip p={p} x={x + 30} y={58} w={58} text="WIP 3" color={p.grey} />}
          </g>
        );
      })}
      <line x1={24} y1={196} x2={618} y2={196} style={line(p.grey, 2, { strokeDasharray: "6 6" })} />
      {lanes.map((ln) => (
        <g key={ln.t}>
          <Chip p={p} x={26} y={ln.y + 30} w={74} text={ln.t} color={p.blue} />
          {ln.n.map((cnt, k) =>
            Array.from({ length: cnt }).map((_, j) => (
              <rect key={`${k}-${j}`} x={110 + k * 128 + 11} y={ln.y + 12 + j * 34} width={96} height={26} rx={5} style={fill(k === 2 ? p.gold : k === 3 ? p.green : p.lblue)} />
            )),
          )}
        </g>
      ))}
      {pin(1, 28, 28)}
      {pin(2, 238 + 116, 22)}
      {pin(3, 128, 120)}
      {pin(4, 490, 66)}
      {pin(5, 28, 250)}
    </Svg>
  );
}

// ── P2 工具分工 ────────────────────────────────────────────

function ToolsPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const tools: { Icon: LucideIcon; k: string; q: string; layer: string; exec?: boolean }[] = [
    { Icon: Network, k: "WBS", q: "要做哪些事？（範圍）", layer: "規劃" },
    { Icon: PackageIcon, k: "工作包", q: "範圍拆到最小是哪一塊？", layer: "拆解" },
    { Icon: ChartGantt, k: "Gantt", q: "什麼時候做、誰先誰後？", layer: "排程" },
    { Icon: Kanban, k: "Kanban", q: "現在進行到哪了？（流動）", layer: "追蹤", exec: true },
    { Icon: ClipboardList, k: "Task", q: "這件事的細節與紀錄？（執行）", layer: "執行", exec: true },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ width: 540, flex: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          <SecHead n="一" Icon={Layers} title="五種工具的分工" c={c} note="依過去經驗整理" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            {tools.map((t) => {
              const tone = t.exec ? s.product : s.project;
              return (
                <div key={t.k} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderTop: `1px solid ${c.border}` }}>
                  <div style={{ width: 40, height: 40, flex: "none", borderRadius: 11, background: tone.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <t.Icon size={20} color={tone.fg} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: DS.body, fontWeight: 900, color: c.ink }}>{t.k}</span>
                    <span style={{ fontSize: DS.small, color: c.body }}>{t.q}</span>
                  </div>
                  <span style={{ flex: "none", padding: "2px 12px", borderRadius: 999, background: tone.solid, fontSize: DS.micro, fontWeight: 700, color: tone.onSolid }}>{t.layer}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
          <SecHead n="二" Icon={Route} title="規劃期與執行期" c={c} note="一條由範圍到執行的鏈" />
          <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
            <LayersScene p={p} />
          </Panel>
        </div>
      </div>
      <Concl c={c}>範圍與時程（WBS、工作包、Gantt）偏規劃期使用；流動與紀錄（Kanban、Task）偏執行期使用。</Concl>
    </div>
  );
}

// ── P4 WBS 兩條規則 ─────────────────────────────────────────

function GrainRuler({ c }: { c: DeckThemeTokens }) {
  const pos = (h: number) => (Math.log2(h) / Math.log2(160)) * 100;
  const ticks = [1, 2, 4, 8, 16, 40, 80, 160];
  const zones = [
    { from: 0, to: pos(8), t: "太細", bg: c.warningSoft, fg: c.warning },
    { from: pos(8), to: pos(80), t: "理想", bg: c.goodSoft, fg: c.good },
    { from: pos(80), to: 100, t: "太大", bg: c.warningSoft, fg: c.warning },
  ];
  const marks = [
    { h: 1, t: "改一段文字 1h" },
    { h: 16, t: "登入頁 16h" },
    { h: 160, t: "整個後台 160h" },
  ];
  return (
    <div
      role="img"
      aria-label="8/80 粒度尺（對數刻度）：8 小時以下太細、8 到 80 小時理想、80 小時以上太大；例子是改一段文字 1 小時、登入頁 16 小時、整個後台 160 小時"
      style={{ position: "relative", height: 132, margin: "0 18px" }}
    >
      {zones.map((z) => (
        <div
          key={z.t}
          style={{
            position: "absolute",
            left: `${z.from}%`,
            width: `${z.to - z.from}%`,
            top: 30,
            height: 36,
            background: z.bg,
            borderTop: `3px solid ${z.fg}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            fontSize: DS.small,
            fontWeight: 900,
            color: z.fg,
          }}
        >
          {z.t === "理想" ? <CircleCheck size={16} color={z.fg} /> : <TriangleAlert size={16} color={z.fg} />}
          {z.t}
        </div>
      ))}
      {ticks.map((t) => (
        <div key={t} style={{ position: "absolute", left: `${pos(t)}%`, top: 66, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 2, height: 8, background: c.border }} />
          <span style={{ fontFamily: MONO, fontSize: DS.micro, fontWeight: t === 8 || t === 80 ? 900 : 400, color: t === 8 || t === 80 ? c.ink : c.muted }}>
            {t}h
          </span>
        </div>
      ))}
      {marks.map((m, i) => (
        <div
          key={m.t}
          style={{
            position: "absolute",
            left: `${pos(m.h)}%`,
            top: 0,
            transform: i === 0 ? "none" : i === 2 ? "translateX(-100%)" : "translateX(-50%)",
            fontSize: DS.micro,
            fontWeight: 700,
            color: c.body,
            whiteSpace: "nowrap",
          }}
        >
          {m.t}
        </div>
      ))}
      <span style={{ position: "absolute", right: 0, top: 106, fontSize: DS.micro, color: c.muted }}>對數刻度</span>
    </div>
  );
}

function WbsPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const kids = [
    { t: "2.1 業務流程", h: 16 },
    { t: "2.2 Schema", h: 16 },
    { t: "2.3 API 規格", h: 24 },
    { t: "2.4 UI Mockup", h: 16 },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <SecHead n="一" Icon={ListTree} title="100% Rule" c={c} note="子節點加總 = 父節點" />
        <Panel c={c} style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 0, padding: "16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 10, background: V.blue700 }}>
            <span style={{ fontSize: DS.small, fontWeight: 900, color: V.n0 }}>2. 設計</span>
            <span style={{ fontFamily: MONO, fontSize: DS.small, fontWeight: 900, color: V.orange300 }}>Σ 72h</span>
          </div>
          <div style={{ width: 2, height: 12, background: c.border }} />
          <div style={{ alignSelf: "stretch", margin: "0 12%", height: 12, borderTop: `2px solid ${c.border}`, borderLeft: `2px solid ${c.border}`, borderRight: `2px solid ${c.border}` }} />
          <div style={{ alignSelf: "stretch", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {kids.map((k) => (
              <div key={k.t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 4px", borderRadius: 10, background: c.slide, border: `1px solid ${c.border}` }}>
                <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.ink, textAlign: "center" }}>{k.t}</span>
                <span style={{ fontFamily: MONO, fontSize: DS.small, fontWeight: 900, color: c.brand }}>{k.h}h</span>
              </div>
            ))}
          </div>
          <span style={{ marginTop: 10, fontFamily: MONO, fontSize: DS.small, fontWeight: 700, color: c.ink }}>16 + 16 + 24 + 16 = 72h（100%）</span>
        </Panel>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          <StackRow c={c} tone={s.project} Icon={ListTree} k="樹狀結構" v="專案總目標 → 主要交付物 → 子交付物 → 工作包" />
          <StackRow c={c} tone={s.project} Icon={PackageIcon} k="以交付物為導向" v="以成果命名，不是拆成一堆動詞清單" />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
        <SecHead n="二" Icon={Ruler} title="8/80 粒度" c={c} note="末端工作包的工時" />
        <Panel c={c} style={{ flex: "none", padding: "16px 4px 8px" }}>
          <GrainRuler c={c} />
        </Panel>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          <StackRow c={c} tone={s.product} Icon={TriangleAlert} k="太大" v="難以估時與追蹤，風險被掩蓋" />
          <StackRow c={c} tone={s.product} Icon={TriangleAlert} k="太細" v="管理成本超過實際產出的價值" />
          <StackRow c={c} tone={s.project} Icon={CircleCheck} k="理想" v="能被一個負責人扛起，驗收標準明確" />
        </div>
      </div>
      <div style={{ width: 340, flex: "none", display: "flex", flexDirection: "column", gap: 6, ...divider(c) }}>
        <SecHead n="三" Icon={Target} title="為什麼 PM 需要 WBS" c={c} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          <StackRow c={c} tone={s.project} Icon={Target} k="確認範圍" v="沒列進 WBS 的，預設就不在範圍內" />
          <StackRow c={c} tone={s.project} Icon={Calculator} k="估算的基礎" v="沒有拆解，就沒有工時與成本估算" />
          <StackRow c={c} tone={s.project} Icon={ShieldAlert} k="風險識別" v="浮現原本沒想到的依賴與盲點" />
          <StackRow c={c} tone={s.project} Icon={UserCheck} k="指派責任" v="每個工作包都有負責人（RACI 的 R）" />
          <StackRow c={c} tone={s.project} Icon={Layers} k="承接後續工具" v="Gantt、Kanban、Task 都從工作包展開" />
        </div>
      </div>
    </div>
  );
}

// ── P7 Kanban ──────────────────────────────────────────────

function KanbanPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const elems: { k: string; v: string }[] = [
    { k: "Board 看板", v: "代表整個工作流的板子" },
    { k: "Column 欄位", v: "對應工作流的每個階段" },
    { k: "Card 卡片", v: "對應一個 Task，由左往右流動" },
    { k: "WIP Limit", v: "每欄同時存在的卡片數量上限" },
    { k: "Swimlane 泳道", v: "橫向切分不同類型的工作" },
  ];
  const states = [
    { t: "Open", v: "待辦" },
    { t: "On Going", v: "進行中" },
    { t: "Done", v: "待驗收" },
    { t: "Verified", v: "待結案" },
    { t: "Closed", v: "已結案" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1.25, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <SecHead n="一" Icon={LayoutGrid} title="基本元素" c={c} />
          <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 14 }}>
            <Panel c={c} style={{ flex: 1.3, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
              <KanbanScene p={p} />
            </Panel>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
              {elems.map((e, i) => (
                <div key={e.k} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: `1px solid ${c.border}` }}>
                  <span style={{ width: 24, height: 24, flex: "none", borderRadius: 999, background: V.orange400, color: V.n0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: DS.micro, fontWeight: 900 }}>{i + 1}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ fontSize: DS.small, fontWeight: 900, color: c.ink }}>{e.k}</span>
                    <span style={{ fontSize: DS.micro, lineHeight: 1.45, color: c.body }}>{e.v}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ width: 360, flex: "none", display: "flex", flexDirection: "column", gap: 6, ...divider(c) }}>
          <SecHead n="二" Icon={Eye} title="核心精神" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            <StackRow c={c} tone={s.product} Icon={Eye} k="視覺化" v="一眼看到目前狀態與卡關處" />
            <StackRow c={c} tone={s.product} Icon={Gauge} k="限制 WIP" v="先完成、再開始，避免同時推太多" />
            <StackRow c={c} tone={s.product} Icon={TrendingUp} k="管理流動" v="用 Lead Time、Cycle Time 反推瓶頸" />
            <StackRow c={c} tone={s.product} Icon={ScrollText} k="明確的流程政策" v="每欄寫清楚進入條件與完成定義" />
            <StackRow c={c} tone={s.product} Icon={RefreshCw} k="持續改善" v="定期檢視瓶頸，調整欄位與 WIP" />
          </div>
        </div>
      </div>
      <Panel c={c} style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px" }}>
        <div style={{ width: 130, flex: "none", display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: DS.small, fontWeight: 900, color: c.accent }}>我的狀態流</span>
          <span style={{ fontSize: DS.micro, color: c.muted }}>驗收、結案獨立出來</span>
        </div>
        {states.map((st, i) => (
          <div key={st.t} style={{ display: "contents" }}>
            {i > 0 && (
              <svg viewBox="0 0 20 14" width={18} height={14} aria-hidden="true" style={{ flex: "none" }}>
                <path d="M1 7H14M10 3L14 7 10 11" style={line(V.blue300, 2)} />
              </svg>
            )}
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 6, padding: "6px 10px", borderRadius: 10, background: c.slide, border: i >= 2 && i <= 3 ? `1.5px solid ${V.orange400}` : `1px solid ${c.border}` }}>
              <span style={{ fontSize: DS.small, fontWeight: 900, color: c.ink, whiteSpace: "nowrap" }}>{st.t}</span>
              <span style={{ fontSize: DS.micro, color: c.muted, whiteSpace: "nowrap" }}>{st.v}</span>
            </div>
          </div>
        ))}
        <div style={{ width: 250, flex: "none", paddingLeft: 10 }}>
          <Note c={c}>Pending／Cancelled 用標籤或泳道處理，不放成欄位</Note>
        </div>
      </Panel>
    </div>
  );
}

// ── P10 Task 欄位與狀態 ──────────────────────────────────────

function StatusMap({ c }: { c: DeckThemeTokens }) {
  const mine = [
    { t: "Open", v: "待辦" },
    { t: "On Going", v: "進行中" },
    { t: "Done", v: "待驗收" },
    { t: "Verified", v: "待結案" },
    { t: "Closed", v: "已結案" },
  ];
  const box = (t: string, v: string, hot = false): ReactNode => (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 4px", borderRadius: 10, background: hot ? c.accentSoft : c.slide, border: hot ? `1.5px solid ${V.orange400}` : `1px solid ${c.border}` }}>
      <span style={{ fontSize: DS.small, fontWeight: 900, color: c.ink, whiteSpace: "nowrap" }}>{t}</span>
      <span style={{ fontSize: DS.micro, color: c.muted }}>{v}</span>
    </div>
  );
  const gap = 10;
  return (
    <div
      role="img"
      aria-label="兩套狀態對照：上排是我的習慣 Open、On Going、Done、Verified、Closed；下排是一般作法 To Do、In Progress、Done；我的 Done、Verified、Closed 都落在一般作法的 Done 裡，拆開後驗收耗時與結案耗時才量得到；Pending 與 Cancelled 從主線分出，是離開流動"
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.accent }}>我的習慣</span>
      <div style={{ display: "flex", gap }}>{mine.map((m, i) => <div key={m.t} style={{ flex: 1, display: "flex" }}>{box(m.t, m.v, i >= 2)}</div>)}</div>
      <div style={{ display: "flex", gap, height: 26 }}>
        <div style={{ flex: 2 + 0.1 }} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: DS.micro, fontWeight: 700, color: c.accent, whiteSpace: "nowrap" }}>驗收耗時 →</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: DS.micro, fontWeight: 700, color: c.accent, whiteSpace: "nowrap" }}>結案耗時 →</div>
        <div style={{ flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap }}>
        <div style={{ flex: 2, marginLeft: `calc((100% - ${gap * 4}px) / 5 * 2 + ${gap * 2}px)` }}>
          <div style={{ height: 12, borderLeft: `2px solid ${V.orange400}`, borderRight: `2px solid ${V.orange400}`, borderBottom: `2px solid ${V.orange400}` }} />
        </div>
      </div>
      <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.brandInk }}>一般作法</span>
      <div style={{ display: "flex", gap }}>
        <div style={{ flex: 1, display: "flex" }}>{box("To Do", "尚未開始")}</div>
        <div style={{ flex: 1, display: "flex" }}>{box("In Progress", "進行中")}</div>
        <div style={{ flex: 3, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 10px", borderRadius: 10, background: c.brandSoft, border: `1px solid ${c.border}`, gap: 8 }}>
          <span style={{ fontSize: DS.small, fontWeight: 900, color: c.ink }}>Done</span>
          <span style={{ fontSize: DS.micro, color: c.muted }}>驗收與結案都包在這一格，量不到各花多久</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
        <GitBranch size={18} color={c.muted} />
        <span style={{ padding: "2px 12px", borderRadius: 999, border: `1.5px dashed ${c.muted}`, fontSize: DS.micro, fontWeight: 700, color: c.body }}>Pending 暫離</span>
        <span style={{ padding: "2px 12px", borderRadius: 999, border: `1.5px dashed ${c.muted}`, fontSize: DS.micro, fontWeight: 700, color: c.body }}>Cancelled 退出</span>
        <span style={{ fontSize: DS.micro, color: c.muted }}>從主線分出，是離開流動</span>
      </div>
    </div>
  );
}

function TaskPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const times = ["預計完成起訖時間", "實際完成起訖時間", "驗收起訖時間", "上線時間"];
  const people = ["需求提案人", "需求審核人", "執行人", "驗收人", "上線審核人"];
  const listCol = (items: string[], Icon: LucideIcon) => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
      {items.map((t) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${c.border}` }}>
          <Icon size={18} color={s.product.fg} style={{ flex: "none" }} />
          <span style={{ fontSize: DS.small, fontWeight: 700, color: c.ink }}>{t}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ width: 240, flex: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        <SecHead n="一" Icon={CalendarClock} title="時間欄位" c={c} />
        {listCol(times, CalendarClock)}
      </div>
      <div style={{ width: 240, flex: "none", display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
        <SecHead n="二" Icon={Users} title="人員欄位" c={c} />
        {listCol(people, UserCheck)}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
        <SecHead n="三" Icon={GitBranch} title="兩套狀態對照" c={c} note="同一條流程，後段細緻度不同" />
        <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "14px 18px" }}>
          <StatusMap c={c} />
        </Panel>
        <Concl c={c}>把壓在 Done 裡的驗收與結案拉出來，這兩段的耗時才量得到，瓶頸才看得見。</Concl>
      </div>
    </div>
  );
}

// ── P12 反推瓶頸、及早介入 ───────────────────────────────────

function BottleneckPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const nodes = ["建立", "開始", "完成", "驗收", "上線"];
  const segs = [
    { k: "Open → On Going", v: "問題還在釐清、資源不足或優先級不清" },
    { k: "實際完成起訖", v: "工作量與估時準確度" },
    { k: "Done → Verified", v: "驗收方的負荷，最容易卡關", hot: true },
    { k: "Verified → 上線", v: "上線審核或部署排程卡關" },
  ];
  const days = [2, 2, 3, 3, 4, 5, 6, 8];
  const MAXD = 10;
  const CH = 190;
  const options: { at: string; opts: string[] }[] = [
    { at: "T6 就介入", opts: ["補人", "調範圍", "改順序", "調整時程"] },
    { at: "T7 介入", opts: ["調範圍", "調整時程"] },
    { at: "T8 才發現", opts: ["硬扛"] },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        <SecHead n="一" Icon={Route} title="四段區間，各自反映不同的問題" c={c} />
        <div style={{ display: "flex", alignItems: "stretch", gap: 16 }}>
          <Panel c={c} style={{ flex: 1, minWidth: 0, padding: "12px 18px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {nodes.map((n, i) => (
                <div key={n} style={{ display: "contents" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
                    <span style={{ width: 12, height: 12, borderRadius: 999, background: V.blue700 }} />
                    <span style={{ fontSize: DS.small, fontWeight: 900, color: c.ink }}>{n}</span>
                  </div>
                  {i < nodes.length - 1 && <div style={{ flex: 1, height: 4, margin: "0 10px", borderRadius: 2, background: segs[i].hot ? V.orange400 : V.blue300 }} />}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, paddingTop: 10 }}>
              {segs.map((sg) => (
                <div key={sg.k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontFamily: MONO, fontSize: DS.micro, fontWeight: 700, color: sg.hot ? c.accent : c.brand }}>{sg.k}</span>
                  <span style={{ fontSize: DS.small, lineHeight: 1.4, color: c.body }}>{sg.v}</span>
                </div>
              ))}
            </div>
          </Panel>
          <div style={{ width: 300, flex: "none", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, padding: "12px 18px", borderRadius: 14, border: `1.5px solid ${V.orange400}`, background: c.accentSoft }}>
            <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.accent }}>完成時間拆兩欄</span>
            <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.ink }}>預計 − 實際 ＝ 估時誤差</span>
            <span style={{ fontSize: DS.micro, lineHeight: 1.45, color: c.body }}>長期記錄，讓每一次的規劃都比上一次更準</span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <SecHead n="二" Icon={TrendingUp} title="看趨勢、及早介入" c={c} note="驗收段耗時（天，示意）" />
          <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 16 }}>
            <div
              role="img"
              aria-label="連續八個任務的驗收段耗時為 2、2、3、3、4、5、6、8 天，第 6 個任務起超過 4 天的警戒線；數據先示警，但當事人說再一下就好，拖到第 8 個任務才被發現"
              style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
            >
              <div style={{ position: "relative", height: CH, display: "flex", alignItems: "flex-end", gap: 10, borderBottom: `2px solid ${c.border}` }}>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: (4 / MAXD) * CH, borderTop: `2px dashed ${V.orange400}` }} />
                <span style={{ position: "absolute", left: 4, bottom: (4 / MAXD) * CH + 4, fontSize: DS.micro, fontWeight: 700, color: c.accent }}>警戒 4 天</span>
                {days.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontFamily: MONO, fontSize: DS.micro, fontWeight: 700, color: d > 4 ? c.accent : c.muted }}>{d}</span>
                    <div style={{ width: "100%", height: (d / MAXD) * CH, borderRadius: "5px 5px 0 0", background: d > 4 ? V.orange400 : V.blue300 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                {days.map((_, i) => (
                  <span key={i} style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: DS.micro, fontWeight: 700, color: c.muted }}>
                    T{i + 1}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6 }}>
                <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.accent }}>T6：數據先示警，當事人說「再一下就好」</span>
                <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.critical }}>T8 才被發現</span>
              </div>
            </div>
            <div style={{ width: 250, flex: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted }}>發現時還能動用的處理方式</span>
              {options.map((o, i) => (
                <div key={o.at} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px", borderRadius: 10, border: `1px solid ${c.border}`, background: i === 0 ? c.goodSoft : i === 2 ? c.criticalSoft : c.slide }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: DS.small, fontWeight: 900, color: c.ink }}>{o.at}</span>
                    <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted }}>{o.opts.length} 種</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {o.opts.map((op) => (
                      <span key={op} style={{ padding: "0 8px", borderRadius: 999, background: c.slide, border: `1px solid ${c.border}`, fontSize: DS.micro, color: c.body }}>
                        {op}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ width: 340, flex: "none", display: "flex", flexDirection: "column", gap: 6, ...divider(c) }}>
          <SecHead n="三" Icon={AlarmClock} title="不必等人開口" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            <StackRow c={c} tone={s.product} Icon={TrendingUp} k="看趨勢，不只看單點" v="連續拉長，數據就先示警" />
            <StackRow c={c} tone={s.product} Icon={MessagesSquare} k="主動把問題攤開來談" v="把「報憂」從個人轉到流程上" />
            <StackRow c={c} tone={s.product} Icon={AlarmClock} k="早介入，便宜解決" v="越早抓到，可用的選項越多" />
          </div>
          <Concl c={c}>把「靠運氣發現」變成「靠機制發現」。</Concl>
        </div>
      </div>
    </div>
  );
}

// ── P14 小結 ───────────────────────────────────────────────

function SummaryPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const rows: { Icon: LucideIcon; k: string; role: string; use: string; exec?: boolean }[] = [
    { Icon: Network, k: "WBS", role: "由上而下拆解交付物，界定整個專案的範圍", use: "專案啟動、要確認「做什麼、不做什麼」時先攤開" },
    { Icon: PackageIcon, k: "工作包", role: "WBS 的末端節點，範圍的最小單位", use: "拆到能被一個人扛起、驗收標準明確就停（8/80）" },
    { Icon: ChartGantt, k: "Gantt", role: "把工作包排上時間軸，看起訖、依賴與時程", use: "直接在 WBS 上加開始日、工時欄位反推時程" },
    { Icon: Kanban, k: "Kanban", role: "追蹤 Task 的流動狀態，讓瓶頸現形", use: "日常推進時看哪一欄堆積，反推卡點", exec: true },
    { Icon: ClipboardList, k: "Task", role: "執行單元，記錄人、時間、狀態", use: "用細緻的時間欄位反推每段耗時、校正估時", exec: true },
  ];
  const cols = "96px 150px 1fr 1fr";
  const chapters = ["在管什麼", "怎麼做", "誰來做", "經典怎麼跑", "用什麼做"];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <SecHead n="一" Icon={Layers} title="五種工具的角色與使用情境" c={c} />
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 14, padding: "2px 0" }}>
          {["階段", "工具", "在流程中的角色", "我的使用情境"].map((h) => (
            <span key={h} style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: ".1em", color: c.muted }}>
              {h}
            </span>
          ))}
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateRows: "repeat(5, 1fr)", borderBottom: `1px solid ${c.border}` }}>
          {rows.map((r, i) => {
            const tone = r.exec ? s.product : s.project;
            const first = i === 0 || i === 3;
            return (
              <div key={r.k} style={{ display: "grid", gridTemplateColumns: cols, gap: 14, alignItems: "center", borderTop: first ? `2px solid ${c.border}` : `1px solid ${c.borderSoft}` }}>
                <span style={{ fontSize: DS.micro, fontWeight: 700, color: tone.ink }}>{first ? (r.exec ? "執行期" : "規劃期") : ""}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, flex: "none", borderRadius: 10, background: tone.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <r.Icon size={18} color={tone.fg} />
                  </div>
                  <span style={{ fontSize: DS.body, fontWeight: 900, color: c.ink }}>{r.k}</span>
                </div>
                <span style={{ fontSize: DS.small, lineHeight: 1.45, color: c.body }}>{r.role}</span>
                <span style={{ fontSize: DS.small, lineHeight: 1.45, color: c.body }}>{r.use}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Panel c={c} style={{ flex: "none", display: "flex", alignItems: "stretch", gap: 20, padding: 12 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, padding: "4px 10px" }}>
          <span style={{ fontSize: DS.body, fontWeight: 900, color: c.brandInk }}>系列回顧</span>
          <div role="img" aria-label="五章路徑：在管什麼、怎麼做、誰來做、經典怎麼跑、用什麼做；本章是最後一章" style={{ display: "flex", alignItems: "center" }}>
            {chapters.map((ch, i) => (
              <div key={ch} style={{ display: "contents" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
                  <span style={{ width: 22, height: 22, borderRadius: 999, background: i === 4 ? V.orange400 : V.blue700, color: i === 4 ? V.n900 : V.n0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: DS.micro, fontWeight: 900 }}>{i + 1}</span>
                  <span style={{ fontSize: DS.small, fontWeight: i === 4 ? 900 : 700, color: i === 4 ? c.accent : c.ink }}>{ch}</span>
                </div>
                {i < chapters.length - 1 && <div style={{ flex: 1, height: 2, margin: "0 10px", background: V.blue300 }} />}
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: 340, flex: "none", display: "flex", alignItems: "center", gap: 16, padding: "12px 22px", borderRadius: 12, background: V.gradHeader }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: DTRACK.label, color: V.orange300 }}>BACK</span>
            <span style={{ fontSize: DS.body, fontWeight: 900, color: V.n0 }}>回到學習地圖</span>
            <span style={{ fontSize: DS.micro, color: "rgba(255,255,255,0.8)" }}>看整條路徑</span>
          </div>
          <ArrowUpRight size={34} color={V.orange300} style={{ flex: "none" }} />
        </div>
      </Panel>
    </div>
  );
}

// ── deck ────────────────────────────────────────────────────

const deck: Deck = {
  slug: "knowledge/project/pm-05-pm-tools",
  title: "Mgmt. Tool（管理工具）",
  eyebrow: "PROJECT MANAGEMENT",
  generatedAt: "2026-09-26",
  source: "knowledge/project/pm-05-pm-tools.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "PROJECT MANAGEMENT · 第五章",
      title: "Mgmt. Tool（管理工具）",
      subtitle: "四種專案管理工具的分工與串接：WBS 拆範圍、Gantt 排時程、Kanban 追流動、Task 記執行。",
      meta: ["2026-09-26", "專案管理基礎系列", "第 5 章"],
      agenda: [
        { n: "01", title: "WBS（Work Breakdown Structure）", sub: "100% Rule 與 8/80 粒度" },
        { n: "02", title: "Kanban（看板）", sub: "卡片堆在哪，瓶頸就在哪" },
        { n: "03", title: "Task（任務）", sub: "時間欄位反推瓶頸" },
        { n: "04", title: "小結", sub: "工具是一條鏈" },
      ],
    },
    {
      layout: "custom",
      nav: "工具分工",
      eyebrow: "OVERVIEW",
      title: "四種工具，一條從範圍到執行的鏈",
      pill: { text: "按層級區分使用情境", tone: "blue" },
      render: ToolsPage,
    },
    {
      layout: "section",
      nav: "WBS",
      num: "01",
      eyebrow: "WORK BREAKDOWN STRUCTURE",
      title: "WBS（Work Breakdown Structure）",
      subtitle: "把專案的最終交付物，由上而下層層拆解成可以被管理、估時、指派的工作單元",
    },
    {
      layout: "custom",
      nav: "WBS 規則",
      num: "01",
      eyebrow: "WBS",
      title: "WBS：以交付物為導向，由上而下拆解",
      pill: { text: "沒列進 WBS 的，就不在範圍", tone: "orange" },
      render: WbsPage,
    },
    {
      layout: "full-visual",
      nav: "WBS → Gantt",
      num: "01",
      eyebrow: "WBS + GANTT",
      title: "WBS 加上時間欄位，就是 Gantt",
      pill: { text: "改工時，看加總與時程一起變", tone: "blue" },
      viz: PmWbsGantt,
      vizLabel: "@ai-visualize · pm-wbs-gantt",
    },
    {
      layout: "section",
      nav: "Kanban",
      num: "02",
      eyebrow: "KANBAN",
      title: "Kanban（看板）",
      subtitle: "把工作流視覺化，並限制在製品數量，讓瓶頸無所遁形",
    },
    {
      layout: "custom",
      nav: "Kanban 元素",
      num: "02",
      eyebrow: "KANBAN",
      title: "Kanban：把工作流視覺化",
      pill: { text: "卡片堆在哪，瓶頸就在哪", tone: "orange" },
      render: KanbanPage,
    },
    {
      layout: "full-visual",
      nav: "推卡片",
      num: "02",
      eyebrow: "WIP LIMIT",
      title: "推卡片、調 WIP，看瓶頸在哪一欄浮現",
      pill: { text: "先完成、再開始", tone: "blue" },
      viz: PmKanbanFlow,
      vizLabel: "@ai-visualize · pm-kanban-flow",
    },
    {
      layout: "section",
      nav: "Task",
      num: "03",
      eyebrow: "TASK",
      title: "Task（任務）",
      subtitle: "一個任務要包含足夠的資訊，才有助於追蹤管理",
    },
    {
      layout: "custom",
      nav: "Task 欄位",
      num: "03",
      eyebrow: "TASK",
      title: "Task：時間、人員、狀態三組欄位",
      pill: { text: "把驗收與結案拉出來追蹤", tone: "orange" },
      render: TaskPage,
    },
    {
      layout: "full-visual",
      nav: "攤開時間",
      num: "03",
      eyebrow: "BOTTLENECK",
      title: "同樣 14 天，攤開才看得出卡在哪",
      pill: { text: "合併看一樣，攤開不一樣", tone: "blue" },
      viz: PmTaskBottleneck,
      vizLabel: "@ai-visualize · pm-task-bottleneck",
    },
    {
      layout: "custom",
      nav: "及早發現",
      num: "03",
      eyebrow: "EARLY WARNING",
      title: "時間欄位攤開，及早發現瓶頸",
      pill: { text: "不必等人開口", tone: "orange" },
      render: BottleneckPage,
    },
    {
      layout: "section",
      nav: "小結",
      num: "04",
      eyebrow: "SUMMARY",
      title: "小結",
      subtitle: "這幾項工具不是各做各的，而是互相輔助",
    },
    {
      layout: "custom",
      nav: "小結",
      num: "04",
      eyebrow: "SUMMARY",
      title: "工具不是各做各的，而是一條鏈",
      pill: { text: "規劃期看範圍與時程，執行期看流動與紀錄", tone: "blue" },
      render: SummaryPage,
    },
  ],
};

export default deck;
