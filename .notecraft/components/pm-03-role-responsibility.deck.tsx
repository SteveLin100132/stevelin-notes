// Role & Responsibility（R&R）—— 簡報（note-deck）
//
// 報告式版面：右上 pill 是這頁的一句結論；內容區分成 2–3 個編號小節，欄與欄用細線分隔；
// 每節用最適合的形式呈現（決策卡、樹狀指揮鏈、自組織圈、對照表、角色分布圖、RACI 矩陣），並以情境插圖／概念小圖輔助。
// Waterfall 一律用藍、Scrum 一律用橘；RACI 字母沿用筆記元件 pm-raci 的配色（A 橘、R 藍、C 淺藍、I 灰）。
// 插圖工具組、概念小圖、版面零件整段複製自 pm-02-waterfall-vs-agile.deck.tsx（其中又源自 pm-01）。
// 顏色取自 dkt() 與 trendlink token 的 CSS 變數，不硬編色碼；人物只用中性剪影，不加星光類裝飾。

import type { CSSProperties, ReactNode } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Bell,
  BookOpen,
  ChartGantt,
  CircleCheck,
  CircleDot,
  CircleX,
  Code,
  Cpu,
  Database,
  DraftingCompass,
  Gavel,
  Hammer,
  ListChecks,
  MessagesSquare,
  Network,
  Palette,
  Scale,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import { DGAP, DS, DTRACK } from "@/components/deck/scale";
import PmRrStructure from "@notes/components/pm-rr-structure";
import PmRaci from "@notes/components/pm-raci";

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

// ── pm-03 共用：RACI 字母色 ───────────────────────────────────

type Letter = "R" | "A" | "C" | "I";
type CellV = "" | Letter | "AR";

/** 沿用筆記元件 pm-raci 的配色：A 橘、R 藍、C 淺藍、I 灰（色塊自帶底色，不隨主題切換） */
const LETTER: Record<Letter, { bg: string; fg: string }> = {
  A: { bg: V.orange400, fg: V.n900 },
  R: { bg: V.blue700, fg: V.n0 },
  C: { bg: "var(--blue-200)", fg: V.blue900 },
  I: { bg: "var(--neutral-300)", fg: V.n900 },
};

function LetterTile({ l, size = 44 }: { l: Letter; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: 10,
        background: LETTER[l].bg,
        color: LETTER[l].fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: size >= 44 ? DS.h3 : DS.body,
        fontWeight: 900,
      }}
    >
      {l}
    </div>
  );
}

// ── pm-03 小圖 ──────────────────────────────────────────────

function Envelope({ p, x, y, w }: { p: P; x: number; y: number; w: number }) {
  const h = w * 0.66;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} style={fs(p.paper, p.ink)} />
      <path d={`M${x + 2} ${y + 3}L${x + w / 2} ${y + h * 0.58}L${x + w - 2} ${y + 3}`} style={line(p.ink, 1.5)} />
    </g>
  );
}

/** 小圖：矩陣每列恰好一格橘色 */
function OneAGrid({ p, x, y, cell = 14 }: { p: P; x: number; y: number; cell?: number }) {
  const aCol = [1, 2, 1, 1];
  return (
    <g>
      {aCol.map((a, r) =>
        [0, 1, 2, 3].map((k) => (
          <rect
            key={`${r}-${k}`}
            x={x + k * (cell + 4)}
            y={y + r * (cell + 4)}
            width={cell}
            height={cell}
            rx={3}
            style={fill(k === a ? p.gold : k === (a + 1) % 4 ? p.navy : p.sky2)}
          />
        )),
      )}
    </g>
  );
}

function MiniOneA({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={80} label="小圖：責任矩陣中，每一列恰好只有一格是橘色的 A">
      <OneAGrid p={p} x={4} y={6} cell={14} />
      <Check p={p} x={70} y={66} r={10} />
    </Svg>
  );
}

function SwapScene({ p }: { p: P }) {
  return (
    <Svg vb={[700, 360]} label="插圖：同樣四個人，左邊排成由上而下的指揮鏈，右邊圍成一圈、中間是團隊，外圍兩人服務團隊">
      {/* 左：樹狀指揮鏈 */}
      <line x1={160} y1={82} x2={160} y2={122} style={line(p.navy, 2.5)} />
      <path d="M160 190V214M100 214H220M100 214V240M220 214V240" style={line(p.navy, 2.5)} />
      <Person p={p} x={160} y={40} s={0.8} color={p.navy} />
      <Chip p={p} x={140} y={88} w={40} text="PM" color={p.navy} />
      <Person p={p} x={160} y={140} s={0.8} />
      <Chip p={p} x={135} y={188} w={50} text="架構師" color={p.blue} />
      <Person p={p} x={100} y={256} s={0.8} />
      <Person p={p} x={220} y={256} s={0.8} />
      <Chip p={p} x={78} y={304} w={44} text="開發" color={p.lblue} />
      <Chip p={p} x={198} y={304} w={44} text="測試" color={p.lblue} />
      {/* 中：換模式 */}
      <Arrow x1={300} y1={190} x2={388} y2={190} color={p.orange} w={3.5} />
      <Chip p={p} x={306} y={160} w={70} text="換模式" color={p.orange} />
      {/* 右：自組織圈 */}
      <circle cx={560} cy={210} r={92} style={{ fill: p.paper, stroke: p.orange, strokeWidth: 2.5 }} />
      <Person p={p} x={528} y={186} s={0.62} />
      <Person p={p} x={592} y={186} s={0.62} />
      <Person p={p} x={560} y={234} s={0.62} />
      <Chip p={p} x={528} y={278} w={64} text="開發團隊" color={p.orange} />
      <Person p={p} x={440} y={62} s={0.7} color={p.orange} />
      <Chip p={p} x={424} y={104} w={32} text="PO" color={p.orange} />
      <Person p={p} x={680} y={62} s={0.7} color={p.orange} />
      <Chip p={p} x={664} y={104} w={32} text="SM" color={p.orange} />
      <Arrow x1={454} y1={126} x2={496} y2={146} color={p.orange} w={2.5} />
      <Arrow x1={666} y1={126} x2={624} y2={146} color={p.orange} w={2.5} />
    </Svg>
  );
}

function ScrumScene({ p }: { p: P }) {
  return (
    <Svg vb={[600, 300]} label="插圖：中央大圓是自組織的開發團隊；左邊 PO 把 Backlog 卡片餵進團隊，右邊 SM 把障礙方塊推出圈外">
      <circle cx={300} cy={160} r={100} style={{ fill: p.paper, stroke: p.orange, strokeWidth: 2.5 }} />
      <Person p={p} x={266} y={128} s={0.6} />
      <Person p={p} x={334} y={128} s={0.6} />
      <Person p={p} x={300} y={172} s={0.6} />
      <rect x={250} y={214} width={30} height={18} rx={3} style={fill(p.gold)} />
      <rect x={286} y={214} width={30} height={18} rx={3} style={fill(p.lblue)} />
      <Chip p={p} x={322} y={214} w={40} text="DoD" color={p.green} />
      {/* PO + Backlog */}
      <Person p={p} x={60} y={96} s={0.8} color={p.orange} />
      <Chip p={p} x={44} y={146} w={32} text="PO" color={p.orange} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={30 + i * 4} y={186 - i * 8} width={56} height={30} rx={4} style={{ fill: i === 2 ? p.gold : p.paper, stroke: p.ink, strokeWidth: 1.2 }} />
      ))}
      <Arrow x1={98} y1={176} cx={150} cy={176} x2={196} y2={166} color={p.orange} w={3} />
      <Chip p={p} x={106} y={196} w={82} text="餵養 Backlog" color={p.orange} />
      {/* SM + 障礙 */}
      <Person p={p} x={540} y={96} s={0.8} color={p.orange} />
      <Chip p={p} x={524} y={146} w={32} text="SM" color={p.orange} />
      <rect x={440} y={196} width={34} height={34} rx={4} style={fill(p.grey)} transform="rotate(12 457 213)" />
      <Arrow x1={404} y1={210} x2={434} y2={212} color={p.orange} w={3} />
      <Chip p={p} x={470} y={244} w={70} text="排除障礙" color={p.orange} />
    </Svg>
  );
}

function RaciFlowScene({ p }: { p: P }) {
  const xs = [80, 240, 400, 560];
  const letters: Letter[] = ["C", "R", "A", "I"];
  return (
    <Svg vb={[640, 250]} label="插圖：PRD 撰寫的權責流向。Tech Lead 事前與 PM 雙向討論（C），PM 在筆電前撰寫（R），PO 在文件上蓋章簽核（A），QA 事後收到單向通知信封（I）">
      {xs.map((x, i) => (
        <g key={x}>
          <rect x={x - 17} y={6} width={34} height={34} rx={8} style={fill(LETTER[letters[i]].bg)} />
          <text x={x} y={30} textAnchor="middle" style={{ fill: LETTER[letters[i]].fg, fontFamily: MONO, fontSize: 20, fontWeight: 900 }}>
            {letters[i]}
          </text>
          <Ground p={p} x={x - 64} y={172} w={128} />
        </g>
      ))}
      {/* C：Tech Lead ↔ PM */}
      <Person p={p} x={48} y={120} s={0.72} />
      <Person p={p} x={112} y={120} s={0.72} color={p.navy} />
      <Arrow x1={62} y1={88} cx={80} cy={76} x2={98} y2={88} color={p.navy} w={2} />
      <Arrow x1={98} y1={98} cx={80} cy={110} x2={62} y2={98} color={p.navy} w={2} />
      {/* R：PM 撰寫 */}
      <Person p={p} x={208} y={122} s={0.72} color={p.navy} />
      <Laptop p={p} x={232} y={126} w={60} bar={p.navy} />
      {/* A：PO 簽核 */}
      <Person p={p} x={366} y={122} s={0.72} color={p.orange} />
      <Doc p={p} x={390} y={98} w={40} h={54} acc={p.gold} />
      <Stamp p={p} x={430} y={144} r={14} rot={-12} />
      {/* I：QA 收到通知 */}
      <Envelope p={p} x={512} y={118} w={40} />
      <Arrow x1={556} y1={132} x2={582} y2={132} color={p.grey} w={2.5} />
      <Person p={p} x={604} y={122} s={0.72} />
      {/* 時間軸 */}
      <line x1={24} y1={214} x2={604} y2={214} style={line(p.grey, 2)} />
      <polygon points="604,207 618,214 604,221" style={fill(p.grey)} />
      {xs.map((x) => (
        <circle key={x} cx={x} cy={214} r={5} style={fill(p.navy)} />
      ))}
    </Svg>
  );
}

function BigNoTitle({ p }: { p: P }) {
  return (
    <Svg vb={[200, 90]} width={200} label="小圖：頭銜名牌被打叉，箭頭指向「決策」與「執行」兩張卡">
      <rect x={6} y={20} width={72} height={48} rx={6} style={fs(p.paper, p.ink)} />
      <rect x={16} y={32} width={40} height={6} rx={3} style={fill(p.navy)} />
      <rect x={16} y={46} width={50} height={4} rx={2} style={fill(p.grey)} />
      <path d="M14 26L70 62M70 26L14 62" style={line(p.orange, 4)} />
      <Arrow x1={88} y1={44} x2={116} y2={44} color={p.navy} w={2.5} />
      <Chip p={p} x={124} y={22} w={60} text="決策" color={p.gold} />
      <Chip p={p} x={124} y={50} w={60} text="執行" color={p.navy} />
    </Svg>
  );
}

function BigTwoStructures({ p }: { p: P }) {
  return (
    <Svg vb={[200, 90]} width={200} label="小圖：左邊由上而下的樹狀指揮鏈，右邊外圍服務中央團隊的圓">
      <circle cx={50} cy={14} r={9} style={fill(p.navy)} />
      <path d="M50 23V36M24 36H76M24 36V48M76 36V48" style={line(p.navy, 2)} />
      <circle cx={24} cy={58} r={9} style={fill(p.lblue)} />
      <circle cx={76} cy={58} r={9} style={fill(p.lblue)} />
      <circle cx={150} cy={50} r={26} style={{ fill: p.paper, stroke: p.orange, strokeWidth: 2 }} />
      <circle cx={142} cy={46} r={5} style={fill(p.lblue)} />
      <circle cx={158} cy={46} r={5} style={fill(p.lblue)} />
      <circle cx={150} cy={58} r={5} style={fill(p.lblue)} />
      <circle cx={110} cy={18} r={8} style={fill(p.orange)} />
      <circle cx={190} cy={18} r={8} style={fill(p.orange)} />
      <Arrow x1={116} y1={24} x2={128} y2={34} color={p.orange} w={1.8} />
      <Arrow x1={184} y1={24} x2={172} y2={34} color={p.orange} w={1.8} />
    </Svg>
  );
}

function BigOneA({ p }: { p: P }) {
  return (
    <Svg vb={[200, 90]} width={200} label="小圖：責任矩陣中每一列恰好一格橘色的 A，旁邊打勾">
      <OneAGrid p={p} x={40} y={4} cell={16} />
      <Check p={p} x={150} y={44} r={16} />
    </Svg>
  );
}

function MiniDilute({ p }: { p: P }) {
  return (
    <Svg vb={[80, 64]} width={72} label="小圖：兩個人把包裹推給對方">
      <Person p={p} x={14} y={18} s={0.5} />
      <Person p={p} x={66} y={18} s={0.5} />
      <Package p={p} x={28} y={22} s={24} />
      <Arrow x1={30} y1={56} x2={10} y2={56} color={p.orange} w={2} />
      <Arrow x1={50} y1={56} x2={70} y2={56} color={p.orange} w={2} />
    </Svg>
  );
}

function MiniNoSign({ p }: { p: P }) {
  return (
    <Svg vb={[80, 64]} width={72} label="小圖：一份文件的簽核處是空的虛線圈">
      <Doc p={p} x={16} y={4} w={40} h={54} acc={p.navy} />
      <circle cx={58} cy={46} r={13} style={line(p.orange, 2, { strokeDasharray: "4 4" })} />
    </Svg>
  );
}

function MiniNoOwner({ p }: { p: P }) {
  return (
    <Svg vb={[80, 64]} width={72} label="小圖：一張工作卡沒有人領，旁邊掛著問號">
      <rect x={12} y={16} width={46} height={32} rx={5} style={fs(p.gold, p.ink, 1.2)} />
      <rect x={18} y={24} width={28} height={4} rx={2} style={fill(p.white)} />
      <rect x={18} y={33} width={20} height={3} rx={1.5} style={fill(p.white)} />
      <QMark p={p} x={62} y={16} r={11} />
    </Svg>
  );
}

// ── P2 導入：R&R 回答的四個問題 ───────────────────────────────

function IntroPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const qs: { Icon: LucideIcon; q: string; v: string }[] = [
    { Icon: Gavel, q: "誰拍板", v: "做決定、出事扛責" },
    { Icon: Hammer, q: "誰動手", v: "實際把事情做完" },
    { Icon: MessagesSquare, q: "誰該被問", v: "事前徵詢意見" },
    { Icon: Bell, q: "誰只是被通知", v: "事後告知結果" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <SecHead n="一" Icon={Scale} title="R&R 要回答的四個問題" c={c} />
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 14 }}>
            {qs.map((x) => (
              <div
                key={x.q}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "16px 18px",
                  borderRadius: 14,
                  border: `1px solid ${c.border}`,
                  background: c.slide,
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: c.brandSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <x.Icon size={24} color={c.brand} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.ink }}>{x.q}</span>
                  <span style={{ fontSize: DS.small, color: c.muted }}>{x.v}</span>
                </div>
              </div>
            ))}
          </div>
          <Concl c={c}>R&R 釐清的是「決策」與「執行」如何在團隊裡分配。</Concl>
        </div>
        <div style={{ flex: 1.2, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
          <SecHead n="二" Icon={Users} title="同一群人，換模式就換位置" c={c} />
          <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px 0" }}>
              <SwapScene p={p} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${c.border}` }}>
              <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: DS.small, fontWeight: 900, color: s.project.ink }}>Waterfall：由上而下</span>
                <span style={{ fontSize: DS.micro, color: c.muted }}>PM 在指揮鏈頂端，逐層指派</span>
              </div>
              <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 2, borderLeft: `1px solid ${c.border}` }}>
                <span style={{ fontSize: DS.small, fontWeight: 900, color: s.product.ink }}>Scrum：由外圍服務</span>
                <span style={{ fontSize: DS.micro, color: c.muted }}>團隊在中央自組織，PO／SM 在外圍</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
      <WhyBand c={c} art={<MiniLoopBoard p={p} />} title="Agile 這一側用 Scrum 來說明">
        Scrum 是目前最常見的敏捷框架，而且有明確的角色與職責定義，適合拿來和 Waterfall 對照。
      </WhyBand>
    </div>
  );
}

// ── P4 兩種權責結構 ──────────────────────────────────────────

function RoleBox({ Icon, k, c, tone, w = 170 }: { Icon: LucideIcon; k: string; c: DeckThemeTokens; tone: Tone; w?: number }) {
  return (
    <div
      style={{
        width: w,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 10,
        border: `1px solid ${c.border}`,
        borderLeft: `4px solid ${tone.fg}`,
        background: c.slide,
      }}
    >
      <div style={{ width: 30, height: 30, flex: "none", borderRadius: 8, background: tone.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={tone.fg} />
      </div>
      <span style={{ fontSize: DS.small, fontWeight: 700, color: c.ink, whiteSpace: "nowrap" }}>{k}</span>
    </div>
  );
}

function DownArrow({ c, label }: { c: DeckThemeTokens; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, height: 28 }}>
      <ArrowDown size={20} color={c.brand} />
      <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted }}>{label}</span>
    </div>
  );
}

function StructurePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const rows: { q: string; wf: string; sc: string }[] = [
    { q: "誰決定做什麼", wf: "PM 依合約與需求規格拍板範疇", sc: "PO 決定 Product Backlog 的內容與優先順序" },
    { q: "誰決定怎麼做", wf: "架構師定技術方案，開發照規格實作", sc: "開發團隊自己決定怎麼實作" },
    { q: "誰分派工作", wf: "PM 把工作逐層指派到個人", sc: "成員從 Sprint Backlog 自己領工作" },
    { q: "誰排除障礙", wf: "PM 處理風險與問題，必要時往上呈報", sc: "SM 移除障礙，保護團隊專注" },
    { q: "誰把關品質", wf: "獨立的測試團隊在測試階段把關", sc: "團隊共同對完成的定義（DoD）負責" },
  ];
  const cols = "150px 1fr 1fr";
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <SecHead n="一" Icon={Network} title="Waterfall：指揮鏈" c={c} note="由上而下指派" />
          <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: 10 }}>
            <RoleBox c={c} tone={s.project} Icon={ChartGantt} k="PM　指揮鏈頂端" w={210} />
            <DownArrow c={c} label="指派" />
            <RoleBox c={c} tone={s.project} Icon={DraftingCompass} k="架構師" />
            <DownArrow c={c} label="指派" />
            <div style={{ display: "flex", gap: 16 }}>
              <RoleBox c={c} tone={s.project} Icon={Code} k="開發團隊" w={150} />
              <RoleBox c={c} tone={s.project} Icon={ListChecks} k="測試團隊" w={150} />
            </div>
          </Panel>
        </div>
        <div style={{ flex: 1.2, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
          <SecHead n="二" Icon={CircleDot} title="Scrum：自組織圈" c={c} note="由外圍服務團隊" />
          <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
            <ScrumScene p={p} />
          </Panel>
        </div>
      </div>
      <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        <SecHead n="三" Icon={MessagesSquare} title="同一個問題，兩邊由誰回答" c={c} />
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, alignItems: "center", padding: "2px 0" }}>
          <span style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: ".1em", color: c.muted }}>問題</span>
          <div>
            <SideTag text="Waterfall" tone={s.project} Icon={Network} />
          </div>
          <div>
            <SideTag text="Scrum" tone={s.product} Icon={CircleDot} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", borderBottom: `1px solid ${c.border}` }}>
          {rows.map((r) => (
            <div key={r.q} style={{ display: "grid", gridTemplateColumns: cols, gap: 12, alignItems: "center", padding: "6px 0", borderTop: `1px solid ${c.border}` }}>
              <span style={{ fontSize: DS.small, fontWeight: 900, color: c.ink }}>{r.q}</span>
              <span style={{ fontSize: DS.small, color: c.body }}>{r.wf}</span>
              <span style={{ fontSize: DS.small, color: c.body }}>{r.sc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── P7 衍生角色 ─────────────────────────────────────────────

function RoleNode({ c, x, y, w, k, Icon, bg, border, dashed }: { c: DeckThemeTokens; x: number; y: number; w: number; k: string; Icon: LucideIcon; bg: string; border: string; dashed?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: 44,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 12px",
        borderRadius: 10,
        background: bg,
        border: `1.5px ${dashed ? "dashed" : "solid"} ${border}`,
      }}
    >
      <Icon size={17} color={border} style={{ flex: "none" }} />
      <span style={{ fontSize: DS.small, fontWeight: 700, color: c.ink, whiteSpace: "nowrap" }}>{k}</span>
    </div>
  );
}

function RolesMap({ c, p }: { c: DeckThemeTokens; p: P }) {
  const s = sides(c);
  const W = 600;
  const H = 450;
  return (
    <div
      role="img"
      aria-label="衍生角色分布：中央是 Scrum 核心團隊 PO、SM、Developers；左側 UI/UX Designer 與 Domain Expert 協助 PO；右側 Tech Lead、QA Engineer、Data Engineer 協助 Developers；Stakeholder 在專案團隊邊界之外，經由 PO 交換需求與回饋"
      style={{ position: "relative", width: W, height: H, flex: "none" }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        <rect x={10} y={96} width={580} height={346} rx={16} style={line(p.grey, 2, { strokeDasharray: "7 7" })} />
        {/* Stakeholder ↔ PO */}
        <path d="M300 58V150" style={line(p.orange, 2.5, { strokeDasharray: "6 5" })} />
        {/* 產品面 → PO */}
        <path d="M200 176H232M200 256Q216 256 216 200Q216 176 232 176" style={line(V.blue300, 2.5)} />
        {/* 技術面 → Developers */}
        <path d="M400 336H372M400 276Q386 276 386 320Q386 336 372 336M400 396Q386 396 386 352Q386 336 372 336" style={line(V.blue300, 2.5)} />
        {/* 核心內部 */}
        <path d="M300 198V230M300 278V312" style={line(p.orange, 2)} />
      </svg>
      <span style={{ position: "absolute", left: 24, top: 104, fontSize: DS.micro, fontWeight: 700, color: c.muted }}>專案團隊</span>
      <span style={{ position: "absolute", left: 312, top: 64, fontSize: DS.micro, fontWeight: 700, color: c.accent }}>需求與回饋</span>
      <RoleNode c={c} x={200} y={14} w={200} k="Stakeholder" Icon={Users} bg={c.sunken} border={V.orange400} dashed />
      <span style={{ position: "absolute", left: 30, top: 128, fontSize: DS.micro, fontWeight: 700, color: c.brandInk }}>產品面：協助 PO</span>
      <RoleNode c={c} x={24} y={154} w={176} k="UI/UX Designer" Icon={Palette} bg={c.brandSoft} border={c.brand} />
      <RoleNode c={c} x={24} y={234} w={176} k="Domain Expert" Icon={BookOpen} bg={c.brandSoft} border={c.brand} />
      <RoleNode c={c} x={232} y={154} w={136} k="PO" Icon={ListChecks} bg={s.product.soft} border={V.orange400} />
      <RoleNode c={c} x={232} y={234} w={136} k="SM" Icon={ShieldCheck} bg={s.product.soft} border={V.orange400} />
      <RoleNode c={c} x={232} y={314} w={136} k="Developers" Icon={Code} bg={s.product.soft} border={V.orange400} />
      <span style={{ position: "absolute", left: 400, top: 226, fontSize: DS.micro, fontWeight: 700, color: c.brandInk }}>技術面：協助 Developers</span>
      <RoleNode c={c} x={400} y={254} w={180} k="Tech Lead" Icon={Cpu} bg={c.brandSoft} border={c.brand} />
      <RoleNode c={c} x={400} y={314} w={180} k="QA Engineer" Icon={ShieldCheck} bg={c.brandSoft} border={c.brand} />
      <RoleNode c={c} x={400} y={374} w={180} k="Data Engineer" Icon={Database} bg={c.brandSoft} border={c.brand} />
    </div>
  );
}

function RolesPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const p = ilPalette(dark);
  const roles: { Icon: LucideIcon; en: string; zh: string; dom: string; v: string }[] = [
    { Icon: Users, en: "Stakeholder", zh: "利益相關者", dom: "外部", v: "對產品或專案有直接或間接利益的人：用戶、客戶、管理層、投資者" },
    { Icon: Cpu, en: "Tech Lead", zh: "技術主管", dom: "技術", v: "技術決策與指導，確保技術方向與產品需求一致" },
    { Icon: Palette, en: "UI/UX Designer", zh: "介面與體驗設計師", dom: "設計", v: "設計介面與使用者體驗，兼顧易用性與美觀" },
    { Icon: BookOpen, en: "Domain Expert", zh: "領域專家", dom: "領域", v: "以專業知識協助團隊理解用戶需求與市場脈絡" },
    { Icon: ShieldCheck, en: "QA Engineer", zh: "品質保證工程師", dom: "品質", v: "測試規劃與執行，協助識別與解決品質問題" },
    { Icon: Database, en: "Data Engineer", zh: "數據工程師", dom: "數據", v: "設計、建置與維護資料基礎設施，支援數據驅動決策" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ width: 620, flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        <SecHead n="一" Icon={Network} title="他們站在哪裡" c={c} />
        <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          <RolesMap c={c} p={p} />
        </Panel>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
        <SecHead n="二" Icon={ListChecks} title="六個角色的職責" c={c} note="不一定每個團隊都有" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          {roles.map((r) => (
            <div key={r.en} style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 0", borderTop: `1px solid ${c.border}` }}>
              <div style={{ width: 40, height: 40, flex: "none", borderRadius: 11, background: c.brandSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <r.Icon size={20} color={c.brand} />
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: DS.body, fontWeight: 900, color: c.ink }}>{r.en}</span>
                  <span style={{ fontSize: DS.small, color: c.muted }}>{r.zh}</span>
                  <span style={{ marginLeft: "auto", padding: "1px 10px", borderRadius: 999, background: c.sunken, fontSize: DS.micro, fontWeight: 700, color: c.body }}>{r.dom}</span>
                </div>
                <span style={{ fontSize: DS.small, lineHeight: 1.45, color: c.body }}>{r.v}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── P9 RACI 四個字母 ─────────────────────────────────────────

function RaciPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const p = ilPalette(dark);
  const defs: { l: Letter; en: string; zh: string; v: string; tag: string }[] = [
    { l: "R", en: "Responsible", zh: "執行者", v: "實際動手做的人", tag: "可以有多位" },
    { l: "A", en: "Accountable", zh: "最終負責人", v: "拍板、出事扛責的人", tag: "每項任務只能一位" },
    { l: "C", en: "Consulted", zh: "被諮詢者", v: "事前要徵詢意見", tag: "雙向溝通" },
    { l: "I", en: "Informed", zh: "被通知者", v: "事後告知結果", tag: "單向溝通" },
  ];
  const flow: { l: Letter; who: string; v: string }[] = [
    { l: "C", who: "Tech Lead", v: "事前被徵詢" },
    { l: "R", who: "PM", v: "動手撰寫" },
    { l: "A", who: "PO", v: "拍板簽核" },
    { l: "I", who: "QA", v: "事後被通知" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <SecHead n="一" Icon={ListChecks} title="四個字母" c={c} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          {defs.map((d) => (
            <div key={d.l} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderTop: `1px solid ${c.border}` }}>
              <LetterTile l={d.l} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: DS.body, fontWeight: 900, color: c.ink }}>{d.zh}</span>
                  <span style={{ fontSize: DS.micro, color: c.muted }}>{d.en}</span>
                </div>
                <span style={{ fontSize: DS.small, color: c.body }}>{d.v}</span>
              </div>
              <span
                style={{
                  flex: "none",
                  padding: "2px 10px",
                  borderRadius: 999,
                  background: d.l === "A" ? c.accentSoft : c.sunken,
                  fontSize: DS.micro,
                  fontWeight: 700,
                  color: d.l === "A" ? c.accent : c.body,
                }}
              >
                {d.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1.25, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
        <SecHead n="二" Icon={ArrowUpRight} title="權責流向：以 PRD 撰寫為例" c={c} />
        <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 14px 0" }}>
            <RaciFlowScene p={p} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: `1px solid ${c.border}` }}>
            {flow.map((f, i) => (
              <div key={f.l} style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2, borderLeft: i ? `1px solid ${c.border}` : "none" }}>
                <span style={{ fontSize: DS.small, fontWeight: 900, color: c.ink }}>
                  {f.l}・{f.who}
                </span>
                <span style={{ fontSize: DS.micro, color: c.muted }}>{f.v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div style={{ width: 320, flex: "none", display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
        <SecHead n="三" Icon={Gavel} title="鐵律" c={c} />
        <FocusCard
          c={c}
          art={<MiniOneA p={p} />}
          q="每一項任務，A 要有幾位？"
          answer="恰好一位 A"
          note="同一個人可以同時是 R 和 A，例如 Tech Lead 自己設計、自己拍板架構"
          hi
        />
        <Note c={c}>A 有兩位，責任就被稀釋</Note>
      </div>
    </div>
  );
}

// ── P10 正確 vs 常見錯誤 ──────────────────────────────────────

const TASKS = ["PRD 撰寫", "架構設計", "UAT 驗收", "上線核准"];
const ROLES = ["PM", "PO", "Tech Lead", "QA"];
const EXAMPLE: CellV[][] = [
  ["R", "A", "C", "I"],
  ["I", "I", "AR", "C"],
  ["C", "A", "I", "R"],
  ["C", "A", "R", "I"],
];
const BROKEN: CellV[][] = [
  ["A", "A", "C", "I"],
  ["I", "I", "R", "C"],
  ["C", "A", "I", "C"],
  ["C", "A", "R", "I"],
];

function rowCheck(row: CellV[]): { ok: boolean; text: string } {
  const a = row.filter((x) => x.includes("A")).length;
  const r = row.filter((x) => x.includes("R")).length;
  if (a > 1) return { ok: false, text: "A 有兩位" };
  if (a === 0) return { ok: false, text: "沒有 A" };
  if (r === 0) return { ok: false, text: "沒有 R" };
  return { ok: true, text: "恰好 1 位 A" };
}

function Matrix({ c, grid }: { c: DeckThemeTokens; grid: CellV[][] }) {
  const cols = "96px repeat(4, 1fr) 118px";
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 6, alignItems: "end", paddingBottom: 6 }}>
        <span />
        {ROLES.map((r) => (
          <span key={r} style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted, textAlign: "center", lineHeight: 1.15 }}>
            {r}
          </span>
        ))}
        <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted }}>檢查</span>
      </div>
      {grid.map((row, i) => {
        const chk = rowCheck(row);
        return (
          <div
            key={TASKS[i]}
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: 6,
              alignItems: "center",
              padding: "7px 0",
              borderTop: `1px solid ${c.border}`,
              background: chk.ok ? "transparent" : c.criticalSoft,
            }}
          >
            <span style={{ fontSize: DS.small, fontWeight: 700, color: c.ink, paddingLeft: 4 }}>{TASKS[i]}</span>
            {row.map((cell, j) => (
              <div key={j} style={{ display: "flex", justifyContent: "center" }}>
                {cell === "" ? null : cell === "AR" ? (
                  <div style={{ display: "flex", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ width: 22, height: 32, background: LETTER.A.bg, color: LETTER.A.fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: DS.small, fontWeight: 900 }}>A</div>
                    <div style={{ width: 22, height: 32, background: LETTER.R.bg, color: LETTER.R.fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: DS.small, fontWeight: 900 }}>R</div>
                  </div>
                ) : (
                  <LetterTile l={cell} size={32} />
                )}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {chk.ok ? <CircleCheck size={18} color={c.good} style={{ flex: "none" }} /> : <CircleX size={18} color={c.critical} style={{ flex: "none" }} />}
              <span style={{ fontSize: DS.micro, fontWeight: 700, color: chk.ok ? c.good : c.critical, whiteSpace: "nowrap" }}>{chk.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MistakePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const p = ilPalette(dark);
  const effects: { art: ReactNode; k: string; v: string }[] = [
    { art: <MiniDilute p={p} />, k: "責任被稀釋", v: "A 有兩位：出事時容易互踢皮球" },
    { art: <MiniNoSign p={p} />, k: "沒人拍板", v: "沒有 A：做完了也沒人簽核" },
    { art: <MiniNoOwner p={p} />, k: "沒人動手", v: "沒有 R：工作卡沒人領" },
  ];
  const legend = (["R", "A", "C", "I"] as Letter[]).map((l) => (
    <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <LetterTile l={l} size={22} />
      <span style={{ fontSize: DS.micro, color: c.muted }}>{{ R: "執行", A: "負責", C: "諮詢", I: "通知" }[l]}</span>
    </span>
  ));
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <SecHead n="一" Icon={CircleCheck} title="正確範例" c={c} />
        <Matrix c={c} grid={EXAMPLE} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, paddingTop: 4 }}>{legend}</div>
        <div style={{ marginTop: "auto" }}>
          <Note c={c}>Tech Lead 自己設計、自己拍板架構：同一格 A/R</Note>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
        <SecHead n="二" Icon={CircleX} title="常見錯誤" c={c} />
        <Matrix c={c} grid={BROKEN} />
        <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body, paddingTop: 4 }}>
          四項任務裡有三項出錯：兩個 A、沒有 A、沒有 R。看起來每格都填了，權責卻沒有分清楚。
        </span>
      </div>
      <div style={{ width: 330, flex: "none", display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
        <SecHead n="三" Icon={TriangleAlert} title="會發生什麼事" c={c} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          {effects.map((e) => (
            <div key={e.k} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: `1px solid ${c.border}` }}>
              {e.art}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: DS.body, fontWeight: 900, color: c.ink }}>{e.k}</span>
                <span style={{ fontSize: DS.small, lineHeight: 1.45, color: c.body }}>{e.v}</span>
              </div>
            </div>
          ))}
        </div>
        <Concl c={c}>每項任務恰好一位 A，至少一位 R。</Concl>
      </div>
    </div>
  );
}

// ── P13 小結 ───────────────────────────────────────────────

function SummaryPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const p = ilPalette(dark);
  const cards: { n: string; Icon: LucideIcon; title: string; art: ReactNode; word: string; how: string; hi?: boolean }[] = [
    { n: "一", Icon: Scale, title: "R&R 在分什麼", art: <BigNoTitle p={p} />, word: "不是列頭銜", how: "釐清「決策」與「執行」如何在團隊裡分配。" },
    { n: "二", Icon: Network, title: "兩種結構", art: <BigTwoStructures p={p} />, word: "指派 vs 服務", how: "Waterfall 權責由上而下指派；Scrum 由外圍服務自組織團隊。" },
    { n: "三", Icon: Gavel, title: "RACI 鐵律", art: <BigOneA p={p} />, word: "恰好一位 A", how: "用 RACI Matrix 把每項任務的權責寫清楚。", hi: true },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        {cards.map((x, i) => (
          <div key={x.n} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...(i ? divider(c) : {}) }}>
            <SecHead n={x.n} Icon={x.Icon} title={x.title} c={c} />
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "18px 22px",
                borderRadius: 14,
                border: x.hi ? `1.5px solid ${V.orange400}` : `1px solid ${c.border}`,
                background: x.hi ? c.accentSoft : c.slide,
              }}
            >
              {x.art}
              <span style={{ fontSize: DS.h2, fontWeight: 900, color: c.ink, lineHeight: 1.15 }}>{x.word}</span>
              <span style={{ marginTop: "auto", fontSize: DS.small, lineHeight: 1.55, color: c.body }}>{x.how}</span>
            </div>
          </div>
        ))}
      </div>
      <NextBand
        c={c}
        lead={
          <>
            <Network size={36} color={c.brand} style={{ flex: "none" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: DS.body, fontWeight: 900, color: c.brandInk }}>權責分清楚之後</span>
              <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>回到最經典的 Waterfall SDLC，看階段、會議、交付物如何環環相扣。</span>
            </div>
          </>
        }
        title="第四章：Waterfall SDLC"
        sub="階段、會議、交付物如何環環相扣"
      />
    </div>
  );
}

// ── deck ────────────────────────────────────────────────────

const deck: Deck = {
  slug: "knowledge/project/pm-03-role-responsibility",
  title: "Role & Responsibility（R&R）",
  eyebrow: "PROJECT MANAGEMENT",
  generatedAt: "2026-09-26",
  source: "knowledge/project/pm-03-role-responsibility.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "PROJECT MANAGEMENT · 第三章",
      title: "Role & Responsibility（R&R）",
      subtitle: "同一群人，在 Waterfall 與 Scrum 底下權責流向天差地遠。R&R 要回答的是：每件事誰拍板、誰動手、誰被諮詢、誰只是被通知。",
      meta: ["2026-09-26", "專案管理基礎系列", "第 3 章"],
      agenda: [
        { n: "01", title: "Waterfall vs Scrum：兩種權責結構", sub: "指派 vs 服務" },
        { n: "02", title: "常見的衍生角色", sub: "各自補上一塊專業" },
        { n: "03", title: "RACI Matrix", sub: "每項任務恰好一位 A" },
        { n: "04", title: "小結", sub: "決策與執行，要分得清楚" },
      ],
    },
    {
      layout: "custom",
      nav: "R&R 在回答什麼",
      eyebrow: "BEFORE WE START",
      title: "R&R 回答的是「每件事誰負責」",
      pill: { text: "不是列頭銜", tone: "blue" },
      render: IntroPage,
    },
    {
      layout: "section",
      nav: "兩種權責結構",
      num: "01",
      eyebrow: "WATERFALL VS SCRUM",
      title: "Waterfall vs Scrum：兩種權責結構",
      subtitle: "同樣是「帶團隊的人」，兩邊站的位置完全不同",
    },
    {
      layout: "custom",
      nav: "指派 vs 服務",
      num: "01",
      eyebrow: "WATERFALL VS SCRUM",
      title: "同一群人，兩種權責結構",
      pill: { text: "指派 vs 服務", tone: "orange" },
      render: StructurePage,
    },
    {
      layout: "full-visual",
      nav: "誰回答哪個問題",
      num: "01",
      eyebrow: "WHO ANSWERS",
      title: "選一個問題，看兩邊由誰回答",
      pill: { text: "點角色看完整職責", tone: "blue" },
      viz: PmRrStructure,
      vizLabel: "@ai-visualize · pm-rr-structure",
    },
    {
      layout: "section",
      nav: "衍生角色",
      num: "02",
      eyebrow: "EXTENDED ROLES",
      title: "常見的衍生角色",
      subtitle: "中大型專案常會看到這些角色，各自補上團隊裡的一塊專業",
    },
    {
      layout: "custom",
      nav: "衍生角色",
      num: "02",
      eyebrow: "EXTENDED ROLES",
      title: "衍生角色各自補上一塊專業",
      pill: { text: "產品面協助 PO，技術面協助團隊", tone: "blue" },
      render: RolesPage,
    },
    {
      layout: "section",
      nav: "RACI Matrix",
      num: "03",
      eyebrow: "RACI MATRIX",
      title: "RACI Matrix",
      subtitle: "角色一多，最常出問題的就是「這件事到底誰負責」",
    },
    {
      layout: "custom",
      nav: "四個字母",
      num: "03",
      eyebrow: "RACI MATRIX",
      title: "RACI：四個字母寫清楚權責",
      pill: { text: "每項任務恰好一位 A", tone: "orange" },
      render: RaciPage,
    },
    {
      layout: "custom",
      nav: "常見錯誤",
      num: "03",
      eyebrow: "COMMON MISTAKES",
      title: "權責不清的表長什麼樣子",
      pill: { text: "A 有兩位，責任就被稀釋", tone: "orange" },
      render: MistakePage,
    },
    {
      layout: "full-visual",
      nav: "動手編 RACI",
      num: "03",
      eyebrow: "TRY IT",
      title: "動手編一張 RACI",
      pill: { text: "點格子切換，試試常見錯誤", tone: "blue" },
      viz: PmRaci,
      vizLabel: "@ai-visualize · pm-raci",
    },
    {
      layout: "section",
      nav: "小結",
      num: "04",
      eyebrow: "SUMMARY",
      title: "小結",
      subtitle: "R&R 釐清的是「決策」與「執行」如何在團隊裡分配，不是列頭銜",
    },
    {
      layout: "custom",
      nav: "小結",
      num: "04",
      eyebrow: "SUMMARY",
      title: "決策與執行，要分得清楚",
      pill: { text: "恰好一位 A", tone: "orange" },
      render: SummaryPage,
    },
  ],
};

export default deck;
