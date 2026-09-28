// NiFi Registry 入門 —— 簡報（note-deck）
//
// 版面採「一頁一份報告」：右上 pill 是這頁的一句結論；內容區分成 2–3 個編號小節，
// 欄與欄用細線分隔；每節用最適合的形式呈現（循環、插圖卡、架構圖、細線清單、流程帶），
// 並以情境插圖輔助。構圖參考 2024/01/11 技術分享投影片（六步循環、痛點與解法、
// Registry 在上三環境在下、編號串接的設定流程），視覺改為 trendlink-design。
// 全 deck 固定：藍 = Registry／版本／部署，橘 = 手動、風險、提交（commit）。
// 顏色取自 dkt() 與 trendlink token 的 CSS 變數，不硬編色碼；不畫 Q 版人物、不加裝飾。

import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  Box,
  Braces,
  Compass,
  Container,
  Database,
  FileDown,
  FileUp,
  FolderPlus,
  FolderTree,
  GitBranch,
  GitCommitHorizontal,
  HardDrive,
  History,
  KeyRound,
  LayoutGrid,
  Layers,
  ListChecks,
  MessageSquare,
  Network,
  Plug,
  Route,
  Save,
  Scale,
  Server,
  ShieldCheck,
  Tags,
  Trash2,
  TriangleAlert,
  Workflow,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import { DS } from "@/components/deck/scale";
import NifiRegistryMigrationCompare from "@notes/components/nifi-registry-migration-compare";
import NifiRegistryFlowLifecycle from "@notes/components/nifi-registry-flow-lifecycle";

// ── token（CSS 變數，不隨主題切換的色階）────────────────────────

const V = {
  blue200: "var(--blue-200)",
  blue300: "var(--blue-300)",
  blue700: "var(--blue-700)",
  blue900: "var(--blue-900)",
  orange200: "var(--orange-200)",
  orange400: "var(--orange-400)",
  n0: "var(--neutral-0)",
  n900: "var(--neutral-900)",
};

const MONO = "var(--font-mono)";

/** 藍 = Registry／部署，橘 = 手動／風險（全 deck 固定） */
function tones(c: DeckThemeTokens) {
  return {
    blue: { fg: c.brand, ink: c.brandInk, soft: c.brandSoft, solid: V.blue700, onSolid: V.n0 },
    orange: { fg: c.accent, ink: c.accent, soft: c.accentSoft, solid: V.orange400, onSolid: V.n900 },
  };
}
type Tone = ReturnType<typeof tones>["blue"];

// ── 插圖工具組 ───────────────────────────────────────────────
// 扁平雙色 + 細描邊。物件都吃同一組色票 P，亮暗主題各一套。
// 短標籤（版本號、環境名）可以直接用 <text>，其餘說明文字一律放 HTML。

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

/** 文件：紙張、摺角、色條、內文線；hiRow 標出一列（例：填錯的設定） */
function Doc({ p, x, y, w, h, acc, rot = 0, hiRow }: { p: P; x: number; y: number; w: number; h: number; acc: string; rot?: number; hiRow?: number }) {
  const rows: number[] = [];
  for (let ly = y + 22; ly < y + h - 8; ly += 9) rows.push(ly);
  return (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>
      <path d={`M${x} ${y + 4}a4 4 0 0 1 4-4h${w - 16}l12 12v${h - 16}a4 4 0 0 1-4 4h${-(w - 8)}a4 4 0 0 1-4-4z`} style={fs(p.paper, p.ink)} />
      <path d={`M${x + w - 12} ${y}v8a4 4 0 0 0 4 4h8`} style={line(p.ink, 1.5)} />
      <rect x={x + 7} y={y + 10} width={w * 0.42} height={5} rx={2.5} style={fill(acc)} />
      {rows.map((ly, i) => (
        <rect key={ly} x={x + 7} y={ly} width={w - 16 - (i % 3) * 6} height={i === hiRow ? 5 : 3} rx={1.5} style={fill(i === hiRow ? p.orange : p.grey)} />
      ))}
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

/** 螢幕上的迷你流程（三個方塊串起來），代表畫布上的 NiFi Flow */
function MiniFlow({ p, x, y, w, color }: { p: P; x: number; y: number; w: number; color: string }) {
  const bw = w * 0.22;
  const gap = (w - bw * 3) / 2;
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={x + i * (bw + gap)} y={y} width={bw} height={bw * 0.62} rx={3} style={fs(i === 1 ? color : p.sky2, p.ink, 1.2)} />
      ))}
      <path d={`M${x + bw} ${y + bw * 0.31}H${x + bw + gap}M${x + 2 * bw + gap} ${y + bw * 0.31}H${x + 2 * bw + 2 * gap}`} style={line(p.ink, 1.4)} />
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

function Chip({ x, y, w, text, color, p, h = 18, size = 10.5 }: { x: number; y: number; w: number; text: string; color: string; p: P; h?: number; size?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} style={fill(color)} />
      <text x={x + w / 2} y={y + h / 2 + size * 0.36} textAnchor="middle" style={{ fill: p.white, fontFamily: MONO, fontSize: size, fontWeight: 700 }}>
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

/** 鉛筆（手動修改） */
function Pencil({ p, x, y, s = 1 }: { p: P; x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(40) scale(${s})`}>
      <rect x={-5} y={-30} width={10} height={44} rx={2} style={fs(p.gold, p.ink, 1.3)} />
      <rect x={-5} y={-30} width={10} height={8} rx={2} style={fs(p.orange, p.ink, 1.3)} />
      <path d="M-5 14L0 26 5 14Z" style={fs(p.paper, p.ink, 1.3)} />
    </g>
  );
}

/** 伺服器機櫃（NiFi Registry） */
function ServerRack({ p, x, y, w, h }: { p: P; x: number; y: number; w: number; h: number }) {
  const u = (h - 16) / 3;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} style={fs(p.navy, p.ink)} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={x + 8} y={y + 8 + i * u} width={w - 16} height={u - 6} rx={4} style={fill(p.paper)} />
          <circle cx={x + 18} cy={y + 8 + i * u + (u - 6) / 2} r={3.5} style={fill(i === 0 ? p.green : p.lblue)} />
          <rect x={x + 30} y={y + 8 + i * u + (u - 6) / 2 - 2} width={w * 0.45} height={4} rx={2} style={fill(p.grey)} />
        </g>
      ))}
    </g>
  );
}

/** 參數卡：鑰匙 + 兩列值；PRD 可加鎖 */
function KeyCard({ p, x, y, w, color }: { p: P; x: number; y: number; w: number; color: string }) {
  const h = w * 0.66;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} style={fs(p.paper, p.ink)} />
      <circle cx={x + 14} cy={y + 16} r={6} style={line(p.ink, 2)} />
      <path d={`M${x + 20} ${y + 16}H${x + 34}M${x + 30} ${y + 16}v5`} style={line(p.ink, 2)} />
      <rect x={x + 8} y={y + 30} width={w - 16} height={7} rx={3.5} style={fill(color)} />
      <rect x={x + 8} y={y + 42} width={w * 0.55} height={5} rx={2.5} style={fill(p.grey)} />
    </g>
  );
}

/** 視窗（瀏覽器 / 終端機） */
function Win({ p, x, y, w, h, bar, dark }: { p: P; x: number; y: number; w: number; h: number; bar: string; dark?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} style={fs(dark ? p.ink : p.paper, p.ink)} />
      <path d={`M${x} ${y + 18}V${y + 8}a8 8 0 0 1 8-8h${w - 16}a8 8 0 0 1 8 8V${y + 18}Z`} style={fill(bar)} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x + 12 + i * 11} cy={y + 9} r={3} style={fill(p.paper)} opacity={0.75} />
      ))}
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

// ── 概念小圖（64px，放在定義卡、決策卡）─────────────────────────

function MiniRegistry({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={64} label="小圖：伺服器機櫃旁一排遞增的版本">
      <ServerRack p={p} x={6} y={10} w={40} h={60} />
      <Chip x={50} y={14} w={26} text="v1" color={p.lblue} p={p} h={16} size={9} />
      <Chip x={50} y={34} w={26} text="v2" color={p.lblue} p={p} h={16} size={9} />
      <Chip x={50} y={54} w={26} text="v3" color={p.navy} p={p} h={16} size={9} />
    </Svg>
  );
}

function MiniParam({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={64} label="小圖：參數卡片加上鎖頭">
      <KeyCard p={p} x={6} y={16} w={62} color={p.orange} />
      <Lock p={p} x={66} y={20} r={11} />
    </Svg>
  );
}

function MiniBucket({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={64} label="小圖：資料夾裡收著兩張流程卡">
      <path d="M6 22a4 4 0 0 1 4-4h18l6 7h36a4 4 0 0 1 4 4v37a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4Z" style={fs(p.sky2, p.ink)} />
      <rect x={16} y={34} width={48} height={12} rx={3} style={fs(p.paper, p.ink, 1.2)} />
      <rect x={16} y={52} width={48} height={12} rx={3} style={fs(p.paper, p.ink, 1.2)} />
    </Svg>
  );
}

function MiniFlowArt({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={64} label="小圖：三個元件以箭頭串成一條資料流程">
      <MiniFlow p={p} x={6} y={30} w={68} color={p.navy} />
    </Svg>
  );
}

function MiniVersions({ p }: { p: P }) {
  return (
    <Svg vb={[80, 80]} width={64} label="小圖：一條直線上依序排列的版本點">
      <line x1={10} y1={40} x2={70} y2={40} style={line(p.lblue, 3)} />
      {[10, 30, 50].map((x) => (
        <circle key={x} cx={x} cy={40} r={7} style={fs(p.paper, p.navy, 2)} />
      ))}
      <circle cx={70} cy={40} r={8} style={fill(p.navy)} />
    </Svg>
  );
}

// ── 版面零件 ─────────────────────────────────────────────────

/** 小節標題：編號 + 圓角方形 icon 章 + 藍色粗體 */
function SecHead({ n, Icon, title, c, note }: { n: string; Icon: LucideIcon; title: string; c: DeckThemeTokens; note?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
      <div style={{ width: 34, height: 34, flex: "none", borderRadius: 10, background: c.brandSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
    <div style={{ flex: "none", background: c.brandSoft, borderLeft: `5px solid ${c.brand}`, padding: "10px 18px", fontSize: DS.body, fontWeight: 700, lineHeight: 1.5, color: c.brandInk }}>
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
  return <div style={{ border: `1px solid ${c.border}`, borderRadius: 14, background: c.slide, ...style }}>{children}</div>;
}

/** 細線清單的一列 */
function ListRow({ Icon, k, v, tone, c, kw = 120 }: { Icon: LucideIcon; k: string; v: ReactNode; tone: Tone; c: DeckThemeTokens; kw?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${c.border}` }}>
      <Icon size={22} color={tone.fg} style={{ flex: "none" }} />
      <span style={{ width: kw, flex: "none", fontSize: DS.body, fontWeight: 700, color: c.ink }}>{k}</span>
      <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{v}</span>
    </div>
  );
}

/** 編號圓章 */
function NumBadge({ n, tone, size = 30 }: { n: string; tone: Tone; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: 999,
        background: tone.solid,
        color: tone.onSolid,
        fontFamily: MONO,
        fontSize: DS.small,
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {n}
    </span>
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
        <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.muted }}>{note}</span>
      </div>
    </div>
  );
}

/** 橫向箭頭（HTML 流程之間） */
function HArrow({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 16" width={24} height={16} aria-hidden="true" style={{ flex: "none", alignSelf: "center" }}>
      <path d="M1 8H18M13 3L18 8 13 13" style={line(color, 2.2)} />
    </svg>
  );
}

// ── P3 Template 六步循環 ─────────────────────────────────────

const TEMPLATE_STEPS: { Icon: LucideIcon; t: string; d: string; risk?: boolean }[] = [
  { Icon: LayoutGrid, t: "開發 Flow", d: "在畫布建立或修改 Processor、Connection 等元件" },
  { Icon: Save, t: "存成 Template", d: "把完成的流程保存為可重用的 Template" },
  { Icon: FileDown, t: "匯出 XML", d: "下載一份包含流程設定的 XML 檔" },
  { Icon: Trash2, t: "刪除舊流程", d: "到目標 NiFi 移除舊版流程與相關元件", risk: true },
  { Icon: FileUp, t: "匯入 Template", d: "在目標 NiFi 匯入 XML 並拖上畫布" },
  { Icon: Wrench, t: "手動調整設定", d: "逐一補回敏感屬性、改 Host / IP / Port", risk: true },
];

function CycleScene({ p }: { p: P }) {
  const cx = 300;
  const cy = 262;
  const R = 200;
  const ang = (i: number) => ((-60 + i * 60) * Math.PI) / 180;
  const pos = (i: number, r = R) => ({ x: cx + r * Math.cos(ang(i)), y: cy + r * Math.sin(ang(i)) });
  return (
    <Svg
      vb={[600, 524]}
      label="插圖：六個步驟排成一個循環，第四步刪除舊流程與第六步手動調整設定以橘色標示；圓心是一份 XML 文件從 DEV 螢幕送到 QAS 螢幕，旁邊一支鉛筆與問號，表示匯入後還要手動修改"
    >
      <circle cx={cx} cy={cy} r={R} style={line(p.sky2, 14)} />
      {TEMPLATE_STEPS.map((_, i) => {
        const a0 = ang(i) + 0.3;
        const a1 = ang(i + 1) - 0.3;
        const am = (a0 + a1) / 2;
        const k = R / Math.cos((a1 - a0) / 2);
        return (
          <Arrow
            key={i}
            x1={cx + R * Math.cos(a0)}
            y1={cy + R * Math.sin(a0)}
            x2={cx + R * Math.cos(a1)}
            y2={cy + R * Math.sin(a1)}
            cx={cx + k * Math.cos(am)}
            cy={cy + k * Math.sin(am)}
            color={TEMPLATE_STEPS[(i + 1) % 6].risk ? p.orange : p.navy}
            w={3}
          />
        );
      })}
      {TEMPLATE_STEPS.map((s, i) => {
        const q = pos(i);
        return (
          <g key={s.t}>
            <circle cx={q.x} cy={q.y} r={40} style={fs(s.risk ? "var(--orange-50)" : p.paper, s.risk ? p.orange : p.navy, 2.5)} />
            <s.Icon x={q.x - 16} y={q.y - 16} width={32} height={32} color={s.risk ? "var(--orange-500)" : "var(--blue-700)"} strokeWidth={2} />
            <circle cx={q.x + 30} cy={q.y - 30} r={13} style={fill(s.risk ? p.orange : p.navy)} />
            <text x={q.x + 30} y={q.y - 25.5} textAnchor="middle" style={{ fill: p.white, fontFamily: MONO, fontSize: 13, fontWeight: 800 }}>
              {i + 1}
            </text>
          </g>
        );
      })}
      {/* 圓心：DEV → XML → QAS + 手改 */}
      <Ground p={p} x={cx - 128} y={cy + 66} w={256} />
      <Monitor p={p} x={cx - 124} y={cy - 6} w={78} h={56} bar={p.navy}>
        <MiniFlow p={p} x={cx - 114} y={cy + 22} w={58} color={p.navy} />
      </Monitor>
      <Monitor p={p} x={cx + 46} y={cy - 6} w={78} h={56} bar={p.lblue}>
        <MiniFlow p={p} x={cx + 56} y={cy + 22} w={58} color={p.orange} />
      </Monitor>
      <Doc p={p} x={cx - 22} y={cy - 52} w={44} h={56} acc={p.gold} />
      <Arrow x1={cx - 64} y1={cy - 16} cx={cx - 50} cy={cy - 40} x2={cx - 28} y2={cy - 34} color={p.navy} w={2.2} />
      <Arrow x1={cx + 28} y1={cy - 34} cx={cx + 50} cy={cy - 40} x2={cx + 64} y2={cy - 16} color={p.navy} w={2.2} />
      <Pencil p={p} x={cx + 128} y={cy - 22} s={0.8} />
      <QMark p={p} x={cx + 120} y={cy - 12} r={12} />
    </Svg>
  );
}

function TemplateCyclePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1.05, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <SecHead n="一" Icon={Route} title="一次發佈就是繞一圈" c={c} note="橘色 = 最容易出錯的兩步" />
        <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 16px" }}>
          <CycleScene p={p} />
        </Panel>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
        <SecHead n="二" Icon={ListChecks} title="每一步做什麼" c={c} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          {TEMPLATE_STEPS.map((s, i) => {
            const tone = s.risk ? t.orange : t.blue;
            return (
              <div key={s.t} style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, borderTop: `1px solid ${c.border}`, background: s.risk ? c.accentSoft : "transparent", padding: "0 12px" }}>
                <NumBadge n={String(i + 1)} tone={tone} />
                <s.Icon size={22} color={tone.fg} style={{ flex: "none" }} />
                <span style={{ width: 150, flex: "none", fontSize: DS.body, fontWeight: 700, color: c.ink }}>{s.t}</span>
                <span style={{ fontSize: DS.small, lineHeight: 1.45, color: c.body }}>{s.d}</span>
              </div>
            );
          })}
        </div>
        <Note c={c}>
          <TriangleAlert size={15} />
          Template 已在 NiFi 2.0 移除，改為下載 / 上傳 Flow Definition（JSON）；手動搬遷的痛點依然存在
        </Note>
      </div>
    </div>
  );
}

// ── P4 三個痛點 + 兩個解法 ───────────────────────────────────

function PainErrorArt({ p }: { p: P }) {
  return (
    <Svg vb={[300, 150]} label="插圖：一份設定文件被複製到另一邊，複製後的文件有一列被標成橘色，掛著警示徽章">
      <Doc p={p} x={40} y={22} w={72} h={96} acc={p.navy} />
      <Arrow x1={122} y1={70} cx={150} cy={52} x2={178} y2={70} color={p.navy} w={2.5} />
      <Doc p={p} x={188} y={22} w={72} h={96} acc={p.navy} hiRow={3} />
      <Alert p={p} x={260} y={30} r={15} />
    </Svg>
  );
}

function PainTraceArt({ p }: { p: P }) {
  return (
    <Svg vb={[300, 150]} label="插圖：三份疊在一起的修改文件，旁邊兩個人形剪影，文件上掛著問號，看不出誰改了什麼">
      <Doc p={p} x={120} y={26} w={64} h={86} acc={p.gold} rot={-12} />
      <Doc p={p} x={132} y={26} w={64} h={86} acc={p.lblue} rot={4} />
      <Doc p={p} x={146} y={30} w={64} h={86} acc={p.navy} rot={14} />
      <Person p={p} x={62} y={66} s={0.9} />
      <Person p={p} x={250} y={66} s={0.9} color={p.lblue} />
      <QMark p={p} x={206} y={30} r={15} />
    </Svg>
  );
}

function PainEnvArt({ p }: { p: P }) {
  const envs = [
    { x: 22, color: p.navy },
    { x: 116, color: p.lblue },
    { x: 210, color: p.orange },
  ];
  return (
    <Svg vb={[300, 150]} label="插圖：DEV、QAS、PRD 三台一樣的螢幕，畫面上的流程相同，只有代表連線位址的色塊各不相同">
      <Ground p={p} x={16} y={126} w={268} />
      {envs.map((e, i) => (
        <g key={i}>
          <Monitor p={p} x={e.x} y={36} w={68} h={58} bar={p.navy}>
            <MiniFlow p={p} x={e.x + 10} y={60} w={48} color={p.lblue} />
            <rect x={e.x + 10} y={78} width={48} height={7} rx={3.5} style={fill(e.color)} />
          </Monitor>
          <Chip x={e.x + 12} y={12} w={44} text={["DEV", "QAS", "PRD"][i]} color={p.navy} p={p} />
        </g>
      ))}
    </Svg>
  );
}

function PainPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const pains: { n: string; title: string; desc: string; art: ReactNode }[] = [
    { n: "①", title: "人工轉移難免出錯", desc: "參數填錯、連線接錯、元件遺漏，流程上線後才發現不正常", art: <PainErrorArt p={p} /> },
    { n: "②", title: "難以追蹤修改了什麼", desc: "多人協作時說不清誰改了什麼，也回不到上一個可用版本", art: <PainTraceArt p={p} /> },
    { n: "③", title: "難以處理環境差異", desc: "資料庫連線、IP、憑證各環境不同，每次搬遷都要重新調整", art: <PainEnvArt p={p} /> },
  ];
  const fixes: { art: ReactNode; name: string; desc: string; solves: string[]; tone: Tone }[] = [
    { art: <MiniRegistry p={p} />, name: "NiFi Registry", desc: "把流程納入版控：commit、拉取指定版本、保留修改紀錄", solves: ["①", "②"], tone: t.blue },
    { art: <MiniParam p={p} />, name: "Parameter Context", desc: "把連線位址、帳號密碼抽出流程，由各環境自己保管", solves: ["③"], tone: t.orange },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <SecHead n="一" Icon={TriangleAlert} title="三個痛點" c={c} note="匯入後仍需手動調整，問題就從這裡開始" />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {pains.map((x) => (
          <Panel key={x.n} c={c} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, minHeight: 0, background: c.slide, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 18px" }}>{x.art}</div>
            <div style={{ padding: "12px 18px 14px", display: "flex", flexDirection: "column", gap: 4, borderTop: `1px solid ${c.border}` }}>
              <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.ink }}>
                <span style={{ color: c.accent, marginRight: 8 }}>{x.n}</span>
                {x.title}
              </span>
              <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{x.desc}</span>
            </div>
          </Panel>
        ))}
      </div>
      <SecHead n="二" Icon={Layers} title="兩個解法" c={c} />
      <div style={{ flex: "none", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {fixes.map((f) => (
          <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 18, padding: "12px 20px", borderRadius: 14, border: `1px solid ${c.border}`, borderTop: `4px solid ${f.tone.fg}`, background: c.slide }}>
            {f.art}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: DS.h4, fontWeight: 900, color: f.tone.ink }}>{f.name}</span>
              <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{f.desc}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "none" }}>
              <span style={{ fontSize: DS.micro, color: c.muted }}>解決</span>
              <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.accent, letterSpacing: "0.1em" }}>{f.solves.join(" ")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── P7 部署架構 ──────────────────────────────────────────────

function ArchScene({ p }: { p: P }) {
  const envs = [
    { x: 70, name: "DEV", up: true },
    { x: 310, name: "QAS", up: false },
    { x: 550, name: "PRD", up: false },
  ];
  return (
    <Svg
      vb={[760, 440]}
      label="插圖：上方是 NiFi Registry，伺服器機櫃旁有兩個 Bucket，各自放著遞增的版本；下緣是 API 橫條。下方是 DEV、QAS、PRD 三台螢幕，DEV 以橘色箭頭往上 commit，QAS 與 PRD 以藍色箭頭往下 import"
    >
      <rect x={20} y={14} width={720} height={196} rx={16} style={fs(p.sky, p.lblue, 1.5)} />
      <ServerRack p={p} x={48} y={36} w={96} h={124} />
      {[0, 1].map((b) => {
        const bx = 176 + b * 276;
        return (
          <g key={b}>
            <rect x={bx} y={34} width={256} height={128} rx={10} style={fs(p.paper, p.ink, 1.2)} />
            <path d={`M${bx + 12} ${34 + 14}h40l6 8h-46z`} style={fill(p.sky2)} />
            {[0, 1].map((f) => {
              const fy = 70 + f * 44;
              const n = b === 0 ? (f === 0 ? 4 : 2) : f === 0 ? 3 : 2;
              return (
                <g key={f}>
                  <rect x={bx + 14} y={fy - 4} width={46} height={28} rx={4} style={fs(p.sky2, p.ink, 1)} />
                  <MiniFlow p={p} x={bx + 18} y={fy + 3} w={38} color={p.navy} />
                  <line x1={bx + 82} y1={fy + 10} x2={bx + 82 + (n - 1) * 44} y2={fy + 10} style={line(p.lblue, 2.5)} />
                  {Array.from({ length: n }).map((_, v) => (
                    <Chip key={v} x={bx + 68 + v * 44} y={fy + 1} w={30} text={`v${v + 1}`} color={v === n - 1 ? p.navy : p.lblue} p={p} />
                  ))}
                </g>
              );
            })}
          </g>
        );
      })}
      <rect x={48} y={178} width={664} height={22} rx={11} style={fill(p.navy)} />
      <text x={380} y={193} textAnchor="middle" style={{ fill: p.white, fontFamily: MONO, fontSize: 12, fontWeight: 800 }}>
        API
      </text>
      {envs.map((e) => {
        const mx = e.x + 70;
        return (
          <g key={e.name}>
            {e.up ? (
              <Arrow x1={mx} y1={300} x2={mx} y2={206} color={p.orange} w={5} />
            ) : (
              <Arrow x1={mx} y1={204} x2={mx} y2={298} color={p.navy} w={5} />
            )}
            <Chip x={mx + 14} y={244} w={64} text={e.up ? "commit" : "import"} color={e.up ? p.orange : p.navy} p={p} h={22} size={12} />
            <Monitor p={p} x={e.x} y={306} w={140} h={92} bar={e.up ? p.orange : p.navy}>
              <MiniFlow p={p} x={e.x + 18} y={344} w={104} color={e.up ? p.orange : p.lblue} />
            </Monitor>
            <Chip x={e.x + 44} y={418} w={52} text={e.name} color={p.ink} p={p} h={20} size={11} />
          </g>
        );
      })}
    </Svg>
  );
}

function ArchPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1.3, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <SecHead n="一" Icon={Network} title="部署架構" c={c} note="多個 NiFi 共用一個 Registry" />
        <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 18px" }}>
          <ArchScene p={p} />
        </Panel>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
        <SecHead n="二" Icon={Server} title="三項能力" c={c} />
        <div>
          <ListRow Icon={Layers} k="Flow Registry" v="保存與管理版本化的流程" tone={t.blue} c={c} kw={160} />
          <ListRow Icon={GitBranch} k="與 NiFi 整合" v="在畫布上 commit、匯入、升級版本" tone={t.blue} c={c} kw={160} />
          <ListRow Icon={ShieldCheck} k="權限管理" v="使用者、群組與 Bucket 存取政策" tone={t.blue} c={c} kw={160} />
        </div>
        <div style={{ flex: 1 }} />
        <SecHead n="三" Icon={Database} title="部署重點" c={c} />
        <div style={{ borderBottom: `1px solid ${c.border}` }}>
          <ListRow Icon={Plug} k="連接埠" v={<span style={{ fontFamily: MONO }}>18080（HTTP）／ 18443（HTTPS）</span>} tone={t.orange} c={c} kw={112} />
          <ListRow Icon={HardDrive} k="Flow 儲存" v="檔案系統（預設）、Git、資料庫三選一" tone={t.orange} c={c} kw={112} />
          <ListRow Icon={Database} k="中繼資料" v="H2（預設），正式環境建議 PostgreSQL / MySQL" tone={t.orange} c={c} kw={112} />
        </div>
      </div>
    </div>
  );
}

// ── P8 Bucket / Flow / Version ────────────────────────────────

function VersionLine({ n, c }: { n: number; c: DeckThemeTokens }) {
  const step = 38;
  const w = 20 + (n - 1) * step;
  return (
    <svg viewBox={`0 0 ${w} 20`} width={w} height={20} aria-hidden="true" style={{ flex: "none" }}>
      <line x1={10} y1={10} x2={w - 10} y2={10} style={line(V.blue300, 2.5)} />
      {Array.from({ length: n }).map((_, i) => (
        <circle key={i} cx={10 + i * step} cy={10} r={i === n - 1 ? 8 : 6.5} style={i === n - 1 ? fill(V.blue700) : fs(c.slide, V.blue700, 2)} />
      ))}
    </svg>
  );
}

function ConceptPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const defs: { art: ReactNode; name: string; like: string; desc: string }[] = [
    { art: <MiniBucket p={p} />, name: "Bucket", like: "Group", desc: "存放與組織 Flow 的容器，也是權限單位" },
    { art: <MiniFlowArt p={p} />, name: "Flow", like: "Project", desc: "一個被版控的 Process Group" },
    { art: <MiniVersions p={p} />, name: "Version", like: "Commit", desc: "每次 commit 的快照：版本號、時間、提交者、comment" },
  ];
  const buckets: { name: string; flows: { name: string; n: number }[] }[] = [
    { name: "etl-order", flows: [{ name: "order-sync", n: 4 }, { name: "invoice-export", n: 2 }] },
    { name: "etl-hr", flows: [{ name: "attendance-load", n: 3 }] },
  ];
  const perms: { k: string; reg: string; nifi: string }[] = [
    { k: "Read", reg: "檢視 Flow", nifi: "匯入、切換版本" },
    { k: "Write", reg: "—", nifi: "Commit 新版本" },
    { k: "Delete", reg: "刪除 Flow", nifi: "—" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1.05, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <SecHead n="一" Icon={FolderTree} title="三層結構" c={c} note="對照 GitLab" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            {defs.map((d) => (
              <div key={d.name} style={{ flex: 1, display: "flex", alignItems: "center", gap: 16, padding: "0 16px", borderRadius: 14, border: `1px solid ${c.border}`, background: c.slide }}>
                {d.art}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.brandInk }}>{d.name}</span>
                    <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted, padding: "2px 10px", borderRadius: 999, background: c.sunken }}>≈ {d.like}</span>
                  </div>
                  <span style={{ fontSize: DS.small, lineHeight: 1.45, color: c.body }}>{d.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1.05, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
          <SecHead n="二" Icon={GitCommitHorizontal} title="每條 Flow 一條版本線" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 14, border: `1.5px solid ${c.brand}`, background: c.slide }}>
            <span style={{ fontSize: DS.small, fontWeight: 900, color: c.brandInk }}>NiFi Registry</span>
            {buckets.map((b) => (
              <div key={b.name} style={{ flex: b.flows.length, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: c.brandSoft }}>
                <span style={{ fontSize: DS.micro, fontWeight: 800, color: c.brandInk, letterSpacing: "0.08em" }}>
                  BUCKET <span style={{ fontFamily: MONO, fontWeight: 600, marginLeft: 6 }}>{b.name}</span>
                </span>
                {b.flows.map((f) => (
                  <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 8, background: c.slide, border: `1px solid ${c.border}` }}>
                    <span style={{ width: 150, flex: "none", fontFamily: MONO, fontSize: DS.small, fontWeight: 600, color: c.ink }}>{f.name}</span>
                    <VersionLine n={f.n} c={c} />
                    <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: DS.micro, fontWeight: 700, color: c.brand }}>v{f.n}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: 360, flex: "none", display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
          <SecHead n="三" Icon={ShieldCheck} title="Bucket 權限" c={c} />
          <div style={{ display: "grid", gridTemplateColumns: "76px 1fr 1fr", borderBottom: `1px solid ${c.border}` }}>
            {["", "Registry", "NiFi"].map((h) => (
              <span key={h} style={{ fontSize: DS.micro, fontWeight: 700, color: c.muted, padding: "0 0 6px" }}>
                {h}
              </span>
            ))}
            {perms.map((r) => (
              <div key={r.k} style={{ display: "contents" }}>
                <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink, padding: "9px 0", borderTop: `1px solid ${c.border}` }}>{r.k}</span>
                <span style={{ fontSize: DS.small, color: r.reg === "—" ? c.muted : c.body, padding: "9px 0", borderTop: `1px solid ${c.border}` }}>{r.reg}</span>
                <span style={{ fontSize: DS.small, color: r.nifi === "—" ? c.muted : c.body, padding: "9px 0", borderTop: `1px solid ${c.border}` }}>{r.nifi}</span>
              </div>
            ))}
          </div>
          <FocusCard c={c} art={<MiniRegistry p={p} />} q="PRD 的 NiFi 該給什麼權限？" answer="只給 Read" note="正式環境只能拉版本，不能回推修改" hi />
        </div>
      </div>
      <Concl c={c}>
        <span style={{ color: t.orange.fg, marginRight: 10 }}>沒有 Branch：</span>
        沒有 merge、rebase，修改集中在 DEV，其他環境只拉取指定版本
      </Concl>
    </div>
  );
}

// ── P11 Parameter Context ────────────────────────────────────

function ParamScene({ p }: { p: P }) {
  const envs = [
    { x: 40, name: "DEV", color: p.lblue },
    { x: 280, name: "QAS", color: p.navy },
    { x: 520, name: "PRD", color: p.orange },
  ];
  return (
    <Svg
      vb={[760, 330]}
      label="插圖：上方一份流程文件，三條線分別連到 DEV、QAS、PRD 三台相同的螢幕；每台螢幕旁有一張參數卡，只有卡上的色塊不同，PRD 的卡片掛著鎖頭，表示敏感值只存在本機"
    >
      <Doc p={p} x={340} y={18} w={80} h={100} acc={p.navy} />
      <MiniFlow p={p} x={350} y={78} w={60} color={p.navy} />
      {envs.map((e) => {
        const mx = e.x + 70;
        return (
          <g key={e.name}>
            <Arrow x1={380} y1={124} cx={mx} cy={140} x2={mx} y2={186} color={p.navy} w={2.5} />
            <Ground p={p} x={e.x - 10} y={300} w={210} />
            <Monitor p={p} x={e.x} y={196} w={124} h={82} bar={p.navy}>
              <MiniFlow p={p} x={e.x + 16} y={228} w={92} color={p.lblue} />
              <rect x={e.x + 16} y={256} width={92} height={8} rx={4} style={fill(e.color)} />
            </Monitor>
            <KeyCard p={p} x={e.x + 134} y={232} w={64} color={e.color} />
            {e.name === "PRD" && <Lock p={p} x={e.x + 196} y={234} r={13} />}
            <Chip x={e.x + 38} y={170} w={48} text={e.name} color={p.ink} p={p} h={20} size={11} />
          </g>
        );
      })}
    </Svg>
  );
}

function ParamPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const resolved: { env: string; v: string; hi?: boolean }[] = [
    { env: "DEV", v: "dev-db:5432/erp" },
    { env: "QAS", v: "qas-db:5432/erp" },
    { env: "PRD", v: "prd-db:5432/erp", hi: true },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1.25, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <SecHead n="一" Icon={Braces} title="同一份流程，三組值" c={c} note="屬性寫參照，值由各環境提供" />
        <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 18px 4px" }}>
            <ParamScene p={p} />
          </div>
          <div style={{ display: "flex", alignItems: "stretch", borderTop: `1px solid ${c.border}` }}>
            <div style={{ width: 170, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: c.brandSoft, fontFamily: MONO, fontSize: DS.body, fontWeight: 800, color: c.brandInk }}>
              {"#{db.url}"}
            </div>
            {resolved.map((r) => (
              <div key={r.env} style={{ flex: 1, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 2, borderLeft: `1px solid ${c.border}` }}>
                <span style={{ fontSize: DS.micro, fontWeight: 800, color: r.hi ? c.accent : c.muted, letterSpacing: "0.08em" }}>{r.env}</span>
                <span style={{ fontFamily: MONO, fontSize: DS.small, fontWeight: 700, color: c.ink }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
        <SecHead n="二" Icon={ListChecks} title="四個要點" c={c} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderBottom: `1px solid ${c.border}` }}>
          {[
            { Icon: History, k: "版本需求", v: "NiFi 1.10.0 起提供；Variable Registry 已在 2.0 移除", tone: t.blue },
            { Icon: Tags, k: "同名慣例", v: "各環境建立同名 Context，匯入或升版時自動沿用", tone: t.blue },
            { Icon: KeyRound, k: "敏感參數", v: "值不會送到 Registry，各環境首次部署時自行填入", tone: t.orange },
            { Icon: Scale, k: "判斷標準", v: "換環境就會變的值都參數化；各環境相同的值寫死即可", tone: t.blue },
          ].map((r) => (
            <div key={r.k} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, borderTop: `1px solid ${c.border}` }}>
              <r.Icon size={24} color={r.tone.fg} style={{ flex: "none" }} />
              <span style={{ width: 100, flex: "none", fontSize: DS.body, fontWeight: 700, color: c.ink }}>{r.k}</span>
              <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{r.v}</span>
            </div>
          ))}
        </div>
        <Concl c={c}>寫死在 Processor 的值，會原封不動跟著流程搬到 PRD</Concl>
      </div>
    </div>
  );
}

// ── P13 四步驟接上 Registry ──────────────────────────────────

function StepTerminal({ p }: { p: P }) {
  return (
    <Svg vb={[300, 180]} label="插圖：終端機視窗執行指令，旁邊一個容器方塊代表 NiFi Registry 啟動">
      <Win p={p} x={30} y={28} w={170} h={120} bar={p.navy} dark />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={44} y={60 + i * 18} width={[118, 90, 60][i]} height={6} rx={3} style={fill(i === 2 ? p.gold : p.lblue)} />
      ))}
      <Arrow x1={206} y1={90} x2={226} y2={90} color={p.navy} w={2.5} />
      <ServerRack p={p} x={232} y={52} w={48} h={80} />
      <Check p={p} x={278} y={54} r={12} />
    </Svg>
  );
}

function StepBucket({ p }: { p: P }) {
  return (
    <Svg vb={[300, 180]} label="插圖：Registry 網頁上的清單，一個新的 Bucket 資料夾正被加入">
      <Win p={p} x={30} y={26} w={200} h={130} bar={p.navy} />
      {[0, 1].map((i) => (
        <rect key={i} x={44} y={56 + i * 24} width={172} height={16} rx={4} style={fs(p.sky2, p.ink, 1)} />
      ))}
      <path d="M150 104a4 4 0 0 1 4-4h26l6 7h54a4 4 0 0 1 4 4v38a4 4 0 0 1-4 4H154a4 4 0 0 1-4-4Z" style={fs(p.gold, p.ink)} />
      <PlusBadge p={p} x={246} y={104} r={14} />
    </Svg>
  );
}

function StepClient({ p }: { p: P }) {
  return (
    <Svg vb={[300, 180]} label="插圖：NiFi 右上角選單展開，Controller Settings 一項被標成橘色，旁邊的設定視窗有新增按鈕">
      <Win p={p} x={20} y={22} w={170} h={136} bar={p.navy} />
      <rect x={82} y={36} width={98} height={112} rx={6} style={fs(p.paper, p.ink, 1.2)} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={90} y={46 + i * 20} width={82} height={12} rx={3} style={fill(i === 2 ? p.gold : p.sky2)} />
      ))}
      <Arrow x1={182} y1={92} cx={200} cy={80} x2={212} y2={70} color={p.orange} w={2.5} />
      <rect x={200} y={40} width={84} height={96} rx={6} style={fs(p.paper, p.ink, 1.2)} />
      <rect x={208} y={50} width={68} height={10} rx={3} style={fill(p.navy)} />
      <rect x={208} y={68} width={68} height={8} rx={3} style={fill(p.grey)} />
      <rect x={208} y={82} width={52} height={8} rx={3} style={fill(p.grey)} />
      <PlusBadge p={p} x={276} y={126} r={13} />
    </Svg>
  );
}

function StepVersion({ p }: { p: P }) {
  return (
    <Svg vb={[300, 180]} label="插圖：畫布上的 Process Group 按右鍵，Version 子選單展開，產生第一個版本 v1">
      <rect x={24} y={46} width={120} height={80} rx={8} style={fs(p.paper, p.navy, 2)} />
      <MiniFlow p={p} x={36} y={80} w={96} color={p.navy} />
      <rect x={124} y={60} width={78} height={92} rx={6} style={fs(p.paper, p.ink, 1.2)} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={132} y={70 + i * 20} width={62} height={12} rx={3} style={fill(i === 3 ? p.gold : p.sky2)} />
      ))}
      <rect x={206} y={112} width={78} height={40} rx={6} style={fs(p.paper, p.orange, 1.5)} />
      <rect x={214} y={122} width={62} height={10} rx={3} style={fill(p.orange)} />
      <Chip x={220} y={40} w={40} text="v1" color={p.navy} p={p} h={22} size={12} />
      <Arrow x1={240} y1={108} x2={240} y2={68} color={p.navy} w={2.5} />
    </Svg>
  );
}

function SetupPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const steps: { Icon: LucideIcon; title: string; art: ReactNode; body: ReactNode }[] = [
    {
      Icon: Container,
      title: "啟動 NiFi Registry",
      art: <StepTerminal p={p} />,
      body: (
        <>
          用官方 Docker image 最快，開啟 <code style={{ fontFamily: MONO }}>/nifi-registry</code> 即可看到 UI
        </>
      ),
    },
    { Icon: FolderPlus, title: "建立 Bucket", art: <StepBucket p={p} />, body: "設定（扳手）→ New Bucket，依團隊或業務領域命名" },
    {
      Icon: Plug,
      title: "新增 Registry Client",
      art: <StepClient p={p} />,
      body: "選單（≡）→ Controller Settings → Registry Clients → +，填入 URL",
    },
    { Icon: GitBranch, title: "開始版控或匯入", art: <StepVersion p={p} />, body: "右鍵 → Version → Start version control；其他環境 Import from Registry" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 10 }}>
        {steps.map((s, i) => (
          <div key={s.title} style={{ display: "contents" }}>
            {i > 0 && <HArrow color={V.blue300} />}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <NumBadge n={String(i + 1)} tone={i === 2 ? t.orange : t.blue} size={34} />
                <s.Icon size={22} color={i === 2 ? c.accent : c.brand} />
                <span style={{ fontSize: DS.body, fontWeight: 900, color: c.ink, whiteSpace: "nowrap" }}>{s.title}</span>
              </div>
              <Panel c={c} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", border: i === 2 ? `1.5px solid ${V.orange400}` : `1px solid ${c.border}` }}>
                <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px" }}>{s.art}</div>
                <div style={{ padding: "10px 14px 12px", borderTop: `1px solid ${c.border}`, fontSize: DS.small, lineHeight: 1.5, color: c.body }}>{s.body}</div>
              </Panel>
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: "none", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 18px", borderRadius: 12, background: c.sunken, border: `1px solid ${c.border}` }}>
          <span style={{ fontSize: DS.micro, fontWeight: 800, color: c.muted, letterSpacing: "0.08em" }}>步驟 1 · 啟動指令</span>
          <span style={{ fontFamily: MONO, fontSize: DS.small, fontWeight: 600, color: c.ink }}>docker run --name nifi-registry -p 18080:18080 -d apache/nifi-registry:latest</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", alignItems: "center", columnGap: 16, rowGap: 4, padding: "10px 18px", borderRadius: 12, border: `1.5px solid ${V.orange400}`, background: c.accentSoft }}>
          <span style={{ fontSize: DS.micro, fontWeight: 800, color: c.accent, gridColumn: "1 / 3", letterSpacing: "0.08em" }}>步驟 3 · Registry Client Properties</span>
          <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink }}>URL</span>
          <span style={{ fontFamily: MONO, fontSize: DS.small, color: c.ink }}>http://&lt;registry-host&gt;:18080</span>
          <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink }}>SSL Context</span>
          <span style={{ fontSize: DS.small, color: c.body }}>使用 HTTPS（:18443）時指定</span>
        </div>
      </div>
    </div>
  );
}

// ── P14 六條規則 ─────────────────────────────────────────────

const RULES: { Icon: LucideIcon; t: string; d: string; hi?: boolean }[] = [
  { Icon: Box, t: "以 Process Group 為版控單位", d: "一個 Flow 對應一個業務流程，不把整張畫布塞進同一版本" },
  { Icon: GitCommitHorizontal, t: "修改只發生在 DEV", d: "QAS / PRD 只做 Import 與 Change version；被改過就先檢視差異再 Revert", hi: true },
  { Icon: Braces, t: "環境相依的值全部參數化", d: "連線、帳號、路徑放進 Parameter Context；密碼一律設為 Sensitive", hi: true },
  { Icon: MessageSquare, t: "commit comment 要寫清楚", d: "Registry 沒有 PR 審查，comment 是追查「為什麼改」的唯一線索" },
  { Icon: ShieldCheck, t: "用 Bucket 權限區隔環境", d: "PRD 的 NiFi 只給 Read，從權限上杜絕回推修改" },
  { Icon: HardDrive, t: "Registry 本身也要備份", d: "Git Persistence Provider push 到遠端，中繼資料改用外部資料庫" },
];

function RulesPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "1fr 1fr", gap: 18 }}>
        {RULES.map((r, i) => (
          <div
            key={r.t}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: "20px 24px",
              borderRadius: 16,
              border: r.hi ? `1.5px solid ${V.orange400}` : `1px solid ${c.border}`,
              borderTop: `4px solid ${r.hi ? V.orange400 : c.brand}`,
              background: r.hi ? c.accentSoft : c.slide,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: MONO, fontSize: DS.h2, fontWeight: 800, color: r.hi ? c.accent : c.brand, lineHeight: 1 }}>{String(i + 1).padStart(2, "0")}</span>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: r.hi ? c.slide : c.brandSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <r.Icon size={26} color={r.hi ? c.accent : c.brand} />
              </div>
            </div>
            <span style={{ marginTop: "auto", fontSize: DS.h4, fontWeight: 900, color: c.ink }}>{r.t}</span>
            <span style={{ fontSize: DS.body, lineHeight: 1.55, color: c.body }}>{r.d}</span>
          </div>
        ))}
      </div>
      <Concl c={c}>修改只在一個地方發生、值留在各自的環境、權限守住正式環境</Concl>
    </div>
  );
}

// ── P15 小結 ────────────────────────────────────────────────

function SumBeforeArt({ p }: { p: P }) {
  return (
    <Svg vb={[260, 130]} label="插圖：一份 XML 文件旁邊有鉛筆與問號，代表每次都要手動重做">
      <Doc p={p} x={92} y={16} w={70} h={92} acc={p.gold} hiRow={2} />
      <Pencil p={p} x={190} y={68} s={1} />
      <QMark p={p} x={160} y={22} r={14} />
    </Svg>
  );
}

function SumVersionArt({ p }: { p: P }) {
  return (
    <Svg vb={[260, 130]} label="插圖：伺服器機櫃旁一條直線上的 v1 到 v3 版本">
      <ServerRack p={p} x={24} y={28} w={56} h={86} />
      <line x1={112} y1={70} x2={226} y2={70} style={line(p.lblue, 3)} />
      <Chip x={96} y={60} w={34} text="v1" color={p.lblue} p={p} h={20} size={11} />
      <Chip x={152} y={60} w={34} text="v2" color={p.lblue} p={p} h={20} size={11} />
      <Chip x={208} y={60} w={34} text="v3" color={p.navy} p={p} h={20} size={11} />
    </Svg>
  );
}

function SumEnvArt({ p }: { p: P }) {
  return (
    <Svg vb={[260, 130]} label="插圖：三台相同的螢幕跑著同一份流程，全部掛著綠色打勾">
      <Ground p={p} x={14} y={112} w={232} />
      {[18, 98, 178].map((x, i) => (
        <g key={x}>
          <Monitor p={p} x={x} y={40} w={64} h={52} bar={p.navy}>
            <MiniFlow p={p} x={x + 9} y={62} w={46} color={[p.lblue, p.navy, p.orange][i]} />
          </Monitor>
          <Check p={p} x={x + 60} y={42} r={10} />
        </g>
      ))}
    </Svg>
  );
}

function SummaryPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const points: { art: ReactNode; t: string; d: string; tone: Tone }[] = [
    { art: <SumBeforeArt p={p} />, t: "Template 每次重做", d: "匯出、刪舊、匯入、手改設定，錯誤隨發佈次數累積", tone: t.orange },
    { art: <SumVersionArt p={p} />, t: "Registry 版本一條線", d: "Bucket → Flow → Version，只在 DEV 修改、其他環境拉版本", tone: t.blue },
    { art: <SumEnvArt p={p} />, t: "Parameter Context 分離環境值", d: "同名 Context 加敏感參數，同一份流程安全地跑在每個環境", tone: t.blue },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <SecHead n="一" Icon={Workflow} title="三句話帶走" c={c} />
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 10 }}>
          {points.map((x, i) => (
            <div key={x.t} style={{ display: "contents" }}>
              {i > 0 && <HArrow color={V.blue300} />}
              <Panel c={c} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderTop: `4px solid ${x.tone.fg}` }}>
                <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 14px" }}>{x.art}</div>
                <div style={{ padding: "12px 18px 16px", borderTop: `1px solid ${c.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: DS.h4, fontWeight: 900, color: x.tone.ink }}>{x.t}</span>
                  <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>{x.d}</span>
                </div>
              </Panel>
            </div>
          ))}
        </div>
        <Concl c={c}>流程交給 Registry 管版本，環境差異交給 Parameter Context</Concl>
      </div>
      <div style={{ width: 380, flex: "none", display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
        <SecHead n="二" Icon={Compass} title="下一步" c={c} />
        <FocusCard c={c} art={<MiniRegistry p={p} />} q="已在使用 NiFi 1.x？" answer="直接導入 Registry" note="本篇的版控操作與參數化做法可直接套用" />
        <FocusCard
          c={c}
          art={<MiniVersions p={p} />}
          q="新專案、或準備升級到 NiFi 2.x 之後？"
          answer="評估 Git-based Client"
          note="直接連 GitHub、GitLab、Bitbucket、Azure DevOps；版控觀念完全相通"
          hi
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: DS.small, color: c.muted }}>
          <ArrowRight size={18} color={c.accent} />
          NiFi Registry 已進入棄用流程，預計 NiFi 3.0 移除
        </div>
      </div>
    </div>
  );
}

// ── deck ────────────────────────────────────────────────────

const deck: Deck = {
  slug: "technology-sharing/nifi-registry-intro",
  title: "NiFi Registry 入門",
  eyebrow: "TECH SHARING",
  generatedAt: "2026-09-28",
  source: "technology-sharing/nifi-registry-intro.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "TECH SHARING · APACHE NIFI",
      title: "NiFi Registry 入門",
      subtitle: "從 Template 手動搬流程的痛點出發，認識 NiFi Registry 的 Bucket、Flow、Version 與 Parameter Context，走一遍 DEV → QAS → PRD 的流程開發生命週期。",
      meta: ["2024-01-11 技術主題分享", "Steve", "2026-09-28 整理"],
      agenda: [
        { n: "01", title: "沒有版控時：用 Template 搬流程", sub: "六個步驟與三個痛點" },
        { n: "02", title: "NiFi Registry 是什麼", sub: "架構與 Bucket、Flow、Version" },
        { n: "03", title: "Flow 開發生命週期", sub: "DEV → QAS → PRD 與 Parameter Context" },
        { n: "04", title: "動手設定", sub: "四步驟接上 Registry 與六條規則" },
      ],
    },
    {
      layout: "section",
      nav: "Template 搬流程",
      num: "01",
      eyebrow: "BEFORE VERSION CONTROL",
      title: "沒有版控時：用 Template 搬流程",
      subtitle: "在導入 NiFi Registry 之前，典型的做法是透過 Template 在環境之間轉移流程",
    },
    {
      layout: "custom",
      nav: "六個步驟",
      num: "01",
      eyebrow: "TEMPLATE WORKFLOW",
      title: "用 Template 搬流程要走六個步驟",
      pill: { text: "每發佈一版，六步都要重來", tone: "orange" },
      render: TemplateCyclePage,
    },
    {
      layout: "custom",
      nav: "痛點與解法",
      num: "01",
      eyebrow: "PAIN POINTS",
      title: "三個痛點，對應兩個解法",
      pill: { text: "Registry 管版本，參數管環境差異", tone: "blue" },
      render: PainPage,
    },
    {
      layout: "full-visual",
      nav: "手動動作累積",
      num: "01",
      eyebrow: "TEMPLATE VS REGISTRY",
      title: "手動動作隨發佈次數累積",
      pill: { text: "差距隨發佈次數線性擴大", tone: "orange" },
      viz: NifiRegistryMigrationCompare,
      vizLabel: "@ai-visualize · nifi-registry-migration-compare",
    },
    {
      layout: "section",
      nav: "NiFi Registry",
      num: "02",
      eyebrow: "NIFI REGISTRY",
      title: "NiFi Registry 是什麼",
      subtitle: "一個獨立部署的應用程式，作為 NiFi / MiNiFi 之間共享資源的集中儲存與管理中心",
    },
    {
      layout: "custom",
      nav: "部署架構",
      num: "02",
      eyebrow: "ARCHITECTURE",
      title: "一個 Registry，服務所有環境",
      pill: { text: "版本集中保存，各環境只拉取", tone: "blue" },
      callout: {
        icon: "alert",
        tone: "orange",
        text: "2026 年 2 月社群投票棄用 NiFi Registry，預計 NiFi 3.0 移除；改用 Git-based Flow Registry Client 時觀念相同",
      },
      render: ArchPage,
    },
    {
      layout: "custom",
      nav: "Bucket / Flow / Version",
      num: "02",
      eyebrow: "CORE CONCEPTS",
      title: "Bucket 裝 Flow，Flow 長出版本",
      pill: { text: "沒有 Branch，只有一條主線", tone: "orange" },
      render: ConceptPage,
    },
    {
      layout: "section",
      nav: "開發生命週期",
      num: "03",
      eyebrow: "FLOW DEVELOPMENT LIFE CYCLE",
      title: "Flow 開發生命週期",
      subtitle: "導入 Registry 後，流程開發就和寫程式很像：在 DEV 開發並 commit，QAS 拉版本測試，驗證通過再部署到 PRD",
    },
    {
      layout: "full-visual",
      nav: "DEV → PRD",
      num: "03",
      eyebrow: "WALKTHROUGH",
      title: "從 DEV 走到 PRD 的八個步驟",
      pill: { text: "環境被直接改過，要先還原才能升版", tone: "orange" },
      callout: { icon: "lightbulb", tone: "blue", text: "回滾就是 Change version：每個版本都完整保存在 Registry，不必再找當初的 Template 檔" },
      viz: NifiRegistryFlowLifecycle,
      vizLabel: "@ai-visualize · nifi-registry-flow-lifecycle",
    },
    {
      layout: "custom",
      nav: "Parameter Context",
      num: "03",
      eyebrow: "PARAMETER CONTEXT",
      title: "Parameter Context 把環境差異抽出流程",
      pill: { text: "流程只有一份，值留在各環境", tone: "blue" },
      render: ParamPage,
    },
    {
      layout: "section",
      nav: "動手設定",
      num: "04",
      eyebrow: "HANDS-ON",
      title: "動手設定",
      subtitle: "以一台 NiFi 連接 NiFi Registry 為例，從啟動 Registry 到第一次版控",
    },
    {
      layout: "custom",
      nav: "四個設定步驟",
      num: "04",
      eyebrow: "SETUP",
      title: "四步驟接上 Registry",
      pill: { text: "Registry Client 設好，版控選單就出現", tone: "blue" },
      render: SetupPage,
    },
    {
      layout: "custom",
      nav: "六條規則",
      num: "04",
      eyebrow: "BEST PRACTICES",
      title: "NiFi 版控的六條規則",
      pill: { text: "修改只在 DEV，其他環境只拉版本", tone: "orange" },
      render: RulesPage,
    },
    {
      layout: "custom",
      nav: "小結",
      eyebrow: "SUMMARY",
      title: "小結：流程一份、版本一條、值留在環境",
      pill: { text: "新專案可評估 Git-based Client", tone: "blue" },
      render: SummaryPage,
    },
  ],
};

export default deck;
