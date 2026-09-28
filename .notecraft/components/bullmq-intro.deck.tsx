// BullMQ 入門 —— 簡報（note-deck）
//
// 版面採「一頁一份報告」：右上 pill 是這頁的一句結論；內容區分成 2–3 個編號小節，
// 欄與欄用細線分隔，每節用最適合的形式呈現（流程帶、細線清單、泳道、程式碼卡、對照表），
// 並以情境插圖輔助。版面安排參考 2023/11/09 原簡報（ETL 時間軸、ENQUEUE → DEQUEUE 管線、
// 1s / 2s / 4s / 8s 重試泳道、Dashboard 標註、三組告警框），改成 trendlink-design 淺色報告式版面。
// 顏色取自 dkt() 與 trendlink token 的 CSS 變數，不硬編色碼；人物不入鏡、不加裝飾（專案 CLAUDE.md）。

import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  ArrowUpNarrowWide,
  Ban,
  BellRing,
  Boxes,
  Calculator,
  CalendarClock,
  Check as CheckIcon,
  CircleCheck,
  CircleX,
  Cpu,
  Database,
  Eye,
  FileText,
  Gauge,
  LayoutDashboard,
  ListOrdered,
  Mail,
  Pause,
  Power,
  Radio,
  Rocket,
  RotateCcw,
  ScrollText,
  Send,
  Server,
  ShieldAlert,
  Timer,
  TrendingUp,
  TriangleAlert,
  Workflow,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import { DS, DTRACK } from "@/components/deck/scale";
import { Code } from "@/components/deck/blocks";
import BullmqJobLifecycle from "@notes/components/bullmq-job-lifecycle";

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
};

const MONO = "var(--font-mono)";

/** 藍 = 結構與主流程、橘 = 強調與需要注意（全 deck 固定） */
function tones(c: DeckThemeTokens) {
  return {
    blue: { fg: c.brand, ink: c.brandInk, soft: c.brandSoft, solid: V.blue700, onSolid: V.n0 },
    orange: { fg: c.accent, ink: c.accent, soft: c.accentSoft, solid: V.orange400, onSolid: V.n900 },
  };
}
type Tone = ReturnType<typeof tones>["blue"];

// ── 插圖工具組 ───────────────────────────────────────────────
// 扁平雙色 + 細描邊。物件都吃同一組色票 P，亮暗主題各一套。
// 短標籤（≤ 6 字元）可以直接用 <text>，其餘說明文字一律放 HTML。

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
    red: "var(--danger-500)",
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

/** 失敗徽章：紅色圓 + 叉 */
function XBadge({ p, x, y, r = 11 }: { p: P; x: number; y: number; r?: number }) {
  const k = r * 0.38;
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={fill(p.red)} />
      <path d={`M${x - k} ${y - k}l${k * 2} ${k * 2}M${x + k} ${y - k}l${-k * 2} ${k * 2}`} style={line(p.white, r / 4.5)} />
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

// ── 本 deck 專用物件 ─────────────────────────────────────────

/** Job 卡：一張帶色條的小卡，右上角可掛狀態徽章 */
function JobCard({
  p,
  x,
  y,
  w,
  h,
  acc,
  badge,
  stroke,
  opacity = 1,
}: {
  p: P;
  x: number;
  y: number;
  w: number;
  h: number;
  acc: string;
  badge?: "check" | "x" | "late" | "alert";
  stroke?: string;
  opacity?: number;
}) {
  const r = Math.max(8, Math.min(12, w / 6));
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={5} style={fs(p.paper, stroke ?? p.ink, stroke ? 2.5 : 1.5)} />
      <rect x={x + 6} y={y + 6} width={w * 0.5} height={5} rx={2.5} style={fill(acc)} />
      <rect x={x + 6} y={y + h * 0.5} width={w - 14} height={3} rx={1.5} style={fill(p.grey)} />
      <rect x={x + 6} y={y + h * 0.72} width={w * 0.55} height={3} rx={1.5} style={fill(p.grey)} />
      {badge === "check" && <Check p={p} x={x + w} y={y} r={r} />}
      {badge === "x" && <XBadge p={p} x={x + w} y={y} r={r} />}
      {badge === "late" && <Late p={p} x={x + w} y={y} r={r} />}
      {badge === "alert" && <Alert p={p} x={x + w} y={y} r={r} />}
    </g>
  );
}

/** 資料庫堆疊（Redis）：三層圓柱 */
function DbStack({ p, x, y, w }: { p: P; x: number; y: number; w: number }) {
  const rx = w / 2;
  const ry = w * 0.14;
  const bh = w * 0.3;
  return (
    <g>
      {[2, 1, 0].map((i) => {
        const cy = y + ry + i * (bh + 4);
        return (
          <g key={i}>
            <path d={`M${x} ${cy}v${bh}a${rx} ${ry} 0 0 0 ${w} 0v${-bh}`} style={fs(p.navy, p.ink)} />
            <ellipse cx={x + rx} cy={cy} rx={rx} ry={ry} style={fs(p.lblue, p.ink)} />
          </g>
        );
      })}
    </g>
  );
}

/** 橫向透明管線（佇列） */
function Tube({ p, x, y, w, h, rings = [] }: { p: P; x: number; y: number; w: number; h: number; rings?: number[] }) {
  const rx = h * 0.2;
  const ry = h / 2;
  // 管身用「紙白 → 淡藍」的直向漸層：物件本身維持淺色，亮暗主題下都清楚（不用實心中藍）
  const gid = `tube-${x}-${y}-${w}`;
  return (
    <g>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: p.paper }} />
          <stop offset="1" style={{ stopColor: "var(--blue-100)" }} />
        </linearGradient>
      </defs>
      <path d={`M${x} ${y}H${x + w}A${rx} ${ry} 0 0 1 ${x + w} ${y + h}H${x}A${rx} ${ry} 0 0 1 ${x} ${y}Z`} style={{ fill: `url(#${gid})`, stroke: p.ink, strokeWidth: 1.5 }} />
      {rings.map((rxp) => (
        <ellipse key={rxp} cx={rxp} cy={y + ry} rx={rx} ry={ry} style={line(p.lblue, 1.5, { strokeDasharray: "4 5" })} />
      ))}
      <ellipse cx={x} cy={y + ry} rx={rx} ry={ry} style={fs(p.paper, p.ink)} />
    </g>
  );
}

function ClockFace({ p, x, y, r }: { p: P; x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={fs(p.paper, p.ink, 2)} />
      <path d={`M${x} ${y - r * 0.62}V${y}l${r * 0.45} ${r * 0.28}`} style={line(p.navy, 3)} />
      <circle cx={x} cy={y} r={2.5} style={fill(p.ink)} />
    </g>
  );
}

function PauseSign({ p, x, y, r }: { p: P; x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={fill(p.orange)} />
      <rect x={x - r * 0.38} y={y - r * 0.42} width={r * 0.24} height={r * 0.84} rx={2} style={fill(p.white)} />
      <rect x={x + r * 0.14} y={y - r * 0.42} width={r * 0.24} height={r * 0.84} rx={2} style={fill(p.white)} />
    </g>
  );
}

function PowerButton({ p, x, y, r, on }: { p: P; x: number; y: number; r: number; on: boolean }) {
  const k = r * 0.5;
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={fill(on ? p.navy : p.grey)} />
      <path d={`M${x - k * 0.72} ${y - k * 0.6}A${k} ${k} 0 1 0 ${x + k * 0.72} ${y - k * 0.6}`} style={line(p.white, 3)} />
      <path d={`M${x} ${y - k * 1.05}V${y - k * 0.1}`} style={line(p.white, 3)} />
    </g>
  );
}

/** 伺服器機櫃 */
function ServerRack({ p, x, y, w }: { p: P; x: number; y: number; w: number }) {
  const uh = w * 0.3;
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={x} y={y + i * (uh + 4)} width={w} height={uh} rx={4} style={fs(p.paper, p.ink)} />
          <circle cx={x + 10} cy={y + i * (uh + 4) + uh / 2} r={3} style={fill(i === 1 ? p.gold : p.green)} />
          <rect x={x + 20} y={y + i * (uh + 4) + uh / 2 - 1.5} width={w * 0.45} height={3} rx={1.5} style={fill(p.grey)} />
        </g>
      ))}
    </g>
  );
}

/** 儀表：半圓刻度 + 指針 */
function Dial({ p, x, y, r }: { p: P; x: number; y: number; r: number }) {
  return (
    <g>
      <path d={`M${x - r} ${y}A${r} ${r} 0 0 1 ${x + r} ${y}Z`} style={fs(p.paper, p.ink)} />
      <path d={`M${x - r + 8} ${y}A${r - 8} ${r - 8} 0 0 1 ${x + r * 0.2} ${y - r + 9}`} style={line(p.lblue, 6, { strokeLinecap: "butt" })} />
      <path d={`M${x + r * 0.2} ${y - r + 9}A${r - 8} ${r - 8} 0 0 1 ${x + r - 8} ${y}`} style={line(p.orange, 6, { strokeLinecap: "butt" })} />
      <path d={`M${x} ${y}L${x + r * 0.5} ${y - r * 0.55}`} style={line(p.ink, 3)} />
      <circle cx={x} cy={y} r={4} style={fill(p.ink)} />
    </g>
  );
}

function Bell({ p, x, y, s, color }: { p: P; x: number; y: number; s: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-18 14c4-4 4-10 4-18a14 14 0 0 1 28 0c0 8 0 14 4 18z" style={fs(color, p.ink)} />
      <path d="M-6 18a6 6 0 0 0 12 0" style={line(p.ink, 2)} />
      <circle cx={0} cy={-19} r={3} style={fill(p.ink)} />
    </g>
  );
}

function Envelope({ p, x, y, w }: { p: P; x: number; y: number; w: number }) {
  const h = w * 0.66;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} style={fs(p.paper, p.ink)} />
      <path d={`M${x + 3} ${y + 4}L${x + w / 2} ${y + h * 0.56}L${x + w - 3} ${y + 4}`} style={line(p.navy, 2.5)} />
    </g>
  );
}

// ── 概念小圖（64–80px）────────────────────────────────────────

function MiniPatched({ p }: { p: P }) {
  return (
    <Svg vb={[100, 84]} width={88} label="小圖：一份 Job 文件上貼滿補丁便條，掛著延遲徽章">
      <Doc p={p} x={22} y={8} w={52} h={70} acc={p.navy} />
      <rect x={10} y={30} width={24} height={18} rx={2} transform="rotate(-12 22 39)" style={fs(p.gold, p.ink, 1.2)} />
      <rect x={56} y={46} width={26} height={18} rx={2} transform="rotate(10 69 55)" style={fs(p.lblue, p.ink, 1.2)} />
      <rect x={30} y={60} width={22} height={14} rx={2} transform="rotate(-4 41 67)" style={fs(p.gold, p.ink, 1.2)} />
      <Late p={p} x={78} y={14} r={11} />
    </Svg>
  );
}

function MiniDone({ p }: { p: P }) {
  return (
    <Svg vb={[84, 70]} width={72} label="小圖：Job 卡打勾完成">
      <JobCard p={p} x={14} y={16} w={50} h={42} acc={p.navy} badge="check" />
    </Svg>
  );
}

function MiniFailed({ p }: { p: P }) {
  return (
    <Svg vb={[84, 70]} width={72} label="小圖：Job 卡掛著失敗叉號">
      <JobCard p={p} x={14} y={16} w={50} h={42} acc={p.grey} badge="x" />
    </Svg>
  );
}

// ── 版面零件 ─────────────────────────────────────────────────

/** 小節標題：編號 + 圓角方形 icon 章 + 藍色粗體 */
function SecHead({ n, Icon, title, c, note, tone }: { n?: string; Icon: LucideIcon; title: string; c: DeckThemeTokens; note?: string; tone?: Tone }) {
  const fg = tone?.fg ?? c.brand;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
      <div style={{ width: 34, height: 34, flex: "none", borderRadius: 10, background: tone?.soft ?? c.brandSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={fg} strokeWidth={2.2} />
      </div>
      <span style={{ fontSize: DS.body, fontWeight: 900, color: tone?.ink ?? c.brandInk, whiteSpace: "nowrap" }}>
        {n ? `${n}　` : ""}
        {title}
      </span>
      {note && <span style={{ fontSize: DS.micro, color: c.muted }}>{note}</span>}
    </div>
  );
}

/** 欄分隔：左細線 */
const divider = (c: DeckThemeTokens): CSSProperties => ({ borderLeft: `1px solid ${c.border}`, paddingLeft: 28 });

/** 結論條：左粗線（藍 = 收斂、橘 = 注意） */
function Concl({ c, children, orange }: { c: DeckThemeTokens; children: ReactNode; orange?: boolean }) {
  return (
    <div
      style={{
        flex: "none",
        background: orange ? c.accentSoft : c.brandSoft,
        borderLeft: `5px solid ${orange ? V.orange400 : c.brand}`,
        padding: "10px 18px",
        fontSize: DS.body,
        fontWeight: 700,
        lineHeight: 1.5,
        color: orange ? c.ink : c.brandInk,
      }}
    >
      {children}
    </div>
  );
}

/** 橘色附註膠囊 */
function Note({ c, children, Icon }: { c: DeckThemeTokens; children: ReactNode; Icon?: LucideIcon }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        alignSelf: "flex-start",
        padding: "4px 14px",
        borderRadius: 999,
        background: c.accentSoft,
        border: `1px solid ${V.orange200}`,
        fontSize: DS.small,
        fontWeight: 700,
        lineHeight: 1.4,
        color: c.ink,
      }}
    >
      {Icon && <Icon size={16} color={c.accent} style={{ flex: "none" }} />}
      {children}
    </span>
  );
}

/** 插圖／說明面板 */
function Panel({ c, children, style }: { c: DeckThemeTokens; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ border: `1px solid ${c.border}`, borderRadius: 14, background: c.slide, ...style }}>{children}</div>;
}

/** 細線清單的一列 */
function ListRow({ Icon, k, v, tone, c, kw = 88, mono }: { Icon: LucideIcon; k: string; v: ReactNode; tone: Tone; c: DeckThemeTokens; kw?: number; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: `1px solid ${c.border}` }}>
      <Icon size={22} color={tone.fg} style={{ flex: "none" }} />
      <span style={{ width: kw, flex: "none", fontSize: DS.body, fontWeight: 700, color: c.ink, fontFamily: mono ? MONO : undefined }}>{k}</span>
      <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{v}</span>
    </div>
  );
}

/** 程式碼 / API 膠囊 */
function Api({ c, children }: { c: DeckThemeTokens; children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: 6,
        background: c.brandSoft,
        color: c.brandInk,
        fontFamily: MONO,
        fontSize: DS.small,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
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

/** 插圖下方的 kicker 標籤（英文大寫小字） */
function Kicker({ c, children, color }: { c: DeckThemeTokens; children: ReactNode; color?: string }) {
  return <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: color ?? c.muted }}>{children}</span>;
}

/** 小方章 icon */
function IconTile({ Icon, tone, size = 44 }: { Icon: LucideIcon; tone: Tone; size?: number }) {
  return (
    <div style={{ width: size, height: size, flex: "none", borderRadius: 12, background: tone.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={Math.round(size * 0.5)} color={tone.fg} strokeWidth={2.2} />
    </div>
  );
}

// ── P3 ETL 與現成工具 ─────────────────────────────────────────

function NifiScene({ p }: { p: P }) {
  return (
    <Svg vb={[240, 130]} label="插圖：一份資料文件流進分流節點，再分送到三個出口">
      <Doc p={p} x={16} y={38} w={44} h={58} acc={p.navy} />
      <Arrow x1={64} y1={67} x2={100} y2={67} color={p.navy} w={2.5} />
      <circle cx={112} cy={67} r={11} style={fs(p.navy, p.ink)} />
      <Arrow x1={122} y1={62} cx={146} cy={30} x2={172} y2={30} color={p.navy} w={2} />
      <Arrow x1={124} y1={67} x2={172} y2={67} color={p.navy} w={2} />
      <Arrow x1={122} y1={72} cx={146} cy={104} x2={172} y2={104} color={p.navy} w={2} />
      {[18, 55, 92].map((yy) => (
        <g key={yy}>
          <rect x={178} y={yy} width={46} height={24} rx={4} style={fs(p.paper, p.ink)} />
          <rect x={184} y={yy + 6} width={22} height={4} rx={2} style={fill(p.lblue)} />
          <rect x={184} y={yy + 14} width={32} height={3} rx={1.5} style={fill(p.grey)} />
        </g>
      ))}
    </Svg>
  );
}

function AirflowScene({ p }: { p: P }) {
  return (
    <Svg vb={[240, 130]} label="插圖：打勾的排程日曆，交出一疊批次文件">
      <Calendar p={p} x={24} y={32} w={72} h={68} mark="check" />
      <Arrow x1={110} y1={66} x2={144} y2={66} color={p.navy} w={2.5} />
      <Doc p={p} x={152} y={30} w={50} h={66} acc={p.lblue} rot={-9} />
      <Doc p={p} x={162} y={30} w={50} h={66} acc={p.lblue} />
      <Doc p={p} x={172} y={32} w={50} h={66} acc={p.gold} rot={8} />
    </Svg>
  );
}

function CustomScene({ p }: { p: P }) {
  return (
    <Svg vb={[240, 130]} label="插圖：一疊待處理的文件被迴圈箭頭繞著，角落掛著問號">
      <LoopArrow x={120} y={66} r={50} color={p.orange} w={4} />
      <Doc p={p} x={92} y={38} w={46} h={58} acc={p.grey} rot={-8} />
      <Doc p={p} x={102} y={36} w={46} h={58} acc={p.orange} />
      <QMark p={p} x={190} y={26} r={14} />
    </Svg>
  );
}

function EtlPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const stages: { zh: string; en: string; Icon: LucideIcon; etl: boolean }[] = [
    { zh: "提取", en: "Extract", Icon: Database, etl: true },
    { zh: "轉換", en: "Transform", Icon: Workflow, etl: true },
    { zh: "載入", en: "Load", Icon: Server, etl: true },
    { zh: "分析", en: "Analysis", Icon: Activity, etl: false },
    { zh: "呈現", en: "Visualize", Icon: LayoutDashboard, etl: false },
  ];
  const rows: { pct: string; name: string; fit: string; limit?: string; art: ReactNode; hi?: boolean }[] = [
    { pct: "80%", name: "Nifi", fit: "即時資料整合、ETL，以及複雜的資料路由與流程控制", limit: "不適合：需要暫存後分批處理、或要多次 Loop 才能完整輸出的資料", art: <NifiScene p={p} /> },
    { pct: "5%", name: "Airflow", fit: "自動化的批次處理任務與工作流程", art: <AirflowScene p={p} /> },
    { pct: "15%", name: "自行開發 Job / Schedule", fit: "需要暫存分批、跑好幾輪迴圈，或帶有特殊商業邏輯的任務", limit: "BullMQ 要解決的，就是這一塊", art: <CustomScene p={p} />, hi: true },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel c={c} style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, padding: "12px 18px" }}>
        <div style={{ width: 150, flex: "none", display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: DS.small, fontWeight: 900, color: c.brandInk }}>資料處理五個過程</span>
          <span style={{ fontSize: DS.micro, color: c.muted }}>前三個 ETL 是本篇範圍</span>
        </div>
        {stages.map((s, i) => (
          <div key={s.en} style={{ display: "contents" }}>
            {i > 0 && (
              <svg viewBox="0 0 20 14" width={20} height={14} aria-hidden="true" style={{ flex: "none" }}>
                <path d="M1 7H14M10 3L14 7 10 11" style={line(s.etl ? V.blue500 : c.border, 2)} />
              </svg>
            )}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 14px",
                borderRadius: 10,
                background: s.etl ? c.brandSoft : c.slide,
                border: s.etl ? `1.5px solid ${c.brand}` : `1px solid ${c.border}`,
              }}
            >
              <s.Icon size={22} color={s.etl ? c.brand : c.muted} style={{ flex: "none" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: DS.body, fontWeight: 900, color: s.etl ? c.ink : c.muted }}>{s.zh}</span>
                <span style={{ fontSize: DS.micro, color: c.muted, fontFamily: MONO }}>{s.en}</span>
              </div>
            </div>
          </div>
        ))}
      </Panel>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <SecHead n="一" Icon={Workflow} title="ETL 需求由誰承接" c={c} note="當時團隊的粗估比例" />
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateRows: "repeat(3, 1fr)", marginTop: 10, borderBottom: `1px solid ${c.border}` }}>
          {rows.map((r) => (
            <div
              key={r.name}
              style={{
                display: "grid",
                gridTemplateColumns: "210px 170px 1fr",
                alignItems: "center",
                gap: 28,
                borderTop: `1px solid ${c.border}`,
                padding: "0 18px",
                background: r.hi ? c.accentSoft : "transparent",
                borderLeft: r.hi ? `5px solid ${V.orange400}` : "5px solid transparent",
              }}
            >
              <div style={{ height: 118, display: "flex", alignItems: "center" }}>{r.art}</div>
              <span style={{ fontSize: DS.h1, fontWeight: 900, fontFamily: MONO, letterSpacing: DTRACK.tight, color: r.hi ? t.orange.fg : c.brandInk, fontVariantNumeric: "tabular-nums" }}>
                {r.pct}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: DS.h3, fontWeight: 900, color: c.ink }}>{r.name}</span>
                <span style={{ fontSize: DS.body, color: c.body }}>{r.fit}</span>
                {r.limit && <span style={{ fontSize: DS.small, fontWeight: r.hi ? 800 : 500, color: r.hi ? t.orange.fg : c.muted }}>{r.limit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── P4 自行開發的痛點 ─────────────────────────────────────────

const PAIN_GROUPS: { key: string; title: string; q: string; Icon: LucideIcon; orange: boolean; items: string[]; fix: string }[] = [
  { key: "fault", title: "容錯", q: "失敗了怎麼辦？", Icon: ShieldAlert, orange: true, items: ["容錯處理", "重拋機制", "Retry 機制", "Retry Interval", "例外處理", "錯誤代碼定義"], fix: "attempts + backoff" },
  { key: "obs", title: "可觀測性", q: "現在跑到哪了？", Icon: Eye, orange: false, items: ["日誌", "流程追蹤", "Metric", "異常監控", "異常通知", "沒有可視化介面", "不易排查錯誤"], fix: "log、progress、Bull Board" },
  { key: "flow", title: "流量控制", q: "量大時會不會爆？", Icon: Gauge, orange: false, items: ["背壓設計", "設定緩衝區", "FIFO / LIFO", "手動觸發"], fix: "concurrency、priority、lifo" },
  { key: "ops", title: "維運", q: "部署與出事時呢？", Icon: Power, orange: true, items: ["Graceful Shutdown", "災難復原", "難以進行還原測試"], fix: "worker.close()、原樣重跑" },
];

function PainPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", overflow: "hidden" }}>
        {PAIN_GROUPS.map((g, gi) => {
          const tone = g.orange ? t.orange : t.blue;
          return (
            <div key={g.key} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12, padding: "0 24px", ...(gi > 0 ? { borderLeft: `1px solid ${c.border}` } : { paddingLeft: 0 }) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <IconTile Icon={g.Icon} tone={tone} size={52} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: DS.h4, fontWeight: 900, color: tone.ink }}>{g.title}</span>
                  <span style={{ fontSize: DS.small, color: c.muted }}>{g.q}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", borderBottom: `1px solid ${c.border}` }}>
                {g.items.map((it) => (
                  <div key={it} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderTop: `1px solid ${c.border}` }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: tone.fg, flex: "none" }} />
                    <span style={{ fontSize: DS.body, fontWeight: 700, color: c.ink }}>{it}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4, padding: "10px 14px", borderRadius: 10, background: c.slide, border: `1px dashed ${c.border}` }}>
                <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: c.muted }}>BULLMQ 對應</span>
                <span style={{ fontSize: DS.small, fontWeight: 700, fontFamily: MONO, color: c.brandInk }}>{g.fix}</span>
              </div>
            </div>
          );
        })}
      </div>
      <WhyBand c={c} art={<MiniPatched p={p} />} title="每一項單獨做都不難，難的是全部自己刻、每個專案都刻一次">
        讓一支 Job「會動」很快，讓它可靠、可觀察、可維運才是成本所在。BullMQ 把這些基礎建設收斂成一個以 Redis 為底的佇列函式庫。
      </WhyBand>
    </div>
  );
}

// ── P6 BullMQ 是什麼 ──────────────────────────────────────────

function ServerRedisScene({ p }: { p: P }) {
  return (
    <Svg vb={[520, 250]} label="插圖：左邊一台執行 Node.js 服務的螢幕，與右邊的 Redis 資料庫堆疊雙向相連，Redis 上疊著兩張已完成的 Job 卡">
      <Ground p={p} x={24} y={222} w={472} />
      <Monitor p={p} x={34} y={52} w={196} h={134} bar={p.navy}>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={50 + (i % 2) * 16} y={80 + i * 18} width={[90, 110, 70, 120, 60][i]} height={6} rx={3} style={fill([p.lblue, p.grey, p.gold, p.grey, p.lblue][i])} />
        ))}
      </Monitor>
      <Arrow x1={244} y1={104} x2={308} y2={104} color={p.navy} w={3} />
      <Arrow x1={308} y1={146} x2={244} y2={146} color={p.orange} w={3} />
      <DbStack p={p} x={322} y={62} w={120} />
      <JobCard p={p} x={430} y={48} w={60} h={46} acc={p.lblue} opacity={0.8} />
      <JobCard p={p} x={440} y={60} w={60} h={46} acc={p.navy} badge="check" />
    </Svg>
  );
}

function WhatPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const feats: { Icon: LucideIcon; k: string; v: string }[] = [
    { Icon: ListOrdered, k: "支援優先級與延遲任務", v: "重要的任務先處理；也能安排任務在未來的特定時間才執行。" },
    { Icon: RotateCcw, k: "支援重試與錯誤處理", v: "執行失敗時依設定自動重試，失敗原因與堆疊都記在 Job 上。" },
    { Icon: Activity, k: "監控與統計資訊", v: "即時追蹤每筆任務的狀態、進度與執行時間，方便除錯與調校。" },
  ];
  const more = ["Job Schedulers 排程", "Flows 父子相依", "Rate limit 限流", "Events 事件監聽"];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <SecHead n="一" Icon={Boxes} title="BullMQ 究竟是什麼" c={c} />
          <span style={{ fontSize: DS.body, lineHeight: 1.6, color: c.body }}>
            以 Redis 為基礎的<strong style={{ color: c.ink }}>分散式任務佇列</strong>（distributed job queue），最早是 Node.js 函式庫，也是舊版 Bull 的繼任者。值得使用的三個特色：
          </span>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
            {feats.map((f) => (
              <div key={f.k} style={{ flex: 1, display: "flex", alignItems: "center", gap: 18, borderTop: `1px solid ${c.border}` }}>
                <IconTile Icon={f.Icon} tone={t.blue} size={48} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.ink }}>{f.k}</span>
                  <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{f.v}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: DS.small, fontWeight: 700, color: c.muted, marginRight: 4 }}>其他</span>
            {more.map((m) => (
              <span key={m} style={{ padding: "3px 12px", borderRadius: 999, border: `1px solid ${c.border}`, background: c.slide, fontSize: DS.small, color: c.body }}>
                {m}
              </span>
            ))}
          </div>
        </div>
        <div style={{ width: 580, flex: "none", display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
          <SecHead n="二" Icon={Database} title="Node.js 服務 × Redis" c={c} />
          <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px 0" }}>
              <ServerRedisScene p={p} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${c.border}` }}>
              <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: DS.small, fontWeight: 900, color: c.brandInk }}>服務：放入與處理 Job</span>
                <span style={{ fontSize: DS.micro, color: c.muted }}>Producer、Worker 都寫在程式裡</span>
              </div>
              <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 2, borderLeft: `1px solid ${c.border}` }}>
                <span style={{ fontSize: DS.small, fontWeight: 900, color: c.brandInk }}>Redis：保存一切狀態</span>
                <span style={{ fontSize: DS.micro, color: c.muted }}>資料、進度、日誌、結果</span>
              </div>
            </div>
          </Panel>
          <span style={{ fontSize: DS.small, color: c.muted }}>官方支援 Node.js、Bun、Python、.NET、Rust、Elixir、PHP，兩端可用不同語言</span>
        </div>
      </div>
      <Note c={c} Icon={TriangleAlert}>
        需搭配 Redis：Standalone、Cluster、Sentinel 模式皆支援，也能建在 K8s；建議 maxmemory-policy 設為 noeviction
      </Note>
    </div>
  );
}

// ── P7 三個角色 ──────────────────────────────────────────────

function ArchScene({ p }: { p: P }) {
  return (
    <Svg vb={[1300, 236]} label="插圖：左邊兩份 Producer 文件送進中間一條橫向佇列管線，管線裡排著五張 Job 卡，最右邊一張即將被取出；右邊三台 Worker 筆電各自接收 Job；管線下方以虛線連到 Redis 資料庫堆疊">
      <Doc p={p} x={70} y={14} w={64} h={80} acc={p.gold} />
      <Doc p={p} x={150} y={92} w={64} h={80} acc={p.navy} />
      <Arrow x1={140} y1={54} cx={250} cy={54} x2={318} y2={64} color={p.blue} w={3} />
      <Arrow x1={220} y1={132} cx={270} cy={80} x2={318} y2={78} color={p.blue} w={3} />
      <Tube p={p} x={340} y={20} w={600} h={100} rings={[460, 580, 700, 820]} />
      {[400, 520, 640, 760].map((xx) => (
        <JobCard key={xx} p={p} x={xx} y={46} w={52} h={48} acc={p.lblue} />
      ))}
      <JobCard p={p} x={866} y={46} w={52} h={48} acc={p.gold} stroke={p.orange} />
      <path d="M650 120V140" style={line(p.navy, 2, { strokeDasharray: "4 4" })} />
      <DbStack p={p} x={615} y={142} w={70} />
      <Arrow x1={954} y1={70} cx={1010} cy={70} x2={1066} y2={34} color={p.blue} w={3} />
      <Arrow x1={954} y1={70} x2={1066} y2={108} color={p.blue} w={3} />
      <Arrow x1={954} y1={70} cx={1010} cy={70} x2={1066} y2={182} color={p.blue} w={3} />
      <Laptop p={p} x={1086} y={6} w={90} bar={p.navy} />
      <Laptop p={p} x={1086} y={80} w={90} bar={p.navy} />
      <Laptop p={p} x={1086} y={154} w={90} bar={p.navy} />
    </Svg>
  );
}

function RolesPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const zone = (k: string, v: string, align: CSSProperties["textAlign"]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: align }}>
      <Kicker c={c} color={c.brandInk}>
        {k}
      </Kicker>
      <span style={{ fontSize: DS.small, fontFamily: MONO, color: c.muted }}>{v}</span>
    </div>
  );
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "14px 22px 4px" }}>
          <ArchScene p={p} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr", gap: 20, padding: "8px 26px 12px", borderTop: `1px solid ${c.border}` }}>
          {zone("PRODUCER · ENQUEUE", "queue.add('sum', data)", "left")}
          {zone("QUEUE · 存在 REDIS", "Job = 資料 + 狀態 + 進度 + 日誌", "center")}
          {zone("DEQUEUE · WORKER", "new Worker('etl', processor)", "right")}
        </div>
      </Panel>
      <div style={{ flex: "none", display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <ListRow c={c} tone={t.blue} Icon={Send} k="Queue" v="生產端：queue.add() 放入 Job，也負責暫停、恢復、查詢數量" kw={150} mono />
          <ListRow c={c} tone={t.blue} Icon={FileText} k="Job" v="流動的單位：帶著 data，記錄狀態、進度、日誌、結果、嘗試次數" kw={150} mono />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", ...divider(c) }}>
          <ListRow c={c} tone={t.blue} Icon={Cpu} k="Worker" v="消費端：取出 Job 交給 processor；可開多個、分散在不同機器" kw={150} mono />
          <ListRow c={c} tone={t.blue} Icon={Radio} k="QueueEvents" v="監聽佇列事件，例如某個 Job completed 或 failed" kw={150} mono />
        </div>
      </div>
      <Concl c={c}>Producer 與 Worker 之間只隔著 Redis：流量變大就多開 Worker，不必動到 Producer。</Concl>
    </div>
  );
}

// ── P8 Job 是資料也是紀錄 ─────────────────────────────────────

function RecordScene({ p }: { p: P }) {
  return (
    <Svg vb={[1340, 216]} label="插圖：Job 從左邊進入佇列管線，初始卡片帶著 a=1、b=2；經過中間的處理後，從右邊出來的卡片多了 c=3 並打勾；兩張卡片都以橘色虛線存進下方的 Redis">
      <Arrow x1={20} y1={70} x2={160} y2={70} color={p.blue} w={3} />
      <Tube p={p} x={176} y={20} w={990} h={100} rings={[450, 610, 770, 930]} />
      <rect x={262} y={36} width={98} height={68} rx={6} style={fs(p.paper, p.ink)} />
      <rect x={270} y={43} width={48} height={5} rx={2.5} style={fill(p.lblue)} />
      <Chip p={p} x={272} y={56} w={50} text="a=1" color={p.navy} />
      <Chip p={p} x={272} y={78} w={50} text="b=2" color={p.navy} />
      {[480, 640, 800].map((xx, i) => (
        <JobCard key={xx} p={p} x={xx} y={42} w={80} h={56} acc={p.lblue} opacity={0.35 + i * 0.15} />
      ))}
      <rect x={1010} y={28} width={112} height={86} rx={6} style={fs(p.paper, p.ink)} />
      <rect x={1018} y={35} width={52} height={5} rx={2.5} style={fill(p.green)} />
      <Chip p={p} x={1020} y={46} w={50} text="a=1" color={p.navy} />
      <Chip p={p} x={1020} y={68} w={50} text="b=2" color={p.navy} />
      <Chip p={p} x={1020} y={90} w={50} text="c=3" color={p.orange} />
      <Check p={p} x={1122} y={28} r={13} />
      <Arrow x1={1180} y1={70} x2={1320} y2={70} color={p.blue} w={3} />
      <Arrow x1={311} y1={106} cx={311} cy={172} x2={622} y2={172} color={p.orange} w={2.5} dash="6 6" />
      <Arrow x1={1066} y1={116} cx={1066} cy={172} x2={708} y2={172} color={p.orange} w={2.5} dash="6 6" />
      <DbStack p={p} x={633} y={128} w={64} />
    </Svg>
  );
}

function RecordPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const col = (first: boolean): CSSProperties => ({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, ...(first ? {} : divider(c)) });
  const card = (label: string, body: string, hi?: boolean) => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: hi ? `1.5px solid ${V.orange400}` : `1px solid ${c.border}`, background: hi ? c.accentSoft : c.slide }}>
      <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted }}>{label}</span>
      <span style={{ fontSize: DS.body, fontWeight: 700, fontFamily: MONO, color: c.ink }}>{body}</span>
    </div>
  );
  const steps = [20, 40, 60, 80, 100];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel c={c} style={{ flex: "none", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 22px 0" }}>
          <RecordScene p={p} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, padding: "6px 26px 10px", borderTop: `1px solid ${c.border}` }}>
          <span style={{ fontSize: DS.small, color: c.body }}>
            <strong style={{ color: c.ink }}>初始資料</strong>　a = 1, b = 2
          </span>
          <span style={{ fontSize: DS.small, color: c.body, textAlign: "center" }}>
            <strong style={{ color: t.orange.fg }}>Redis</strong> 保存處理前後的歷程
          </span>
          <span style={{ fontSize: DS.small, color: c.body, textAlign: "right" }}>
            <strong style={{ color: c.ink }}>運算後結果</strong>　c = a + b = 3
          </span>
        </div>
      </Panel>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={col(true)}>
          <SecHead n="一" Icon={Calculator} title="運算前後紀錄" c={c} />
          <div style={{ flex: 1, display: "flex", alignItems: "stretch", gap: 10 }}>
            {card("data（運算前）", "{ a: 1, b: 2 }")}
            <svg viewBox="0 0 20 14" width={20} height={14} aria-hidden="true" style={{ alignSelf: "center", flex: "none" }}>
              <path d="M1 7H14M10 3L14 7 10 11" style={line(V.blue500, 2)} />
            </svg>
            {card("returnvalue（運算後）", "{ …, c: 3 }", true)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Api c={c}>job.data</Api>
            <span style={{ fontSize: DS.small, color: c.muted }}>與 processor 回傳值</span>
          </div>
        </div>
        <div style={col(false)}>
          <SecHead n="二" Icon={TrendingUp} title="進度追蹤" c={c} />
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 10, paddingBottom: 4 }}>
            {steps.map((s) => (
              <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                <span style={{ fontSize: DS.small, fontWeight: 800, fontFamily: MONO, color: s === 100 ? t.orange.fg : c.brandInk }}>{s}%</span>
                <div style={{ width: "100%", height: `${s * 0.62}%`, minHeight: 10, borderRadius: 6, background: s === 100 ? V.orange400 : V.blue300 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Api c={c}>job.updateProgress(n)</Api>
            <span style={{ fontSize: DS.small, color: c.muted }}>數字或物件</span>
          </div>
        </div>
        <div style={col(false)}>
          <SecHead n="三" Icon={ScrollText} title="日誌記錄" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, padding: "12px 16px", borderRadius: 10, background: c.codeSurface, border: `1px solid ${c.border}` }}>
            {["[2023-11-09] start", "[2023-11-09] c = 3", "[2023-11-09] completed"].map((l, i) => (
              <span key={l} style={{ fontSize: DS.body, fontFamily: MONO, color: i === 2 ? c.good : c.body }}>
                {l}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Api c={c}>job.log(text)</Api>
            <span style={{ fontSize: DS.small, color: c.muted }}>這筆 Job 專屬的日誌</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── P11 延遲、優先序與暫停 ───────────────────────────────────

function DelayScene({ p }: { p: P }) {
  return (
    <Svg vb={[400, 190]} label="插圖：圈出日期的日曆與時鐘旁，一張掛著延遲徽章的 Job 卡在等待，時間到才往下走">
      <Ground p={p} x={24} y={168} w={352} />
      <Calendar p={p} x={40} y={50} w={96} h={92} mark="circle" />
      <ClockFace p={p} x={160} y={52} r={28} />
      <Arrow x1={170} y1={112} cx={210} cy={128} x2={240} y2={116} color={p.grey} w={2.5} dash="5 6" />
      <JobCard p={p} x={254} y={80} w={96} h={74} acc={p.navy} badge="late" />
    </Svg>
  );
}

function PriorityScene({ p }: { p: P }) {
  return (
    <Svg vb={[400, 190]} label="插圖：三張 Job 卡排隊進入 Worker 筆電，排最前面、最先被取走的是沒有設定 priority 的那張，它掛著警示徽章；後面依序是 P1、P10">
      <Ground p={p} x={24} y={168} w={352} />
      <JobCard p={p} x={36} y={76} w={64} h={52} acc={p.lblue} />
      <JobCard p={p} x={118} y={76} w={64} h={52} acc={p.navy} />
      <JobCard p={p} x={200} y={76} w={64} h={52} acc={p.gold} stroke={p.orange} badge="alert" />
      <Chip p={p} x={44} y={138} w={48} text="P10" color={p.lblue} />
      <Chip p={p} x={126} y={138} w={48} text="P1" color={p.navy} />
      <Chip p={p} x={208} y={138} w={48} text="無" color={p.orange} />
      <Arrow x1={272} y1={102} x2={296} y2={102} color={p.navy} w={2.5} />
      <Laptop p={p} x={308} y={74} w={76} bar={p.navy} />
    </Svg>
  );
}

function PauseScene({ p }: { p: P }) {
  return (
    <Svg vb={[400, 190]} label="插圖：佇列管線入口掛著暫停標誌，新的 Job 卡在外面排隊，管線裡最後一張已打勾流出">
      <Ground p={p} x={24} y={168} w={352} />
      <JobCard p={p} x={20} y={82} w={50} h={42} acc={p.lblue} opacity={0.7} />
      <JobCard p={p} x={62} y={78} w={50} h={42} acc={p.lblue} />
      <Tube p={p} x={150} y={58} w={200} h={88} />
      <JobCard p={p} x={274} y={80} w={52} h={44} acc={p.navy} badge="check" />
      <PauseSign p={p} x={150} y={102} r={24} />
      <Arrow x1={352} y1={102} x2={390} y2={102} color={p.navy} w={2.5} />
    </Svg>
  );
}

function StopPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const cols: { n: string; Icon: LucideIcon; title: string; state: string; art: ReactNode; code: string; text: string; note?: string; tone: Tone }[] = [
    { n: "一", Icon: Timer, title: "延遲 delay", state: "delayed", art: <DelayScene p={p} />, code: "queue.add('report', data, { delay: 5000 })", text: "時間到才移回 wait；服務重啟也不會遺失。", tone: t.blue },
    { n: "二", Icon: ArrowUpNarrowWide, title: "優先序 priority", state: "prioritized", art: <PriorityScene p={p} />, code: "queue.add('vip', data, { priority: 1 })", text: "數字越小越優先，範圍 1 ~ 2,097,152。", note: "沒設 priority 的 Job 反而最先處理", tone: t.orange },
    { n: "三", Icon: Pause, title: "暫停 pause", state: "wait", art: <PauseScene p={p} />, code: "await queue.pause();  await queue.resume();", text: "Worker 不再取新 Job，進行中的照常做完。", tone: t.blue },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        {cols.map((k, i) => (
          <div key={k.n} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, ...(i > 0 ? divider(c) : {}) }}>
            <SecHead n={k.n} Icon={k.Icon} title={k.title} c={c} tone={k.tone} />
            <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px 0" }}>{k.art}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderTop: `1px solid ${c.border}` }}>
                <span style={{ fontSize: DS.micro, color: c.muted }}>停在</span>
                <span style={{ fontSize: DS.small, fontWeight: 800, fontFamily: MONO, color: k.tone.fg }}>{k.state}</span>
              </div>
            </Panel>
            <Code dark={dark} lines={k.code} size="xs" showLineNumbers={false} style={{ flex: "none" }} />
            <div style={{ height: 70, flex: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{k.text}</span>
              {k.note && <Note c={c} Icon={TriangleAlert}>{k.note}</Note>}
            </div>
          </div>
        ))}
      </div>
      <Concl c={c}>三者都只是「讓 Job 停在哪個狀態、停多久」的規則：delayed、prioritized、wait。</Concl>
    </div>
  );
}

// ── P12 重試與退避 ───────────────────────────────────────────

function RetryLane({ c, ok, art, title, sub }: { c: DeckThemeTokens; ok: boolean; art: ReactNode; title: string; sub: string }) {
  const waits = ["1s", "2s", "4s", "8s"];
  const block = (i: number) => {
    const last = i === 4;
    const success = last && ok;
    const color = success ? c.good : c.critical;
    const soft = success ? c.goodSoft : c.criticalSoft;
    const Icon = success ? CircleCheck : CircleX;
    return (
      <div
        style={{
          width: 100,
          flex: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          padding: "10px 0",
          borderRadius: 12,
          border: `1.5px solid ${color}`,
          background: last ? soft : c.slide,
        }}
      >
        <Icon size={24} color={color} />
        <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink }}>{i === 0 ? "首次" : `重試 #${i}`}</span>
        <span style={{ fontSize: DS.micro, fontWeight: 700, color }}>{success ? "Success" : "Failed"}</span>
      </div>
    );
  };
  return (
    <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", gap: 18, padding: "12px 20px" }}>
      <div style={{ width: 170, flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        {art}
        <span style={{ fontSize: DS.body, fontWeight: 900, color: ok ? c.good : c.critical }}>{title}</span>
        <span style={{ fontSize: DS.micro, color: c.muted, fontFamily: MONO }}>{sub}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: "contents" }}>
            {i > 0 && (
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: DS.small, fontWeight: 800, fontFamily: MONO, color: c.accent }}>{waits[i - 1]}</span>
                <svg viewBox="0 0 100 12" width="100%" height={12} preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 6H92" style={line(V.orange400, 2, { strokeDasharray: "5 5" })} />
                  <path d="M88 1L96 6 88 11" style={line(V.orange400, 2)} />
                </svg>
              </div>
            )}
            {block(i)}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RetryPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const cmp = (k: string, seq: string, hi?: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: `1px solid ${c.border}` }}>
      <span style={{ width: 116, flex: "none", fontSize: DS.small, fontWeight: 800, fontFamily: MONO, color: hi ? t.orange.fg : c.ink }}>{k}</span>
      <span style={{ fontSize: DS.small, fontFamily: MONO, color: c.body }}>{seq}</span>
    </div>
  );
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <SecHead n="一" Icon={RotateCcw} title="兩種結局" c={c} note="attempts 5（含首次）· exponential · delay 1s · 橘色虛線 = 停在 delayed 等待" />
        <RetryLane c={c} ok art={<MiniDone p={p} />} title="第 5 次成功" sub="→ completed" />
        <RetryLane c={c} ok={false} art={<MiniFailed p={p} />} title="用完 5 次仍失敗" sub="→ failed" />
        <Concl c={c}>失敗的 Job 先回到 delayed，等退避時間到再重試；每次嘗試的時間與失敗原因都記在 Job 上。</Concl>
      </div>
      <div style={{ width: 400, flex: "none", display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
        <SecHead n="二" Icon={Timer} title="設定方式" c={c} />
        <Code
          dark={dark}
          lang="ts"
          size="xs"
          showLineNumbers={false}
          style={{ flex: "none" }}
          lines={"await queue.add('sync', data, {\n  attempts: 5,\n  backoff: {\n    type: 'exponential',\n    delay: 1000,\n  },\n});"}
        />
        <div style={{ display: "flex", flexDirection: "column", borderBottom: `1px solid ${c.border}` }}>
          {cmp("fixed", "1s → 1s → 1s → 1s")}
          {cmp("exponential", "1s → 2s → 4s → 8s", true)}
        </div>
        <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>
          exponential 讓等待倍增，給下游服務恢復的時間，也避免重試把它打得更慘。
        </span>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <Note c={c} Icon={Ban}>
            拋出 UnrecoverableError：不重試，直接 failed
          </Note>
        </div>
      </div>
    </div>
  );
}

// ── P13 排程與優雅關機 ───────────────────────────────────────

function ScheduleScene({ p }: { p: P }) {
  return (
    <Svg vb={[520, 170]} label="插圖：被循環箭頭環繞的日曆，按時間在桌面上依序產生三張 Job 卡">
      <LoopArrow x={96} y={84} r={62} color={p.orange} w={4} />
      <Calendar p={p} x={52} y={42} w={88} h={84} mark="circle" />
      <Arrow x1={170} y1={86} x2={210} y2={86} color={p.navy} w={2.5} />
      <Ground p={p} x={214} y={138} w={286} />
      {[226, 318, 410].map((xx, i) => (
        <JobCard key={xx} p={p} x={xx} y={66} w={72} h={60} acc={p.navy} badge={i < 2 ? "check" : undefined} opacity={i === 2 ? 0.6 : 1} />
      ))}
    </Svg>
  );
}

function ShutdownScene({ p }: { p: P }) {
  return (
    <Svg vb={[520, 170]} label="插圖：伺服器螢幕上的最後一個 Job 先完成打勾，之後電源鍵才亮起、行程結束">
      <Monitor p={p} x={36} y={26} w={170} h={110} bar={p.navy}>
        <rect x={56} y={62} width={130} height={10} rx={5} style={fill(p.grey)} />
        <rect x={56} y={62} width={130} height={10} rx={5} style={fill(p.green)} />
        <rect x={56} y={86} width={90} height={5} rx={2.5} style={fill(p.grey)} />
        <rect x={56} y={100} width={110} height={5} rx={2.5} style={fill(p.grey)} />
      </Monitor>
      <Arrow x1={220} y1={82} x2={270} y2={82} color={p.grey} w={2.5} />
      <JobCard p={p} x={284} y={50} w={82} h={66} acc={p.navy} badge="check" />
      <Arrow x1={384} y1={82} x2={426} y2={82} color={p.grey} w={2.5} />
      <PowerButton p={p} x={466} y={82} r={30} on />
    </Svg>
  );
}

function OpsPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const flowStep = (label: string, mono: boolean, hi?: boolean) => (
    <span
      style={{
        flex: 1,
        minWidth: 0,
        textAlign: "center",
        padding: "6px 10px",
        borderRadius: 10,
        border: hi ? `1.5px solid ${c.brand}` : `1px solid ${c.border}`,
        background: hi ? c.brandSoft : c.slide,
        fontSize: DS.small,
        fontWeight: 800,
        fontFamily: mono ? MONO : undefined,
        color: c.ink,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
  const arrow = (
    <svg viewBox="0 0 20 14" width={20} height={14} aria-hidden="true" style={{ flex: "none" }}>
      <path d="M1 7H14M10 3L14 7 10 11" style={line(V.blue500, 2)} />
    </svg>
  );
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <SecHead n="一" Icon={CalendarClock} title="排程：取代自己寫的 cron" c={c} />
          <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 16px", overflow: "hidden" }}>
            <ScheduleScene p={p} />
          </Panel>
          <Code
            dark={dark}
            lang="ts"
            size="xs"
            showLineNumbers={false}
            style={{ flex: "none" }}
            lines={"// 每天 02:00（cron）\nawait queue.upsertJobScheduler('daily-report', { pattern: '0 2 * * *' });\n// 每 10 分鐘\nawait queue.upsertJobScheduler('sync', { every: 600_000 });"}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <ListRow c={c} tone={t.blue} Icon={Database} k="存在 Redis" v="服務重啟不會重複註冊，多個實例也只有一份" kw={120} />
            <ListRow c={c} tone={t.blue} Icon={FileText} k="普通 Job" v="每次執行都適用重試、進度、日誌、暫停" kw={120} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
          <SecHead n="二" Icon={Power} title="優雅關機：做完手上的再走" c={c} />
          <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 16px", overflow: "hidden" }}>
            <ShutdownScene p={p} />
          </Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {flowStep("收到 SIGTERM", false)}
            {arrow}
            {flowStep("worker.close()", true, true)}
            {arrow}
            {flowStep("process.exit(0)", true)}
          </div>
          <Code
            dark={dark}
            lang="ts"
            size="xs"
            showLineNumbers={false}
            style={{ flex: "none" }}
            lines={"process.on('SIGTERM', async () => {\n  await worker.close(); // 停止取新 Job，等進行中的做完\n  await queue.close();\n  process.exit(0);\n});"}
          />
        </div>
      </div>
      <Concl c={c} orange>
        行程仍可能被強制砍掉，stalled 的 Job 會被重新處理：processor 要設計成冪等，同一筆 Job 跑兩次結果一樣。
      </Concl>
    </div>
  );
}

// ── P15 Bull Board ──────────────────────────────────────────

function Pin({ p, x, y, n }: { p: P; x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={15} style={{ fill: p.orange, stroke: p.white, strokeWidth: 3 }} />
      <text x={x} y={y + 5} textAnchor="middle" style={{ fill: p.white, fontFamily: MONO, fontSize: 14, fontWeight: 800 }}>
        {n}
      </text>
    </g>
  );
}

function DashboardScene({ p }: { p: P }) {
  return (
    <Svg vb={[820, 500]} label="插圖：Bull Board 儀表板的簡化示意。左側是佇列清單，頂端是各狀態分頁與暫停標籤；中間一筆 Job 的資料區塊、日誌分頁與完成的進度環；下方另一筆 Job 的執行時間欄與錯誤堆疊。七個橘色編號標出對應的功能">
      <Monitor p={p} x={10} y={8} w={800} h={450} bar={p.navy}>
        <rect x={16} y={25} width={150} height={427} style={fill(p.navy)} />
        <rect x={30} y={44} width={110} height={8} rx={4} style={fill(p.lblue)} />
        <rect x={30} y={70} width={120} height={22} rx={5} style={fill(p.blue)} />
        <rect x={30} y={102} width={100} height={8} rx={4} style={fill(p.lblue)} opacity={0.6} />
        {[190, 262, 334].map((xx) => (
          <rect key={xx} x={xx} y={40} width={62} height={20} rx={10} style={fill(p.desk)} />
        ))}
        <rect x={410} y={36} width={148} height={28} rx={8} style={fs(p.paper, p.gold, 2)} />
        <rect x={420} y={44} width={56} height={12} rx={6} style={fill(p.green)} />
        <rect x={486} y={44} width={62} height={12} rx={6} style={fill(p.red)} opacity={0.85} />
        <rect x={690} y={36} width={82} height={28} rx={8} style={fs(p.paper, p.gold, 2)} />
        <rect x={702} y={46} width={10} height={9} rx={1} style={fill(p.orange)} />
        <rect x={718} y={46} width={44} height={9} rx={4} style={fill(p.grey)} />
        <rect x={190} y={80} width={604} height={176} rx={8} style={fs(p.paper, p.grey)} />
        <rect x={206} y={94} width={70} height={8} rx={4} style={fill(p.grey)} />
        {[300, 344].map((xx) => (
          <rect key={xx} x={xx} y={90} width={38} height={16} rx={4} style={fill(p.desk)} />
        ))}
        <rect x={388} y={88} width={40} height={20} rx={4} style={fs(p.paper, p.gold, 2)} />
        <rect x={300} y={122} width={320} height={120} rx={6} style={fill("var(--blue-50)")} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={314 + (i % 3 === 0 ? 0 : 16)} y={136 + i * 17} width={[40, 130, 90, 110, 170, 30][i]} height={6} rx={3} style={fill([p.grey, p.navy, p.orange, p.navy, p.orange, p.grey][i])} />
        ))}
        <circle cx={718} cy={172} r={34} style={line(p.green, 7)} />
        <rect x={704} y={168} width={28} height={8} rx={4} style={fill(p.grey)} />
        <rect x={190} y={270} width={604} height={172} rx={8} style={fs(p.paper, p.grey)} />
        <rect x={204} y={284} width={96} height={146} rx={6} style={fill("var(--blue-50)")} />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={216} y={298 + i * 44} width={60} height={6} rx={3} style={fill(p.grey)} />
            <rect x={216} y={310 + i * 44} width={48} height={6} rx={3} style={fill(i === 2 ? p.red : p.navy)} />
          </g>
        ))}
        <rect x={316} y={292} width={404} height={118} rx={6} style={fs(p.paper, p.red, 1.5)} />
        <rect x={330} y={306} width={150} height={7} rx={3.5} style={fill(p.red)} />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={344} y={324 + i * 16} width={[300, 250, 330, 280, 220][i]} height={5} rx={2.5} style={fill(p.grey)} />
        ))}
        <circle cx={760} cy={360} r={22} style={line(p.desk, 6)} />
        <path d="M760 338A22 22 0 0 1 781 354" style={line(p.orange, 6)} />
      </Monitor>
      <Pin p={p} x={562} y={34} n={1} />
      <Pin p={p} x={612} y={124} n={2} />
      <Pin p={p} x={296} y={284} n={3} />
      <Pin p={p} x={774} y={34} n={4} />
      <Pin p={p} x={430} y={86} n={5} />
      <Pin p={p} x={754} y={138} n={6} />
      <Pin p={p} x={718} y={292} n={7} />
    </Svg>
  );
}

function BoardPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const p = ilPalette(dark);
  const left: { n: number; k: string; v: string }[] = [
    { n: 1, k: "狀態記錄", v: "wait、active、completed、failed、delayed 的數量與清單" },
    { n: 2, k: "運算前後紀錄", v: "每筆 Job 的 data 與 returnValue" },
    { n: 3, k: "執行時間", v: "加入、開始處理、完成的時間點" },
  ];
  const right: { n: number; k: string; v: string }[] = [
    { n: 4, k: "暫停與啟用", v: "直接在網頁上 pause / resume 佇列" },
    { n: 5, k: "日誌記錄", v: "job.log() 寫入的內容" },
    { n: 6, k: "處理進度", v: "updateProgress() 回報的百分比" },
    { n: 7, k: "錯誤紀錄", v: "failedReason 與完整堆疊，可手動重試" },
  ];
  const item = (x: { n: number; k: string; v: string }) => (
    <div key={x.n} style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderTop: `1px solid ${c.border}` }}>
      <span
        style={{
          width: 30,
          height: 30,
          flex: "none",
          borderRadius: 999,
          background: V.orange400,
          color: V.n900,
          fontFamily: MONO,
          fontSize: DS.small,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {x.n}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: DS.body, fontWeight: 900, color: c.ink }}>{x.k}</span>
        <span style={{ fontSize: DS.small, lineHeight: 1.45, color: c.body }}>{x.v}</span>
      </div>
    </div>
  );
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 24 }}>
        <div style={{ width: 280, flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          <SecHead n="一" Icon={Eye} title="狀態與資料" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", borderBottom: `1px solid ${c.border}` }}>{left.map(item)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <DashboardScene p={p} />
        </div>
        <div style={{ width: 280, flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          <SecHead n="二" Icon={Wrench} title="進度、日誌與操作" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", borderBottom: `1px solid ${c.border}` }}>{right.map(item)}</div>
        </div>
      </div>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: DS.small, color: c.body }}>
          社群套件 <strong style={{ color: c.ink }}>@bull-board/api</strong> + <strong style={{ color: c.ink }}>@bull-board/express</strong>，掛在既有 Express 服務的 /admin/queues
        </span>
        <span style={{ marginLeft: "auto" }}>
          <Note c={c} Icon={TriangleAlert}>
            能刪除與重試 Job：務必放在內網或加上驗證
          </Note>
        </span>
      </div>
    </div>
  );
}

// ── P16 監控告警 ────────────────────────────────────────────

function MiniScene({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Svg vb={[90, 70]} width={80} label={label}>
      {children}
    </Svg>
  );
}

function AlertBox({ c, tone, tag, name, lines: ls, art }: { c: DeckThemeTokens; tone: Tone; tag: string; name: string; lines: string[]; art: ReactNode }) {
  return (
    <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", gap: 16, padding: "18px 18px 12px", borderRadius: 14, border: `1.5px solid ${tone.fg}`, background: c.slide }}>
      <span style={{ position: "absolute", top: -11, left: 16, padding: "0 10px", background: c.slide, fontSize: DS.micro, fontWeight: 800, letterSpacing: DTRACK.label, color: tone.ink }}>{tag}</span>
      {art}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.ink }}>{name}</span>
        {ls.map((l) => (
          <span key={l} style={{ fontSize: DS.small, fontFamily: MONO, color: c.muted }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function HLink({ c, label, tone }: { c: DeckThemeTokens; label: string; tone: Tone }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <span style={{ padding: "2px 12px", borderRadius: 999, border: `1px solid ${tone.fg}`, background: tone.soft, fontSize: DS.small, fontWeight: 700, color: tone.ink }}>{label}</span>
      <svg viewBox="0 0 100 12" width="100%" height={12} preserveAspectRatio="none" aria-hidden="true">
        <path d="M2 6H92" style={line(tone.fg, 2, { strokeDasharray: "5 5" })} />
        <path d="M88 1L96 6 88 11" style={line(tone.fg, 2)} />
      </svg>
      <span style={{ fontSize: DS.micro, color: c.muted }}>&nbsp;</span>
    </div>
  );
}

function VLink({ label, tone, both }: { label: string; tone: Tone; both?: boolean }) {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <svg viewBox="0 0 14 40" width={14} height={40} aria-hidden="true">
        <path d="M7 4V34" style={line(tone.fg, 2, { strokeDasharray: "4 4" })} />
        <path d="M2 30L7 37 12 30" style={line(tone.fg, 2)} />
        {both && <path d="M2 10L7 3 12 10" style={line(tone.fg, 2)} />}
      </svg>
      <span style={{ padding: "2px 12px", borderRadius: 999, border: `1px solid ${tone.fg}`, background: tone.soft, fontSize: DS.small, fontWeight: 700, color: tone.ink }}>{label}</span>
    </div>
  );
}

function AlertPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 130px 1fr 130px 1fr", gridTemplateRows: "1fr 56px 1fr", paddingTop: 12 }}>
        <AlertBox
          c={c}
          tone={t.blue}
          tag="ETL JOB"
          name="Node.js + BullMQ"
          lines={["Queue #1 · #2 · #3", "processor(job)"]}
          art={
            <MiniScene label="小圖：伺服器機櫃">
              <ServerRack p={p} x={14} y={8} w={62} />
            </MiniScene>
          }
        />
        <HLink c={c} label="Metrics" tone={t.orange} />
        <AlertBox
          c={c}
          tone={t.orange}
          tag="METRICS"
          name="Prometheus"
          lines={["completed: 20", "failed: 12"]}
          art={
            <MiniScene label="小圖：指針偏向橘色區的儀表">
              <Dial p={p} x={45} y={54} r={38} />
            </MiniScene>
          }
        />
        <HLink c={c} label="Alarm" tone={t.blue} />
        <AlertBox
          c={c}
          tone={t.blue}
          tag="NOTIFICATION"
          name="Opsgenie"
          lines={["Queue #1 Alert P5", "Queue #2 Alert P3"]}
          art={
            <MiniScene label="小圖：掛著警示徽章的鈴鐺">
              <Bell p={p} x={42} y={38} s={1.25} color={p.gold} />
              <Alert p={p} x={70} y={16} r={11} />
            </MiniScene>
          }
        />
        <VLink label="狀態記錄" tone={t.blue} both />
        <div />
        <VLink label="Alert Rule" tone={t.orange} />
        <div />
        <VLink label="Send" tone={t.blue} />
        <AlertBox
          c={c}
          tone={t.blue}
          tag="QUEUE CACHE"
          name="Redis"
          lines={["Job 資料與狀態"]}
          art={
            <MiniScene label="小圖：Redis 資料庫堆疊">
              <DbStack p={p} x={22} y={2} w={46} />
            </MiniScene>
          }
        />
        <div />
        <AlertBox
          c={c}
          tone={t.orange}
          tag="ALERT"
          name="Alertmanager"
          lines={["分組、去重、路由"]}
          art={
            <MiniScene label="小圖：藍色鈴鐺">
              <Bell p={p} x={45} y={38} s={1.25} color={p.lblue} />
            </MiniScene>
          }
        />
        <div />
        <AlertBox
          c={c}
          tone={t.blue}
          tag="EMAIL"
          name="Email · Outlook"
          lines={["Queue #1 Open", "Queue #2 Closed"]}
          art={
            <MiniScene label="小圖：信封">
              <Envelope p={p} x={12} y={12} w={66} />
            </MiniScene>
          }
        />
      </div>
      <div style={{ flex: "none", display: "flex", gap: 28 }}>
        <div style={{ flex: 1.2, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <SecHead n="一" Icon={BellRing} title="Alert Rule 範例：失敗 Job 持續偏高" c={c} />
          <Code
            dark={dark}
            lang="yaml"
            size="xs"
            showLineNumbers={false}
            style={{ flex: "none" }}
            lines={'- alert: EtlQueueFailedHigh\n  expr: bullmq_jobs{queue="etl",state="failed"} > 10\n  for: 5m\n  labels: { severity: P3 }'}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, ...divider(c) }}>
          <SecHead n="二" Icon={Mail} title="兩條路，各司其職" c={c} />
          <div style={{ display: "flex", flexDirection: "column", borderBottom: `1px solid ${c.border}` }}>
            <ListRow c={c} tone={t.orange} Icon={BellRing} k="告警鏈" v="沒人盯著時，由規則主動通知值班" kw={110} />
            <ListRow c={c} tone={t.blue} Icon={LayoutDashboard} k="Bull Board" v="收到通知後進去看細節、重試或暫停" kw={110} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── P17 小結 ────────────────────────────────────────────────

function SummaryPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const cat = Object.fromEntries(PAIN_GROUPS.map((g) => [g.key, g]));
  const rows: { g: string; pain: string; fix: string }[] = [
    { g: "fault", pain: "容錯處理、Retry 機制與間隔", fix: "attempts + backoff（fixed / exponential）" },
    { g: "fault", pain: "例外處理、錯誤代碼", fix: "failedReason 與堆疊記在 Job；UnrecoverableError" },
    { g: "obs", pain: "日誌、流程追蹤", fix: "job.log()、updateProgress()、data / returnvalue" },
    { g: "obs", pain: "沒有可視化介面、不易排查", fix: "Bull Board 即時查看與操作" },
    { g: "obs", pain: "異常監控、異常通知、Metric", fix: "getJobCounts() + Prometheus + Opsgenie" },
    { g: "flow", pain: "背壓、緩衝區、FIFO / LIFO", fix: "Redis 暫存 + concurrency；lifo、priority" },
    { g: "ops", pain: "還原測試、手動觸發", fix: "失敗 Job 保留原始 data，可原樣重跑" },
    { g: "ops", pain: "Graceful Shutdown、災難復原", fix: "worker.close()；stalled Job 交給其他 Worker" },
  ];
  const steps: { n: string; k: string; v: string }[] = [
    { n: "01", k: "先從一個佇列開始", v: "挑一支最常出問題的 Job，改成 Queue + Worker，補上 attempts 與 backoff" },
    { n: "02", k: "讓它看得見", v: "加上 updateProgress 與 log，掛上 Bull Board" },
    { n: "03", k: "讓它會喊救命", v: "把 Job 數量接到 Prometheus，設定告警與通知管道" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <SecHead n="一" Icon={CheckIcon} title="自行開發的痛點 × BullMQ 的解法" c={c} />
        <div style={{ display: "grid", gridTemplateColumns: "118px 1fr 1.25fr", gap: 16, padding: "4px 0" }}>
          <Kicker c={c}>類別</Kicker>
          <Kicker c={c}>痛點</Kicker>
          <Kicker c={c}>BullMQ 的解法</Kicker>
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateRows: `repeat(${rows.length}, 1fr)`, borderBottom: `1px solid ${c.border}` }}>
          {rows.map((r) => {
            const g = cat[r.g];
            const tone = g.orange ? t.orange : t.blue;
            return (
              <div key={r.pain} style={{ display: "grid", gridTemplateColumns: "118px 1fr 1.25fr", gap: 16, alignItems: "center", borderTop: `1px solid ${c.border}` }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: DS.small, fontWeight: 800, color: tone.ink }}>
                  <g.Icon size={18} color={tone.fg} />
                  {g.title}
                </span>
                <span style={{ fontSize: DS.small, fontWeight: 700, color: c.ink }}>{r.pain}</span>
                <span style={{ fontSize: DS.small, fontFamily: MONO, color: c.body }}>{r.fix}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ width: 400, flex: "none", display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
        <SecHead n="二" Icon={Rocket} title="三步導入" c={c} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ flex: 1, display: "flex", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none" }}>
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    background: i === 2 ? V.orange400 : V.blue700,
                    color: i === 2 ? V.n900 : V.n0,
                    fontFamily: MONO,
                    fontSize: DS.small,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                  }}
                >
                  {s.n}
                </span>
                {i < steps.length - 1 && <span style={{ flex: 1, width: 2, background: c.border, margin: "6px 0" }} />}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 8, paddingBottom: 12 }}>
                <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.ink }}>{s.k}</span>
                <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{s.v}</span>
              </div>
            </div>
          ))}
        </div>
        <Concl c={c} orange>
          不用一次全換：從一個佇列開始，逐步補上可觀測性與告警。
        </Concl>
      </div>
    </div>
  );
}

// ── deck ────────────────────────────────────────────────────

const deck: Deck = {
  slug: "technology-sharing/bullmq-intro",
  title: "BullMQ 入門",
  eyebrow: "TECH SHARING",
  generatedAt: "2026-09-28",
  source: "technology-sharing/bullmq-intro.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "TECH SHARING · BULLMQ",
      title: "BullMQ 入門",
      subtitle: "從自行開發 Job 會遇到的痛點出發，認識 BullMQ 的 Queue、Job、Worker，一路看到 Job 生命週期、重試與退避、暫停、Dashboard 與監控告警。",
      meta: ["2026-09-28", "技術主題分享", "原簡報 2023-11-09"],
      agenda: [
        { n: "01", title: "為什麼需要 BullMQ", sub: "現成工具之外，自己寫的 Job 缺可靠性" },
        { n: "02", title: "BullMQ 是什麼", sub: "Queue、Job、Worker 透過 Redis 協作" },
        { n: "03", title: "Job 的生命週期", sub: "延遲、優先、暫停、重試與排程" },
        { n: "04", title: "Dashboard：Bull Board", sub: "看得到，也會主動通知" },
      ],
    },
    {
      layout: "section",
      nav: "為什麼需要 BullMQ",
      num: "01",
      eyebrow: "WHY BULLMQ",
      title: "為什麼需要 BullMQ",
      subtitle: "現成工具只涵蓋大部分情境，剩下需要暫存分批、多次迴圈或特殊邏輯的任務，只能自行開發",
    },
    {
      layout: "custom",
      nav: "ETL 與現成工具",
      num: "01",
      eyebrow: "WHY BULLMQ",
      title: "ETL 約 85% 有現成工具，剩下的只能自己寫",
      pill: { text: "15% 只能自己寫", tone: "orange" },
      render: EtlPage,
    },
    {
      layout: "custom",
      nav: "自行開發的痛點",
      num: "01",
      eyebrow: "WHY BULLMQ",
      title: "自己寫的 Job，缺的是可靠性",
      pill: { text: "每一項都得自己刻", tone: "orange" },
      render: PainPage,
    },
    {
      layout: "section",
      nav: "BullMQ 是什麼",
      num: "02",
      eyebrow: "WHAT IS BULLMQ",
      title: "BullMQ 是什麼",
      subtitle: "以 Redis 為基礎的分散式任務佇列，Producer 與 Worker 之間只隔著 Redis",
    },
    {
      layout: "custom",
      nav: "BullMQ 特色",
      num: "02",
      eyebrow: "WHAT IS BULLMQ",
      title: "以 Redis 為底的分散式任務佇列",
      pill: { text: "狀態全部存在 Redis", tone: "blue" },
      render: WhatPage,
    },
    {
      layout: "custom",
      nav: "三個角色",
      num: "02",
      eyebrow: "QUEUE · JOB · WORKER",
      title: "三個角色透過 Redis 協作",
      pill: { text: "兩端獨立部署、獨立擴充", tone: "blue" },
      render: RolesPage,
    },
    {
      layout: "custom",
      nav: "Job 的紀錄",
      num: "02",
      eyebrow: "JOB AS A RECORD",
      title: "Job 一路累積運算結果、進度與日誌",
      pill: { text: "出問題時可以追查", tone: "blue" },
      render: RecordPage,
    },
    {
      layout: "section",
      nav: "Job 的生命週期",
      num: "03",
      eyebrow: "JOB LIFECYCLE",
      title: "Job 的生命週期",
      subtitle: "一筆 Job 從加入到結束，會在幾個狀態之間移動",
    },
    {
      layout: "full-visual",
      nav: "狀態模擬",
      num: "03",
      eyebrow: "JOB LIFECYCLE",
      title: "加幾個 Job，看它們在各狀態間流動",
      pill: { text: "延遲、優先、重試都是停留規則", tone: "blue" },
      viz: BullmqJobLifecycle,
      vizLabel: "@ai-visualize · bullmq-job-lifecycle",
    },
    {
      layout: "custom",
      nav: "延遲、優先、暫停",
      num: "03",
      eyebrow: "DELAY · PRIORITY · PAUSE",
      title: "延遲、優先序與暫停",
      pill: { text: "沒設 priority 反而最先處理", tone: "orange" },
      render: StopPage,
    },
    {
      layout: "custom",
      nav: "重試與退避",
      num: "03",
      eyebrow: "RETRY & BACKOFF",
      title: "失敗就退避重試，直到成功或用完次數",
      pill: { text: "exponential 給下游恢復時間", tone: "blue" },
      render: RetryPage,
    },
    {
      layout: "custom",
      nav: "排程與優雅關機",
      num: "03",
      eyebrow: "SCHEDULER · SHUTDOWN",
      title: "上線前補兩件事：排程與優雅關機",
      pill: { text: "排程和關機流程都交給 BullMQ", tone: "blue" },
      render: OpsPage,
    },
    {
      layout: "section",
      nav: "Dashboard",
      num: "04",
      eyebrow: "DASHBOARD & ALERTING",
      title: "Dashboard：Bull Board",
      subtitle: "狀態、進度、日誌如果只能用程式查，維運起來還是很累",
    },
    {
      layout: "custom",
      nav: "Bull Board",
      num: "04",
      eyebrow: "DASHBOARD & ALERTING",
      title: "Bull Board 把 Queue 狀態搬上網頁",
      pill: { text: "看得到，也能直接操作", tone: "blue" },
      render: BoardPage,
    },
    {
      layout: "custom",
      nav: "監控告警",
      num: "04",
      eyebrow: "DASHBOARD & ALERTING",
      title: "沒人盯著時，由告警主動通知",
      pill: { text: "Dashboard 看細節，告警負責叫人", tone: "blue" },
      render: AlertPage,
    },
    {
      layout: "custom",
      nav: "痛點對照",
      num: "04",
      eyebrow: "SUMMARY",
      title: "痛點對照：自己刻的基礎建設都有了解法",
      pill: { text: "從一個佇列開始", tone: "orange" },
      render: SummaryPage,
    },
  ],
};

export default deck;
