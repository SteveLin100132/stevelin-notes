import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { FileSignature, Play, Rocket, RotateCcw, StickyNote } from "lucide-react";

/* trendlink-design 色票（生成元件的 Tailwind class 不會被編譯，直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700
const NAVY_DEEP = "#112f5d"; // --blue-900
const BLUE = "#2c6ebb"; // --blue-500
const BLUE_50 = "#eef4fb";
const BLUE_100 = "#d6e4f5";
const BLUE_200 = "#adc8e8";
const ORANGE = "#ed9b26"; // --orange-400
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

const MS_PER_DAY = 110; // 模擬中 1 天所花的真實毫秒

interface Step {
  label: string;
  who: string;
  days: number;
}

const PROJECT_STEPS: Step[] = [
  { label: "評估影響", who: "PM · 技術負責人", days: 5 },
  { label: "撰寫 CR 文件", who: "PM", days: 5 },
  { label: "多層簽核", who: "客戶 · 變更委員會", days: 15 },
  { label: "執行變更", who: "開發團隊", days: 10 },
];
const PRODUCT_STEPS: Step[] = [
  { label: "加入 Backlog", who: "PO", days: 1 },
  { label: "排序優先級", who: "PO · 團隊", days: 2 },
  { label: "下個 Sprint", who: "開發團隊", days: 10 },
];

function total(steps: Step[]): number {
  return steps.reduce((s, x) => s + x.days, 0);
}

const PROJECT_TOTAL = total(PROJECT_STEPS);
const PRODUCT_TOTAL = total(PRODUCT_STEPS);

/* ---------- 圖：共用天數軸的甘特圖 ---------- */

/* SVG viewBox 寬 = 實際像素寬（不小於 MIN_W），文字維持 1:1，天數軸隨寬度延展 */
const MIN_W = 720;
const LABEL_W = 168;
const X0 = LABEL_W + 8;
const ROW = 22;

type Scale = (d: number) => number;

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

function Lane({ sx, steps, y, days, color, soft, title, doneAt }: { sx: Scale; steps: Step[]; y: number; days: number; color: string; soft: string; title: string; doneAt: number }) {
  let acc = 0;
  const done = days >= doneAt;
  return (
    <g>
      <text x={16} y={y - 8} fontSize={11} fontWeight={800} fill={color} fontFamily={FONT} letterSpacing="0.04em">
        {title}
      </text>
      {steps.map((s, i) => {
        const start = acc;
        const end = acc + s.days;
        acc = end;
        const ry = y + i * ROW;
        const fillEnd = Math.max(start, Math.min(end, days));
        const active = days > start && days < end;
        const finished = days >= end;
        return (
          <g key={s.label}>
            <text x={16} y={ry + 14} fontSize={11.5} fontWeight={active || finished ? 700 : 500} fill={active || finished ? TEXT : MUTED} fontFamily={FONT}>
              {s.label}
            </text>
            <text x={LABEL_W} y={ry + 14} textAnchor="end" fontSize={9.5} fill={MUTED} fontFamily={FONT}>
              {s.who}
            </text>
            <rect x={sx(start)} y={ry + 3} width={Math.max(sx(end) - sx(start) - 1, 2)} height={14} rx={2} fill={soft} />
            <rect x={sx(start)} y={ry + 3} width={Math.max(sx(fillEnd) - sx(start) - 1, 0)} height={14} rx={2} fill={color} opacity={active ? 0.75 : 1} />
            {sx(end) - sx(start) > 34 && (
              <text x={(sx(start) + sx(end)) / 2} y={ry + 14} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={fillEnd > (start + end) / 2 ? "#ffffff" : MUTED} fontFamily={FONT}>
                {s.days} 天
              </text>
            )}
          </g>
        );
      })}
      {/* 上線里程碑 */}
      <g transform={`translate(${sx(doneAt)} ${y + (steps.length - 1) * ROW + 10})`}>
        <path d="M0 -6 L6 0 L0 6 L-6 0 Z" fill={done ? SUCCESS : "#ffffff"} stroke={done ? SUCCESS : GRAY} strokeWidth={1.5} />
      </g>
      <text x={sx(doneAt) + (doneAt === PROJECT_TOTAL ? -10 : 10)} y={y + (steps.length - 1) * ROW + 14} textAnchor={doneAt === PROJECT_TOTAL ? "end" : "start"} fontSize={10} fontWeight={700} fill={done ? SUCCESS : MUTED} fontFamily={FONT}>
        {doneAt === PROJECT_TOTAL ? "" : `上線 · 第 ${doneAt} 天`}
      </text>
    </g>
  );
}

function Gantt({ days }: { days: number }) {
  const [svgRef, W] = useMeasuredWidth(MIN_W);
  const X1 = W - 28;
  const sx: Scale = (d) => X0 + ((X1 - X0) * d) / PROJECT_TOTAL;
  const projY = 36;
  const prodY = projY + PROJECT_STEPS.length * ROW + 34;
  const axisY = prodY + PRODUCT_STEPS.length * ROW + 10;
  const H = axisY + 34;
  const cursor = Math.min(days, PROJECT_TOTAL);
  const productDone = days >= PRODUCT_TOTAL;
  const projectDone = days >= PROJECT_TOTAL;
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`需求變更甘特圖，共用天數軸。專案 CR 流程四步共 ${PROJECT_TOTAL} 天，產品 Backlog 流程三步共 ${PRODUCT_TOTAL} 天。目前第 ${Math.floor(days)} 天${productDone ? "，產品已上線" : ""}${projectDone ? "，專案也已完成變更" : ""}。`}
    >
      <rect width={W} height={H} rx={10} fill={PANEL} />
      {/* 天數格線 */}
      {Array.from({ length: PROJECT_TOTAL / 5 + 1 }, (_, k) => (
        <g key={k}>
          <line x1={sx(k * 5)} y1={20} x2={sx(k * 5)} y2={axisY} stroke={GRAY_2} strokeWidth={1} />
          <text x={sx(k * 5)} y={axisY + 16} textAnchor="middle" fontSize={9.5} fill={MUTED} fontFamily={FONT}>
            {k * 5}
          </text>
        </g>
      ))}
      <text x={X1} y={axisY + 30} textAnchor="end" fontSize={9.5} fill={MUTED} fontFamily={FONT}>
        天
      </text>
      <line x1={16} y1={prodY - 24} x2={X1} y2={prodY - 24} stroke={GRAY} strokeWidth={1} />
      <Lane sx={sx} steps={PROJECT_STEPS} y={projY} days={days} color={NAVY} soft={BLUE_100} title="PROJECT · 正式變更流程（CR）" doneAt={PROJECT_TOTAL} />
      <Lane sx={sx} steps={PRODUCT_STEPS} y={prodY} days={days} color={ORANGE_DEEP} soft={ORANGE_100} title="PRODUCT · Backlog 流程" doneAt={PRODUCT_TOTAL} />
      {/* 兩條路徑的差距 */}
      {productDone && (
        <g>
          <line x1={sx(PRODUCT_TOTAL)} y1={prodY - 12} x2={sx(cursor)} y2={prodY - 12} stroke={ORANGE_DEEP} strokeWidth={1.2} strokeDasharray="3 3" />
          {cursor - PRODUCT_TOTAL > 4 && (
            <text x={(sx(PRODUCT_TOTAL) + sx(cursor)) / 2} y={prodY - 16} textAnchor="middle" fontSize={10} fontWeight={700} fill={ORANGE_700} fontFamily={FONT}>
              產品已上線 {Math.floor(cursor - PRODUCT_TOTAL)} 天
            </text>
          )}
        </g>
      )}
      {/* 今日游標 */}
      {days > 0 && (
        <g>
          <line x1={sx(cursor)} y1={16} x2={sx(cursor)} y2={axisY} stroke={projectDone ? SUCCESS : TEXT} strokeWidth={1.5} />
          <rect x={sx(cursor) - 22} y={4} width={44} height={16} rx={3} fill={projectDone ? SUCCESS : TEXT} />
          <text x={sx(cursor)} y={15.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#ffffff" fontFamily={FONT} style={{ fontVariantNumeric: "tabular-nums" }}>
            第 {Math.floor(days)} 天
          </text>
        </g>
      )}
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

export default function PmChangeRequest() {
  const reduce = useReducedMotion() ?? false;
  const [running, setRunning] = useState(false);
  const [days, setDays] = useState(0);
  const last = useRef<number | null>(null);
  const daysRef = useRef(0);

  const advance = (delta: number) => {
    const next = daysRef.current + delta;
    if (next >= PROJECT_TOTAL) {
      daysRef.current = PROJECT_TOTAL;
      setDays(PROJECT_TOTAL);
      setRunning(false);
    } else {
      daysRef.current = next;
      setDays(next);
    }
  };
  const resetDays = () => {
    daysRef.current = 0;
    setDays(0);
  };

  useEffect(() => {
    if (!running) {
      last.current = null;
      return;
    }
    let raf = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = (now: number) => {
      if (last.current === null) last.current = now;
      const dt = (now - last.current) / MS_PER_DAY;
      last.current = now;
      advance(dt);
      raf = requestAnimationFrame(tick);
    };
    if (reduce) {
      timer = setInterval(() => advance(1), 400);
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearInterval(timer);
    };
    // advance 依賴的 ref 與 setter 皆穩定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, reduce]);

  const projectDone = days >= PROJECT_TOTAL;
  const productDone = days >= PRODUCT_TOTAL;
  const started = days > 0;

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <div role="group" aria-label="模擬控制" style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              if (projectDone) resetDays();
              setRunning(true);
            }}
            disabled={running}
            style={{ ...btn, background: running ? GRAY_2 : NAVY, color: running ? MUTED : "#ffffff", borderColor: running ? GRAY_2 : NAVY, cursor: running ? "default" : "pointer" }}
          >
            <Play size={16} /> {projectDone ? "再模擬一次" : started ? "繼續" : "模擬需求變更"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              resetDays();
            }}
            style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}
          >
            <RotateCcw size={16} /> 重置
          </button>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: TEXT, background: GRAY_2, padding: "4px 12px", borderRadius: 6, fontVariantNumeric: "tabular-nums" }}>
          同一份需求 · 第 {Math.floor(days)} 天
        </span>
      </div>

      <Gantt days={days} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.6, color: projectDone ? NAVY_DEEP : TEXT, background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "10px 12px" }}>
          <FileSignature size={16} style={{ color: NAVY, flexShrink: 0, marginTop: 3 }} />
          <span>
            <strong style={{ color: NAVY }}>專案 · 約 {PROJECT_TOTAL} 天</strong>
            <br />
            {projectDone ? "第 35 天才完成變更。變動被視為風險，每一步都要評估、留紀錄、取得批准。" : "先評估對範疇、時程、成本的影響，寫成 CR 文件，再層層簽核，批准後才動工。"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.6, color: TEXT, background: ORANGE_50, border: `1px solid ${ORANGE_100}`, borderRadius: 8, padding: "10px 12px" }}>
          {productDone ? <Rocket size={16} style={{ color: ORANGE_DEEP, flexShrink: 0, marginTop: 3 }} /> : <StickyNote size={16} style={{ color: ORANGE_DEEP, flexShrink: 0, marginTop: 3 }} />}
          <span>
            <strong style={{ color: ORANGE_700 }}>產品 · 約 {PRODUCT_TOTAL} 天</strong>
            <br />
            {productDone ? `第 ${PRODUCT_TOTAL} 天上線，之後照常收集回饋、繼續迭代。${projectDone ? "" : "專案那邊還在走流程。"}` : "加入 Backlog、排好優先順序，下個 Sprint 就做，通常兩週內上線。"}
          </span>
        </div>
      </div>
    </div>
  );
}
