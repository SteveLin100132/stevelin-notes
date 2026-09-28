// 透過 TUS 實現可續傳的檔案上傳 —— 簡報（note-deck）
//
// 版面與內容依 2024/08/20 技術主題分享的原始投影片逐頁對應，改用 trendlink-design：
// 白底、藍（結構）+ 橘（強調、程式碼標註）+ 冷灰；狀態（失敗 / 完成）一律 icon + 文字並行。
// 官方 logo 取自原始投影片，放在 docs/assets/logos/，以 /notes-assets/ 路徑引用。
// 程式碼頁用系統的 <Code>（行號、淡化、左側標籤），終端機指令用 <Terminal>。
// 兩頁 Demo 以動畫示意原本的錄影：只在 live 時播放，縮覽與 reduced motion 停在關鍵畫面。

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import {
  Activity,
  ArrowDown,
  BookOpen,
  CircleCheck,
  CircleHelp,
  CircleX,
  Database,
  File as FileIcon,
  FileText,
  FolderOpen,
  Gauge,
  Layers,
  Link as LinkIcon,
  ListChecks,
  MousePointerClick,
  Network,
  Plus,
  RefreshCw,
  RotateCcw,
  Scissors,
  ShieldCheck,
  Timer,
  TriangleAlert,
  Upload,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CustomSlideProps, Deck } from "@/lib/decks";
import { dkt } from "@/components/deck/theme";
import type { DeckThemeTokens } from "@/components/deck/theme";
import { DGAP, DS, DTRACK } from "@/components/deck/scale";
import { Code, Terminal } from "@/components/deck/blocks";
import type { CodeLabel, TermLine } from "@/components/deck/blocks";
import TusResumeCompare from "@notes/components/tus-resume-compare";
import TusProtocolFlow from "@notes/components/tus-protocol-flow";

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

function tones(c: DeckThemeTokens) {
  return {
    blue: { fg: c.brand, ink: c.brandInk, soft: c.brandSoft, solid: V.blue700, onSolid: V.n0 },
    orange: { fg: c.accent, ink: c.accent, soft: c.accentSoft, solid: V.orange400, onSolid: V.n900 },
  };
}
type Tone = ReturnType<typeof tones>["blue"];

// ── 官方 logo（取自原始投影片）──────────────────────────────────

const LOGO = {
  tus: "/notes-assets/assets/logos/tus-logo.png",
  tusWhite: "/notes-assets/assets/logos/tus-logo-white.png",
  uppy: "/notes-assets/assets/logos/uppy-mark.png",
  angular: "/notes-assets/assets/logos/angular-mark.png",
  node: "/notes-assets/assets/logos/nodejs-logo.jpeg",
  minio: "/notes-assets/assets/logos/minio-mark.png",
};

function TusLogo({ dark, height }: { dark: boolean; height: number }) {
  return <img src={dark ? LOGO.tusWhite : LOGO.tus} alt="tus：Open Protocol for Resumable File Uploads" style={{ height, width: "auto", display: "block" }} />;
}

function UppyLogo({ c, height, tagline = true }: { c: DeckThemeTokens; height: number; tagline?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: height * 0.16 }}>
      <img src={LOGO.uppy} alt="Uppy" style={{ height, width: "auto", display: "block" }} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: height * 0.62, fontWeight: 700, lineHeight: 1, color: c.ink, letterSpacing: "-0.02em" }}>Uppy</span>
        {tagline && <span style={{ fontSize: DS.micro, color: c.muted, marginTop: 6 }}>Sleek, modular open-source JS file uploader</span>}
      </div>
    </div>
  );
}

/** 深色底的 logo 方塊（Node.js、MinIO 原圖是黑底） */
function DarkTile({ src, alt, size, h, fit = "contain" }: { src: string; alt: string; size: number; h?: number; fit?: "contain" | "cover" }) {
  return (
    <div style={{ width: size, height: h ?? size, flex: "none", borderRadius: Math.min(size, h ?? size) * 0.2, background: V.n900, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: fit, display: "block" }} />
    </div>
  );
}

// ── 插圖工具組 ───────────────────────────────────────────────

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

function Svg({ vb, label, children, width = "100%", height }: { vb: [number, number]; label: string; children: ReactNode; width?: string | number; height?: number }) {
  return (
    <svg viewBox={`0 0 ${vb[0]} ${vb[1]}`} width={width} height={height} role="img" aria-label={label} style={{ display: "block", flex: "none" }}>
      {children}
    </svg>
  );
}

/** 文件外框（摺角） */
function Sheet({ p, x, y, w, h }: { p: P; x: number; y: number; w: number; h: number }) {
  const k = Math.min(w, h) * 0.22;
  return (
    <g>
      <path d={`M${x} ${y + 5}a5 5 0 0 1 5-5h${w - k - 5}l${k} ${k}v${h - k - 5}a5 5 0 0 1-5 5h${-(w - 10)}a5 5 0 0 1-5-5z`} style={fs(p.paper, p.ink)} />
      <path d={`M${x + w - k} ${y}v${k * 0.7}a${k * 0.3} ${k * 0.3} 0 0 0 ${k * 0.3} ${k * 0.3}h${k * 0.7}`} style={line(p.ink, 1.5)} />
    </g>
  );
}

/** 影片檔：文件 + 底片框 + 播放鍵 */
function VideoDoc({ p, x, y, w, h }: { p: P; x: number; y: number; w: number; h: number }) {
  const fw = w * 0.62;
  const fh = fw * 0.66;
  const fx = x + (w - fw) / 2;
  const fy = y + h * 0.36;
  const holes = [0, 1, 2, 3, 4];
  return (
    <g>
      <Sheet p={p} x={x} y={y} w={w} h={h} />
      <rect x={fx} y={fy} width={fw} height={fh} rx={4} style={fs(p.sky, p.navy, 2)} />
      {holes.map((i) => (
        <g key={i}>
          <rect x={fx + 5 + i * ((fw - 14) / 4)} y={fy + 3} width={5} height={4} rx={1} style={fill(p.navy)} />
          <rect x={fx + 5 + i * ((fw - 14) / 4)} y={fy + fh - 7} width={5} height={4} rx={1} style={fill(p.navy)} />
        </g>
      ))}
      <path d={`M${fx + fw * 0.42} ${fy + fh * 0.32}v${fh * 0.36}l${fw * 0.22} ${-fh * 0.18}z`} style={fs(p.paper, p.navy, 2)} />
    </g>
  );
}

/** 描述資訊檔：文件 + i 圓章 */
function InfoDoc({ p, x, y, w, h }: { p: P; x: number; y: number; w: number; h: number }) {
  const r = w * 0.2;
  const cx = x + w / 2;
  const cy = y + h * 0.55;
  return (
    <g>
      <Sheet p={p} x={x} y={y} w={w} h={h} />
      <circle cx={cx} cy={cy} r={r} style={fs(p.paper, p.orange, 2)} />
      <path d={`M${cx} ${cy - r * 0.1}v${r * 0.55}`} style={line(p.orange, 2.4)} />
      <circle cx={cx} cy={cy - r * 0.45} r={1.6} style={fill(p.orange)} />
    </g>
  );
}

function Folder({ p, x, y, w }: { p: P; x: number; y: number; w: number }) {
  const h = w * 0.72;
  return (
    <g>
      <path d={`M${x} ${y + 6}a5 5 0 0 1 5-5h${w * 0.3}l6 7h${w * 0.7 - 16}a5 5 0 0 1 5 5v${h - 13}a5 5 0 0 1-5 5h${-(w - 10)}a5 5 0 0 1-5-5z`} style={fs(p.sky2, p.ink)} />
      <rect x={x + 6} y={y + 14} width={w - 12} height={h * 0.3} rx={2} style={fs(p.paper, p.ink, 1)} />
      <path d={`M${x} ${y + h * 0.42}h${w}l-6 ${h * 0.58 - 2}h${-(w - 12)}z`} style={fs(p.lblue, p.ink)} />
    </g>
  );
}

function Db({ p, x, y, w, h, color }: { p: P; x: number; y: number; w: number; h: number; color?: string }) {
  const ry = w * 0.16;
  const col = color ?? p.lblue;
  return (
    <g>
      <path d={`M${x} ${y + ry}v${h - 2 * ry}a${w / 2} ${ry} 0 0 0 ${w} 0v${-(h - 2 * ry)}`} style={fs(col, p.ink)} />
      <path d={`M${x} ${y + h / 2}a${w / 2} ${ry} 0 0 0 ${w} 0`} style={line(p.ink, 1.5)} />
      <ellipse cx={x + w / 2} cy={y + ry} rx={w / 2} ry={ry} style={fs(p.paper, p.ink)} />
    </g>
  );
}

function Rack({ p, x, y, w }: { p: P; x: number; y: number; w: number }) {
  const uh = w * 0.34;
  return (
    <g>
      {[0, 1].map((i) => {
        const yy = y + i * (uh + 10);
        return (
          <g key={i}>
            <rect x={x} y={yy} width={w} height={uh} rx={6} style={fs(p.paper, p.ink)} />
            <circle cx={x + 14} cy={yy + uh / 2} r={4} style={fill(p.green)} />
            <circle cx={x + 26} cy={yy + uh / 2} r={4} style={fill(p.gold)} />
            {[0, 1, 2].map((k) => (
              <rect key={k} x={x + w - 44 + k * 12} y={yy + uh / 2 - 2} width={8} height={4} rx={2} style={fill(p.grey)} />
            ))}
          </g>
        );
      })}
      <line x1={x + w / 2} y1={y + uh} x2={x + w / 2} y2={y + uh + 10} style={line(p.ink, 1.5)} />
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, color, w = 2.5, dash }: { x1: number; y1: number; x2: number; y2: number; color: string; w?: number; dash?: string }) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const dx = (x2 - x1) / len;
  const dy = (y2 - y1) / len;
  const hl = 5 + w * 2.4;
  const hw = 3 + w * 1.4;
  const bx = x2 - dx * hl;
  const by = y2 - dy * hl;
  return (
    <g>
      <path d={`M${x1} ${y1}L${bx} ${by}`} style={line(color, w, dash ? { strokeDasharray: dash } : {})} />
      <polygon points={`${x2},${y2} ${bx - dy * hw},${by + dx * hw} ${bx + dy * hw},${by - dx * hw}`} style={fill(color)} />
    </g>
  );
}

/** 小型水平箭頭（HTML 版面中穿插） */
function HArrow({ color, w = 48, dash }: { color: string; w?: number; dash?: boolean }) {
  return (
    <svg viewBox={`0 0 ${w} 16`} width={w} height={16} aria-hidden="true" style={{ flex: "none", display: "block" }}>
      <path d={`M1 8H${w - 9}`} style={line(color, 2, dash ? { strokeDasharray: "4 4" } : {})} />
      <path d={`M${w - 11} 3L${w - 3} 8 ${w - 11} 13`} style={line(color, 2)} />
    </svg>
  );
}

// ── 版面零件 ─────────────────────────────────────────────────

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

const divider = (c: DeckThemeTokens): CSSProperties => ({ borderLeft: `1px solid ${c.border}`, paddingLeft: 28 });

function Concl({ c, children }: { c: DeckThemeTokens; children: ReactNode }) {
  return (
    <div style={{ flex: "none", background: c.brandSoft, borderLeft: `5px solid ${c.brand}`, padding: "10px 18px", fontSize: DS.body, fontWeight: 700, lineHeight: 1.5, color: c.brandInk }}>
      {children}
    </div>
  );
}

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
      <TriangleAlert size={14} />
      {children}
    </span>
  );
}

function Panel({ c, children, style }: { c: DeckThemeTokens; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ border: `1px solid ${c.border}`, borderRadius: 14, background: c.slide, ...style }}>{children}</div>;
}

/** 編號圓點（與程式碼左側標籤同色：橘） */
function NumDot({ n, tone, size = 30 }: { n: string | number; tone: Tone; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: 999,
        background: tone.solid,
        color: tone.onSolid,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size > 30 ? DS.body : DS.small,
        fontWeight: 900,
        fontFamily: MONO,
      }}
    >
      {n}
    </span>
  );
}

/** 編號 + 外框膠囊標題（對應原投影片的「① 模組導入」） */
function StepTitle({ n, title, tone, c }: { n: string | number; title: string; tone: Tone; c: DeckThemeTokens }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        alignSelf: "flex-start",
        padding: "3px 16px 3px 4px",
        borderRadius: 999,
        border: `1.5px solid ${tone.fg}`,
        background: c.slide,
      }}
    >
      <NumDot n={n} tone={tone} size={26} />
      <span style={{ fontSize: DS.body, fontWeight: 800, color: tone.ink, whiteSpace: "nowrap" }}>{title}</span>
    </div>
  );
}

function Bullets({ c, items, color }: { c: DeckThemeTokens; items: ReactNode[]; color?: string }) {
  return (
    <div role="group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <span style={{ width: 7, height: 7, flex: "none", borderRadius: 999, background: color ?? c.brand, transform: "translateY(-3px)" }} />
          <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>{it}</span>
        </div>
      ))}
    </div>
  );
}

const mono = (c: DeckThemeTokens, strong = false): CSSProperties => ({ fontFamily: MONO, fontSize: "0.92em", fontWeight: strong ? 700 : 500, color: strong ? c.ink : c.body });

function Kbd({ c, children }: { c: DeckThemeTokens; children: ReactNode }) {
  return <code style={{ ...mono(c, true), padding: "1px 6px", borderRadius: 6, background: c.sunken, border: `1px solid ${c.border}` }}>{children}</code>;
}

// ── P2 情境：上傳到 99.99% 斷線 ─────────────────────────────────

function ScenarioPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const stats: { v: string; k: string; tone: Tone }[] = [
    { v: "50 GB", k: "檔案大小", tone: t.blue },
    { v: "1.5 小時", k: "已經花掉的上傳時間", tone: t.blue },
    { v: "0%", k: "按下「重新上傳」後的起點", tone: t.orange },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1.7, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 上傳中 */}
          <div style={{ flex: 1, borderRadius: 16, border: `1px solid ${c.border}`, background: c.slide, boxShadow: c.shadow, padding: "22px 36px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <span style={{ fontSize: DS.h4, fontWeight: 800, color: c.ink }}>檔案上傳中，請稍候…</span>
              <RefreshCw size={24} color={c.brand} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <FileIcon size={44} color={c.ink} strokeWidth={1.5} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 360 }}>
                <span style={{ fontSize: DS.small, color: c.body }}>大小：50 GB，已花費 1 小時 30 分</span>
                <HArrow color={c.brand} w={360} dash />
              </div>
              <FolderOpen size={44} color={c.ink} strokeWidth={1.5} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1, height: 22, borderRadius: 999, background: c.brandSoft, border: `1px solid ${c.border}`, overflow: "hidden" }}>
                <div style={{ width: "99.8%", height: "100%", borderRadius: 999, background: V.blue700 }} />
              </div>
              <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.brandInk, fontFamily: MONO }}>99.99%</span>
            </div>
          </div>
          {/* 錯誤 */}
          <div style={{ flex: 1, borderRadius: 16, border: `1.5px solid ${c.critical}`, background: c.criticalSoft, padding: "20px 36px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CircleX size={34} color={c.critical} />
              <span style={{ fontSize: DS.h3, fontWeight: 900, color: c.critical }}>錯誤</span>
            </div>
            <span style={{ fontSize: DS.body, color: c.ink }}>網路連線發生錯誤，錯誤代碼（E8601224）</span>
            <div role="group" style={{ display: "flex", gap: 28 }}>
              <span style={{ width: 170, padding: "8px 0", textAlign: "center", borderRadius: 10, border: `1.5px solid ${c.critical}`, color: c.critical, fontSize: DS.body, fontWeight: 700, background: c.slide }}>取消</span>
              <span style={{ width: 170, padding: "8px 0", textAlign: "center", borderRadius: 10, background: c.critical, color: V.n0, fontSize: DS.body, fontWeight: 700 }}>重新上傳</span>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14, ...divider(c) }}>
          <SecHead n="一" Icon={Timer} title="這次斷線的代價" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around" }}>
            {stats.map((s) => (
              <div key={s.k} style={{ display: "flex", flexDirection: "column", gap: 2, borderTop: `1px solid ${c.border}`, paddingTop: 12 }}>
                <span style={{ fontSize: DS.h1, fontWeight: 900, lineHeight: 1.05, color: s.tone.fg, fontFamily: MONO, letterSpacing: DTRACK.tight }}>{s.v}</span>
                <span style={{ fontSize: DS.body, color: c.body }}>{s.k}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Concl c={c}>沒有斷點續傳、也沒有分片上傳：網路一中斷，整個上傳被迫終止，使用者只能從頭重新上傳整個檔案。</Concl>
    </div>
  );
}

// ── P4 要克服的問題（五個面向的關鍵字雲）────────────────────────

type Tag = { t: string; w: 1 | 2 | 3 | 4 };
const TAG_SIZE: Record<1 | 2 | 3 | 4, number> = { 1: DS.small, 2: DS.body, 3: DS.h4, 4: DS.h3 };

function ProblemsPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const cols: { Icon: LucideIcon; name: string; problems: string[]; fixes: Tag[] }[] = [
    { Icon: WifiOff, name: "可靠性", problems: ["網路中斷", "單次請求逾時"], fixes: [{ t: "斷點續傳", w: 4 }, { t: "重試機制", w: 2 }, { t: "錯誤處理", w: 2 }] },
    { Icon: Gauge, name: "效能", problems: ["大檔案", "耗費大量時間"], fixes: [{ t: "分片設計", w: 4 }, { t: "併發處理", w: 3 }, { t: "串流處理", w: 1 }] },
    { Icon: ShieldCheck, name: "正確性", problems: ["片段遺失", "順序錯亂"], fixes: [{ t: "檔案完整性檢查", w: 3 }, { t: "合併驗證", w: 2 }] },
    { Icon: Activity, name: "可觀測性", problems: ["缺少日誌", "難以追蹤", "不易排查錯誤"], fixes: [{ t: "進度監控", w: 4 }, { t: "錯誤回報", w: 2 }, { t: "上傳狀態查詢", w: 1 }] },
    { Icon: MousePointerClick, name: "使用體驗", problems: ["失敗只能重來", "看不到進度"], fixes: [{ t: "上傳控制", w: 4 }, { t: "暫停 / 繼續 / 取消", w: 1 }, { t: "進度條", w: 2 }] },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>
        {cols.map((col, i) => (
          <div key={col.name} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16, padding: "0 20px", borderLeft: i ? `1px solid ${c.border}` : undefined }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 999, background: c.brandSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <col.Icon size={22} color={c.brand} />
              </div>
              <span style={{ fontSize: DS.h4, fontWeight: 900, color: c.brandInk }}>{col.name}</span>
            </div>
            <span style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: ".12em", color: c.muted }}>遇到的問題</span>
            <div role="group" style={{ minHeight: 84, display: "flex", flexWrap: "wrap", alignContent: "flex-start", gap: 8 }}>
              {col.problems.map((p) => (
                <span key={p} style={{ padding: "4px 12px", borderRadius: 999, background: c.sunken, border: `1px solid ${c.border}`, fontSize: DS.small, color: c.body }}>
                  {p}
                </span>
              ))}
            </div>
            <ArrowDown size={22} color={c.muted} />
            <span style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: ".12em", color: c.muted }}>需要的機制</span>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly", gap: 6 }}>
              {col.fixes.map((f) => (
                <span key={f.t} style={{ fontSize: TAG_SIZE[f.w], fontWeight: f.w >= 3 ? 900 : 700, lineHeight: 1.2, color: f.w === 4 ? c.brandInk : f.w === 3 ? c.brand : c.body }}>
                  {f.t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Concl c={c}>「重新上傳」只是表面症狀：要讓大檔案上傳可靠、可監控，這五個面向要一起處理。</Concl>
    </div>
  );
}

// ── P5 分片上傳的基本原理 ──────────────────────────────────────

const CHUNKS = [
  { pct: 100, done: true },
  { pct: 25, done: false },
  { pct: 100, done: true, retry: true },
  { pct: 10, done: false },
  { pct: 35, done: false },
  { pct: 8, done: false },
  { pct: 20, done: false },
];
const ROW_H = 50;

function Fan({ p, side }: { p: P; side: "left" | "right" }) {
  const h = ROW_H * CHUNKS.length;
  const w = 90;
  const mid = h / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" style={{ flex: "none", display: "block" }}>
      {CHUNKS.map((_, i) => {
        const y = ROW_H * i + ROW_H / 2;
        const d = side === "left" ? `M0 ${mid}C${w * 0.55} ${mid} ${w * 0.35} ${y} ${w} ${y}` : `M0 ${y}C${w * 0.65} ${y} ${w * 0.45} ${mid} ${w} ${mid}`;
        return <path key={i} d={d} style={line(p.lblue, 1.5, { strokeDasharray: "3 5" })} />;
      })}
      <circle cx={side === "left" ? 3 : w - 3} cy={mid} r={4} style={fill(p.navy)} />
    </svg>
  );
}

function ChunkPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const steps: { Icon: LucideIcon; t: string; d: string }[] = [
    { Icon: Scissors, t: "檔案切割成 Chunks", d: "把大檔案切成多個小片段，大小從數 MB 到數十 MB 不等。" },
    { Icon: Gauge, t: "監控上傳進度", d: "追蹤每個 Chunk 的進度，彙總成整體進度條或百分比。" },
    { Icon: Layers, t: "上傳控制", d: "每個 Chunk 單獨上傳，並以多條併發連線同時傳送。" },
    { Icon: Database, t: "合併 Chunks", d: "所有 Chunk 都抵達後，伺服器合併回原始檔案。" },
    { Icon: RotateCcw, t: "錯誤處理", d: "失敗的 Chunk 單獨重試，多次失敗才停止上傳。" },
  ];
  const fileCol = (sub: string) => (
    <div style={{ width: 200, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <Svg vb={[140, 170]} width={140} label={`插圖：100 GB 影片檔（${sub}）`}>
        <VideoDoc p={p} x={24} y={14} w={92} h={128} />
      </Svg>
      <span style={{ fontSize: DS.body, fontWeight: 900, color: c.ink }}>Video file</span>
      <span style={{ fontSize: DS.body, fontWeight: 700, color: c.ink, fontFamily: MONO }}>100 GB</span>
      <span style={{ fontSize: DS.small, color: c.muted, whiteSpace: "nowrap" }}>{sub}</span>
    </div>
  );
  const tag = (text: string) => <span style={{ fontSize: DS.micro, fontWeight: 800, letterSpacing: ".14em", color: c.brand }}>{text}</span>;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {fileCol("Source：User Upload")}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {tag("SPLIT")}
          <Fan p={p} side="left" />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
            {tag("SEND CHUNKS")}
            {tag("每個 Chunk 各自上傳")}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {CHUNKS.map((ch, i) => (
              <div key={i} style={{ height: ROW_H, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 70, fontSize: DS.micro, fontFamily: MONO, color: c.muted }}>Chunk {i + 1}</span>
                <div style={{ flex: 1, height: 18, borderRadius: 999, background: c.sunken, border: `1px solid ${c.border}`, overflow: "hidden" }}>
                  <div style={{ width: `${ch.pct}%`, height: "100%", borderRadius: 999, background: ch.retry ? V.orange400 : V.blue700 }} />
                </div>
                <span style={{ width: 118, display: "flex", alignItems: "center", gap: 6, fontSize: DS.small, fontWeight: 700, fontFamily: MONO, color: ch.retry ? c.accent : c.ink }}>
                  {ch.pct}%{ch.retry && (<><RotateCcw size={16} /><span style={{ fontFamily: "inherit", fontSize: DS.micro }}>重試</span></>)}
                </span>
                <span style={{ width: 30, display: "flex", justifyContent: "center" }}>
                  {ch.done ? <CircleCheck size={24} color={c.good} /> : <span style={{ width: 20, height: 20, borderRadius: 999, border: `1.5px dashed ${c.muted}` }} />}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 4px" }}>{tag("RECEIVE CHUNKS")}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {tag("CONCATENATE")}
          <Fan p={p} side="right" />
        </div>
        {fileCol("Destination：Storage")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20 }}>
        {steps.map((s, i) => {
          const tone = i === 4 ? t.orange : t.blue;
          return (
            <div key={s.t} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `3px solid ${tone.fg}`, paddingTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <s.Icon size={20} color={tone.fg} />
                <span style={{ fontSize: DS.body, fontWeight: 900, color: c.ink, whiteSpace: "nowrap" }}>{s.t}</span>
              </div>
              <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>{s.d}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── P6 自己實作的難處 → TUS 與 Uppy ─────────────────────────────

function SolutionPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const row = (tone: Tone, k: string, v: ReactNode) => (
    <div key={k} style={{ display: "flex", alignItems: "center", gap: 20, padding: "10px 0", borderTop: `1px solid ${c.border}` }}>
      <span style={{ width: 230, flex: "none", padding: "8px 0", textAlign: "center", borderRadius: 10, border: `1.5px solid ${tone.fg}`, background: tone.soft, fontSize: DS.body, fontWeight: 800, color: tone.ink }}>{k}</span>
      <span style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>{v}</span>
    </div>
  );
  const hi = (s: string) => <strong style={{ color: c.brandInk }}>{s}</strong>;
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1.45, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-evenly" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SecHead n="一" Icon={TriangleAlert} title="自己實作會碰到的困難點" c={c} note="涉及系統設計與效能優化" />
          <div>
            {row(t.orange, "Chunk 切割與合併", "如何有效率地切割大檔案，並在全部上傳完成後正確合併、做完整性檢查。")}
            {row(t.orange, "併發上傳與連線管理", "同時處理多個 Chunk 的併發上傳，又要控制連線數，避免伺服器過載。")}
            {row(t.orange, "進度監控與反饋", "即時追蹤每個 Chunk 的進度並回饋給使用者，可能還要引入 WebSocket。")}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SecHead n="二" Icon={ListChecks} title="解法：TUS 與 Uppy" c={c} note="通用問題不必每個專案重新發明" />
          <div>
            {row(t.blue, "TUS · 斷點續傳協議", <>針對{hi("大檔案")}與不穩定網路設計的上傳協議，網路中斷後能{hi("從斷點恢復上傳")}。</>)}
            {row(t.blue, "Uppy · 檔案上傳模組", <>提供拖放選檔、檔案管理、進度顯示等 UI，{hi("簡化並強化上傳體驗")}，內建 TUS 外掛。</>)}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column", marginTop: 22, padding: "34px 28px 24px", border: `1.5px dashed ${V.blue300}`, borderRadius: 18 }}>
        <span style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 26px", borderRadius: 999, background: V.blue700, color: V.n0, fontSize: DS.body, fontWeight: 800, whiteSpace: "nowrap" }}>
          <Upload size={18} /> 檔案上傳實踐
        </span>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "stretch", gap: 12 }}>
          <div style={{ flex: 1, borderRadius: 14, border: `1px solid ${c.border}`, background: c.slide, boxShadow: c.shadow, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <TusLogo dark={dark} height={120} />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Plus size={40} color={c.accent} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, borderRadius: 14, border: `1px solid ${c.border}`, background: c.slide, boxShadow: c.shadow, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <UppyLogo c={c} height={92} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── P8 四個 HTTP 方法 ─────────────────────────────────────────

function MiniResume({ p }: { p: P }) {
  return (
    <Svg vb={[120, 80]} width={96} label="小圖：一份掛著 URL 的上傳，伺服器記得已收到的位置">
      <Rack p={p} x={10} y={14} w={60} />
      <rect x={76} y={30} width={38} height={10} rx={5} style={fill(p.grey)} />
      <rect x={76} y={30} width={24} height={10} rx={5} style={fill(p.navy)} />
      <line x1={100} y1={24} x2={100} y2={46} style={line(p.orange, 2.5)} />
    </Svg>
  );
}

function MethodsPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const p = ilPalette(dark);
  const methods: { m: string; use: string; head: string; ok: string }[] = [
    { m: "OPTIONS", use: "探測版本與擴充（選用）", head: "Tus-Version · Tus-Extension", ok: "204" },
    { m: "POST", use: "建立上傳，取得專屬 URL", head: "Upload-Length · Upload-Metadata", ok: "201 + Location" },
    { m: "HEAD", use: "查詢目前的 offset", head: "Upload-Offset · Cache-Control", ok: "200" },
    { m: "PATCH", use: "從 offset 寫入一段資料", head: "Upload-Offset · Content-Type", ok: "204 + 新 offset" },
  ];
  const codes: { k: string; v: string }[] = [
    { k: "409", v: "offset 不一致，先 HEAD" },
    { k: "404", v: "找不到這筆上傳" },
    { k: "410", v: "已過期或已刪除" },
    { k: "412", v: "協議版本不支援" },
    { k: "415", v: "Content-Type 錯誤" },
    { k: "460", v: "checksum 驗證失敗" },
  ];
  const grid = "150px 1.05fr 1.35fr 0.8fr";
  const th = (s: string) => <span style={{ fontSize: DS.micro, fontWeight: 700, letterSpacing: ".1em", color: c.muted }}>{s}</span>;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <SecHead n="一" Icon={Network} title="核心流程" c={c} note="除了 OPTIONS，每個請求都帶 Tus-Resumable: 1.0.0" />
          <div style={{ display: "grid", gridTemplateColumns: grid, gap: 16, padding: "4px 0" }}>
            {th("方法")}
            {th("用途")}
            {th("關鍵標頭")}
            {th("成功回應")}
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateRows: "repeat(4, 1fr)", borderBottom: `1px solid ${c.border}` }}>
            {methods.map((r) => {
              const key = r.m === "HEAD" || r.m === "PATCH";
              return (
                <div key={r.m} style={{ display: "grid", gridTemplateColumns: grid, gap: 16, alignItems: "center", borderTop: `1px solid ${c.border}` }}>
                  <span style={{ justifySelf: "start", padding: "5px 14px", borderRadius: 8, background: key ? V.orange400 : V.blue700, color: key ? V.n900 : V.n0, fontFamily: MONO, fontSize: DS.body, fontWeight: 800 }}>{r.m}</span>
                  <span style={{ fontSize: DS.body, fontWeight: 700, color: c.ink }}>{r.use}</span>
                  <span style={{ fontFamily: MONO, fontSize: DS.small, color: c.body }}>{r.head}</span>
                  <span style={{ fontFamily: MONO, fontSize: DS.small, fontWeight: 700, color: c.good }}>{r.ok}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ width: 330, flex: "none", display: "flex", flexDirection: "column", gap: 12, ...divider(c) }}>
          <SecHead n="二" Icon={TriangleAlert} title="常見狀態碼" c={c} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {codes.map((s) => (
              <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 0", borderTop: `1px solid ${c.border}` }}>
                <span style={{ width: 52, fontFamily: MONO, fontSize: DS.h4, fontWeight: 900, color: s.k === "409" ? c.accent : c.brandInk }}>{s.k}</span>
                <span style={{ fontSize: DS.small, color: c.body }}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Panel c={c} style={{ flex: "none", display: "flex", alignItems: "center", gap: 20, padding: "10px 22px" }}>
        <MiniResume p={p} />
        <div style={{ flex: 1, borderLeft: `1px solid ${c.border}`, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: DS.body, fontWeight: 900, color: c.brandInk }}>核心觀念：一筆上傳一個 URL，伺服器記得收到幾個位元組</span>
          <span style={{ fontSize: DS.small, lineHeight: 1.6, color: c.body }}>斷線後用戶端不必猜：先用 HEAD 問伺服器的 offset，再用 PATCH 從那裡接著傳；offset 對不上時伺服器回 409，避免資料錯位。</span>
        </div>
      </Panel>
    </div>
  );
}

// ── P10 一次上傳，兩份資料 ─────────────────────────────────────

const META_JSON = `{
  "id": "test/1373d49c80f36de265be8b494ff391a9",
  "size": 539335594,
  "offset": 0,
  "metadata": {
    "relativePath": "null",
    "name": "selectdb-x2doris-1.0.4_2.12-bin.tar.gz",
    "type": "application/gzip",
    "filetype": "application/gzip",
    "filename": "selectdb-x2doris-1.0.4_2.12-bin.tar.gz"
  },
  "creation_date": "2024-08-16T14:45:59.366Z"
}`;

function MetadataFlow({ c, p, dark }: { c: DeckThemeTokens; p: P; dark: boolean }) {
  const box = (children: ReactNode, style?: CSSProperties) => (
    <div style={{ height: "100%", borderRadius: 14, border: `1.5px dashed ${c.border}`, background: c.slide, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, ...style }}>{children}</div>
  );
  const out = (tone: "blue" | "orange", n: string, text: string, art: ReactNode) => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, padding: "8px 16px", borderRadius: 12, border: `1.5px ${tone === "orange" ? "solid" : "dashed"} ${tone === "orange" ? V.orange400 : c.border}`, background: tone === "orange" ? c.accentSoft : c.slide }}>
      <NumDot n={n} tone={tones(c)[tone]} size={26} />
      <span style={{ flex: 1, fontSize: DS.small, fontWeight: 800, color: c.ink }}>{text}</span>
      {art}
    </div>
  );
  return (
    <div style={{ height: 216, flex: "none", display: "flex", alignItems: "stretch", gap: 12 }}>
      <div style={{ width: 160, flex: "none" }}>
        {box(
          <>
            <span style={{ fontSize: DS.small, fontWeight: 800, color: c.muted }}>Client</span>
            <Svg vb={[80, 100]} width={62} label="插圖：原始影片檔">
              <VideoDoc p={p} x={8} y={4} w={64} h={90} />
            </Svg>
            <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink }}>Source File</span>
          </>,
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.brand }}>Drag & Drop</span>
        <HArrow color={c.brand} w={70} />
      </div>
      <div style={{ width: 300, flex: "none" }}>
        {box(
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src={LOGO.uppy} alt="Uppy" style={{ height: 44 }} />
              <span style={{ fontSize: DS.h4, fontWeight: 800, color: c.ink }}>Uppy</span>
            </div>
            <div style={{ alignSelf: "stretch", flex: 1, borderRadius: 10, border: `1px dashed ${c.border}`, background: c.sunken, display: "flex", alignItems: "center", justifyContent: "center", fontSize: DS.small, color: c.body }}>
              Drop files here or&nbsp;<span style={{ color: c.brand, textDecoration: "underline" }}>browse files</span>
            </div>
          </>,
          { justifyContent: "flex-start" },
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.brand }}>TUS</span>
        <HArrow color={c.brand} w={60} />
      </div>
      <div style={{ width: 230, flex: "none" }}>
        {box(
          <>
            <TusLogo dark={dark} height={46} />
            <Svg vb={[120, 90]} width={110} label="插圖：TUS Server 機架">
              <Rack p={p} x={6} y={6} w={108} />
            </Svg>
            <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink }}>TUS Server</span>
          </>,
        )}
      </div>
      <Svg vb={[60, 216]} width={60} height={216} label="分岔：一次上傳拆成兩份資料">
        <circle cx={6} cy={108} r={5} style={fill(p.navy)} />
        <path d="M6 108C34 108 26 56 58 56" style={line(p.orange, 2)} />
        <path d="M6 108C34 108 26 160 58 160" style={line(p.navy, 2)} />
      </Svg>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {out(
          "orange",
          "2",
          "Store Metadata",
          <Svg vb={[130, 60]} width={120} label="插圖：資訊文件存進資料庫">
            <InfoDoc p={p} x={4} y={4} w={40} h={52} />
            <Arrow x1={50} y1={30} x2={82} y2={30} color={p.orange} w={2} />
            <Db p={p} x={88} y={6} w={38} h={48} />
          </Svg>,
        )}
        {out(
          "blue",
          "1",
          "Store File",
          <Svg vb={[130, 60]} width={120} label="插圖：影片檔存進資料夾">
            <VideoDoc p={p} x={4} y={4} w={40} h={52} />
            <Arrow x1={50} y1={30} x2={80} y2={30} color={p.navy} w={2} />
            <Folder p={p} x={84} y={10} w={42} />
          </Svg>,
        )}
      </div>
    </div>
  );
}

function MetadataPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const fields: { k: string; v: string }[] = [
    { k: "id", v: "檔案的唯一識別碼" },
    { k: "size", v: "檔案總大小（位元組）" },
    { k: "offset", v: "已上傳的偏移量，初始為 0" },
    { k: "metadata", v: "原始檔名、檔案類型、相對路徑" },
    { k: "creation_date", v: "建立上傳的日期與時間" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <MetadataFlow c={c} p={p} dark={dark} />
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <StepTitle n="1" title="檔案拆成兩份" tone={t.blue} c={c} />
          <span style={{ fontSize: DS.small, lineHeight: 1.6, color: c.body }}>伺服器把一次上傳拆成原始檔案與 metadata 分開保存，對檔案提供額外的描述資訊，管理更有彈性。</span>
          <StepTitle n="2" title="Metadata 欄位" tone={t.orange} c={c} />
          <div>
            {fields.map((f) => (
              <div key={f.k} style={{ display: "flex", alignItems: "center", gap: 14, padding: "5px 0", borderTop: `1px solid ${c.border}` }}>
                <span style={{ width: 150, flex: "none", fontFamily: MONO, fontSize: DS.small, fontWeight: 700, color: f.k === "offset" ? c.accent : c.ink }}>{f.k}</span>
                <span style={{ fontSize: DS.small, color: c.body }}>{f.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: 720, flex: "none", display: "flex", flexDirection: "column" }}>
          <Code dark={dark} lines={META_JSON} lang="json" fileName="test/1373d49c80f36de265be8b494ff391a9.json" size="xs" style={{ flex: "none" }} />
        </div>
      </div>
    </div>
  );
}

// ── P12 / P18 環境與套件 ──────────────────────────────────────

interface EnvConfig {
  intro: string;
  logo: (dark: boolean, c: DeckThemeTokens) => ReactNode;
  items: { title: string; body: ReactNode }[];
  badges: [string, string][];
  pkgs: { title: string; cmd: string }[];
}

function EnvCard({ n, c, tone, title, children }: { n: string; c: DeckThemeTokens; tone: Tone; title: string; children: ReactNode }) {
  return (
    <div style={{ position: "relative", borderRadius: 14, border: `1.5px solid ${tone.fg}`, background: c.slide, padding: "14px 22px 16px 34px", display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ position: "absolute", left: -17, top: -12 }}>
        <NumDot n={n} tone={tone} size={34} />
      </span>
      <span style={{ fontSize: DS.body, fontWeight: 800, color: tone.ink, textAlign: "center" }}>{title}</span>
      {children}
    </div>
  );
}

function makeEnvPage(cfg: EnvConfig) {
  return function EnvPage({ dark }: CustomSlideProps) {
    const c = dkt(dark);
    const t = tones(c);
    return (
      <div style={{ height: "100%", display: "flex", gap: 40 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <span style={{ fontSize: DS.body, lineHeight: 1.7, color: c.body }}>{cfg.intro}</span>
          {cfg.items.map((it, i) => (
            <div key={it.title} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `1px solid ${c.border}`, paddingTop: 16 }}>
              <StepTitle n={i + 1} title={it.title} tone={i === 0 ? t.blue : t.orange} c={c} />
              <span style={{ fontSize: DS.small, lineHeight: 1.65, color: c.body }}>{it.body}</span>
            </div>
          ))}
        </div>
        <div style={{ width: 600, flex: "none", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 18, paddingLeft: 20 }}>
          <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>{cfg.logo(dark, c)}</div>
          <EnvCard n="1" c={c} tone={t.blue} title="Requirement">
            <div style={{ display: "flex", justifyContent: "space-around", gap: 16 }}>
              {cfg.badges.map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: DS.body, fontWeight: 700, color: c.ink }}>{k}</span>
                  <span style={{ padding: "4px 18px", borderRadius: 8, background: V.blue700, color: V.n0, fontFamily: MONO, fontSize: DS.small, fontWeight: 800 }}>Ver {v}</span>
                </div>
              ))}
            </div>
          </EnvCard>
          {cfg.pkgs.map((pk, i) => (
            <EnvCard key={pk.title} n={String(i + 2)} c={c} tone={t.orange} title={pk.title}>
              <Terminal dark={dark} lines={[{ text: pk.cmd, kind: "cmd" } as TermLine]} compact style={{ flex: "none" }} />
            </EnvCard>
          ))}
        </div>
      </div>
    );
  };
}

const NodeEnvPage = makeEnvPage({
  intro: "在 Node.js 中使用 TUS 協議，需要設置一個 TUS Server 來處理斷點續傳請求。以下是相關的環境與所需套件：",
  logo: (dark) => <TusLogo dark={dark} height={112} />,
  items: [
    { title: "Requirement", body: "建議使用 Node.js 16.0 以上的版本；可搭配 Express.js、Koa、Fastify、Next.js 等 Web Server 框架。" },
    { title: "Server Package", body: "從 1.0.0 開始，套件拆分並改在 @tus 下發布；舊的 tus-node-server 只會收到安全修補，請改用新套件。" },
    { title: "Storage Package", body: "依儲存方式選擇：本機檔案系統用 @tus/file-store，S3 相容儲存（AWS S3、MinIO）用 @tus/s3-store。" },
  ],
  badges: [
    ["Node.js", "16.0 +"],
    ["npm", "7.0 +"],
  ],
  pkgs: [
    { title: "TUS Server Package", cmd: "npm install @tus/server" },
    { title: "TUS Storage Package", cmd: "npm install @tus/file-store @tus/s3-store" },
  ],
});

const AngularEnvPage = makeEnvPage({
  intro: "利用 Uppy 與 Angular，可以快速打造功能完整的檔案上傳元件。以下是在 Angular 專案中安裝相關套件的步驟：",
  logo: (_dark, c) => <UppyLogo c={c} height={100} />,
  items: [
    { title: "Requirement", body: "最低版本要求為 Angular 12；最新版 Uppy 建議使用 Angular 16.0 以上，確保最佳效能與功能支援。" },
    { title: "Angular Uppy Package", body: "Uppy 官方的 Angular 整合套件，把 Dashboard 等元件包成 Angular 元件，內建拖放上傳、進度顯示、多檔選擇。" },
    { title: "Uppy TUS Package", body: "專門支援 TUS 協議的 Uppy 外掛，讓 Uppy 把檔案上傳到支援 TUS 協議的伺服器。" },
  ],
  badges: [
    ["Node.js", "16.0 +"],
    ["Angular", "16.0 +"],
  ],
  pkgs: [
    { title: "Angular Uppy Package", cmd: "npm install @uppy/core @uppy/angular" },
    { title: "Uppy TUS Package", cmd: "npm install @uppy/tus" },
  ],
});

// ── P13–P16 Node.js 程式碼走查 ─────────────────────────────────

const SERVER_TS = `import { FileStore } from '@tus/file-store';
import { S3Store } from '@tus/s3-store';
import { Server } from '@tus/server';
import * as crypto from 'crypto';
import * as https from 'https';

// 只在自簽憑證的開發環境使用
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// 方式一：本機檔案系統
const fileStore = new FileStore({ directory: './temp' });

// 方式二：S3 相容儲存（MinIO）
const s3Store = new S3Store({
  partSize: 8 * 1024 * 1024,
  s3ClientConfig: {
    region: 'us-west-2',
    requestHandler: { httpsAgent },
    forcePathStyle: true,
    bucket: 'your-bucket',
    endpoint: 'https://minio.example.com/',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  },
});
const datastore = s3Store; // 或 fileStore
const port = Number(process.env.PORT ?? 3000);

const server = new Server({
  path: '/files',
  datastore,
  namingFunction: async (_req, metadata) => {
    const id = crypto.randomBytes(16).toString('hex');
    return \`test/\${id}\`;
  },
  generateUrl: (_req, { proto, host, path, id }) => {
    id = Buffer.from(id, 'utf-8').toString('base64url');
    return \`\${proto}://\${host}\${path}/\${id}\`;
  },
  getFileIdFromRequest: (req) => {
    const match = /([^/]+)\\/?$/.exec(req.url as string);
    if (!match) return;
    return Buffer.from(match[1], 'base64url').toString('utf-8');
  },
  onIncomingRequest: async (req) => {
    const token = req.headers.authorization;
    if (token !== 'Bearer testing.token') {
      throw { status_code: 401, body: 'Unauthorized' };
    }
  },
});

server.listen({ port });`.split("\n");

const slice = (src: string[], from: number, to: number) => src.slice(from - 1, to).join("\n");

interface Step {
  n: string;
  title: string;
  body: ReactNode;
}

function CodeWalk({
  dark,
  intro,
  steps,
  code,
}: {
  dark: boolean;
  intro: string;
  steps: Step[];
  code: { lines: string; startLine: number; fileName: string; highlight: (number | [number, number])[]; labels: CodeLabel[] };
}) {
  const c = dkt(dark);
  const t = tones(c);
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ fontSize: DS.body, lineHeight: 1.65, color: c.body }}>{intro}</span>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly", gap: 12 }}>
          {steps.map((s) => (
            <div key={s.n} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <StepTitle n={s.n} title={s.title} tone={t.orange} c={c} />
              <div style={{ fontSize: DS.small, lineHeight: 1.6, color: c.body }}>{s.body}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: 860, flex: "none", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Code dark={dark} lines={code.lines} startLine={code.startLine} fileName={code.fileName} lang="ts" highlight={code.highlight} labels={code.labels} labelWidth={84} style={{ flex: "none" }} />
      </div>
    </div>
  );
}

const WALK_INTRO = "設置一個簡單的 TUS Server 接收檔案上傳，同時示範本機檔案與 MinIO 兩種儲存方式：";

function FileStorePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const pc = (good: boolean, k: string, v: string) => (
    <div key={k} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "4px 0" }}>
      <span style={{ width: 7, height: 7, flex: "none", borderRadius: 999, background: good ? t.blue.fg : t.orange.fg, transform: "translateY(-3px)" }} />
      <span style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>
        <strong style={{ color: good ? c.brandInk : c.accent }}>{k}</strong>　{v}
      </span>
    </div>
  );
  return (
    <CodeWalk
      dark={dark}
      intro={WALK_INTRO}
      steps={[
        {
          n: "1",
          title: "模組導入",
          body: <Bullets c={c} items={[<><Kbd c={c}>FileStore</Kbd>、<Kbd c={c}>S3Store</Kbd>：兩種不同儲存方式的驅動</>, <><Kbd c={c}>Server</Kbd>：TUS 協議伺服器的核心模組</>]} />,
        },
        {
          n: "2",
          title: "檔案系統存儲宣告",
          body: (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span>建立 FileStore，把檔案直接存到本機的 <Kbd c={c}>./temp</Kbd> 目錄，是最基本的選項。</span>
              {pc(true, "易於使用", "設定簡單，適合小型應用或開發環境")}
              {pc(true, "輕量", "部署與執行成本低")}
              {pc(false, "擴展性有限", "不適合多台伺服器水平擴展")}
              {pc(false, "備份與還原", "需要額外措施避免資料遺失")}
            </div>
          ),
        },
      ]}
      code={{
        lines: slice(SERVER_TS, 1, 12),
        startLine: 1,
        fileName: "server.ts",
        highlight: [[1, 3], 11],
        labels: [
          { text: "1", lines: [1, 3], tone: "orange" },
          { text: "2", lines: [11, 11], tone: "orange" },
        ],
      }}
    />
  );
}

function S3StorePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const rows: [string, string][] = [
    ["partSize", "每個分片 8 MB"],
    ["region", "S3 服務所在區域"],
    ["forcePathStyle", "路徑樣式 URL，連 MinIO 要開"],
    ["bucket", "儲存桶名稱"],
    ["endpoint", "MinIO 伺服器的端點 URL"],
    ["credentials", "存取金鑰，從環境變數讀取"],
  ];
  return (
    <CodeWalk
      dark={dark}
      intro={WALK_INTRO}
      steps={[
        {
          n: "3",
          title: "S3 存儲宣告",
          body: (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span>S3Store 把檔案存到相容 S3 的物件儲存，例如 AWS S3 或 MinIO。</span>
              <div>
                {rows.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 14, padding: "5px 0", borderTop: `1px solid ${c.border}` }}>
                    <span style={{ width: 150, flex: "none", fontFamily: MONO, fontWeight: 700, color: c.ink }}>{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              <Note c={c}>rejectUnauthorized: false 只用在自簽憑證的開發環境</Note>
            </div>
          ),
        },
      ]}
      code={{
        lines: slice(SERVER_TS, 13, 27),
        startLine: 13,
        fileName: "server.ts",
        highlight: [14, 15, 19, 20, 21, [22, 25]],
        labels: [{ text: "3", lines: [14, 27], tone: "orange" }],
      }}
    />
  );
}

function ServerConfigPage1({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  return (
    <CodeWalk
      dark={dark}
      intro={WALK_INTRO}
      steps={[
        { n: "4", title: "TUS Server 配置", body: <Bullets c={c} items={[<><Kbd c={c}>path</Kbd>：TUS API 的路徑，例如 localhost:3000/files</>, <><Kbd c={c}>datastore</Kbd>：前面宣告的儲存元件</>]} /> },
        { n: "5", title: "檔名命名方法", body: <>以 16 位元組的隨機十六進位字串當 ID，前綴 <Kbd c={c}>test/</Kbd> 作為 MinIO 中的資料夾；參數 metadata 可取得原始檔名、類型與大小。</> },
        { n: "6", title: "生成上傳 URL", body: <>ID 含有 <Kbd c={c}>/</Kbd>，先以 base64url 編碼再放進 URL，例如 <span style={{ fontFamily: MONO, color: c.brand }}>…/files/dGVzdC85MTQ2…</span></> },
      ]}
      code={{
        lines: slice(SERVER_TS, 28, 41),
        startLine: 28,
        fileName: "server.ts",
        highlight: [32, 33, 35, 36, 39, 40],
        labels: [
          { text: "4", lines: [31, 33], tone: "orange" },
          { text: "5", lines: [34, 37], tone: "orange" },
          { text: "6", lines: [38, 41], tone: "orange" },
        ],
      }}
    />
  );
}

function ServerConfigPage2({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  return (
    <CodeWalk
      dark={dark}
      intro={WALK_INTRO}
      steps={[
        { n: "7", title: "提取檔案 ID", body: <>從請求 URL 的最後一段取出編碼過的 ID，再解碼回 <Kbd c={c}>test/&lt;id&gt;</Kbd>；與 generateUrl 成對改寫。</> },
        { n: "8", title: "處理上傳請求", body: <>每個請求進來時都會呼叫，適合實作身分驗證：檢查 <Kbd c={c}>Authorization</Kbd> 的 Bearer token，實務上可換成 JWT。</> },
        { n: "9", title: "Server 監聽端口", body: "啟動伺服器並監聽指定的 port。" },
      ]}
      code={{
        lines: slice(SERVER_TS, 42, 55),
        startLine: 42,
        fileName: "server.ts",
        highlight: [43, 45, 48, 49, 50, 55],
        labels: [
          { text: "7", lines: [42, 46], tone: "orange" },
          { text: "8", lines: [47, 52], tone: "orange" },
          { text: "9", lines: [55, 55], tone: "orange" },
        ],
      }}
    />
  );
}

// ── P19 Angular 三個檔案 ───────────────────────────────────────

const MODULE_TS = `import { UppyAngularDashboardModule } from '@uppy/angular';
@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule, UppyAngularDashboardModule],
  bootstrap: [AppComponent],
})
export class AppModule {}`;

const COMPONENT_TS = `import { Uppy } from '@uppy/core';
import Tus from '@uppy/tus';
@Component({ /* ... */ })
export class AppComponent {
  public uppy: Uppy = new Uppy({ debug: true, autoProceed: false }).use(Tus, {
    endpoint: 'http://localhost:3000/files/',
    onBeforeRequest: async (req) => {
      const token = 'testing.token';
      req.setHeader('Authorization', \`Bearer \${token}\`);
    },
  });
}`;

function AngularCodePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const steps: Step[] = [
    { n: "1", title: "模組導入", body: <>匯入 <Kbd c={c}>UppyAngularDashboardModule</Kbd>，模板才能使用 Uppy Dashboard。</> },
    { n: "2", title: "實例化 Uppy", body: <><Kbd c={c}>new Uppy()</Kbd> 建立上傳核心；<Kbd c={c}>autoProceed: false</Kbd> 由使用者按下上傳。</> },
    { n: "3", title: "使用 TUS 協議", body: <><Kbd c={c}>.use(Tus)</Kbd> 啟用外掛，<Kbd c={c}>endpoint</Kbd> 對應 Server 的 path。</> },
    { n: "4", title: "請求前執行動作", body: <><Kbd c={c}>onBeforeRequest</Kbd> 補上 Authorization 標頭，對應伺服器的身分驗證。</> },
  ];
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10 }}>
        {steps.map((s) => (
          <div key={s.n} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <StepTitle n={s.n} title={s.title} tone={t.orange} c={c} />
            <div style={{ fontSize: DS.small, lineHeight: 1.55, color: c.body }}>{s.body}</div>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <StepTitle n="5" title="建立上傳元件" tone={t.orange} c={c} />
          <Code dark={dark} lines={`<uppy-dashboard [uppy]="uppy"></uppy-dashboard>`} fileName="app.component.html" lang="html" size="xs" style={{ flex: "none" }} />
        </div>
      </div>
      <div style={{ width: 900, flex: "none", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}>
        <Code
          dark={dark}
          lines={MODULE_TS}
          fileName="app.module.ts"
          lang="ts"
          size="xs"
          highlight={[1, 4]}
          labels={[
            { text: "1", lines: [1, 1], tone: "orange" },
            { text: "1", lines: [4, 4], tone: "orange" },
          ]}
          labelWidth={64}
          style={{ flex: "none" }}
        />
        <Code
          dark={dark}
          lines={COMPONENT_TS}
          fileName="app.component.ts"
          lang="ts"
          size="xs"
          highlight={[5, 6, [7, 10]]}
          labels={[
            { text: "2", lines: [1, 2], tone: "orange" },
            { text: "3", lines: [5, 6], tone: "orange" },
            { text: "4", lines: [7, 10], tone: "orange" },
          ]}
          labelWidth={64}
          style={{ flex: "none" }}
        />
      </div>
    </div>
  );
}

// ── Demo 動畫共用 ─────────────────────────────────────────────

function useClock(active: boolean, period: number, still: number) {
  const reduce = useReducedMotion();
  const [t, setT] = useState(still);
  useEffect(() => {
    if (!active || reduce) {
      setT(still);
      return;
    }
    const start = performance.now();
    setT(0);
    const id = window.setInterval(() => setT(((performance.now() - start) / 1000) % period), 100);
    return () => window.clearInterval(id);
  }, [active, reduce, period, still]);
  return t;
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const mb = (b: number) => `${(b / 1024 / 1024).toFixed(0)} MB`;

function Callout({ c, text }: { c: DeckThemeTokens; text: string }) {
  return (
    <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 14px", borderRadius: 8, border: `1.5px solid ${c.brand}`, background: c.brandSoft, fontSize: DS.small, fontWeight: 800, color: c.brandInk }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: c.brand }} />
      {text}
    </span>
  );
}

function ProgressBar({ c, pct, state }: { c: DeckThemeTokens; pct: number; state: "run" | "pause" | "done" }) {
  const col = state === "pause" ? V.orange400 : state === "done" ? "var(--success-500)" : V.blue700;
  return (
    <div style={{ height: 10, borderRadius: 999, background: c.sunken, border: `1px solid ${c.border}`, overflow: "hidden" }}>
      <div style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 999, background: col, transition: "width 100ms linear" }} />
    </div>
  );
}

function FileRow({ c, name, size, pct, state, note }: { c: DeckThemeTokens; name: string; size: string; pct: number; state: "run" | "pause" | "done"; note: string }) {
  const Icon = state === "done" ? CircleCheck : state === "pause" ? WifiOff : Upload;
  const col = state === "done" ? c.good : state === "pause" ? c.accent : c.brand;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderRadius: 10, background: c.slide, border: `1px solid ${c.border}` }}>
      <FileText size={30} color={c.muted} style={{ flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: DS.small, fontWeight: 700, color: c.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
          <span style={{ fontSize: DS.micro, fontFamily: MONO, color: c.muted, flex: "none" }}>{size}</span>
        </div>
        <ProgressBar c={c} pct={pct} state={state} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: DS.micro, fontWeight: 700, color: col }}>
          <Icon size={14} />
          <span>{note}</span>
          <span style={{ marginLeft: "auto", fontFamily: MONO }}>{Math.floor(pct * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

function UppyShell({ c, children, footer }: { c: DeckThemeTokens; children: ReactNode; footer: string }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", borderRadius: 14, border: `1px solid ${c.border}`, background: c.slide, overflow: "hidden", boxShadow: c.shadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${c.border}`, background: c.slide }}>
        <img src={LOGO.uppy} alt="Uppy" style={{ height: 26 }} />
        <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink }}>Uppy Dashboard</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
      <div style={{ padding: "8px 16px", borderTop: `1px solid ${c.border}`, fontSize: DS.micro, color: c.muted, textAlign: "center" }}>{footer}</div>
    </div>
  );
}

function PhaseStrip({ c, phases, cur }: { c: DeckThemeTokens; phases: { Icon: LucideIcon; t: string; warn?: boolean }[]; cur: number }) {
  return (
    <div role="group" style={{ flex: "none", display: "flex", alignItems: "center", gap: 8 }}>
      {phases.map((ph, i) => {
        const on = i === cur;
        const past = i < cur;
        const col = ph.warn ? c.accent : c.brand;
        return (
          <div key={ph.t} style={{ display: "contents" }}>
            {i > 0 && <HArrow color={past || on ? col : c.border} w={28} />}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 14px",
                borderRadius: 10,
                border: on ? `1.5px solid ${col}` : `1px solid ${c.border}`,
                background: on ? (ph.warn ? c.accentSoft : c.brandSoft) : c.slide,
                opacity: past || on ? 1 : 0.55,
              }}
            >
              <ph.Icon size={18} color={col} />
              <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink, whiteSpace: "nowrap" }}>{ph.t}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── P20 Demo：檔案續傳 ────────────────────────────────────────

const DEMO_FILE = "selectdb-x2doris-1.0.4_2.12-bin.tar.gz";
const DEMO_SIZE = 539335594;
const DEMO_URL = "/files/dGVzdC8xMzczZDQ5…";
const BREAK_AT = 0.45;

function resumeProgress(t: number) {
  if (t < 1) return 0;
  if (t < 5) return ((t - 1) / 4) * BREAK_AT;
  if (t < 8.5) return BREAK_AT;
  if (t < 12) return BREAK_AT + ((t - 8.5) / 3.5) * (1 - BREAK_AT);
  return 1;
}

function resumePhase(t: number) {
  if (t < 5) return 0;
  if (t < 8) return 1;
  if (t < 8.5) return 2;
  if (t < 12) return 3;
  return 4;
}

function DemoResumePage({ dark, live }: CustomSlideProps) {
  const c = dkt(dark);
  const p = ilPalette(dark);
  const t = useClock(live, 14, 6.5);
  const pct = resumeProgress(t);
  const ph = resumePhase(t);
  const offsetAtBreak = Math.round(DEMO_SIZE * BREAK_AT);
  const logs: { at: number; line: TermLine }[] = [
    { at: 0, line: { text: "npm run start", kind: "cmd" } },
    { at: 0, line: { text: "[SERVER] Server run at 3000", kind: "dim" } },
    { at: 0.8, line: { text: "POST /files → 201 Created", kind: "out" } },
    { at: 1.2, line: { text: `PATCH ${DEMO_URL}  Upload-Offset: 0`, kind: "out" } },
    { at: 5, line: { text: "連線中斷：請求沒有完成", kind: "prompt" } },
    { at: 8, line: { text: `HEAD ${DEMO_URL} → Upload-Offset: ${offsetAtBreak}`, kind: "out" } },
    { at: 8.5, line: { text: `PATCH ${DEMO_URL}  Upload-Offset: ${offsetAtBreak}`, kind: "out" } },
    { at: 12, line: { text: `204 No Content  Upload-Offset: ${DEMO_SIZE}（完成）`, kind: "choice" } },
  ];
  // 終端機框高固定，只留最近 6 行（像真的終端機往上捲）
  const shown = logs
    .filter((l) => t >= l.at)
    .map((l) => l.line)
    .slice(-6);
  const state: "run" | "pause" | "done" = ph === 1 || ph === 2 ? "pause" : ph === 4 ? "done" : "run";
  const note = ["上傳中", "網路中斷，等待重新連線", "查詢伺服器的 offset", `從 ${mb(offsetAtBreak)} 接著上傳`, "上傳完成"][ph];
  const written = Math.round(DEMO_SIZE * pct);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <Callout c={c} text="Uppy Uploader" />
          <UppyShell c={c} footer="Powered by Uppy · @uppy/tus">
            <FileRow c={c} name={DEMO_FILE} size={mb(DEMO_SIZE)} pct={pct} state={state} note={note} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Svg vb={[260, 150]} width={300} label="插圖：瀏覽器把檔案經由網路線送往伺服器，斷線時線段中斷">
                <VideoDoc p={p} x={24} y={36} w={62} h={84} />
                <Rack p={p} x={170} y={52} w={72} />
                {state === "pause" ? (
                  <g>
                    <path d="M92 78H118" style={line(p.orange, 3)} />
                    <path d="M142 78H164" style={line(p.orange, 3)} />
                    <path d="M124 70l12 16M136 70l-12 16" style={line(p.orange, 3)} />
                  </g>
                ) : (
                  <Arrow x1={92} y1={78} x2={164} y2={78} color={state === "done" ? p.green : p.navy} w={3} dash="6 6" />
                )}
              </Svg>
            </div>
          </UppyShell>
        </div>
        <div style={{ flex: 1.15, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <Callout c={c} text="TUS Server" />
          <div style={{ height: 262, flex: "none", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <Terminal dark={dark} lines={shown} title="tus-server" />
          </div>
          <Callout c={c} text="File Storage：./temp/test/" />
          <div style={{ flex: 1, minHeight: 0, borderRadius: 14, border: `1px solid ${c.border}`, background: c.slide, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", padding: "8px 16px", background: c.sunken, fontSize: DS.micro, fontWeight: 700, color: c.muted }}>
              <span>名稱</span>
              <span style={{ textAlign: "right" }}>大小</span>
            </div>
            {t >= 0.8 ? (
              <>
                {[
                  { Icon: FileIcon, n: "1373d49c80f36de265be8b494ff391a9", s: mb(written), hi: state === "run" },
                  { Icon: FileText, n: "1373d49c80f36de265be8b494ff391a9.json", s: "1 KB", hi: false },
                ].map((r) => (
                  <div key={r.n} style={{ display: "grid", gridTemplateColumns: "1fr 150px", alignItems: "center", padding: "10px 16px", borderTop: `1px solid ${c.border}` }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: DS.small, color: c.ink }}>
                      <r.Icon size={20} color={c.brand} />
                      {r.n}
                    </span>
                    <span style={{ textAlign: "right", fontFamily: MONO, fontSize: DS.small, fontWeight: 700, color: r.hi ? c.brand : c.body }}>{r.s}</span>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ padding: 16, fontSize: DS.small, color: c.muted }}>這個資料夾是空的。</div>
            )}
          </div>
        </div>
      </div>
      <PhaseStrip
        c={c}
        cur={ph}
        phases={[
          { Icon: Upload, t: "PATCH 上傳" },
          { Icon: WifiOff, t: "網路中斷", warn: true },
          { Icon: RefreshCw, t: "HEAD 查 offset" },
          { Icon: RotateCcw, t: "從 offset 續傳" },
          { Icon: CircleCheck, t: "完成" },
        ]}
      />
    </div>
  );
}

// ── P21 Demo：上傳到 MinIO ────────────────────────────────────

const MINIO_FILES = [
  { name: "product-demo.mp4", size: 1288490188, id: "4f2a9c81d07e5b3a6c19e2f08d7b4a55", start: 0.5, end: 5 },
  { name: "sensor-logs.parquet", size: 671088640, id: "a93d17e6c4b2085f1e7a6d3c9b40f218", start: 0.5, end: 7.5 },
  { name: "db-backup.tar.gz", size: 2576980377, id: "0c6e8b3f5a21d94e7b8c0a16f3d52e97", start: 0.5, end: 10 },
];
const PART = 8 * 1024 * 1024;

function DemoMinioPage({ dark, live }: CustomSlideProps) {
  const c = dkt(dark);
  const p = ilPalette(dark);
  const t = useClock(live, 12.5, 6);
  const rows = MINIO_FILES.map((f) => ({ ...f, pct: clamp((t - f.start) / (f.end - f.start)) }));
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 20, alignItems: "stretch" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <Callout c={c} text="Uppy Uploader" />
          <UppyShell c={c} footer="3 個檔案同時上傳 · 每個檔案一筆 TUS 上傳">
            {rows.map((r) => (
              <FileRow key={r.id} c={c} name={r.name} size={mb(r.size)} pct={r.pct} state={r.pct >= 1 ? "done" : "run"} note={r.pct >= 1 ? "上傳完成" : "上傳中"} />
            ))}
          </UppyShell>
        </div>
        <div style={{ width: 200, flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          <Callout c={c} text="TUS Server" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <TusLogo dark={dark} height={40} />
            <Svg vb={[200, 110]} width={200} label="插圖：TUS Server 接收 PATCH，轉成 S3 分片寫入 MinIO">
              <Arrow x1={2} y1={30} x2={60} y2={30} color={p.navy} w={2.5} />
              <Rack p={p} x={64} y={10} w={72} />
              <Arrow x1={140} y1={30} x2={198} y2={30} color={p.orange} w={2.5} dash="5 5" />
            </Svg>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
              <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.brand }}>TUS PATCH</span>
              <span style={{ fontSize: DS.micro, fontWeight: 700, color: c.accent }}>S3 multipart · 8 MB</span>
            </div>
          </div>
        </div>
        <div style={{ flex: 1.2, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <Callout c={c} text="MinIO Console" />
          <div style={{ flex: 1, minHeight: 0, borderRadius: 14, border: `1px solid ${c.border}`, background: c.slide, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: c.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${c.border}` }}>
              <DarkTile src={LOGO.minio} alt="MinIO" size={30} />
              <span style={{ fontSize: DS.small, fontWeight: 800, color: c.ink }}>your-bucket</span>
              <span style={{ fontSize: DS.small, fontFamily: MONO, color: c.muted }}>/ test /</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", padding: "6px 16px", background: c.sunken, fontSize: DS.micro, fontWeight: 700, color: c.muted }}>
              <span>物件</span>
              <span style={{ textAlign: "right" }}>大小 / 狀態</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {rows
                .filter((r) => r.pct > 0)
                .flatMap((r) => {
                  const done = r.pct >= 1;
                  const parts = Math.ceil(r.size / PART);
                  const up = Math.floor(parts * r.pct);
                  return [
                    { key: r.id, Icon: done ? FileIcon : Layers, n: r.id, s: done ? mb(r.size) : `${up} / ${parts} parts`, run: !done },
                    ...(done ? [{ key: `${r.id}.info`, Icon: FileText, n: `${r.id}.info`, s: "1 KB", run: false }] : []),
                  ];
                })
                .map((o) => (
                  <div key={o.key} style={{ display: "grid", gridTemplateColumns: "1fr 120px", alignItems: "center", padding: "8px 16px", borderTop: `1px solid ${c.border}` }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: DS.micro, color: c.ink, overflow: "hidden", whiteSpace: "nowrap" }}>
                      <o.Icon size={18} color={o.run ? c.accent : c.brand} style={{ flex: "none" }} />
                      {o.n}
                    </span>
                    <span style={{ textAlign: "right", fontFamily: MONO, fontSize: DS.micro, fontWeight: 700, color: o.run ? c.accent : c.body }}>{o.s}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
      <Concl c={c}>每個檔案在 bucket 裡都有兩個物件：檔案本體與保存 metadata 的 .info；上傳過程中以 8 MB 分片寫入。</Concl>
    </div>
  );
}

// ── P22 系統全貌 ──────────────────────────────────────────────

function ArchCard({ c, head, tone, logo, title, lines }: { c: DeckThemeTokens; head: string; tone: Tone; logo: ReactNode; title: string; lines: string[] }) {
  return (
    <div style={{ position: "relative", flex: 1, borderRadius: 14, border: `1.5px solid ${tone.fg}`, background: c.slide, padding: "26px 20px 14px", display: "flex", alignItems: "center", gap: 18 }}>
      <span style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", padding: "2px 16px", background: c.slide, fontSize: DS.body, fontWeight: 900, color: c.ink, whiteSpace: "nowrap" }}>{head}</span>
      <div style={{ width: 108, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {logo}
        <span style={{ fontSize: DS.body, fontWeight: 800, color: c.ink }}>{title}</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {lines.map((l) => (
          <span key={l} style={{ fontSize: DS.small, lineHeight: 1.5, color: c.body }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function Link2({ c, text, tone }: { c: DeckThemeTokens; text: string; tone: Tone }) {
  return (
    <div style={{ height: 44, flex: "none", display: "flex", alignItems: "center", gap: 10, paddingLeft: 54 }}>
      <span style={{ width: 0, height: "100%", borderLeft: `2px dashed ${tone.fg}` }} />
      <span style={{ padding: "2px 14px", borderRadius: 999, border: `1.5px solid ${tone.fg}`, background: tone.soft, fontSize: DS.micro, fontWeight: 800, color: tone.ink }}>{text}</span>
    </div>
  );
}

function ArchitecturePage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const t = tones(c);
  const p = ilPalette(dark);
  const between = (label: string, art: ReactNode) => (
    <div style={{ width: 150, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
      {art}
      <span style={{ fontSize: DS.small, fontWeight: 700, color: c.body, textAlign: "center" }}>{label}</span>
      <HArrow color={c.accent} w={130} dash />
    </div>
  );
  const col = (children: ReactNode) => <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>{children}</div>;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", paddingTop: 14 }}>
        {col(
          <>
            <ArchCard c={c} head="Client" tone={t.blue} logo={<img src={LOGO.angular} alt="Angular" style={{ height: 70 }} />} title="Angular" lines={["作為前端 UI 框架", "構建動態的單頁應用程式"]} />
            <Link2 c={c} text="Plugin" tone={t.blue} />
            <ArchCard c={c} head="File Uploader" tone={t.blue} logo={<img src={LOGO.uppy} alt="Uppy" style={{ height: 70 }} />} title="Uppy" lines={["#1 支援檔案拖放", "#2 上傳進度狀態", "#3 自動恢復上傳"]} />
          </>,
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {between(
            "Files",
            <Svg vb={[60, 70]} width={46} label="插圖：影片檔">
              <VideoDoc p={p} x={6} y={2} w={48} h={64} />
            </Svg>,
          )}
          <div style={{ flex: 1 }} />
        </div>
        {col(
          <>
            <ArchCard c={c} head="Server" tone={t.orange} logo={<DarkTile src={LOGO.node} alt="Node.js" size={108} h={60} fit="cover" />} title="Node.js" lines={["作為後端 Server 框架", "可搭配 LoopBack / Express.js"]} />
            <Link2 c={c} text="綁定協議" tone={t.orange} />
            <ArchCard c={c} head="Protocol" tone={t.orange} logo={<TusLogo dark={dark} height={44} />} title="TUS" lines={["#1 檔案分片傳輸", "#2 回傳上傳狀態", "#3 中斷續傳機制"]} />
          </>,
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {between(
            "Metadata & Files",
            <Svg vb={[110, 70]} width={84} label="插圖：資訊文件與檔案">
              <InfoDoc p={p} x={4} y={2} w={46} h={64} />
              <VideoDoc p={p} x={58} y={2} w={46} h={64} />
            </Svg>,
          )}
          <div style={{ flex: 1 }} />
        </div>
        {col(
          <>
            <ArchCard c={c} head="Storage" tone={t.blue} logo={<DarkTile src={LOGO.minio} alt="MinIO" size={70} />} title="MinIO" lines={["分散式的物件儲存系統", "完全相容 Amazon S3"]} />
            <Link2 c={c} text="保存檔案" tone={t.blue} />
            <ArchCard
              c={c}
              head="Bucket"
              tone={t.blue}
              logo={
                <Svg vb={[70, 70]} width={62} label="插圖：儲存桶">
                  <Db p={p} x={8} y={6} w={54} h={58} />
                </Svg>
              }
              title="Bucket"
              lines={["#1 保存 metadata", "#2 保存檔案本體"]}
            />
          </>,
        )}
      </div>
      <Concl c={c}>TUS、Uppy 與 MinIO 組合起來，就是一套能處理大檔案、支援斷點續傳、並存進分散式物件儲存的上傳系統。</Concl>
    </div>
  );
}

// ── P23 小結 ──────────────────────────────────────────────────

function SummaryPage({ dark }: CustomSlideProps) {
  const c = dkt(dark);
  const items: { k: string; t: string; d: string }[] = [
    { k: "01", t: "痛點", d: "大檔案上傳一旦斷線就從頭來；網路越不穩、檔案越大，越可能永遠傳不完。" },
    { k: "02", t: "原理", d: "切片上傳、記錄 offset，斷線後從 offset 接續，失敗只重傳一小段。" },
    { k: "03", t: "TUS", d: "把原理標準化成 HTTP 協議：POST 建立、HEAD 查進度、PATCH 寫資料，offset 以伺服器為準。" },
    { k: "04", t: "實作", d: "伺服器用 @tus/server 搭 FileStore 或 S3Store；前端用 Uppy 的 TUS 外掛，就有完整上傳 UI 與自動續傳。" },
  ];
  const refs = ["tus.io：Resumable file uploads", "TUS 協議規格 1.0.x", "tus-node-server（@tus/server）", "uppy.io"];
  return (
    <div style={{ height: "100%", display: "flex", gap: 28 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {items.map((it) => (
          <div key={it.k} style={{ display: "flex", alignItems: "center", gap: 28, padding: "18px 0", borderTop: `1px solid ${c.border}` }}>
            <span style={{ width: 80, fontFamily: MONO, fontSize: DS.h2, fontWeight: 900, color: it.k === "03" ? c.accent : c.brand }}>{it.k}</span>
            <span style={{ width: 90, fontSize: DS.h4, fontWeight: 900, color: c.ink }}>{it.t}</span>
            <span style={{ flex: 1, fontSize: DS.body, lineHeight: 1.6, color: c.body }}>{it.d}</span>
          </div>
        ))}
      </div>
      <div style={{ width: 380, flex: "none", display: "flex", flexDirection: "column", gap: 16, ...divider(c) }}>
        <SecHead n="一" Icon={BookOpen} title="參考資料" c={c} />
        <div>
          {refs.map((r) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${c.border}` }}>
              <LinkIcon size={18} color={c.brand} />
              <span style={{ fontSize: DS.small, color: c.body }}>{r}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, borderRadius: 16, background: "var(--gradient-header)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <CircleHelp size={44} color={V.n0} />
          <span style={{ fontSize: DS.h2, fontWeight: 900, color: V.n0, letterSpacing: DTRACK.tight }}>Q & A</span>
          <span style={{ fontSize: DS.small, color: "rgba(255,255,255,0.72)" }}>Thank you for listening</span>
        </div>
      </div>
    </div>
  );
}

// ── deck ────────────────────────────────────────────────────

const deck: Deck = {
  slug: "technology-sharing/tus-resumable-upload",
  title: "透過 TUS 實現可續傳的檔案上傳",
  eyebrow: "TECH SHARING",
  generatedAt: "2026-09-28",
  source: "technology-sharing/tus-resumable-upload.mdx",
  slides: [
    {
      layout: "cover",
      nav: "封面",
      eyebrow: "TECH SHARING · TUS",
      title: "透過 TUS 實現可續傳的檔案上傳",
      subtitle: "斷線無法避免，差別在於要不要從 0 重來：TUS 把「記住 offset、從斷點接著傳」標準化，搭配 Uppy 與 MinIO 組成一套可靠的上傳系統。",
      meta: ["2024/08/20 技術主題分享", "技術分享筆記", "2026-09-28 整理"],
      agenda: [
        { n: "01", title: "TUS 是什麼", sub: "可續傳上傳的 HTTP 開放協議" },
        { n: "02", title: "實作一：Node.js 架設 TUS Server", sub: "@tus/server + FileStore / S3Store" },
        { n: "03", title: "實作二：Angular 用 Uppy 打造上傳元件", sub: "@uppy/angular + @uppy/tus" },
      ],
    },
    {
      layout: "custom",
      nav: "情境",
      eyebrow: "SCENARIO",
      title: "情境：上傳到 99.99% 斷線",
      pill: { text: "沒有續傳，斷線就從 0% 重來", tone: "orange" },
      render: ScenarioPage,
    },
    {
      layout: "full-visual",
      nav: "兩種上傳結果",
      eyebrow: "SIMULATION",
      title: "同一條網路，兩種上傳結果",
      pill: { text: "網路撐不過一次上傳，就永遠傳不完", tone: "orange" },
      viz: TusResumeCompare,
      vizLabel: "@ai-visualize · tus-resume-compare",
    },
    {
      layout: "custom",
      nav: "要克服的問題",
      eyebrow: "CHALLENGES",
      title: "避免重來，要克服的不只是斷線",
      pill: { text: "五個面向要一起處理", tone: "blue" },
      render: ProblemsPage,
    },
    {
      layout: "custom",
      nav: "分片上傳原理",
      eyebrow: "CHUNKED UPLOAD",
      title: "如何實踐高可靠、可監控的大檔案上傳",
      pill: { text: "化整為零，失敗只重傳一片", tone: "blue" },
      render: ChunkPage,
    },
    {
      layout: "custom",
      nav: "TUS 與 Uppy",
      eyebrow: "BUILD OR ADOPT",
      title: "自己實作的難處，交給 TUS 與 Uppy",
      pill: { text: "通用問題不必重新發明", tone: "blue" },
      render: SolutionPage,
    },
    {
      layout: "section",
      nav: "TUS 是什麼",
      num: "01",
      eyebrow: "WHAT IS TUS",
      title: "TUS 是什麼",
      subtitle: "建立在 HTTP 之上的可續傳檔案上傳開放協議，網路再不穩，都能從中斷的地方接著傳",
    },
    {
      layout: "custom",
      nav: "四個 HTTP 方法",
      num: "01",
      eyebrow: "CORE PROTOCOL",
      title: "四個 HTTP 方法撐起整個協議",
      pill: { text: "offset 以伺服器為準", tone: "blue" },
      render: MethodsPage,
    },
    {
      layout: "full-visual",
      nav: "請求往來",
      num: "01",
      eyebrow: "WALKTHROUGH",
      title: "逐步看請求往來與 offset 變化",
      pill: { text: "斷線後先 HEAD，再 PATCH", tone: "blue" },
      viz: TusProtocolFlow,
      vizLabel: "@ai-visualize · tus-protocol-flow",
    },
    {
      layout: "custom",
      nav: "檔案與 Metadata",
      num: "01",
      eyebrow: "FILE METADATA",
      title: "一次上傳，兩份資料：檔案與 Metadata",
      pill: { text: "檔案與描述資訊分開保存", tone: "blue" },
      render: MetadataPage,
    },
    {
      layout: "section",
      nav: "Node.js TUS Server",
      num: "02",
      eyebrow: "SERVER",
      title: "實作一：Node.js 架設 TUS Server",
      subtitle: "官方 Node.js 實作 @tus/server，可以單獨啟動，也能掛在 Express、Koa、Fastify、Next.js 上",
    },
    {
      layout: "custom",
      nav: "Node.js 環境與套件",
      num: "02",
      eyebrow: "SETUP",
      title: "如何在 Node.js 使用 TUS 協議",
      pill: { text: "一個核心套件，加一個儲存驅動", tone: "blue" },
      render: NodeEnvPage,
    },
    {
      layout: "custom",
      nav: "FileStore",
      num: "02",
      eyebrow: "DATASTORE",
      title: "儲存方式一：FileStore 存到本機",
      pill: { text: "設定簡單，但綁在單一台機器", tone: "orange" },
      render: FileStorePage,
    },
    {
      layout: "custom",
      nav: "S3Store",
      num: "02",
      eyebrow: "DATASTORE",
      title: "儲存方式二：S3Store 接上 MinIO",
      pill: { text: "伺服器無狀態，才能水平擴展", tone: "blue" },
      render: S3StorePage,
    },
    {
      layout: "custom",
      nav: "Server 設定（一）",
      num: "02",
      eyebrow: "SERVER OPTIONS",
      title: "Server 設定：路徑、命名與上傳 URL",
      pill: { text: "ID 含 /，所以要 base64url 編碼", tone: "blue" },
      render: ServerConfigPage1,
    },
    {
      layout: "custom",
      nav: "Server 設定（二）",
      num: "02",
      eyebrow: "SERVER OPTIONS",
      title: "Server 設定：解析 ID、驗證身分與啟動",
      pill: { text: "generateUrl 與 getFileIdFromRequest 成對改寫", tone: "orange" },
      footnotes: [{ n: "*", text: "依分享當時的 @tus/server 1.x 寫法，新版 API 有調整。" }],
      render: ServerConfigPage2,
    },
    {
      layout: "section",
      nav: "Angular Uppy",
      num: "03",
      eyebrow: "CLIENT",
      title: "實作二：Angular 用 Uppy 打造上傳元件",
      subtitle: "Uppy 提供拖放選檔、檔案清單、進度顯示等完整 UI，並有官方的 TUS 外掛",
    },
    {
      layout: "custom",
      nav: "Angular 環境與套件",
      num: "03",
      eyebrow: "SETUP",
      title: "如何在 Angular 快速打造上傳元件",
      pill: { text: "兩個套件就能接上 TUS", tone: "blue" },
      render: AngularEnvPage,
    },
    {
      layout: "custom",
      nav: "三個檔案",
      num: "03",
      eyebrow: "UPPY UPLOADER",
      title: "三個檔案接上 TUS Server",
      pill: { text: "endpoint 對應 Server 的 path", tone: "blue" },
      render: AngularCodePage,
    },
    {
      layout: "custom",
      nav: "Demo：檔案續傳",
      num: "03",
      eyebrow: "DEMO",
      title: "檔案續傳 Demo",
      pill: { text: "斷線後從 offset 接著傳", tone: "orange" },
      render: DemoResumePage,
    },
    {
      layout: "custom",
      nav: "Demo：上傳 MinIO",
      num: "03",
      eyebrow: "DEMO",
      title: "檔案上傳 MinIO Demo",
      pill: { text: "每個檔案都有一份 .info", tone: "blue" },
      render: DemoMinioPage,
    },
    {
      layout: "custom",
      nav: "系統全貌",
      num: "03",
      eyebrow: "ARCHITECTURE",
      title: "系統全貌：TUS + Uppy + MinIO",
      pill: { text: "三層各司其職", tone: "blue" },
      render: ArchitecturePage,
    },
    {
      layout: "custom",
      nav: "小結",
      eyebrow: "SUMMARY",
      title: "小結：從斷點續傳到一套上傳系統",
      pill: { text: "offset 是續傳的關鍵", tone: "orange" },
      render: SummaryPage,
    },
  ],
};

export default deck;
