import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { ChevronRight, Eye, RotateCcw, Stethoscope, Wrench } from "lucide-react";

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

const POINTS = ["建立", "開始", "完成", "驗收", "上線"];
const SEG_NAMES = ["Open → On Going", "開始 → 完成", "Done → Verified", "Verified → 上線"];
const ESTIMATE = 4; // 「開始 → 完成」的預計天數

interface Scenario {
  name: string;
  days: number[]; // 四段耗時
  bottleneck: number;
  after: number; // 開立處方後，瓶頸段預期縮短到幾天
  segment: string;
  causeTag: string; // 插圖上的病因短標
  remedyTag: string; // 插圖上的處方短標
  symptom: string;
  cause: string;
  remedies: string[];
  why: string;
}

const SCENARIOS: Scenario[] = [
  {
    name: "前置壅塞",
    days: [8, 4, 1, 1],
    bottleneck: 0,
    after: 2,
    segment: "建立 → 開始（Open → On Going）",
    causeTag: "需求未釐清、優先級不清",
    remedyTag: "放行前先釐清，Open 設 WIP",
    symptom: "卡片大量堆在 Open，遲遲不進 On Going；待辦越積越多，卻很少真正動工。",
    cause: "需求還沒釐清、資源還沒到位，或優先級不清，工作「進得來卻動不了」。",
    remedies: ["把需求講清、驗收標準定好再放行，而不是先塞進來再說", "對 Open 欄設 WIP 上限，逼團隊先消化、再接新需求", "每天掃一次最舊的卡片，停留過久就當面釐清卡點"],
    why: "前置一塞，後面每一段都跟著延後，這是最該先處理、效益最高的一段。",
  },
  {
    name: "估時失準",
    days: [1, 9, 2, 2],
    bottleneck: 1,
    after: 5,
    segment: "開始 → 完成（實際完成起訖）",
    causeTag: "估時太樂觀、範圍偷偷長大",
    remedyTag: "拆小工作包，校正估時",
    symptom: "實際耗時遠超過預計，而且常常一拖再拖；估時與實際的差距越來越大。",
    cause: "估時太樂觀，或範圍在執行中偷偷長大。",
    remedies: ["用「預計 vs 實際」的差距回頭校正下一次估時", "把過大的工作包再拆小，降低估時的不確定性", "凍結範圍，變更走 CR，別讓需求邊做邊長"],
    why: "估時長期失準，整張 Gantt 都不可信，連帶影響對外承諾的交期。",
  },
  {
    name: "驗收塞車",
    days: [1, 4, 8, 1],
    bottleneck: 2,
    after: 2,
    segment: "完成 → 驗收（Done → Verified）",
    causeTag: "驗收人沒空、標準不清",
    remedyTag: "定好驗收標準，做完一件驗一件",
    symptom: "卡片堆在待驗收遲遲不動：開發明明做完了，卻過不了驗收這關。",
    cause: "驗收人沒空，或驗收標準不清，導致來回退件、反覆確認。",
    remedies: ["明確「做完」的定義與驗收標準，讓做完有客觀依據", "保障驗收產能，別讓驗收人的時間被其他工作佔滿", "把批量驗收改成流動驗收，做完一件就驗一件"],
    why: "驗收最常被忽略、卻最容易卡關；它一塞，前面做得再快也卡在門口。",
  },
  {
    name: "上線延宕",
    days: [1, 4, 2, 7],
    bottleneck: 3,
    after: 2,
    segment: "驗收 → 上線（Verified → 上線）",
    causeTag: "審核排程卡住",
    remedyTag: "固定發布窗口，部署自動化",
    symptom: "驗收通過的東西排隊等上線，要等特定時機或主管審核才能進行。",
    cause: "上線審核排程卡住，或部署被當成「大事件」而不是例行流程。",
    remedies: ["固定發布窗口，讓上線變成可預期的節奏", "把部署自動化並建立通知機制，降低每次上線的人為成本", "上線檢查表提前準備，避免到了窗口才發現缺東缺西"],
    why: "價值卡在最後一哩進不了使用者手上；越接近交付端的延宕，使用者感受越直接。",
  },
];

const STEPS = [
  { label: "介入前", sub: "察覺症狀", Icon: Eye },
  { label: "介入中", sub: "診斷病因", Icon: Stethoscope },
  { label: "介入後", sub: "開立處方", Icon: Wrench },
];

/* ---------- 圖：時間軸 ---------- */

const W = 720;
const X0 = 24;
const X1 = 696;
const MAXD = 16;
const sx = (d: number) => X0 + ((X1 - X0) * d) / MAXD;
const BAR_Y = 70;
const BAR_H = 26;
const H = 150;

function Timeline({ sc, expanded, treated }: { sc: Scenario; expanded: boolean; treated: boolean }) {
  const days = sc.days.map((d, i) => (treated && i === sc.bottleneck ? sc.after : d));
  const total = days.reduce((a, b) => a + b, 0);
  const original = sc.days.reduce((a, b) => a + b, 0);
  const starts = days.map((_, i) => days.slice(0, i).reduce((a, b) => a + b, 0));
  const ease: CSSProperties = { transition: "x 300ms ease-out, width 300ms ease-out, fill 300ms" };
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={
        expanded
          ? `攤開視角：${SEG_NAMES.map((n, i) => `${n} ${days[i]} 天`).join("，")}；瓶頸在 ${SEG_NAMES[sc.bottleneck]}。總耗時 ${total} 天。`
          : `合併視角：只記錄上線時間，總耗時 ${total} 天，看不出時間花在哪一段。`
      }
    >
      <rect width={W} height={H} rx={10} fill={PANEL} />
      {Array.from({ length: MAXD + 1 }, (_, d) => (
        <g key={d}>
          <line x1={sx(d)} y1={40} x2={sx(d)} y2={BAR_Y + BAR_H + 8} stroke={GRAY_2} strokeWidth={1} />
          {d % 2 === 0 && (
            <text x={sx(d)} y={BAR_Y + BAR_H + 24} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={FONT}>
              {d}
            </text>
          )}
        </g>
      ))}
      <text x={X1} y={BAR_Y + BAR_H + 38} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT}>
        天
      </text>

      {!expanded ? (
        <g>
          <rect x={sx(0)} y={BAR_Y} width={sx(total) - sx(0)} height={BAR_H} rx={4} fill={GRAY} style={ease} />
          <text x={(sx(0) + sx(total)) / 2} y={BAR_Y + 17} textAnchor="middle" fontSize={12} fontWeight={700} fill={TEXT} fontFamily={FONT}>
            建立 → 上線 · {total} 天
          </text>
          <text x={X0} y={28} fontSize={11.5} fontWeight={700} fill={MUTED} fontFamily={FONT}>
            只記錄上線時間：看不出時間花在哪一段
          </text>
        </g>
      ) : (
        <g>
          {/* 「開始 → 完成」的預計天數，對照實際 */}
          <rect x={sx(starts[1])} y={BAR_Y - 12} width={sx(ESTIMATE) - sx(0)} height={6} rx={3} fill="none" stroke={NAVY} strokeWidth={1} strokeDasharray="3 2" style={ease} />
          <text x={sx(starts[1]) + sx(ESTIMATE) - sx(0) + 6} y={BAR_Y - 6} fontSize={9.5} fill={NAVY} fontFamily={FONT}>
            預計 {ESTIMATE} 天
          </text>
          {days.map((d, i) => {
            const isB = i === sc.bottleneck;
            const color = isB ? (treated ? SUCCESS : ORANGE_DEEP) : i % 2 === 0 ? NAVY : BLUE_200;
            return (
              <g key={i}>
                <rect x={sx(starts[i]) + 1} y={BAR_Y} width={Math.max(sx(d) - sx(0) - 2, 2)} height={BAR_H} rx={3} fill={color} style={ease} />
                {sx(d) - sx(0) > 34 && (
                  <text x={sx(starts[i] + d / 2)} y={BAR_Y + 17} textAnchor="middle" fontSize={11} fontWeight={700} fill={i % 2 === 1 && !isB ? NAVY_DEEP : "#ffffff"} fontFamily={FONT}>
                    {d} 天
                  </text>
                )}
              </g>
            );
          })}
          {/* 疏通前的原始長度 */}
          {treated && (
            <rect x={sx(starts[sc.bottleneck]) + 1} y={BAR_Y - 2} width={sx(sc.days[sc.bottleneck]) - sx(0) - 2} height={BAR_H + 4} rx={3} fill="none" stroke={ORANGE_DEEP} strokeWidth={1} strokeDasharray="4 3" />
          )}
          {POINTS.map((p, i) => {
            const at = i === 0 ? 0 : starts[i - 1] + days[i - 1];
            return (
              <g key={p}>
                <circle cx={sx(at)} cy={BAR_Y + BAR_H / 2} r={4} fill="#ffffff" stroke={TEXT} strokeWidth={1.5} style={{ transition: "cx 300ms ease-out" }} />
                <text x={sx(at)} y={36} textAnchor={i === 0 ? "start" : "middle"} fontSize={10.5} fontWeight={700} fill={TEXT} fontFamily={FONT}>
                  {p}
                </text>
              </g>
            );
          })}
          <text x={X1} y={20} textAnchor="end" fontSize={11} fontWeight={800} fill={treated ? SUCCESS : ORANGE_700} fontFamily={FONT}>
            {treated ? `疏通後 ${total} 天（少 ${original - total} 天）` : `總耗時 ${total} 天 · 瓶頸段 ${sc.days[sc.bottleneck]} 天`}
          </text>
        </g>
      )}
    </svg>
  );
}

/* ---------- 插圖：流程管線（瓶頸 = 最窄的管徑） ---------- */

const PIPE_MIN_W = 640;
const CY = 82; // 管線中心線
const PIPE_H = CY + 74;
const ROLES = ["需求審核人", "執行人", "驗收人", "上線審核人"];
const TILE = 12; // 排隊卡片的間距
const dia = (d: number) => Math.max(12, 48 - 4 * d); // 耗時越長，管徑越窄

/** 量測 SVG 的實際寬度（不小於設計最小寬度） */
function useMeasuredWidth(min: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [w, setW] = useState(min);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(min, Math.round(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, w] as const;
}

function Pipeline({ sc, expanded, step, reduce }: { sc: Scenario; expanded: boolean; step: number; reduce: boolean }) {
  const [ref, w] = useMeasuredWidth(PIPE_MIN_W);
  const treated = expanded && step === 2;
  const b = sc.bottleneck;
  const days = sc.days.map((d, i) => (treated && i === b ? sc.after : d));
  const pad = 12;
  const x0 = pad + 92; // 左側留給入口排隊
  const x1 = w - pad - 36;
  const segL = (x1 - x0) / 4;
  const segX = (i: number) => x0 + i * segL;
  const queue = expanded ? Math.max(0, days[b] - 2) : 0;
  const neckX = segX(b) + segL / 2;
  const queueX = segX(b) - 4 - (queue * TILE) / 2;
  const tone = treated ? SUCCESS : ORANGE_DEEP;
  const toneText = treated ? SUCCESS : ORANGE_700;
  const ease = (props: string): CSSProperties => (reduce ? {} : { transition: props });

  const callout = step === 0 ? `症狀：${sc.days[b] - 2} 件卡片在這裡排隊` : step === 1 ? `病因：${sc.causeTag}` : `處方：${sc.remedyTag}`;
  const anchorX = step === 0 ? queueX : neckX;
  const half = (callout.length * 11.5) / 2 + 4;
  const textX = Math.min(Math.max(anchorX, pad + half), w - pad - half);
  const anchorTop = step === 0 ? CY - 9 : CY - dia(days[b]) / 2 - 2;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${w} ${PIPE_H}`}
      width="100%"
      role="img"
      aria-label={
        expanded
          ? `流程管線：四段依序由${ROLES.join("、")}負責，耗時越長管徑越窄。${SEG_NAMES[b]} 是最窄的一段，${treated ? `開立處方後管徑放寬、排隊減到 ${queue} 件` : `前方有 ${queue} 件卡片排隊`}。`
          : "流程管線被包成黑箱：只看得到建立與上線，看不到中間哪一段變窄。"
      }
    >
      <defs>
        <marker id="tb-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill={BLUE_200} />
        </marker>
      </defs>
      <rect width={w} height={PIPE_H} rx={10} fill={PANEL} />

      {/* 入口與出口 */}
      <line x1={pad + 4} y1={CY} x2={x0 - 3} y2={CY} stroke={BLUE_200} strokeWidth={1.5} markerEnd="url(#tb-arr)" />
      <line x1={x1 + 3} y1={CY} x2={w - pad - 2} y2={CY} stroke={BLUE_200} strokeWidth={1.5} markerEnd="url(#tb-arr)" />

      {/* 四段管線 */}
      {days.map((d, i) => {
        const isB = expanded && i === b;
        const h = dia(d);
        return (
          <rect
            key={i}
            x={segX(i)}
            y={CY - h / 2}
            width={segL}
            height={h}
            fill={isB ? (treated ? "#e8f5ee" : ORANGE_50) : BLUE_50}
            stroke={isB ? tone : NAVY}
            strokeWidth={1.25}
            style={ease("y 300ms ease-out, height 300ms ease-out, fill 300ms, stroke 300ms")}
          />
        );
      })}

      {/* 排隊的卡片 */}
      {Array.from({ length: queue }, (_, k) => (
        <rect key={k} x={segX(b) - 4 - (k + 1) * TILE + 2} y={CY - 7} width={TILE - 3} height={14} rx={2} fill="#ffffff" stroke={tone} strokeWidth={1} />
      ))}

      {/* 節點與負責角色 */}
      <g style={{ opacity: expanded ? 1 : 0, ...ease("opacity 250ms") }}>
        {POINTS.map((p, i) => (
          <g key={p}>
            <line x1={segX(i)} y1={CY + 26} x2={segX(i)} y2={CY + 30} stroke={MUTED} strokeWidth={1} />
            <text x={segX(i)} y={CY + 42} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={TEXT} fontFamily={FONT}>
              {p}
            </text>
          </g>
        ))}
        {ROLES.map((r, i) => {
          const isB = i === b;
          const pw = Math.min(segL - 36, 84);
          return (
            <g key={r}>
              <rect x={segX(i) + segL / 2 - pw / 2} y={CY + 50} width={pw} height={18} rx={9} fill={isB ? (treated ? "#e8f5ee" : ORANGE_50) : "#ffffff"} stroke={isB ? tone : GRAY_2} strokeWidth={1} style={ease("fill 300ms, stroke 300ms")} />
              <text x={segX(i) + segL / 2} y={CY + 63} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={isB ? toneText : MUTED} fontFamily={FONT}>
                {r}
              </text>
            </g>
          );
        })}
        <line x1={anchorX} y1={30} x2={anchorX} y2={anchorTop} stroke={tone} strokeWidth={1} strokeDasharray="3 2" />
        <text x={textX} y={24} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={toneText} fontFamily={FONT}>
          {callout}
        </text>
      </g>

      {/* 合併視角：整段包成黑箱 */}
      <g style={{ opacity: expanded ? 0 : 1, pointerEvents: "none", ...ease("opacity 250ms") }}>
        <rect x={x0 - 4} y={CY - 30} width={x1 - x0 + 8} height={60} rx={8} fill={GRAY_2} stroke={GRAY} strokeWidth={1} />
        <text x={(x0 + x1) / 2} y={CY + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={MUTED} fontFamily={FONT}>
          黑箱：中間哪一段變窄，看不出來
        </text>
        <text x={x0} y={CY + 46} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={TEXT} fontFamily={FONT}>
          建立
        </text>
        <text x={x1} y={CY + 46} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={TEXT} fontFamily={FONT}>
          上線
        </text>
      </g>
    </svg>
  );
}

/* ---------- 主元件 ---------- */

const pill = (on: boolean, color = NAVY): CSSProperties => ({
  height: 32,
  padding: "0 12px",
  borderRadius: 999,
  border: `1.5px solid ${on ? color : BLUE_200}`,
  background: on ? color : "#ffffff",
  color: on ? "#ffffff" : NAVY,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
});

export default function PmTaskBottleneck() {
  const [si, setSi] = useState(2);
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState(0);
  const reduce = useReducedMotion() ?? false;
  const sc = SCENARIOS[si];

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <div role="group" aria-label="瓶頸情境" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SCENARIOS.map((s, i) => (
            <button
              key={s.name}
              type="button"
              aria-pressed={si === i}
              onClick={() => {
                setSi(i);
                setStep(0);
              }}
              style={pill(si === i)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div role="group" aria-label="視角" style={{ display: "flex", marginLeft: "auto", border: `1.5px solid ${BLUE_200}`, borderRadius: 8, overflow: "hidden" }}>
          {["合併視角", "攤開視角"].map((label, i) => {
            const on = expanded === (i === 1);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => setExpanded(i === 1)}
                style={{ height: 30, padding: "0 12px", border: "none", background: on ? NAVY : "#ffffff", color: on ? "#ffffff" : NAVY, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <Pipeline sc={sc} expanded={expanded} step={step} reduce={reduce} />

      <Timeline sc={sc} expanded={expanded} treated={expanded && step === 2} />

      {!expanded ? (
        <div style={{ fontSize: 13, lineHeight: 1.65, color: TEXT, background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "10px 12px" }}>
          四種情境的總耗時都一樣是 14 天。只看上線時間，分不出卡在哪裡；切到<strong style={{ color: NAVY }}>攤開視角</strong>看瓶頸。
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div role="group" aria-label="介入階段" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {STEPS.map((s, i) => {
              const on = step === i;
              const reached = step >= i;
              return (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setStep(i)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 8, border: `1.5px solid ${reached ? (i === 2 ? SUCCESS : ORANGE_DEEP) : GRAY}`, background: on ? (i === 2 ? SUCCESS : ORANGE_DEEP) : "#ffffff", color: on ? "#ffffff" : reached ? (i === 2 ? SUCCESS : ORANGE_700) : MUTED, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    <s.Icon size={14} /> {s.label}
                    <span style={{ fontWeight: 500, fontSize: 12 }}>{s.sub}</span>
                  </button>
                  {i < STEPS.length - 1 && <ChevronRight size={14} style={{ color: GRAY }} />}
                </div>
              );
            })}
            {step > 0 && (
              <button type="button" onClick={() => setStep(0)} aria-label="回到介入前" style={{ marginLeft: "auto", display: "inline-flex", border: "none", background: "none", color: MUTED, cursor: "pointer" }}>
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          <div aria-live="polite" style={{ fontSize: 13, lineHeight: 1.7, color: TEXT, background: step === 2 ? "#ffffff" : ORANGE_50, border: `1px solid ${step === 2 ? GRAY_2 : ORANGE_100}`, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: MUTED }}>{sc.segment}</div>
            {step === 0 && (
              <span>
                <strong style={{ color: ORANGE_700 }}>症狀（看板上長怎樣）：</strong>
                {sc.symptom}
              </span>
            )}
            {step === 1 && (
              <span>
                <strong style={{ color: ORANGE_700 }}>病因：</strong>
                {sc.cause}
              </span>
            )}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <strong style={{ color: SUCCESS }}>處方：</strong>
                {sc.remedies.map((r, k) => (
                  <div key={k} style={{ display: "flex", gap: 8 }}>
                    <span style={{ flexShrink: 0, width: 18, height: 18, marginTop: 3, borderRadius: 999, background: SUCCESS, color: "#ffffff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{k + 1}</span>
                    <span>{r}</span>
                  </div>
                ))}
                <span style={{ color: MUTED, marginTop: 4 }}>{sc.why}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
