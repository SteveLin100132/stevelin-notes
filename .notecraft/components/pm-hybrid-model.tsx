import { useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { Building2, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Users, Zap } from "lucide-react";

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
const SUCCESS = "#2e9e6b";
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";

interface Milestone {
  id: string;
  label: string;
  first: number; // 起始 Sprint（1-indexed）
  last: number; // 結束 Sprint
}

const MILESTONES: Milestone[] = [
  { id: "M1", label: "範疇定義", first: 1, last: 1 },
  { id: "M2", label: "設計凍結", first: 2, last: 3 },
  { id: "M3", label: "開發完成", first: 4, last: 6 },
  { id: "M4", label: "交付上線", first: 7, last: 7 },
];
const SPRINTS = 7;
const LOOP = ["規劃", "開發", "審查", "回顧"];

/* ---------- 圖 ---------- */

const W = 720;
const X0 = 70;
const X1 = 700;
const COL = (X1 - X0) / SPRINTS;
const cx = (s: number) => X0 + COL * (s - 0.5); // 第 s 個 Sprint 的中心
const TOP_Y = 58;
const BOT_Y = 196;
const R = 22;
const H = 262;

function arcPath(r: number): string {
  // 約 300 度的圓弧，留一個缺口放箭頭
  const a0 = (-80 * Math.PI) / 180;
  const a1 = (220 * Math.PI) / 180;
  const p = (a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  return `M${p(a0)} A${r} ${r} 0 1 1 ${p(a1)}`;
}

function Diagram({ done, changes, reduce }: { done: number; changes: Record<number, number>; reduce: boolean }) {
  const current = done < SPRINTS ? done + 1 : 0;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`混搭模型：外層 4 個里程碑（剛性），內層 7 個 Sprint 迴圈（柔性）。已完成 ${done} 個 Sprint${current ? `，目前 S${current} 進行中` : "，全部完成"}。`}
    >
      <style>{`
        @keyframes pmHybridSpin { to { transform: rotate(360deg); } }
        .pm-hybrid-spin { transform-box: fill-box; transform-origin: center; animation: pmHybridSpin 2.4s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .pm-hybrid-spin { animation: none; } }
      `}</style>
      <rect width={W} height={H} rx={10} fill={PANEL} />

      {/* 層標籤 */}
      <text x={16} y={24} fontSize={11} fontWeight={800} fill={NAVY} fontFamily={FONT} letterSpacing="0.04em">
        對外契約層 · 里程碑（剛性）
      </text>
      <text x={16} y={150} fontSize={11} fontWeight={800} fill={ORANGE_DEEP} fontFamily={FONT} letterSpacing="0.04em">
        對內團隊層 · Sprint 迴圈（柔性）
      </text>
      <line x1={16} y1={132} x2={X1} y2={132} stroke={GRAY} strokeWidth={1} strokeDasharray="4 4" />

      {/* 里程碑階段條 */}
      {MILESTONES.map((m) => {
        const dx = X0 + COL * m.last - 6; // 閘門落在階段條尾端
        const x = X0 + COL * (m.first - 1) + 4;
        const w = dx - 12 - x;
        const reached = done >= m.last;
        const active = !reached && current >= m.first && current <= m.last;
        const progress = Math.max(0, Math.min(done - (m.first - 1), m.last - m.first + 1)) / (m.last - m.first + 1);
        return (
          <g key={m.id}>
            <text x={x + w / 2} y={TOP_Y - 18} textAnchor="middle" fontSize={11} fontWeight={700} fill={reached || active ? NAVY_DEEP : MUTED} fontFamily={FONT}>
              {m.id} {m.label}
            </text>
            <rect x={x} y={TOP_Y - 7} width={w} height={14} rx={3} fill={BLUE_100} />
            <rect x={x} y={TOP_Y - 7} width={w * progress} height={14} rx={3} fill={NAVY} />
            {active && <rect x={x} y={TOP_Y - 7} width={w} height={14} rx={3} fill="none" stroke={NAVY} strokeWidth={1.5} />}
            {/* 里程碑閘門 */}
            <path d={`M${dx} ${TOP_Y - 8} L${dx + 8} ${TOP_Y} L${dx} ${TOP_Y + 8} L${dx - 8} ${TOP_Y} Z`} fill={reached ? SUCCESS : "#ffffff"} stroke={reached ? SUCCESS : GRAY} strokeWidth={1.5} />
            <text x={x + w / 2} y={TOP_Y + 24} textAnchor="middle" fontSize={10} fontWeight={700} fill={reached ? SUCCESS : active ? NAVY : MUTED} fontFamily={FONT}>
              {reached ? "已達成" : active ? "進行中" : "未開始"}
            </text>
            {/* 閘門與最後一個 Sprint 的對應 */}
            <line x1={dx} y1={TOP_Y + 10} x2={cx(m.last)} y2={BOT_Y - R - 6} stroke={reached ? SUCCESS : GRAY} strokeWidth={1} strokeDasharray="2 3" />
          </g>
        );
      })}

      {/* Sprint 迴圈 */}
      {Array.from({ length: SPRINTS }, (_, i) => {
        const s = i + 1;
        const x = cx(s);
        const isDone = s <= done;
        const isCur = s === current;
        const extra = changes[s] ?? 0;
        const stroke = isDone ? NAVY : isCur ? ORANGE_DEEP : GRAY;
        return (
          <g key={s}>
            <circle cx={x} cy={BOT_Y} r={R + 6} fill={isCur ? ORANGE_50 : "transparent"} />
            <g transform={`translate(${x} ${BOT_Y})`}>
              <g className={isCur && !reduce ? "pm-hybrid-spin" : undefined}>
                {/* 透明外圓讓 fill-box 以圓心為中心旋轉 */}
                <circle r={R + 8} fill="transparent" />
                <path d={arcPath(R)} fill="none" stroke={stroke} strokeWidth={isCur ? 2.5 : 2} />
                <path d="M0 0 L-6 -4 L-6 4 Z" transform={`translate(${(R * Math.cos((220 * Math.PI) / 180)).toFixed(2)} ${(R * Math.sin((220 * Math.PI) / 180)).toFixed(2)}) rotate(-50)`} fill={stroke} />
              </g>
              {isDone && <circle r={R - 6} fill={NAVY} />}
            </g>
            <text x={x} y={BOT_Y + 4} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={isDone ? "#ffffff" : isCur ? ORANGE_700 : MUTED} fontFamily={FONT}>
              S{s}
            </text>
            {extra > 0 && (
              <g>
                <rect x={x - 22} y={BOT_Y + R + 12} width={44} height={16} rx={8} fill={ORANGE_100} stroke={ORANGE_DEEP} strokeWidth={1} />
                <text x={x} y={BOT_Y + R + 23.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={ORANGE_700} fontFamily={FONT}>
                  +{extra} 變更
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- 主元件 ---------- */

const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 12px",
  borderRadius: 8,
  border: "1.5px solid transparent",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 160ms, color 160ms, border-color 160ms",
};

export default function PmHybridModel() {
  const reduce = useReducedMotion() ?? false;
  const [done, setDone] = useState(2);
  const [changes, setChanges] = useState<Record<number, number>>({});
  const current = done < SPRINTS ? done + 1 : 0;
  const nextSprint = current ? Math.min(current + 1, SPRINTS) : 0;
  const ms = MILESTONES.find((m) => done < m.last) ?? null;
  const absorbed = Object.values(changes).reduce((a, b) => a + b, 0);

  const injectChange = () => {
    if (!nextSprint) return;
    setChanges((c) => ({ ...c, [nextSprint]: (c[nextSprint] ?? 0) + 1 }));
  };

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <div role="group" aria-label="Sprint 推進" style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setDone((d) => Math.max(0, d - 1))} disabled={done === 0} style={{ ...btn, background: "#ffffff", color: done === 0 ? MUTED : NAVY, borderColor: BLUE_200, cursor: done === 0 ? "default" : "pointer" }}>
            <ChevronLeft size={16} /> 上一個
          </button>
          <button type="button" onClick={() => setDone((d) => Math.min(SPRINTS, d + 1))} disabled={done === SPRINTS} style={{ ...btn, background: done === SPRINTS ? GRAY_2 : NAVY, color: done === SPRINTS ? MUTED : "#ffffff", borderColor: done === SPRINTS ? GRAY_2 : NAVY, cursor: done === SPRINTS ? "default" : "pointer" }}>
            完成本 Sprint <ChevronRight size={16} />
          </button>
        </div>
        <div role="group" aria-label="變更與重置" style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={injectChange} disabled={!nextSprint} style={{ ...btn, background: nextSprint ? ORANGE_DEEP : GRAY_2, color: nextSprint ? "#ffffff" : MUTED, borderColor: nextSprint ? ORANGE_DEEP : GRAY_2, cursor: nextSprint ? "pointer" : "default" }}>
            <Zap size={16} /> 插入需求變更
          </button>
          <button
            type="button"
            onClick={() => {
              setDone(2);
              setChanges({});
            }}
            style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}
          >
            <RotateCcw size={16} /> 重置
          </button>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: TEXT, background: GRAY_2, padding: "4px 12px", borderRadius: 6 }}>
          已完成 {done} / {SPRINTS} 個 Sprint
        </span>
      </div>

      <Diagram done={done} changes={changes} reduce={reduce} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.6, color: TEXT, background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "10px 12px" }}>
          <Building2 size={16} style={{ color: NAVY, flexShrink: 0, marginTop: 3 }} />
          <span>
            <strong style={{ color: NAVY_DEEP }}>對外（客戶、管理層）看到的</strong>
            <br />
            {ms ? `${ms.id}「${ms.label}」進行中，預計在 S${ms.last} 結束時達成。` : "四個里程碑全部達成，專案交付。"}
            {absorbed > 0 && "里程碑日期沒有變動。"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.6, color: TEXT, background: ORANGE_50, border: `1px solid ${ORANGE_100}`, borderRadius: 8, padding: "10px 12px" }}>
          {current ? <RefreshCw size={16} style={{ color: ORANGE_DEEP, flexShrink: 0, marginTop: 3 }} /> : <Users size={16} style={{ color: ORANGE_DEEP, flexShrink: 0, marginTop: 3 }} />}
          <span>
            <strong style={{ color: ORANGE_700 }}>對內（團隊）在跑的</strong>
            <br />
            {current ? `S${current}：${LOOP.join(" → ")}，每兩週一輪。` : "所有 Sprint 跑完，進入維運或下一個專案。"}
            {absorbed > 0 ? `已有 ${absorbed} 項變更排進後續 Sprint，在里程碑範疇內消化。` : "試試「插入需求變更」，看變更落在哪裡。"}
          </span>
        </div>
      </div>
    </div>
  );
}
