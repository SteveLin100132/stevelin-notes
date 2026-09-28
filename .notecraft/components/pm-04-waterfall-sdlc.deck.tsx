// Waterfall SDLC —— 簡報（note-deck）
//
// 報告式版面：右上 pill 是這頁的一句結論；內容區分成 2–3 個編號小節，欄與欄用細線分隔。
// 九個階段刻意畫成「由左上往右下遞降」的階梯：單向往下流這件事是靠形狀說的，不拆成清單。
// 流程主體用藍、閘門與變更用橘；狀態色只用在「放行 / 退回」。
// 插圖工具組、概念小圖、版面零件整段複製自 pm-03-role-responsibility.deck.tsx（源自 pm-01、pm-02）。
// 顏色取自 dkt() 與 trendlink token 的 CSS 變數，不硬編色碼；人物只用中性剪影，不加星光類裝飾。

import type { CSSProperties, ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUpRight,
  BookOpen,
  ChartColumn,
  ClipboardCheck,
  Code,
  DoorClosed,
  DraftingCompass,
  FileText,
  Flag,
  Layers,
  ListChecks,
  Map as MapIcon,
  Network,
  Rocket,
  Search,
  Table2,
  TestTube,
  Undo2,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import { DGAP, DS, DTRACK } from "@/components/deck/scale";
import PmSdlcPipeline from "@notes/components/pm-sdlc-pipeline";
import PmSdlcChangeRipple from "@notes/components/pm-sdlc-change-ripple";

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

// ── pm-04 插圖 ─────────────────────────────────────────────

function CascadeScene({ p }: { p: P }) {
  const pools = [
    { t: "規劃", x: 40, y: 50 },
    { t: "設計", x: 180, y: 128 },
    { t: "建置與測試", x: 320, y: 206 },
    { t: "驗收與上線", x: 460, y: 284 },
  ];
  const W = 190;
  return (
    <Svg vb={[700, 430]} label="插圖：規劃、設計、建置與測試、驗收與上線四個水池由上往下排列，最後流入維運；每個水池右側有一道閘門，通過驗收才溢流到下一級；一條從下游逆流回上游的橘色虛線，越往上代價越大">
      {pools.map((pl, i) => (
        <g key={pl.t}>
          <rect x={pl.x} y={pl.y} width={W} height={52} rx={8} style={{ fill: p.lblue, stroke: p.navy, strokeWidth: 1.5 }} />
          <rect x={pl.x} y={pl.y} width={W} height={12} rx={6} style={fill(p.blue)} />
          <Chip p={p} x={pl.x + 12} y={pl.y + 22} w={Math.max(52, pl.t.length * 15 + 16)} text={pl.t} color={p.navy} />
          {/* 閘門 */}
          <rect x={pl.x + W - 6} y={pl.y - 16} width={8} height={40} rx={3} style={fill(p.gold)} />
          <Diamond x={pl.x + W - 2} y={pl.y - 22} r={8} color={p.gold} />
          {/* 溢流 */}
          <path
            d={i < 3 ? `M${pl.x + W + 4} ${pl.y + 20}Q${pl.x + W + 26} ${pl.y + 30} ${pl.x + W + 22} ${pl.y + 76}` : `M${pl.x + W + 4} ${pl.y + 20}Q${pl.x + W + 26} ${pl.y + 40} ${pl.x + W - 20} ${pl.y + 84}`}
            style={line(p.blue, 6)}
          />
        </g>
      ))}
      <rect x={400} y={372} width={280} height={44} rx={10} style={fill(p.navy)} />
      <Chip p={p} x={416} y={385} w={52} text="維運" color={p.gold} />
      <Arrow x1={440} y1={338} cx={120} cy={330} x2={70} y2={116} color={p.orange} w={3} dash="7 6" />
      <Chip p={p} x={70} y={268} w={120} text="往回走，代價越大" color={p.orange} />
    </Svg>
  );
}

function GateScene({ p }: { p: P }) {
  const checks = ["交付物完整", "與 SRS 一致", "風險已記錄", "相關方簽核"];
  return (
    <Svg vb={[640, 420]} label="插圖：System Design 階段產出的 SDD 送進里程碑審查，逐項檢查交付物完整、與 SRS 一致、風險已記錄、相關方簽核；PM、客戶、技術主管簽核後放行到 Coding，缺項則退回補件">
      {/* 階段 N 的交付物 */}
      <Chip p={p} x={20} y={96} w={96} text="System Design" color={p.navy} />
      <Doc p={p} x={28} y={124} w={80} h={104} acc={p.navy} />
      <Chip p={p} x={42} y={238} w={52} text="SDD" color={p.blue} />
      <Arrow x1={118} y1={176} x2={170} y2={176} color={p.navy} w={3} />
      {/* 審查板 */}
      <rect x={176} y={50} width={250} height={266} rx={12} style={fs(p.paper, p.ink)} />
      <rect x={176} y={50} width={250} height={40} rx={12} style={fill(p.navy)} />
      <rect x={176} y={74} width={250} height={16} style={fill(p.navy)} />
      <text x={301} y={76} textAnchor="middle" style={{ fill: p.white, fontSize: 14, fontWeight: 700 }}>
        Milestone Review
      </text>
      {checks.map((t, i) => {
        const y = 110 + i * 40;
        return (
          <g key={t}>
            <rect x={196} y={y} width={20} height={20} rx={5} style={fs(p.paper, p.navy, 1.5)} />
            {i < 3 && <path d={`M200 ${y + 10}l4 4 8-9`} style={line(p.green, 2.5)} />}
            <text x={228} y={y + 15} style={{ fill: p.ink, fontSize: 14, fontWeight: 700 }}>
              {t}
            </text>
          </g>
        );
      })}
      {[216, 286, 356].map((x) => (
        <Person key={x} p={p} x={x} y={274} s={0.5} />
      ))}
      {[216, 286, 356].map((x, i) => (
        <Stamp key={`s${x}`} p={p} x={x + 20} y={272} r={9} rot={-10 + i * 8} />
      ))}
      <text x={216} y={312} textAnchor="middle" style={{ fill: p.ink, fontSize: 11 }}>PM</text>
      <text x={286} y={312} textAnchor="middle" style={{ fill: p.ink, fontSize: 11 }}>客戶</text>
      <text x={356} y={312} textAnchor="middle" style={{ fill: p.ink, fontSize: 11 }}>技術主管</text>
      {/* 放行 */}
      <Arrow x1={434} y1={150} x2={496} y2={150} color={p.green} w={3.5} />
      <rect x={504} y={112} width={120} height={76} rx={10} style={{ fill: p.paper, stroke: p.green, strokeWidth: 2 }} />
      <Check p={p} x={528} y={150} r={12} />
      <text x={548} y={146} style={{ fill: p.ink, fontSize: 14, fontWeight: 700 }}>放行</text>
      <text x={548} y={166} style={{ fill: p.ink, fontSize: 12 }}>進入 Coding</text>
      {/* 退回 */}
      <Arrow x1={300} y1={322} cx={300} cy={392} x2={70} y2={262} color={p.orange} w={2.5} dash="6 6" />
      <Chip p={p} x={318} y={364} w={132} text="缺項：退回補件" color={p.orange} />
    </Svg>
  );
}

function RevisionStack({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={80} label="小圖：一疊越堆越高的改版文件，最上面蓋著 CR 章">
      <Doc p={p} x={8} y={22} w={40} h={50} acc={p.lblue} rot={-8} />
      <Doc p={p} x={16} y={16} w={40} h={50} acc={p.navy} rot={-2} />
      <Doc p={p} x={24} y={10} w={40} h={50} acc={p.gold} rot={5} />
      <Stamp p={p} x={62} y={58} r={14} rot={-10} />
    </Svg>
  );
}

// ── P2 為什麼叫瀑布 ─────────────────────────────────────────

function CascadePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1.45, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <SecHead n="一" Icon={Layers} title="瀑布隱喻" c={c} note="水只往下流" />
          <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
            <CascadeScene p={p} />
          </Panel>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
          <SecHead n="二" Icon={ListChecks} title="三個特性" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            <StackRow c={c} tone={s.project} Icon={ArrowDown} k="單向往下流" v="一個階段完成，水才往下一級流" />
            <StackRow c={c} tone={s.project} Icon={DoorClosed} k="每一階都有閘門" v="交付物驗收＋里程碑審查，通過了才放行" />
            <StackRow c={c} tone={s.product} Icon={Undo2} k="往回走代價很高" v="越下游，回頭重做的代價越大" />
          </div>
          <Concl c={c}>本章看階段、會議、交付物如何環環相扣。</Concl>
        </div>
      </div>
      <WhyBand c={c} art={<MiniSdlc p={p} />} title="SDLC：軟體開發生命週期">
        把專案從構思到退役拆解成數個明確階段；Waterfall 是其中最經典的一種。
      </WhyBand>
    </div>
  );
}

// ── P4 九個階段（階梯）──────────────────────────────────────

interface Stage {
  n: number;
  en: string;
  zh: string;
  Icon: LucideIcon;
  v: string;
  optional?: boolean;
}

const STAGES: Stage[] = [
  { n: 1, en: "Blueprint", zh: "藍圖", Icon: MapIcon, v: "確認目標、範疇與預期成果；最便宜的修改點" },
  { n: 2, en: "System Analysis", zh: "系統分析", Icon: Search, v: "訪談需求、釐清流程，產出 SRS" },
  { n: 3, en: "System Design", zh: "系統設計", Icon: DraftingCompass, v: "架構、資料模型、介面與 API 規格" },
  { n: 4, en: "Coding", zh: "開發", Icon: Code, v: "依設計文件實作，把 SDD 變成程式" },
  { n: 5, en: "SIT", zh: "系統整合測試", Icon: Network, v: "QA 測「整體會不會壞」" },
  { n: 6, en: "UAT", zh: "使用者驗收", Icon: ClipboardCheck, v: "用戶依驗收標準操作，通過即可上線" },
  { n: 7, en: "Cutover", zh: "切換", Icon: ArrowLeftRight, v: "資料移轉、停機計畫、進退版", optional: true },
  { n: 8, en: "Go-Live", zh: "上線", Icon: Rocket, v: "正式運作，之後都是 Production 修改" },
  { n: 9, en: "Maintenance", zh: "維運", Icon: Wrench, v: "維護優化，知識回流下一個藍圖" },
];

const STEP_SHADE = ["var(--blue-100)", "var(--blue-100)", "var(--blue-200)", "var(--blue-200)", "var(--blue-300)", "var(--blue-300)", "var(--blue-400)", "var(--blue-500)", "var(--blue-700)"];
const STEP_DROP = 24;
const GATE_W = 16;

function StagesPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const groups: { t: string; span: number }[] = [
    { t: "規劃", span: 2 },
    { t: "設計", span: 1 },
    { t: "建置與測試", span: 2 },
    { t: "驗收與上線", span: 3 },
    { t: "維運", span: 1 },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        role="img"
        aria-label="九個階段由左上往右下逐級遞降：Blueprint、System Analysis、System Design、Coding、SIT、UAT、Cutover（視情況）、Go-Live、Maintenance；階段之間有閘門"
        style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-start" }}
      >
        {STAGES.map((st, i) => (
          <div key={st.n} style={{ display: "contents" }}>
            {i > 0 && (
              <div style={{ width: GATE_W, flex: "none", paddingTop: i * STEP_DROP + 22, display: "flex", justifyContent: "center" }}>
                <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
                  <Diamond x={8} y={8} r={7} color={V.orange400} />
                </svg>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0, paddingTop: i * STEP_DROP }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "12px 12px 14px",
                  borderRadius: 12,
                  background: c.slide,
                  border: st.optional ? `1.5px dashed ${c.muted}` : `1px solid ${c.border}`,
                  borderTop: st.optional ? `1.5px dashed ${c.muted}` : `5px solid ${STEP_SHADE[i]}`,
                  boxShadow: c.shadow,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: MONO, fontSize: DS.h4, fontWeight: 900, color: c.brand }}>{String(st.n).padStart(2, "0")}</span>
                  <st.Icon size={20} color={c.brand} />
                </div>
                <span style={{ fontSize: DS.small, fontWeight: 900, color: c.ink, lineHeight: 1.25 }}>{st.en}</span>
                <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted }}>
                  {st.zh}
                  {st.optional ? "（視情況）" : ""}
                </span>
                <span style={{ fontSize: DS.micro, lineHeight: 1.5, color: c.body }}>{st.v}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: "none", display: "flex" }}>
        {groups.map((g, i) => (
          <div
            key={g.t}
            style={{
              flex: g.span,
              marginLeft: i ? GATE_W : 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div style={{ alignSelf: "stretch", height: 8, borderLeft: `2px solid ${c.border}`, borderRight: `2px solid ${c.border}`, borderBottom: `2px solid ${c.border}` }} />
            <span style={{ fontSize: DS.small, fontWeight: 700, color: c.brandInk }}>{g.t}</span>
          </div>
        ))}
      </div>
      <Concl c={c}>Blueprint 是整段瀑布最便宜的修改點；Go-Live 之後，任何修改都是 Production 修改，成本最高。</Concl>
    </div>
  );
}

// ── P6 會議：守門人 ─────────────────────────────────────────

function MeetingsPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const p = ilPalette(dark);
  const meetings: { n: number; en: string; zh: string; at: string; v: string; tag?: string }[] = [
    { n: 1, en: "Kickoff Meeting", zh: "啟動會議", at: "Blueprint", v: "對齊目標、範疇、角色責任與初步計畫", tag: "唯一不審查交付物" },
    { n: 2, en: "Milestone Review", zh: "里程碑審查", at: "SA 到 SIT 各閘門", v: "評估進度與成果、決定是否放行下一階段", tag: "Waterfall 的節拍器" },
    { n: 3, en: "UAT Meeting", zh: "使用者驗收會議", at: "UAT", v: "用戶實際參與驗收、簽署驗收文件" },
    { n: 4, en: "Go-Live Meeting", zh: "上線會議", at: "Cutover 到 Go-Live", v: "確認部署步驟、分工、回退機制與支援資源" },
    { n: 5, en: "Handover Meeting", zh: "交接會議", at: "Maintenance", v: "交接成果與文件、知識轉移、未結項目與已知風險" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1.1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <SecHead n="一" Icon={DoorClosed} title="一道閘門長什麼樣" c={c} note="以 System Design 為例" />
        <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
          <GateScene p={p} />
        </Panel>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
        <SecHead n="二" Icon={Flag} title="五場會議" c={c} note="不同位置的閘門，由不同會議把關" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          {meetings.map((m) => (
            <div key={m.n} style={{ display: "flex", gap: 14, padding: "10px 0", borderTop: `1px solid ${c.border}` }}>
              <span style={{ fontFamily: MONO, fontSize: DS.h4, fontWeight: 900, color: c.brand, width: 28, flex: "none" }}>{m.n}</span>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: DS.body, fontWeight: 900, color: c.ink }}>{m.en}</span>
                  <span style={{ fontSize: DS.small, color: c.muted }}>{m.zh}</span>
                  <span style={{ marginLeft: "auto", padding: "1px 10px", borderRadius: 999, background: c.brandSoft, fontSize: DS.micro, fontWeight: 700, color: c.brandInk }}>{m.at}</span>
                </div>
                <span style={{ fontSize: DS.small, lineHeight: 1.45, color: c.body }}>{m.v}</span>
                {m.tag && <Note c={c}>{m.tag}</Note>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── P7 文件即合約 ───────────────────────────────────────────

const DOCS: { k: string; at: string; v: string; Icon: LucideIcon }[] = [
  { k: "PRD", at: "Blueprint", v: "定義「為什麼要做」與「成功長什麼樣」", Icon: FileText },
  { k: "SRS", at: "System Analysis", v: "把 PRD 轉成可驗證的系統需求", Icon: ListChecks },
  { k: "SDD", at: "System Design", v: "承接 SRS，給出架構與細部設計", Icon: Layers },
  { k: "Test Plan / Case", at: "SIT", v: "測試計畫與案例，對應 SRS 與 SDD", Icon: TestTube },
  { k: "UAT Checklist", at: "UAT", v: "驗收清單，業務方簽收的依據", Icon: ClipboardCheck },
  { k: "Cutover Plan", at: "Cutover", v: "資料移轉、停機計畫、進退版策略", Icon: ArrowLeftRight },
  { k: "Maintenance Manual", at: "Go-Live / Handover", v: "維運手冊，封裝專案知識", Icon: BookOpen },
];

function DocChain({ c }: { c: DeckThemeTokens }) {
  const short = ["PRD", "SRS", "SDD", "Test Plan", "UAT List", "Cutover", "Manual"];
  return (
    <Panel c={c} style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, padding: "10px 14px" }}>
      {DOCS.map((d, i) => (
        <div key={d.k} style={{ display: "contents" }}>
          {i > 0 && (
            <svg viewBox="0 0 20 14" width={18} height={14} aria-hidden="true" style={{ flex: "none" }}>
              <path d="M1 7H14M10 3L14 7 10 11" style={line(V.blue300, 2)} />
            </svg>
          )}
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 10, background: c.slide, border: `1px solid ${c.border}` }}>
            <d.Icon size={18} color={c.brand} style={{ flex: "none" }} />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: DS.small, fontWeight: 900, color: c.ink, whiteSpace: "nowrap" }}>{short[i]}</span>
              <span style={{ fontSize: DS.micro, color: c.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.at}</span>
            </div>
          </div>
        </div>
      ))}
    </Panel>
  );
}

function TraceMap({ c }: { c: DeckThemeTokens }) {
  const W = 880;
  const H = 300;
  const colX = [0, 234, 468, 702];
  const colW = 178;
  const rowY = [44, 132, 220];
  const rowH = 60;
  const heads = [
    { k: "PRD", v: "產品需求" },
    { k: "SRS", v: "系統需求" },
    { k: "SDD", v: "系統設計" },
    { k: "Test Case", v: "測試案例" },
  ];
  const cols: { id: string; t: string }[][] = [
    [
      { id: "G1", t: "縮短排班時間" },
      { id: "G2", t: "出勤可以追蹤" },
      { id: "G3", t: "舊班表（下期）" },
    ],
    [
      { id: "REQ-01", t: "自動推薦班表" },
      { id: "REQ-02", t: "排除時段設定" },
      { id: "REQ-03", t: "出勤統計" },
    ],
    [
      { id: "API", t: "產生草稿班表" },
      { id: "DB", t: "排除時段資料表" },
      { id: "API", t: "統計報表查詢" },
    ],
    [
      { id: "TC-01", t: "推薦符合限制" },
      { id: "TC-02", t: "排除時段生效" },
      { id: "TC-03", t: "統計數字正確" },
    ],
  ];
  const links: [number, number, number, number][] = [
    [0, 0, 1, 0],
    [0, 0, 1, 1],
    [0, 1, 1, 2],
    [1, 0, 2, 0],
    [1, 1, 2, 1],
    [1, 2, 2, 2],
    [2, 0, 3, 0],
    [2, 1, 3, 1],
    [2, 2, 3, 2],
  ];
  const hot = (ci: number, ri: number) => ri === 1 && ci >= 1;
  return (
    <div
      role="img"
      aria-label="DutyMate 的需求追溯線：PRD 的目標展開成 SRS 的需求，再對應到 SDD 的設計與測試案例；REQ-02 排除時段設定變更後，沿線的排除時段資料表與 TC-02 都要一起改版"
      style={{ position: "relative", width: W, height: H, flex: "none" }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        {links.map(([c1, r1, c2, r2], i) => {
          const on = hot(c2, r2) && hot(c1, r1) || (c1 === 1 && r1 === 1 && c2 === 2 && r2 === 1);
          const x1 = colX[c1] + colW;
          const y1 = rowY[r1] + rowH / 2;
          const x2 = colX[c2];
          const y2 = rowY[r2] + rowH / 2;
          return (
            <path
              key={i}
              d={`M${x1} ${y1}C${x1 + 30} ${y1} ${x2 - 30} ${y2} ${x2} ${y2}`}
              style={line(on ? V.orange400 : V.blue300, on ? 3 : 2)}
            />
          );
        })}
      </svg>
      {heads.map((h, ci) => (
        <div key={h.k} style={{ position: "absolute", left: colX[ci], top: 0, width: colW, display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: DS.small, fontWeight: 900, color: c.brandInk }}>{h.k}</span>
          <span style={{ fontSize: DS.micro, color: c.muted }}>{h.v}</span>
        </div>
      ))}
      {cols.map((col, ci) =>
        col.map((it, ri) => {
          const isHot = hot(ci, ri);
          return (
            <div
              key={`${ci}-${ri}`}
              style={{
                position: "absolute",
                left: colX[ci],
                top: rowY[ri],
                width: colW,
                height: rowH,
                boxSizing: "border-box",
                padding: "6px 10px",
                borderRadius: 10,
                background: isHot ? c.accentSoft : c.slide,
                border: isHot ? `2px solid ${V.orange400}` : `1px solid ${c.border}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: DS.micro, fontWeight: 700, color: isHot ? c.accent : c.brand }}>{it.id}</span>
              <span style={{ fontSize: DS.small, fontWeight: 700, color: c.ink, whiteSpace: "nowrap" }}>{it.t}</span>
              {isHot && (
                <span style={{ position: "absolute", right: -6, top: -10, padding: "0 8px", borderRadius: 999, background: V.orange400, fontSize: DS.micro, fontWeight: 700, color: V.n900 }}>
                  {ci === 1 ? "變更" : "改版"}
                </span>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

function DocsPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <DocChain c={c} />
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <SecHead n="一" Icon={Network} title="一條需求的追溯線" c={c} note="以 DutyMate 為例" />
          <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 12 }}>
            <TraceMap c={c} />
            <span style={{ fontSize: DS.small, color: c.body }}>REQ-02 一變更，沿著追溯線的設計與測試案例都要一起改版。</span>
          </Panel>
        </div>
        <div style={{ width: 380, flex: "none", display: "flex", flexDirection: "column", gap: 6, ...divider(c) }}>
          <SecHead n="二" Icon={FileText} title="七份交付物的用途" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            {DOCS.map((d) => (
              <div key={d.k} style={{ display: "flex", flexDirection: "column", gap: 1, padding: "5px 0", borderTop: `1px solid ${c.border}` }}>
                <span style={{ fontSize: DS.small, fontWeight: 900, color: c.ink }}>{d.k}</span>
                <span style={{ fontSize: DS.micro, lineHeight: 1.45, color: c.body }}>{d.v}</span>
              </div>
            ))}
          </div>
          <Note c={c}>Coding 與 Go-Live 沒有獨立文件</Note>
        </div>
      </div>
    </div>
  );
}

// ── P11 變更成本 ────────────────────────────────────────────

function RiskPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const s = sides(c);
  const p = ilPalette(dark);
  const bars: { k: string; x: number }[] = [
    { k: "BP", x: 1 },
    { k: "SA", x: 1.5 },
    { k: "SD", x: 2.5 },
    { k: "DEV", x: 5 },
    { k: "SIT", x: 10 },
    { k: "UAT", x: 20 },
    { k: "CUT", x: 35 },
    { k: "GO", x: 60 },
    { k: "MNT", x: 80 },
  ];
  const H = 300;
  const color = (i: number) => (i < 3 ? V.blue300 : i < 6 ? V.blue700 : V.orange400);
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1.25, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <SecHead n="一" Icon={ChartColumn} title="變更成本倍數" c={c} note="示意值，重點是形狀" />
        <div
          role="img"
          aria-label="九個階段的變更成本倍數（示意）：BP 1 倍、SA 1.5 倍、SD 2.5 倍、DEV 5 倍、SIT 10 倍、UAT 20 倍、CUT 35 倍、GO 60 倍、MNT 80 倍"
          style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8 }}
        >
          <div style={{ height: H + 30, display: "flex", alignItems: "flex-end", gap: 14, borderBottom: `2px solid ${c.border}` }}>
            {bars.map((b, i) => (
              <div key={b.k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: DS.small, fontWeight: 900, color: i >= 6 ? c.accent : c.ink }}>{b.x}x</span>
                <div style={{ width: "100%", height: Math.max(4, (b.x / 80) * H), borderRadius: "6px 6px 0 0", background: color(i) }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {bars.map((b) => (
              <span key={b.k} style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: DS.micro, fontWeight: 700, color: c.muted }}>
                {b.k}
              </span>
            ))}
          </div>
        </div>
        <Concl c={c}>同一個變更，在 Blueprint 改是 1 倍，到了維運階段是 80 倍（示意）。</Concl>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
        <SecHead n="二" Icon={Undo2} title="為什麼會放大" c={c} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          <StackRow c={c} tone={s.project} Icon={Network} k="文件即合約" v="前一份文件是後一份的輸入，改一條需求要沿線改版" />
          <StackRow c={c} tone={s.project} Icon={Layers} k="一路回頭重做" v="設計、開發、測試、文件都要跟著改" />
          <StackRow c={c} tone={s.product} Icon={ArrowDown} k="越下游越多" v="每往後一個階段，要拆掉的東西就越多" />
          <StackRow c={c} tone={s.product} Icon={Rocket} k="上線之後" v="任何修改都是 Production 修改，成本最高" />
        </div>
      </div>
      <div style={{ width: 320, flex: "none", display: "flex", flexDirection: "column", gap: 10, ...divider(c) }}>
        <SecHead n="三" Icon={DoorClosed} title="所以才要閘門" c={c} />
        <FocusCard
          c={c}
          art={<RevisionStack p={p} />}
          q="怎麼把問題擋在便宜的前期？"
          answer="盡早凍結、盡早驗收"
          note="真的非改不可，就走變更管理流程（CR），把影響評估清楚再動手"
          hi
        />
        <Note c={c}>閘門、需求凍結、里程碑審查目的都一樣</Note>
      </div>
    </div>
  );
}

// ── P14 總表 ───────────────────────────────────────────────

function SummaryPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const rows: { n: number; stage: string; zh: string; meet: string; doc: string; self?: boolean; optional?: boolean }[] = [
    { n: 1, stage: "Blueprint", zh: "藍圖", meet: "Kickoff Meeting", doc: "PRD" },
    { n: 2, stage: "System Analysis（SA）", zh: "系統分析", meet: "Milestone Review", doc: "SRS" },
    { n: 3, stage: "System Design（SD）", zh: "系統設計", meet: "Milestone Review", doc: "SDD" },
    { n: 4, stage: "Coding", zh: "開發", meet: "Milestone Review", doc: "程式碼本身", self: true },
    { n: 5, stage: "SIT", zh: "系統整合測試", meet: "Milestone Review", doc: "Test Plan / Case" },
    { n: 6, stage: "UAT", zh: "使用者驗收", meet: "UAT Meeting", doc: "UAT Checklist" },
    { n: 7, stage: "Cutover", zh: "切換（視情況）", meet: "Go-Live Meeting", doc: "Cutover Plan", optional: true },
    { n: 8, stage: "Go-Live", zh: "上線", meet: "Go-Live Meeting", doc: "上線本身", self: true },
    { n: 9, stage: "Maintenance", zh: "維運", meet: "Handover Meeting", doc: "Maintenance Manual" },
  ];
  const cols = "56px 1.3fr 1fr 1fr";
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <SecHead n="一" Icon={Table2} title="階段、會議、交付物總表" c={c} />
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "2px 12px" }}>
          {["#", "階段", "對應會議", "該階段交付物"].map((h) => (
            <span key={h} style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: ".1em", color: c.muted }}>
              {h}
            </span>
          ))}
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateRows: "repeat(9, 1fr)", borderBottom: `1px solid ${c.border}` }}>
          {rows.map((r) => (
            <div
              key={r.n}
              style={{
                display: "grid",
                gridTemplateColumns: cols,
                gap: 12,
                alignItems: "center",
                padding: "0 12px",
                borderTop: r.optional ? `1px dashed ${c.muted}` : `1px solid ${c.border}`,
                background: r.n % 2 === 0 ? c.sunken : "transparent",
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: DS.small, fontWeight: 900, color: c.brand }}>{String(r.n).padStart(2, "0")}</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: DS.small, fontWeight: 900, color: c.ink }}>{r.stage}</span>
                <span style={{ fontSize: DS.micro, color: c.muted }}>{r.zh}</span>
              </div>
              <div>
                <span style={{ padding: "1px 10px", borderRadius: 999, background: c.brandSoft, fontSize: DS.micro, fontWeight: 700, color: c.brandInk }}>{r.meet}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FileText size={16} color={r.self ? c.muted : c.accent} style={{ flex: "none" }} />
                <span style={{ fontSize: DS.small, fontWeight: r.self ? 400 : 700, color: r.self ? c.muted : c.ink }}>{r.doc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <NextBand
        c={c}
        lead={
          <>
            <Wrench size={36} color={c.brand} style={{ flex: "none" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: DS.body, fontWeight: 900, color: c.brandInk }}>觀念與流程都有了</span>
              <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>最後一章看怎麼把它們落地：WBS、Gantt、Kanban、Task 如何分工與串接。</span>
            </div>
          </>
        }
        title="第五章：專案管理工具"
        sub="WBS、Gantt、Kanban、Task"
      />
    </div>
  );
}

// ── deck ────────────────────────────────────────────────────

const deck: Deck = {
  slug: "knowledge/project/pm-04-waterfall-sdlc",
  title: "Waterfall SDLC",
  eyebrow: "PROJECT MANAGEMENT",
  generatedAt: "2026-09-26",
  source: "knowledge/project/pm-04-waterfall-sdlc.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "PROJECT MANAGEMENT · 第四章",
      title: "Waterfall SDLC",
      subtitle: "拆解 Waterfall SDLC 的閘門式單向流程：九個階段、對應的會議與交付物文件鏈如何接力，以及需求越晚變更、成本越放大的結構性風險。",
      meta: ["2026-09-26", "專案管理基礎系列", "第 4 章"],
      agenda: [
        { n: "01", title: "九個階段", sub: "一級一級往下流" },
        { n: "02", title: "五場管控會議與七份交付物", sub: "守門人與文件鏈" },
        { n: "03", title: "階段、會議、交付物一起看", sub: "同一條瀑布上接力" },
        { n: "04", title: "Waterfall 的風險：需求變更的成本", sub: "越晚改越貴" },
        { n: "05", title: "小結", sub: "總表" },
      ],
    },
    {
      layout: "custom",
      nav: "為什麼叫瀑布",
      eyebrow: "BEFORE WE START",
      title: "為什麼叫「瀑布」：水只往下流",
      pill: { text: "往回走，代價很高", tone: "orange" },
      render: CascadePage,
    },
    {
      layout: "section",
      nav: "九個階段",
      num: "01",
      eyebrow: "NINE STAGES",
      title: "九個階段",
      subtitle: "每個階段都有一道閘門，通過了，水才往下一級流",
    },
    {
      layout: "custom",
      nav: "九個階段",
      num: "01",
      eyebrow: "NINE STAGES",
      title: "九個階段，一級一級往下流",
      pill: { text: "越晚修改，成本越高", tone: "orange" },
      render: StagesPage,
    },
    {
      layout: "section",
      nav: "會議與交付物",
      num: "02",
      eyebrow: "MEETINGS & DELIVERABLES",
      title: "五場管控會議與七份交付物",
      subtitle: "會議確認上一階段是否真的完成；文件則一份接一份交棒",
    },
    {
      layout: "custom",
      nav: "五場會議",
      num: "02",
      eyebrow: "MEETINGS",
      title: "會議是守門人：確認上一階段真的完成",
      pill: { text: "通過閘門才往下流", tone: "blue" },
      render: MeetingsPage,
    },
    {
      layout: "custom",
      nav: "七份交付物",
      num: "02",
      eyebrow: "DELIVERABLES",
      title: "文件即合約：前一份是後一份的輸入",
      pill: { text: "改一條需求，後面都要改", tone: "orange" },
      render: DocsPage,
    },
    {
      layout: "section",
      nav: "一起看",
      num: "03",
      eyebrow: "ALL TOGETHER",
      title: "階段、會議、交付物一起看",
      subtitle: "把三張表疊在同一條瀑布上，就能看出它們如何接力",
    },
    {
      layout: "full-visual",
      nav: "通過閘門",
      num: "03",
      eyebrow: "PIPELINE",
      title: "一格一格通過閘門",
      pill: { text: "每過一道閘門，多一份文件交棒", tone: "blue" },
      viz: PmSdlcPipeline,
      vizLabel: "@ai-visualize · pm-sdlc-pipeline",
    },
    {
      layout: "section",
      nav: "變更成本",
      num: "04",
      eyebrow: "RISK",
      title: "Waterfall 的風險：需求變更的成本",
      subtitle: "需求越晚改，就要沿著設計、開發、測試、文件一路回頭重做",
    },
    {
      layout: "custom",
      nav: "越晚改越貴",
      num: "04",
      eyebrow: "COST OF CHANGE",
      title: "變更越晚，要回頭改的越多",
      pill: { text: "把問題擋在便宜的前期", tone: "orange" },
      render: RiskPage,
    },
    {
      layout: "full-visual",
      nav: "變更漣漪",
      num: "04",
      eyebrow: "CHANGE RIPPLE",
      title: "選一個時點，看成本如何放大",
      pill: { text: "倍數是示意，重點是形狀", tone: "orange" },
      viz: PmSdlcChangeRipple,
      vizLabel: "@ai-visualize · pm-sdlc-change-ripple",
    },
    {
      layout: "section",
      nav: "小結",
      num: "05",
      eyebrow: "SUMMARY",
      title: "小結",
      subtitle: "九個階段、五場會議、七份交付物，在同一條瀑布上接力",
    },
    {
      layout: "custom",
      nav: "總表",
      num: "05",
      eyebrow: "SUMMARY",
      title: "九個階段的會議與交付物總表",
      pill: { text: "文件鏈跑通，專案才算跑完", tone: "blue" },
      render: SummaryPage,
    },
  ],
};

export default deck;
