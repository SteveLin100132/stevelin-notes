// 專案管理方法與精神 —— 簡報（note-deck）
//
// 報告式版面：右上 pill 是這頁的一句結論；內容區分成 2–3 個編號小節，欄與欄用細線分隔；
// 每節用最適合的形式呈現（流程帶、細線清單、對照表、定義卡、決策卡），並以情境插圖／概念小圖輔助。
// Waterfall 一律用藍、Agile 一律用橘（沿用 pm-01 的專案藍／產品橘）。
// 插圖工具組、概念小圖、版面零件整段複製自 pm-01-project-vs-product.deck.tsx。
// 顏色取自 dkt() 與 trendlink token 的 CSS 變數，不硬編色碼；人物只用中性剪影，不加星光類裝飾。

import type { CSSProperties, ReactNode } from "react";
import {
  ArrowUpRight,
  Banknote,
  Bot,
  CalendarClock,
  ClipboardList,
  Cloud,
  Code,
  Database,
  FileText,
  GitPullRequest,
  Handshake,
  Hourglass,
  Landmark,
  Layers,
  Lightbulb,
  ListChecks,
  Lock as LockIcon,
  MessagesSquare,
  Milestone,
  Package as PackageIcon,
  RefreshCw,
  Rocket,
  Scale,
  Smartphone,
  Target,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import { DGAP, DS, DTRACK } from "@/components/deck/scale";
import PmChangeCost from "@notes/components/pm-change-cost";
import PmHybridModel from "@notes/components/pm-hybrid-model";

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

function Blob({ cx, cy, rx, ry, color }: { cx: number; cy: number; rx: number; ry: number; color: string }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} style={fill(color)} />;
}

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
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 14, background: c.sunken, ...style }}>
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

// ── P3 Waterfall ────────────────────────────────────────────

function WaterfallStrip({ c, tone }: { c: DeckThemeTokens; tone: Tone }) {
  const stages: { Icon: LucideIcon; t: string; doc: string }[] = [
    { Icon: ClipboardList, t: "需求", doc: "PRD・需求規格" },
    { Icon: Layers, t: "設計", doc: "SDD・設計規格" },
    { Icon: Code, t: "開發", doc: "原始碼・建置產出" },
    { Icon: ListChecks, t: "測試", doc: "測試報告・驗證紀錄" },
    { Icon: Rocket, t: "上線", doc: "上線手冊・維運交接" },
  ];
  return (
    <Panel c={c} style={{ flex: "none", display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 16px" }}>
      {stages.map((s, i) => {
        const hi = i === stages.length - 1;
        return (
          <div key={s.t} style={{ display: "contents" }}>
            {i > 0 && (
              <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, paddingTop: 12 }}>
                <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
                  <Diamond x={8} y={8} r={7} color={V.orange400} />
                </svg>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 12px",
                  borderRadius: 10,
                  background: hi ? tone.soft : c.slide,
                  border: hi ? `1.5px solid ${tone.fg}` : `1px solid ${c.border}`,
                }}
              >
                <div style={{ width: 30, height: 30, flex: "none", borderRadius: 8, background: hi ? c.slide : tone.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.Icon size={16} color={tone.fg} />
                </div>
                <span style={{ fontSize: DS.small, fontWeight: 700, color: c.ink }}>{s.t}</span>
                {hi && (
                  <span style={{ marginLeft: "auto", fontSize: DS.micro, fontWeight: 700, color: c.accent, whiteSpace: "nowrap" }}>一次交付</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 4 }}>
                <FileText size={14} color={c.muted} style={{ flex: "none" }} />
                <span style={{ fontSize: DS.micro, color: c.muted, whiteSpace: "nowrap" }}>{s.doc}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ flex: "none", alignSelf: "center", display: "flex", alignItems: "center", gap: 6, paddingLeft: 8, borderLeft: `1px solid ${c.border}` }}>
        <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
          <Diamond x={8} y={8} r={7} color={V.orange400} />
        </svg>
        <span style={{ fontSize: DS.micro, color: c.muted, whiteSpace: "nowrap" }}>里程碑審查</span>
      </div>
    </Panel>
  );
}

function WaterfallPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <WaterfallStrip c={c} tone={s.project} />
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1.1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <SecHead n="一" Icon={ListChecks} title="四個特徵" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            <ListRow c={c} tone={s.project} Icon={Layers} k="階段清楚" v="一個階段完成，才進入下一個階段" kw={116} />
            <ListRow c={c} tone={s.project} Icon={FileText} k="文件齊全" v="每階段產出的文件交接給下一階段" kw={116} />
            <ListRow c={c} tone={s.project} Icon={ClipboardList} k="前期規劃重" v="前期把事情想清楚、一次定案" kw={116} />
            <ListRow c={c} tone={s.project} Icon={TriangleAlert} k="變更成本高" v="抗拒變更，原則上凍結需求" kw={116} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
          <SecHead n="二" Icon={Target} title="適用情境" c={c} />
          <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>需求穩定、合規要求高，或對交付物有明確規範</span>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            <CaseRow c={c} tone={s.project} Icon={Landmark} k="政府標案" />
            <CaseRow c={c} tone={s.project} Icon={Database} k="ERP 導入" />
            <CaseRow c={c} tone={s.project} Icon={Banknote} k="金融系統" />
          </div>
          <Concl c={c}>大部分的「專案」會採用瀑布式方法。</Concl>
        </div>
        <div style={{ width: 360, flex: "none", display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
          <SecHead n="三" Icon={Hourglass} title="SDLC 是什麼" c={c} />
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8, padding: "14px 18px", borderRadius: 14, border: `1px solid ${c.border}`, background: c.slide }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <MiniSdlc p={p} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.ink }}>SDLC</span>
                <span style={{ fontSize: DS.micro, color: c.muted }}>Software Development Life Cycle</span>
              </div>
            </div>
            <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>一件工作從構思到退役的完整流程：拆成明確的階段，有系統地規劃、執行與管控。</span>
            <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.muted }}>名字裡有「軟體開發」，但其他類型的專案也常借用這套思路。</span>
          </div>
          <Note c={c}>目前只比較 Waterfall 與 Agile 兩種模式</Note>
        </div>
      </div>
      <WhyBand c={c} art={<MiniDocsWait p={p} />} title="客戶直到上線，才一次拿到可用成果">
        前四個階段，客戶看不到可用的東西，只看到文件與進度報告；走完所有階段後才一次交付。
      </WhyBand>
    </div>
  );
}

// ── P4 Agile ────────────────────────────────────────────────

function SprintScene({ p }: { p: P }) {
  const phases = [
    { t: "規劃", deg: 315 },
    { t: "開發", deg: 45 },
    { t: "檢視", deg: 135 },
    { t: "回顧", deg: 225 },
  ];
  const cx = 300;
  const cy = 176;
  const r = 78;
  const stacks = [1, 2, 3];
  const blockColors = [p.navy, p.blue, p.lblue];
  return (
    <Svg vb={[600, 400]} label="插圖：Product Backlog 看板挑出最優先的金色卡片進入 Sprint 循環（規劃、開發、檢視、回顧），每一圈交付的增量積木越疊越高；使用者的回饋再用虛線繞回看板重排優先序">
      <Blob cx={300} cy={206} rx={292} ry={176} color={p.sky} />
      {/* Backlog */}
      <Chip p={p} x={33} y={70} w={74} text="Backlog" color={p.navy} />
      <Board p={p} x={10} y={96} w={120} h={150} cols={[4, 3]} hi={[0, 0]} />
      <rect x={146} y={140} width={38} height={24} rx={4} style={fill(p.gold)} transform="rotate(-6 165 152)" />
      <Arrow x1={136} y1={182} cx={176} cy={196} x2={210} y2={180} color={p.navy} w={3} />
      {/* Sprint loop */}
      <Chip p={p} x={cx - 30} y={62} w={60} text="Sprint" color={p.orange} />
      <circle cx={cx} cy={cy} r={r - 16} style={fill(p.paper)} />
      <LoopArrow x={cx} y={cy} r={r} color={p.orange} w={7} />
      {phases.map((ph) => {
        const a = (ph.deg * Math.PI) / 180;
        const x = cx + r * Math.sin(a);
        const y = cy - r * Math.cos(a);
        return <Chip key={ph.t} p={p} x={x - 22} y={y - 9} w={44} text={ph.t} color={p.navy} />;
      })}
      <text x={cx} y={cy + 5} textAnchor="middle" style={{ fill: p.ink, fontFamily: MONO, fontSize: 13, fontWeight: 700 }}>
        1–4 週
      </text>
      <Arrow x1={cx + r + 14} y1={cy} x2={438} y2={cy} color={p.orange} w={3} />
      {/* Increments */}
      <Ground p={p} x={440} y={256} w={156} />
      {stacks.map((n, k) => {
        const x = 446 + k * 50;
        return (
          <g key={n}>
            {Array.from({ length: n }).map((_, j) => (
              <rect key={j} x={x} y={256 - (j + 1) * 30} width={44} height={27} rx={4} style={fill(blockColors[j])} />
            ))}
          </g>
        );
      })}
      <Chip p={p} x={442} y={270} w={48} text="S1" color={p.navy} />
      <Chip p={p} x={494} y={270} w={48} text="S1–S2" color={p.navy} />
      <Chip p={p} x={546} y={270} w={50} text="S1–S3" color={p.navy} />
      <Check p={p} x={584} y={150} r={12} />
      {/* Feedback */}
      <Ground p={p} x={300} y={382} w={150} />
      <Person p={p} x={340} y={326} s={0.8} />
      <rect x={372} y={300} width={80} height={34} rx={9} style={{ fill: p.paper, stroke: p.ink, strokeWidth: 1.5 }} />
      <rect x={382} y={309} width={36} height={4} rx={2} style={fill(p.orange)} />
      <rect x={382} y={319} width={58} height={3} rx={1.5} style={fill(p.grey)} />
      <Arrow x1={520} y1={294} cx={520} cy={318} x2={462} y2={318} color={p.navy} w={2.5} />
      <Arrow x1={310} y1={350} cx={120} cy={372} x2={70} y2={256} color={p.orange} w={2.5} dash="6 6" />
    </Svg>
  );
}

function AgilePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const practices: { k: string; v: string }[] = [
    { k: "Scrum", v: "固定長度的 Sprint 迭代，定義 PO、SM、開發團隊三種角色與一組固定會議" },
    { k: "Kanban", v: "把工作視覺化在看板上，限制進行中的工作數量（WIP），讓工作持續流動" },
    { k: "極限編程（XP）", v: "結對程式設計、測試驅動開發、持續整併等工程實踐" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1.35, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <SecHead n="一" Icon={RefreshCw} title="迭代迴圈" c={c} note="每一圈都交付、都回饋" />
        <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 14px 0" }}>
            <SprintScene p={p} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${c.border}` }}>
            <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: DS.small, fontWeight: 900, color: s.product.ink }}>每一圈交付可用增量</span>
              <span style={{ fontSize: DS.micro, color: c.muted }}>產品逐次長大，客戶每圈都拿得到能用的東西</span>
            </div>
            <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 2, borderLeft: `1px solid ${c.border}` }}>
              <span style={{ fontSize: DS.small, fontWeight: 900, color: s.product.ink }}>回饋回到 Backlog</span>
              <span style={{ fontSize: DS.micro, color: c.muted }}>使用者回饋與需求變更 → 重排優先序</span>
            </div>
          </div>
        </Panel>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
        <SecHead n="二" Icon={ListChecks} title="特徵與適用情境" c={c} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <StackRow c={c} tone={s.product} Icon={RefreshCw} k="迭代交付" v="每個 Sprint 交付可用的增量" />
          <StackRow c={c} tone={s.product} Icon={GitPullRequest} k="擁抱變化" v="需求變更成本低，隨迭代調整" />
          <StackRow c={c} tone={s.product} Icon={MessagesSquare} k="溝通與回饋" v="高頻、持續回饋" />
        </div>
        <span style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: ".1em", color: c.muted, paddingTop: 6 }}>適用：需求不明、需要快速試錯</span>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", borderBottom: `1px solid ${c.border}` }}>
          <CaseRow c={c} tone={s.product} Icon={Smartphone} k="消費型 App" />
          <CaseRow c={c} tone={s.product} Icon={Cloud} k="SaaS 產品" />
        </div>
        <Concl c={c}>「產品」通常會採用敏捷式方法。</Concl>
      </div>
      <div style={{ width: 340, flex: "none", display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
        <SecHead n="三" Icon={Lightbulb} title="精神與實踐" c={c} />
        <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>Agile 比較像一種精神或文化，背後有很多具體的實踐方法：</span>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          {practices.map((pr) => (
            <div key={pr.k} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 0", borderTop: `1px solid ${c.border}` }}>
              <span style={{ fontSize: DS.body, fontWeight: 900, color: s.product.ink }}>{pr.k}</span>
              <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{pr.v}</span>
            </div>
          ))}
        </div>
        <Note c={c}>具體實踐內容較多，之後再獨立整理</Note>
      </div>
    </div>
  );
}

// ── P6 核心差異：倒轉的鐵三角 + 六面向對照 ─────────────────────────

function InvTriangle({ c, p, tone, title, top, left, right, caption }: {
  c: DeckThemeTokens;
  p: P;
  tone: Tone;
  title: string;
  top: { k: string; fixed: boolean; note: string };
  left: { k: string; fixed: boolean; note: string };
  right: { k: string; fixed: boolean; note: string };
  caption: string;
}) {
  const S = 230;
  const k = S / 300;
  const verts = [
    { v: top, x: 150, y: 46, lx: 150, ly: 4 },
    { v: left, x: 44, y: 236, lx: 44, ly: 266 },
    { v: right, x: 256, y: 236, lx: 256, ly: 266 },
  ];
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: DS.body, fontWeight: 900, color: tone.ink }}>{title}</span>
      <div
        role="img"
        aria-label={`${title}：${verts.map((x) => `${x.v.k}${x.v.fixed ? "固定" : "估算"}`).join("、")}`}
        style={{ position: "relative", width: S, height: S + 40, flex: "none" }}
      >
        <svg viewBox="0 0 300 300" width={S} height={S} style={{ position: "absolute", left: 0, top: 22 }} aria-hidden="true">
          <polygon points="150,46 44,236 256,236" style={{ fill: tone.soft, stroke: tone.solid, strokeWidth: 2.5, strokeLinejoin: "round" }} />
          {verts.map((x) =>
            x.v.fixed ? <Lock key={x.v.k} p={p} x={x.x} y={x.y} r={17} /> : <circle key={x.v.k} cx={x.x} cy={x.y} r={11} style={{ fill: c.slide, stroke: tone.solid, strokeWidth: 2.5, strokeDasharray: "4 4" }} />,
          )}
        </svg>
        {verts.map((x) => (
          <div
            key={x.v.k}
            style={{
              position: "absolute",
              left: x.lx * k,
              top: x.ly * k + (x.ly < 100 ? 0 : 22),
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              whiteSpace: "nowrap",
              lineHeight: 1.25,
            }}
          >
            <span style={{ fontSize: DS.small, fontWeight: 700, color: c.ink }}>{x.v.k}</span>
            <span style={{ fontSize: DS.micro, fontWeight: 700, color: x.v.fixed ? c.accent : c.muted }}>{x.v.note}</span>
          </div>
        ))}
      </div>
      <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body, textAlign: "center" }}>{caption}</span>
    </div>
  );
}

function CorePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const rows: { Icon: LucideIcon; k: string; w: string; a: string; hi?: boolean }[] = [
    { Icon: PackageIcon, k: "交付方式", w: "走完所有階段後一次性交付", a: "每個 Sprint 交付可用的增量" },
    { Icon: GitPullRequest, k: "需求變更", w: "成本高、抗拒變更", a: "成本低、擁抱變化", hi: true },
    { Icon: FileText, k: "文件", w: "前期齊全、文件驅動", a: "精簡夠用即可" },
    { Icon: CalendarClock, k: "規劃時機", w: "前期規劃重、一次定案", a: "持續滾動、隨迭代調整" },
    { Icon: MessagesSquare, k: "溝通回饋", w: "里程碑階段審查", a: "高頻、持續回饋" },
    { Icon: Target, k: "適用情境", w: "需求穩定、合規要求高", a: "需求不明、需要快速試錯" },
  ];
  const cols = "136px 1fr 1fr";
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ width: 560, flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        <SecHead n="一" Icon={Scale} title="倒轉的鐵三角" c={c} note="固定的東西剛好相反" />
        <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
          <InvTriangle
            c={c}
            p={p}
            tone={s.project}
            title="Waterfall：先凍結範疇"
            top={{ k: "範疇", fixed: true, note: "固定" }}
            left={{ k: "時程", fixed: false, note: "估算" }}
            right={{ k: "成本", fixed: false, note: "估算" }}
            caption="先把要做什麼定案，再估要多久、花多少"
          />
          <div style={{ width: 1, alignSelf: "stretch", background: c.border }} />
          <InvTriangle
            c={c}
            p={p}
            tone={s.product}
            title="Agile：先固定時間與資源"
            top={{ k: "範疇", fixed: false, note: "估算" }}
            left={{ k: "時程", fixed: true, note: "固定（時間盒）" }}
            right={{ k: "成本", fixed: true, note: "固定（團隊）" }}
            caption="時間與人力先定下來，這一輪做多少由它決定"
          />
        </Panel>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
        <SecHead n="二" Icon={ListChecks} title="六個面向對照" c={c} />
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, alignItems: "center", padding: "2px 10px" }}>
          <span style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: ".1em", color: c.muted }}>面向</span>
          <div>
            <SideTag text="Waterfall 瀑布" tone={s.project} Icon={Layers} />
          </div>
          <div>
            <SideTag text="Agile 敏捷" tone={s.product} Icon={RefreshCw} />
          </div>
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateRows: "repeat(6, 1fr)", borderBottom: `1px solid ${c.border}` }}>
          {rows.map((r) => (
            <div
              key={r.k}
              style={{
                display: "grid",
                gridTemplateColumns: cols,
                gap: 12,
                alignItems: "center",
                borderTop: `1px solid ${c.border}`,
                background: r.hi ? c.accentSoft : "transparent",
                padding: "0 10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <r.Icon size={20} color={r.hi ? c.accent : c.ink} style={{ flex: "none" }} />
                <span style={{ fontSize: DS.body, fontWeight: 700, color: c.ink }}>{r.k}</span>
              </div>
              <span style={{ fontSize: DS.small, lineHeight: 1.45, color: c.ink, fontWeight: r.hi ? 700 : 400 }}>{r.w}</span>
              <span style={{ fontSize: DS.small, lineHeight: 1.45, color: c.ink, fontWeight: r.hi ? 700 : 400 }}>{r.a}</span>
            </div>
          ))}
        </div>
        <Concl c={c}>最關鍵的是「需求變更」：同一個變更，越晚發生代價差越大。</Concl>
      </div>
    </div>
  );
}

// ── P9 混搭：對外瀑布、對內敏捷 ────────────────────────────────

function HybridPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const neutral: Tone = { fg: c.brand, ink: c.brandInk, soft: c.brandSoft, solid: V.blue700, onSolid: V.n0 };
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <SecHead n="一" Icon={Scale} title="為什麼很少純粹" c={c} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          <StackRow c={c} tone={neutral} Icon={Users} k="原本為「人」設計" v="這些方法論原本都是讓人照特定模式執行" />
          <StackRow c={c} tone={neutral} Icon={Bot} k="AI Coding 改變節奏" v="AI 介入後改變了專案執行的節奏和方式" />
          <StackRow c={c} tone={neutral} Icon={Lightbulb} k="核心精神仍有參考價值" v="理解差異與適用情境，才能靈活運用、甚至混搭" />
          <StackRow c={c} tone={neutral} Icon={Handshake} k="也是溝通與說服的工具" v="說清楚風險和代價，替團隊爭取彈性與資源" />
        </div>
      </div>
      <div style={{ flex: 1.05, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
        <SecHead n="二" Icon={Layers} title="最常見的混搭" c={c} />
        <DefCard
          c={c}
          tone={s.project}
          art={<MiniMilestones p={p} />}
          tag={<SideTag text="對外・瀑布" tone={s.project} Icon={Milestone} />}
          title="里程碑與階段"
          desc="定義專案的範疇和交付節點，給客戶與管理層可預期的承諾"
        />
        <DefCard
          c={c}
          tone={s.product}
          art={<MiniLoopBoard p={p} />}
          tag={<SideTag text="對內・敏捷" tone={s.product} Icon={RefreshCw} />}
          title="Sprint 迴圈"
          desc="推進團隊的日常工作，中途的需求變更在內層被消化"
        />
        <Concl c={c}>兼顧外部的管理需求與內部的執行效率。</Concl>
      </div>
      <div style={{ width: 340, flex: "none", display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
        <SecHead n="三" Icon={TriangleAlert} title="混搭不是萬靈丹" c={c} />
        <FocusCard
          c={c}
          art={<MiniRebuild p={p} />}
          q="變更大到動搖範疇，例如整個模組砍掉重練？"
          answer="回到外層走正式 CR"
          note="內層能消化的變更，前提是它還在里程碑的範疇之內"
          hi
        />
        <Note c={c}>CR：上一章提到的正式變更流程</Note>
      </div>
    </div>
  );
}

// ── P12 小結 ───────────────────────────────────────────────

function SummaryPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const big = (tone: Tone, art: ReactNode, who: string, word: string, how: string, hi?: boolean) => (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "18px 22px",
        borderRadius: 14,
        border: hi ? `1.5px solid ${V.orange400}` : `1px solid ${c.border}`,
        background: hi ? c.accentSoft : c.slide,
      }}
    >
      {art}
      <span style={{ fontSize: DS.small, fontWeight: 700, color: tone.ink }}>{who}</span>
      <span style={{ fontSize: DS.h1, fontWeight: 900, color: c.ink, lineHeight: 1.1 }}>{word}</span>
      <span style={{ marginTop: "auto", fontSize: DS.small, lineHeight: 1.55, color: c.body }}>{how}</span>
    </div>
  );
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <SecHead n="一" Icon={LockIcon} title="Waterfall 追求可預測" c={c} />
          {big(s.project, <BigFrozen p={p} />, "Waterfall", "可預測", "前期把事情想清楚、凍結下來，換取交付的確定性。")}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
          <SecHead n="二" Icon={Rocket} title="Agile 追求可適應" c={c} />
          {big(s.product, <BigAdapt p={p} />, "Agile", "可適應", "小步快跑、持續回饋，換取回應變化的速度。", true)}
        </div>
        <div style={{ width: 380, flex: "none", display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
          <SecHead n="三" Icon={Wrench} title="方法論是工具箱" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            <StackRow c={c} tone={s.project} Icon={Target} k="依「在管什麼」挑選" v="專案多採瀑布式，產品多採敏捷式" />
            <StackRow c={c} tone={s.product} Icon={Layers} k="實務上多半混搭" v="對外瀑布的里程碑，對內敏捷的 Sprint" />
            <StackRow c={c} tone={s.project} Icon={Handshake} k="拿來溝通代價" v="讓決策者理解變更的風險與成本" />
          </div>
          <Concl c={c}>方法論不是信仰，是工具箱。</Concl>
        </div>
      </div>
      <NextBand
        c={c}
        lead={
          <>
            <Users size={36} color={c.brand} style={{ flex: "none" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: DS.body, fontWeight: 900, color: c.brandInk }}>接著要問「誰來做」</span>
              <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>
                同一群人換到 Waterfall 與 Scrum 底下，權責流向完全不同。
              </span>
            </div>
          </>
        }
        title="第三章：Role & Responsibility"
        sub="誰拍板、誰執行、誰被諮詢、誰被通知"
      />
    </div>
  );
}

// ── deck ────────────────────────────────────────────────────

const deck: Deck = {
  slug: "knowledge/project/pm-02-waterfall-vs-agile",
  title: "專案管理方法與精神",
  eyebrow: "PROJECT MANAGEMENT",
  generatedAt: "2026-09-26",
  source: "knowledge/project/pm-02-waterfall-vs-agile.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "PROJECT MANAGEMENT · 第二章",
      title: "專案管理方法與精神",
      subtitle: "Waterfall 把變更視為威脅而力求凍結（剛性），Agile 把變更視為原料而擁抱流動（柔性）；實務上多是「對外瀑布、對內敏捷」的混搭。",
      meta: ["2026-09-26", "專案管理基礎系列", "第 2 章"],
      agenda: [
        { n: "01", title: "Waterfall（瀑布式）與 Agile（敏捷式）", sub: "階段推進 vs 小步迭代" },
        { n: "02", title: "核心差異對照", sub: "凍結變更 vs 擁抱變更" },
        { n: "03", title: "實務上：很少有純瀑布或純敏捷", sub: "對外瀑布、對內敏捷" },
        { n: "04", title: "小結", sub: "可預測，還是可適應" },
      ],
    },
    {
      layout: "section",
      nav: "Waterfall 與 Agile",
      num: "01",
      eyebrow: "WATERFALL & AGILE",
      title: "Waterfall（瀑布式）與 Agile（敏捷式）",
      subtitle: "Waterfall 階段清楚、前期規劃重；Agile 迭代交付、擁抱變化",
    },
    {
      layout: "custom",
      nav: "Waterfall",
      num: "01",
      eyebrow: "WATERFALL",
      title: "Waterfall：階段依序推進，最後一次交付",
      pill: { text: "適合需求穩定的專案", tone: "blue" },
      render: WaterfallPage,
    },
    {
      layout: "custom",
      nav: "Agile",
      num: "01",
      eyebrow: "AGILE",
      title: "Agile：小步迭代，每一圈都交付",
      pill: { text: "適合需求不明的產品", tone: "orange" },
      render: AgilePage,
    },
    {
      layout: "section",
      nav: "核心差異對照",
      num: "02",
      eyebrow: "KEY DIFFERENCES",
      title: "核心差異對照",
      subtitle: "瀑布把變更視為威脅而力求凍結，敏捷把變更視為原料而擁抱流動",
    },
    {
      layout: "custom",
      nav: "倒轉的鐵三角",
      num: "02",
      eyebrow: "KEY DIFFERENCES",
      title: "兩者固定的東西剛好相反",
      pill: { text: "瀑布凍結範疇，敏捷固定時間盒", tone: "blue" },
      render: CorePage,
    },
    {
      layout: "full-visual",
      nav: "變更成本",
      num: "02",
      eyebrow: "COST OF CHANGE",
      title: "同一個變更，越晚發生代價差越大",
      pill: { text: "重點是形狀，不是數字", tone: "orange" },
      footnotes: [
        { n: "1", text: "倍數只是示意，參考 Boehm「越晚修正越貴」的觀察" },
        { n: "2", text: "敏捷的持平曲線是 Kent Beck 主張的理想狀態" },
      ],
      viz: PmChangeCost,
      vizLabel: "@ai-visualize · pm-change-cost",
    },
    {
      layout: "section",
      nav: "實務上的混搭",
      num: "03",
      eyebrow: "IN PRACTICE",
      title: "實務上：很少有純瀑布或純敏捷",
      subtitle: "理解差異與適用情境，才能在實務中靈活運用、甚至混搭",
    },
    {
      layout: "custom",
      nav: "對外瀑布、對內敏捷",
      num: "03",
      eyebrow: "HYBRID",
      title: "對外瀑布、對內敏捷",
      pill: { text: "兼顧外部管理與內部效率", tone: "blue" },
      render: HybridPage,
    },
    {
      layout: "full-visual",
      nav: "混搭模型",
      num: "03",
      eyebrow: "HYBRID MODEL",
      title: "變更在內層被消化，外層里程碑照常達成",
      pill: { text: "兩者並存，而非二選一", tone: "orange" },
      viz: PmHybridModel,
      vizLabel: "@ai-visualize · pm-hybrid-model",
    },
    {
      layout: "section",
      nav: "小結",
      num: "04",
      eyebrow: "SUMMARY",
      title: "小結",
      subtitle: "方法論不是信仰，是依「在管什麼」挑出來的工具箱",
    },
    {
      layout: "custom",
      nav: "小結",
      num: "04",
      eyebrow: "SUMMARY",
      title: "可預測，還是可適應",
      pill: { text: "方法論不是信仰", tone: "orange" },
      render: SummaryPage,
    },
  ],
};

export default deck;
