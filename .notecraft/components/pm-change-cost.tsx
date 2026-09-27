import { useId, useState, type CSSProperties } from "react";
import { GitBranch, Layers, RotateCcw, Zap } from "lucide-react";

/* trendlink-design 色票（生成元件的 Tailwind class 不會被編譯，直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700
const NAVY_DEEP = "#112f5d"; // --blue-900
const BLUE_50 = "#eef4fb";
const BLUE_100 = "#d6e4f5";
const BLUE_200 = "#adc8e8";
const ORANGE_DEEP = "#e37b24"; // --orange-500
const ORANGE_50 = "#fdf4e6";
const ORANGE_100 = "#fbe7c6";
const ORANGE_700 = "#a04f15";
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";

interface Phase {
  label: string;
  start: number;
  end: number;
}

/* 瀑布五階段在整體進度（0–100%）上的區間 */
const PHASES: Phase[] = [
  { label: "需求", start: 0, end: 15 },
  { label: "設計", start: 15, end: 35 },
  { label: "開發", start: 35, end: 70 },
  { label: "測試", start: 70, end: 90 },
  { label: "上線", start: 90, end: 100 },
];
const SPRINTS = 8;
const SPRINT_LEN = 100 / SPRINTS;

/* 變更成本倍數（示意）：瀑布依 Boehm 常被引用的曲線，在階段邊界取值、之間以對數內插；敏捷近乎持平 */
const WF_KNOTS: [number, number][] = [
  [0, 1],
  [15, 5],
  [35, 10],
  [70, 20],
  [90, 50],
  [100, 100],
];

function wfCost(p: number): number {
  for (let i = 1; i < WF_KNOTS.length; i++) {
    const [x0, y0] = WF_KNOTS[i - 1];
    const [x1, y1] = WF_KNOTS[i];
    if (p <= x1) {
      const t = (p - x0) / (x1 - x0);
      return Math.exp(Math.log(y0) + t * (Math.log(y1) - Math.log(y0)));
    }
  }
  return 100;
}

function agCost(p: number): number {
  return 1 + p / 100;
}

function phaseAt(p: number): number {
  const i = PHASES.findIndex((ph) => p < ph.end);
  return i === -1 ? PHASES.length - 1 : i;
}

function fmt(x: number): string {
  return x < 10 ? x.toFixed(1) : Math.round(x).toString();
}

/* ---------- 圖 ---------- */

const W = 720;
const X0 = 120;
const X1 = 696;
const sx = (p: number) => X0 + ((X1 - X0) * p) / 100;

const WF_Y = 44;
const AG_Y = 110;
const LANE_H = 24;
const CH_TOP = 186;
const CH_BOT = 336;
const H = 372;
const LOG_MAX = Math.log(100);
const sy = (v: number) => CH_BOT - ((CH_BOT - CH_TOP) * Math.log(v)) / LOG_MAX;

function curvePath(f: (p: number) => number): string {
  const pts: string[] = [];
  for (let p = 0; p <= 100; p += 1) pts.push(`${p === 0 ? "M" : "L"}${sx(p).toFixed(1)} ${sy(f(p)).toFixed(1)}`);
  return pts.join(" ");
}

const WF_PATH = curvePath(wfCost);
const AG_PATH = curvePath(agCost);

function Chart({ p, changed }: { p: number; changed: boolean }) {
  const hatch = useId().replace(/:/g, "");
  const cur = phaseAt(p);
  const doneSprints = Math.floor(p / SPRINT_LEN);
  const target = Math.min(doneSprints + (p % SPRINT_LEN === 0 ? 0 : 1), SPRINTS - 1);
  const afterAll = p >= 100;
  const touched = PHASES.filter((ph) => ph.start < p || ph.start === 0);
  const wc = wfCost(p);
  const ac = agCost(p);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`需求變更影響示意。目前專案進度 ${p}%，瀑布位於「${PHASES[cur].label}」階段，變更成本約 ${fmt(wc)} 倍${changed ? `，需回頭重做 ${touched.length} 個階段` : ""}；敏捷已完成 ${doneSprints} 個 Sprint，變更成本約 ${fmt(ac)} 倍${changed ? "，變更排入下一個 Sprint" : ""}。`}
    >
      <defs>
        <pattern id={hatch} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={6} height={6} fill={ORANGE_100} />
          <line x1={0} y1={0} x2={0} y2={6} stroke={ORANGE_DEEP} strokeWidth={1.5} opacity={0.55} />
        </pattern>
      </defs>
      <rect width={W} height={H} rx={10} fill={PANEL} />

      {/* ---- 瀑布泳道 ---- */}
      <text x={16} y={WF_Y - 12} fontSize={11} fontWeight={800} fill={NAVY} fontFamily={FONT} letterSpacing="0.04em">
        WATERFALL
      </text>
      <text x={16} y={WF_Y + 16} fontSize={11.5} fill={MUTED} fontFamily={FONT}>
        五個階段依序走
      </text>
      {PHASES.map((ph) => {
        const x = sx(ph.start);
        const w = sx(ph.end) - x - 2;
        const filled = Math.max(0, Math.min(ph.end, p) - ph.start);
        const redo = changed && touched.includes(ph);
        return (
          <g key={ph.label}>
            <rect x={x} y={WF_Y} width={w} height={LANE_H} rx={3} fill={BLUE_100} />
            <rect x={x} y={WF_Y} width={Math.max(0, sx(ph.start + filled) - x - (filled >= ph.end - ph.start ? 2 : 0))} height={LANE_H} rx={3} fill={NAVY} />
            {redo && <rect x={x} y={WF_Y} width={w} height={LANE_H} rx={3} fill={`url(#${hatch})`} stroke={ORANGE_DEEP} strokeWidth={1.2} />}
            <text x={x + w / 2} y={WF_Y + 16} textAnchor="middle" fontSize={11} fontWeight={700} fill={redo ? ORANGE_700 : filled > (ph.end - ph.start) / 2 ? "#ffffff" : TEXT} fontFamily={FONT}>
              {redo ? `重做${ph.label}` : ph.label}
            </text>
          </g>
        );
      })}

      {/* ---- 敏捷泳道 ---- */}
      <text x={16} y={AG_Y - 12} fontSize={11} fontWeight={800} fill={ORANGE_DEEP} fontFamily={FONT} letterSpacing="0.04em">
        AGILE
      </text>
      <text x={16} y={AG_Y + 16} fontSize={11.5} fill={MUTED} fontFamily={FONT}>
        {SPRINTS} 個 Sprint 迭代
      </text>
      {Array.from({ length: SPRINTS }, (_, i) => {
        const start = i * SPRINT_LEN;
        const x = sx(start);
        const w = sx(start + SPRINT_LEN) - x - 2;
        const filled = Math.max(0, Math.min(start + SPRINT_LEN, p) - start);
        const isTarget = changed && !afterAll && i === target;
        return (
          <g key={i}>
            <rect x={x} y={AG_Y} width={w} height={LANE_H} rx={3} fill={BLUE_100} />
            <rect x={x} y={AG_Y} width={Math.max(0, (w * filled) / SPRINT_LEN)} height={LANE_H} rx={3} fill={NAVY} />
            {isTarget && <rect x={x} y={AG_Y} width={w} height={LANE_H} rx={3} fill={`url(#${hatch})`} stroke={ORANGE_DEEP} strokeWidth={1.2} />}
            <text x={x + w / 2} y={AG_Y + 16} textAnchor="middle" fontSize={11} fontWeight={700} fill={isTarget ? ORANGE_700 : filled > SPRINT_LEN / 2 ? "#ffffff" : TEXT} fontFamily={FONT}>
              {isTarget ? "排入" : `S${i + 1}`}
            </text>
          </g>
        );
      })}
      {changed && afterAll && (
        <text x={X1} y={AG_Y + LANE_H + 14} textAnchor="end" fontSize={10.5} fontWeight={700} fill={ORANGE_700} fontFamily={FONT}>
          排入下一版的第一個 Sprint
        </text>
      )}

      {/* ---- 進度游標 ---- */}
      <line x1={sx(p)} y1={WF_Y - 8} x2={sx(p)} y2={AG_Y + LANE_H + 4} stroke={TEXT} strokeWidth={1.5} />
      <rect x={Math.min(Math.max(sx(p) - 20, X0 - 20), X1 - 40)} y={8} width={40} height={16} rx={3} fill={TEXT} />
      <text x={Math.min(Math.max(sx(p), X0), X1 - 20)} y={19.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#ffffff" fontFamily={FONT} style={{ fontVariantNumeric: "tabular-nums" }}>
        {p}%
      </text>

      {/* ---- 成本曲線 ---- */}
      <line x1={16} y1={CH_TOP - 32} x2={X1} y2={CH_TOP - 32} stroke={GRAY} strokeWidth={1} />
      <text x={16} y={CH_TOP - 12} fontSize={11} fontWeight={800} fill={TEXT} fontFamily={FONT} letterSpacing="0.04em">
        變更成本（倍數，對數刻度）
      </text>
      {[1, 2, 5, 10, 20, 50, 100].map((v) => (
        <g key={v}>
          <line x1={X0} y1={sy(v)} x2={X1} y2={sy(v)} stroke={GRAY_2} strokeWidth={1} />
          <text x={X0 - 8} y={sy(v) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT}>
            {v}x
          </text>
        </g>
      ))}
      {PHASES.map((ph) => (
        <g key={ph.label}>
          <line x1={sx(ph.start)} y1={CH_TOP} x2={sx(ph.start)} y2={CH_BOT} stroke={GRAY_2} strokeWidth={1} strokeDasharray="2 3" />
          <text x={(sx(ph.start) + sx(ph.end)) / 2} y={CH_BOT + 16} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={FONT}>
            {ph.label}
          </text>
        </g>
      ))}
      <text x={X1} y={CH_BOT + 30} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT}>
        變更發生的時點
      </text>
      <path d={WF_PATH} fill="none" stroke={NAVY} strokeWidth={2} />
      <path d={AG_PATH} fill="none" stroke={ORANGE_DEEP} strokeWidth={2} />
      <line x1={sx(p)} y1={CH_TOP} x2={sx(p)} y2={CH_BOT} stroke={TEXT} strokeWidth={1} strokeDasharray="3 3" />
      <circle cx={sx(p)} cy={sy(wc)} r={5} fill="#ffffff" stroke={NAVY} strokeWidth={2} />
      <circle cx={sx(p)} cy={sy(ac)} r={5} fill="#ffffff" stroke={ORANGE_DEEP} strokeWidth={2} />
      <text x={sx(p) + (p > 80 ? -10 : 10)} y={sy(wc) + 4} textAnchor={p > 80 ? "end" : "start"} fontSize={11} fontWeight={800} fill={NAVY} fontFamily={FONT}>
        瀑布 {fmt(wc)}x
      </text>
      <text x={sx(p) + (p > 80 ? -10 : 10)} y={sy(ac) - 8} textAnchor={p > 80 ? "end" : "start"} fontSize={11} fontWeight={800} fill={ORANGE_700} fontFamily={FONT}>
        敏捷 {fmt(ac)}x
      </text>
    </svg>
  );
}

/* ---------- 主元件 ---------- */

const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 14px",
  borderRadius: 8,
  border: "1.5px solid transparent",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 160ms, color 160ms, border-color 160ms",
};

export default function PmChangeCost() {
  const [p, setP] = useState(45);
  const [changed, setChanged] = useState(false);
  const cur = phaseAt(p);
  const touchedCount = PHASES.filter((ph) => ph.start < p || ph.start === 0).length;
  const doneSprints = Math.floor(p / SPRINT_LEN);

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 260px", fontSize: 13, fontWeight: 700, color: TEXT }}>
          專案進度
          <input type="range" min={0} max={100} step={5} value={p} onChange={(e) => setP(Number(e.target.value))} aria-label="專案進度百分比" style={{ flex: 1, accentColor: NAVY }} />
          <span style={{ width: 40, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p}%</span>
        </label>
        <div role="group" aria-label="變更控制" style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            aria-pressed={changed}
            onClick={() => setChanged((c) => !c)}
            style={{ ...btn, background: changed ? ORANGE_50 : ORANGE_DEEP, color: changed ? ORANGE_700 : "#ffffff", borderColor: ORANGE_DEEP }}
          >
            <Zap size={16} /> {changed ? "撤回變更" : "觸發需求變更"}
          </button>
          <button
            type="button"
            onClick={() => {
              setP(45);
              setChanged(false);
            }}
            style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}
          >
            <RotateCcw size={16} /> 重置
          </button>
        </div>
      </div>

      <Chart p={p} changed={changed} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.6, color: TEXT, background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "10px 12px" }}>
          <Layers size={16} style={{ color: NAVY, flexShrink: 0, marginTop: 3 }} />
          <span>
            <strong style={{ color: NAVY_DEEP }}>瀑布 · 位於「{PHASES[cur].label}」，成本約 {fmt(wfCost(p))} 倍</strong>
            <br />
            {changed
              ? touchedCount <= 1
                ? "還在需求階段，改文件就好，代價最小。"
                : `需求一改，前面已凍結的 ${touchedCount} 個階段都要回頭重走：改需求文件、改設計、改已寫好的程式與測試。`
              : "每個階段的產出是下一階段的輸入，越往後，變更要拆掉的東西越多。"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.6, color: TEXT, background: ORANGE_50, border: `1px solid ${ORANGE_100}`, borderRadius: 8, padding: "10px 12px" }}>
          <GitBranch size={16} style={{ color: ORANGE_DEEP, flexShrink: 0, marginTop: 3 }} />
          <span>
            <strong style={{ color: ORANGE_700 }}>敏捷 · 已交付 {doneSprints} 個增量，成本約 {fmt(agCost(p))} 倍</strong>
            <br />
            {changed
              ? `變更進 Backlog，排入${p >= 100 ? "下一版" : "下一個"} Sprint；已交付的 ${doneSprints} 個增量不用重做。`
              : "每個 Sprint 都是一個小循環，變更只影響還沒開始的 Sprint。"}
          </span>
        </div>
      </div>
    </div>
  );
}
