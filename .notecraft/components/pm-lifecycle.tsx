import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { Flag, Pause, Play, RotateCcw, Repeat } from "lucide-react";

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
const INK = "#2b3550";
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";

/* 模擬時間：1 秒 = 1 個月 */
const PROJECT_MONTHS = 8; // 專案從啟動到結案
const LAP_MONTHS = 3; // 產品一輪迭代
const AXIS_MONTHS = 12; // 專案時間軸顯示範圍

const PHASES = [
  { label: "啟動", start: 0, end: 1 },
  { label: "規劃", start: 1, end: 3 },
  { label: "執行", start: 3, end: 6.5 },
  { label: "結案", start: 6.5, end: 8 },
];

const LOOP = ["規劃", "開發", "發佈", "量測"];

/* SVG viewBox 寬 = 實際像素寬（不小於 MIN_W），文字維持 1:1，時間軸隨寬度延展 */
const MIN_W = 340;

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

/* ---------- 圖：專案甘特圖（有終點） ---------- */

function ProjectGantt({ t }: { t: number }) {
  const [svgRef, W] = useMeasuredWidth(MIN_W);
  const x0 = 58;
  const x1 = W - 16;
  const sx = (m: number) => x0 + ((x1 - x0) * m) / AXIS_MONTHS;
  const now = Math.min(t, AXIS_MONTHS);
  const finished = t >= PROJECT_MONTHS;
  const rowY = (i: number) => 44 + i * 30;
  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} 220`} width="100%" role="img" aria-label={`專案甘特圖：啟動、規劃、執行、結案四個階段依序完成，目前第 ${t.toFixed(1)} 個月${finished ? "，專案已在第 8 個月結案，之後不再有活動" : ""}`}>
      <rect width={W} height={220} rx={10} fill={PANEL} />
      {/* 月份格線與刻度 */}
      {Array.from({ length: AXIS_MONTHS / 2 + 1 }, (_, k) => {
        const m = k * 2;
        return (
          <g key={m}>
            <line x1={sx(m)} y1={30} x2={sx(m)} y2={166} stroke={GRAY_2} strokeWidth={1} />
            <text x={sx(m)} y={182} textAnchor="middle" fontSize={9.5} fill={MUTED} fontFamily={FONT}>
              {m}
            </text>
          </g>
        );
      })}
      <text x={x1} y={200} textAnchor="end" fontSize={9.5} fill={MUTED} fontFamily={FONT}>
        月
      </text>
      {/* 結案後的區域 */}
      {finished && (
        <g>
          <rect x={sx(PROJECT_MONTHS)} y={30} width={sx(now) - sx(PROJECT_MONTHS)} height={136} fill={GRAY_2} opacity={0.6} />
          {now - PROJECT_MONTHS > 2.2 && (
            <text x={(sx(PROJECT_MONTHS) + sx(now)) / 2} y={104} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={FONT}>
              已結案
            </text>
          )}
        </g>
      )}
      {/* 階段列 */}
      {PHASES.map((p, i) => {
        const y = rowY(i);
        const fillEnd = Math.max(p.start, Math.min(p.end, t));
        const active = t > p.start && t < p.end;
        return (
          <g key={p.label}>
            <text x={x0 - 8} y={y + 13} textAnchor="end" fontSize={11} fontWeight={700} fill={t > p.start ? NAVY : MUTED} fontFamily={FONT}>
              {p.label}
            </text>
            <rect x={sx(p.start)} y={y + 2} width={sx(p.end) - sx(p.start)} height={16} rx={3} fill={BLUE_100} />
            <rect x={sx(p.start)} y={y + 2} width={sx(fillEnd) - sx(p.start)} height={16} rx={3} fill={active ? BLUE : NAVY} />
          </g>
        );
      })}
      {/* 結案里程碑 */}
      <g transform={`translate(${sx(PROJECT_MONTHS)} 162)`}>
        <path d="M0 -6 L6 0 L0 6 L-6 0 Z" fill={finished ? ORANGE : "#ffffff"} stroke={finished ? ORANGE_DEEP : GRAY} strokeWidth={1.5} />
      </g>
      <text x={sx(PROJECT_MONTHS) + 10} y={166} fontSize={10} fontWeight={700} fill={finished ? ORANGE_700 : MUTED} fontFamily={FONT}>
        結案
      </text>
      {/* 時間游標 */}
      {t > 0 && (
        <g>
          <line x1={sx(now)} y1={26} x2={sx(now)} y2={170} stroke={finished ? MUTED : ORANGE_DEEP} strokeWidth={1.5} />
          <path d={`M${sx(now) - 4} 22 L${sx(now) + 4} 22 L${sx(now)} 28 Z`} fill={finished ? MUTED : ORANGE_DEEP} />
        </g>
      )}
    </svg>
  );
}

/* ---------- 圖：產品迭代循環與累積價值（無終點） ---------- */

function ProductLoop({ t }: { t: number }) {
  const [svgRef, W] = useMeasuredWidth(MIN_W);
  const laps = Math.floor(t / LAP_MONTHS);
  const frac = (t % LAP_MONTHS) / LAP_MONTHS;
  const cx = 82;
  const cy = 108;
  const r = 52;
  const a = frac * Math.PI * 2 - Math.PI / 2;
  const stage = Math.floor(frac * LOOP.length);

  // 累積價值折線：每完成一輪，價值階梯上升
  const gx0 = 176;
  const gx1 = W - 14;
  const gy0 = 166;
  const gy1 = 40;
  const span = Math.max(AXIS_MONTHS, Math.ceil(t / 3) * 3);
  const maxLaps = Math.max(4, Math.floor(span / LAP_MONTHS));
  const gx = (m: number) => gx0 + ((gx1 - gx0) * m) / span;
  const gy = (v: number) => gy0 - ((gy0 - gy1) * v) / maxLaps;
  const pts: string[] = [`${gx(0)},${gy(0)}`];
  for (let k = 1; k <= laps; k++) {
    pts.push(`${gx(k * LAP_MONTHS)},${gy(k - 1)}`, `${gx(k * LAP_MONTHS)},${gy(k)}`);
  }
  pts.push(`${gx(t)},${gy(laps)}`);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} 220`} width="100%" role="img" aria-label={`產品迭代循環：規劃、開發、發佈、量測不斷循環，目前第 ${laps + 1} 輪「${LOOP[stage]}」階段；右側折線顯示累積價值已上升 ${laps} 階`}>
      <rect width={W} height={220} rx={10} fill={PANEL} />
      {/* 循環 */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ORANGE_100} strokeWidth={10} />
      {t > 0 && (
        <path
          d={frac > 0.001 ? `M${cx} ${cy - r} A${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}` : ""}
          fill="none"
          stroke={ORANGE}
          strokeWidth={10}
        />
      )}
      {LOOP.map((s, i) => {
        const ang = (i / LOOP.length) * Math.PI * 2 - Math.PI / 2 + Math.PI / LOOP.length;
        const lx = cx + (r + 0) * Math.cos(ang);
        const ly = cy + (r + 0) * Math.sin(ang);
        const on = t > 0 && i === stage;
        return (
          <g key={s}>
            <rect x={lx - 20} y={ly - 10} width={40} height={20} rx={4} fill={on ? ORANGE_DEEP : "#ffffff"} stroke={on ? ORANGE_DEEP : GRAY} strokeWidth={1.2} />
            <text x={lx} y={ly + 4} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={on ? "#ffffff" : TEXT} fontFamily={FONT}>
              {s}
            </text>
          </g>
        );
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={FONT}>
        第
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={18} fontWeight={800} fill={ORANGE_700} fontFamily={FONT} style={{ fontVariantNumeric: "tabular-nums" }}>
        {laps + 1}
      </text>
      <text x={cx} y={cy + 30} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={FONT}>
        輪
      </text>
      {/* 累積價值 */}
      <text x={gx0} y={28} fontSize={10.5} fontWeight={700} fill={TEXT} fontFamily={FONT}>
        累積價值
      </text>
      {Array.from({ length: maxLaps + 1 }, (_, k) => (
        <line key={k} x1={gx0} y1={gy(k)} x2={gx1} y2={gy(k)} stroke={GRAY_2} strokeWidth={1} />
      ))}
      <line x1={gx0} y1={gy0} x2={gx1} y2={gy0} stroke={GRAY} strokeWidth={1} />
      {Array.from({ length: Math.floor(span / 3) + 1 }, (_, k) => (
        <text key={k} x={gx(k * 3)} y={gy0 + 16} textAnchor="middle" fontSize={9.5} fill={MUTED} fontFamily={FONT}>
          {k * 3}
        </text>
      ))}
      <text x={gx1} y={200} textAnchor="end" fontSize={9.5} fill={MUTED} fontFamily={FONT}>
        月
      </text>
      <polyline points={pts.join(" ")} fill="none" stroke={ORANGE_DEEP} strokeWidth={2} strokeLinejoin="round" />
      {Array.from({ length: laps }, (_, k) => (
        <circle key={k} cx={gx((k + 1) * LAP_MONTHS)} cy={gy(k + 1)} r={3} fill="#ffffff" stroke={ORANGE_DEEP} strokeWidth={1.5} />
      ))}
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

export default function PmLifecycle() {
  const reduce = useReducedMotion() ?? false;
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      last.current = null;
      return;
    }
    let raf = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const step = (now: number) => {
      if (last.current === null) last.current = now;
      const dt = (now - last.current) / 1000;
      last.current = now;
      setT((v) => v + dt);
      raf = requestAnimationFrame(step);
    };
    if (reduce) {
      // 減少動態：每 0.5 秒跳一格，而非連續動畫
      timer = setInterval(() => setT((v) => v + 0.5), 500);
    } else {
      raf = requestAnimationFrame(step);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearInterval(timer);
    };
  }, [running, reduce]);

  const p = Math.min(t / PROJECT_MONTHS, 1);
  const finished = p >= 1;
  const laps = Math.floor(t / LAP_MONTHS);

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <div role="group" aria-label="模擬控制" style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setRunning((r) => !r)} style={{ ...btn, background: running ? "#ffffff" : NAVY, color: running ? NAVY : "#ffffff", borderColor: running ? BLUE_200 : NAVY }}>
            {running ? <Pause size={16} /> : <Play size={16} />} {running ? "暫停" : t > 0 ? "繼續" : "開始模擬"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setT(0);
            }}
            style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}
          >
            <RotateCcw size={16} /> 重置
          </button>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: TEXT, background: GRAY_2, padding: "4px 12px", borderRadius: 6, fontVariantNumeric: "tabular-nums" }}>
          同一個時鐘 · 第 {t.toFixed(1)} 個月
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: NAVY }}>PROJECT</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: NAVY_DEEP }}>專案</span>
            <span style={{ fontSize: 12, color: MUTED }}>單一路徑 · 有終點</span>
          </div>
          <ProjectGantt t={t} />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: MUTED, marginBottom: 4 }}>
              <span>整體進度</span>
              <span style={{ fontWeight: 700, color: NAVY, fontVariantNumeric: "tabular-nums" }}>{Math.round(p * 100)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: BLUE_100, overflow: "hidden" }}>
              <div style={{ width: `${p * 100}%`, height: "100%", background: NAVY, transition: reduce ? "none" : "width 120ms linear" }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: finished ? NAVY_DEEP : MUTED, background: finished ? BLUE_50 : "transparent", borderRadius: 8, padding: finished ? "8px 12px" : 0, fontWeight: finished ? 700 : 400 }}>
            <Flag size={16} style={{ flexShrink: 0 }} />
            {finished ? "第 8 個月結案，專案即告結束：成果交付、資源釋放。" : "階段依序推進，抵達「結案」後就結束。"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: ORANGE_DEEP }}>PRODUCT</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: ORANGE_700 }}>產品</span>
            <span style={{ fontSize: 12, color: MUTED }}>循環迭代 · 無終點</span>
          </div>
          <ProductLoop t={t} />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: MUTED, marginBottom: 4 }}>
              <span>本輪迭代</span>
              <span style={{ fontWeight: 700, color: ORANGE_700, fontVariantNumeric: "tabular-nums" }}>第 {laps + 1} 輪</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: ORANGE_100, overflow: "hidden" }}>
              <div style={{ width: `${((t % LAP_MONTHS) / LAP_MONTHS) * 100}%`, height: "100%", background: ORANGE_DEEP, transition: reduce ? "none" : "width 120ms linear" }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: laps > 0 ? ORANGE_700 : MUTED, background: laps > 0 ? ORANGE_50 : "transparent", borderRadius: 8, padding: laps > 0 ? "8px 12px" : 0, fontWeight: laps > 0 ? 700 : 400 }}>
            <Repeat size={16} style={{ flexShrink: 0 }} />
            {laps > 0 ? (finished ? `已完成 ${laps} 輪迭代，價值持續累積；專案早已結案，產品還在跑。` : `已完成 ${laps} 輪迭代，每一輪都釋出價值，然後進入下一輪。`) : "每一輪都釋出價值，然後進入下一輪。"}
          </div>
        </div>
      </div>
    </div>
  );
}
