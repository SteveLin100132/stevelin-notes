import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";

/* ================================================================
 * 資料：之後新增量測，往下追加一列即可（日期 YYYY-MM-DD、體重 kg）。
 * 週平均、建議區間、座標軸範圍、週日／週一標記全部由此陣列計算。
 * ================================================================ */
const WEIGHTS: { date: string; kg: number }[] = [
  { date: "2026-09-28", kg: 73.05 },
  { date: "2026-09-29", kg: 73.4 },
  { date: "2026-09-30", kg: 72.55 },
  { date: "2026-10-01", kg: 72.45 },
  { date: "2026-10-02", kg: 72.35 },
  { date: "2026-10-03", kg: 72.4 },
  { date: "2026-10-04", kg: 73.1 },
  { date: "2026-10-05", kg: 73.95 },
  { date: "2026-10-06", kg: 73.15 },
  { date: "2026-10-07", kg: 72.55 },
  { date: "2026-10-08", kg: 72.55 },
  { date: "2026-10-09", kg: 72.85 },
  { date: "2026-10-10", kg: 72.65 },
  { date: "2026-10-11", kg: 73.6 },
  { date: "2026-10-12", kg: 74.0 },
  { date: "2026-10-13", kg: 73.1 },
  { date: "2026-10-14", kg: 73.4 },
  { date: "2026-10-15", kg: 73.3 },
  { date: "2026-10-16", kg: 73.2 },
  { date: "2026-10-17", kg: 73.1 },
  { date: "2026-10-18", kg: 73.6 },
];

/* 建議增重速度（筆記）：每月 +0.25～0.5 kg；一個月以 30.44 天換算成每日斜率 */
const GAIN_LOW_PER_MONTH = 0.25;
const GAIN_HIGH_PER_MONTH = 0.5;
const DAYS_PER_MONTH = 30.44;
const LOW_PER_DAY = GAIN_LOW_PER_MONTH / DAYS_PER_MONTH;
const HIGH_PER_DAY = GAIN_HIGH_PER_MONTH / DAYS_PER_MONTH;
/* 筆記中的調整門檻：週平均每週增加 0.2 kg 以上就減熱量 */
const ADJUST_THRESHOLD_PER_WEEK = 0.2;

/* trendlink-design 色票（生成元件的 Tailwind class 不會被編譯，直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700
const BLUE_400 = "#4d84cb";
const BLUE_300 = "#7ba6da";
const BLUE_200 = "#adc8e8";
const ORANGE = "#e37b24"; // --orange-500
const ORANGE_700 = "#a04f15";
const SUCCESS = "#2e9e6b";
const TEXT = "#3a4456"; // --neutral-700
const STRONG = "#161c28";
const MUTED = "#6c798e"; // --neutral-500
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

const DAY_MS = 86400000;
const WD = ["日", "一", "二", "三", "四", "五", "六"];

/* ---------- 計算 ---------- */

interface Pt {
  i: number; // 距第一筆的天數
  date: string;
  kg: number;
  wd: number; // 0 = 週日、1 = 週一
  week: number; // 所屬週的索引
}

interface Week {
  n: number;
  startI: number; // 該週週一的天數索引
  endI: number; // 該週週日的天數索引
  mid: number; // 該週實際有資料日期的平均位置（完整一週 = 週四）
  avg: number;
  count: number;
  first: string;
  last: string;
}

const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const mmdd = (s: string) => s.slice(5).replace("-", "/");
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const signed = (v: number, digits = 2) => `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(digits)}`;

function analyze(rows: { date: string; kg: number }[]) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const t0 = parse(sorted[0].date);
  const weeks: Week[] = [];
  const pts: Pt[] = [];
  const weekIndex = new Map<number, number>();

  for (const r of sorted) {
    const t = parse(r.date);
    const i = Math.round((t - t0) / DAY_MS);
    const wd = new Date(t).getUTCDay();
    const monday = i - ((wd + 6) % 7); // 週一～週日為一週
    let w = weekIndex.get(monday);
    if (w === undefined) {
      w = weeks.length;
      weekIndex.set(monday, w);
      weeks.push({ n: w + 1, startI: monday, endI: monday + 6, mid: 0, avg: 0, count: 0, first: r.date, last: r.date });
    }
    pts.push({ i, date: r.date, kg: r.kg, wd, week: w });
  }
  for (const w of weeks) {
    const ps = pts.filter((p) => p.week === w.n - 1);
    w.mid = mean(ps.map((p) => p.i));
    w.avg = mean(ps.map((p) => p.kg));
    w.count = ps.length;
    w.first = ps[0].date;
    w.last = ps[ps.length - 1].date;
  }

  const lastI = pts[pts.length - 1].i;

  /* 建議區間：錨定在「第一週的中點（完整週 = 週四）、第一週週平均」。
   * 選中點而非 09/28，是因為之後拿來比較的是各週週平均（同樣落在各週中點），
   * 兩者在同一個時間基準上才可直接對照。 */
  const anchor = { i: weeks[0].mid, kg: weeks[0].avg };
  const bandAt = (i: number) => ({
    lo: anchor.kg + LOW_PER_DAY * (i - anchor.i),
    hi: anchor.kg + HIGH_PER_DAY * (i - anchor.i),
  });
  const bandEnd = Math.max(lastI, anchor.i);

  const lastW = weeks[weeks.length - 1];
  const firstW = weeks[0];
  const rate = weeks.length >= 2 ? (lastW.avg - firstW.avg) / ((lastW.mid - firstW.mid) / 7) : null; // kg/週
  const steps = weeks.slice(1).map((w, k) => w.avg - weeks[k].avg);

  const sunMon = pts.filter((p) => p.wd === 0 || p.wd === 1);
  const others = pts.filter((p) => p.wd !== 0 && p.wd !== 1);
  const sunMonAvg = sunMon.length ? mean(sunMon.map((p) => p.kg)) : null;
  const othersAvg = others.length ? mean(others.map((p) => p.kg)) : null;

  /* 座標範圍：涵蓋每日值、週平均與建議區間 */
  const vals = [...pts.map((p) => p.kg), bandAt(bandEnd).hi, bandAt(anchor.i).lo];
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const step = maxV - minV + 0.3 <= 2.5 ? 0.25 : 0.5;
  const yMin = Math.floor((minV - 0.15) / step) * step;
  const yMax = Math.ceil((maxV + 0.25) / step) * step;

  return { pts, weeks, lastI, anchor, bandAt, bandEnd, rate, steps, sunMonAvg, othersAvg, yMin, yMax, step };
}

/* ---------- 量測：讓 viewBox 寬 = 像素寬 ---------- */

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

/* ---------- 圖 ---------- */

type Layers = { daily: boolean; weekly: boolean; band: boolean };
type Data = ReturnType<typeof analyze>;

function Chart({ d, layers, reduce }: { d: Data; layers: Layers; reduce: boolean }) {
  const [ref, W] = useMeasuredWidth(560);
  const [hover, setHover] = useState<number | null>(null);
  const H = 360;
  const padL = 50;
  const padR = 20;
  const padT = 50;
  const padB = 46;
  const plotW = W - padL - padR;
  const base = H - padB;
  const span = d.lastI + 1; // 定義域 [-0.5, lastI + 0.5]
  const sx = (i: number) => padL + ((i + 0.5) / span) * plotW;
  const sy = (v: number) => base - ((base - padT) * (v - d.yMin)) / (d.yMax - d.yMin);
  const pxPerDay = plotW / span;

  const yTicks: number[] = [];
  for (let v = d.yMin; v <= d.yMax + 1e-9; v += d.step) yTicks.push(+v.toFixed(2));
  const labelEvery = pxPerDay >= 32 ? 1 : pxPerDay >= 16 ? 2 : 7;

  const dailyPath = d.pts.map((p, k) => `${k ? "L" : "M"} ${sx(p.i).toFixed(1)} ${sy(p.kg).toFixed(1)}`).join(" ");
  const weeklyPath = d.weeks.map((w, k) => `${k ? "L" : "M"} ${sx(w.mid).toFixed(1)} ${sy(w.avg).toFixed(1)}`).join(" ");

  const bandPts: string[] = [];
  const b0 = d.anchor.i;
  const b1 = d.bandEnd;
  for (const i of [b0, b1]) bandPts.push(`${sx(i).toFixed(1)},${sy(d.bandAt(i).hi).toFixed(1)}`);
  for (const i of [b1, b0]) bandPts.push(`${sx(i).toFixed(1)},${sy(d.bandAt(i).lo).toFixed(1)}`);

  const onMove = (e: RPointerEvent<SVGRectElement>) => {
    const svg = ref.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) * (W / r.width);
    const i = ((x - padL) / plotW) * span - 0.5;
    let best = 0;
    for (let k = 1; k < d.pts.length; k++) if (Math.abs(d.pts[k].i - i) < Math.abs(d.pts[best].i - i)) best = k;
    setHover(best);
  };

  const hp = hover !== null ? d.pts[hover] : null;
  const draw = (delay: number) => ({
    initial: reduce ? false : { pathLength: 0 },
    animate: { pathLength: 1 },
    transition: { duration: reduce ? 0 : 0.8, ease: "easeOut" as const, delay: reduce ? 0 : delay },
  });

  const ariaWeeks = d.weeks.map((w) => `第 ${w.n} 週 ${w.avg.toFixed(2)}`).join("、");

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`每日體重折線圖，${mmdd(d.pts[0].date)} 至 ${mmdd(d.pts[d.pts.length - 1].date)}。週平均：${ariaWeeks} kg。${d.rate !== null ? `平均每週 ${signed(d.rate)} kg。` : ""}建議增重區間每月 +0.25～0.5 kg。週日與週一以橘點標示。`}
      style={{ display: "block", touchAction: "pan-y" }}
    >
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={8} fill="#ffffff" stroke={GRAY_2} strokeWidth={1} />

      {/* 水平格線與 y 刻度 */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} stroke={GRAY_2} strokeWidth={1} />
          <text x={padL - 8} y={sy(v) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={MONO}>
            {v.toFixed(2)}
          </text>
        </g>
      ))}
      <text x={padL - 8} y={padT - 10} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT}>
        kg
      </text>
      <line x1={padL} y1={base} x2={W - padR} y2={base} stroke={GRAY} strokeWidth={1} />

      {/* 週分隔線與週標題 */}
      {d.weeks.map((w, k) => {
        const left = Math.max(w.startI, 0) - 0.5; // 資料若不是從週一開始，標題只置中於有資料的範圍
        const right = Math.min(w.endI + 0.5, d.lastI + 0.5);
        const cx = (sx(left) + sx(right)) / 2;
        const colW = sx(right) - sx(left);
        const step = k > 0 ? d.steps[k - 1] : null;
        return (
          <g key={w.n}>
            {k > 0 && <line x1={sx(w.startI - 0.5)} y1={10} x2={sx(w.startI - 0.5)} y2={base} stroke={GRAY} strokeWidth={1} strokeDasharray="3 3" />}
            {colW >= 140 ? (
              <>
                <text x={cx} y={22} textAnchor="middle" fontSize={11.5} fontFamily={FONT} fill={STRONG} fontWeight={700}>
                  {`第 ${w.n} 週　`}
                  <tspan fill={NAVY} fontFamily={MONO} fontWeight={800}>
                    {w.avg.toFixed(2)}
                  </tspan>
                  <tspan fill={MUTED} fontWeight={400}>
                    {" kg"}
                  </tspan>
                </text>
                <text x={cx} y={37} textAnchor="middle" fontSize={10} fontFamily={MONO} fill={MUTED}>
                  {`${mmdd(w.first)}–${mmdd(w.last)}`}
                  {w.count < 7 ? `（${w.count} 天）` : ""}
                  {step !== null ? `  週增 ${signed(step)}` : ""}
                </text>
              </>
            ) : colW >= 44 ? (
              <text x={cx} y={28} textAnchor="middle" fontSize={10.5} fontFamily={MONO} fill={NAVY} fontWeight={800}>
                {w.avg.toFixed(2)}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* 建議區間 */}
      {layers.band && b1 > b0 && (
        <g>
          <polygon points={bandPts.join(" ")} fill={SUCCESS} fillOpacity={0.1} />
          <line x1={sx(b0)} y1={sy(d.bandAt(b0).hi)} x2={sx(b1)} y2={sy(d.bandAt(b1).hi)} stroke={SUCCESS} strokeWidth={1} strokeDasharray="4 3" />
          <line x1={sx(b0)} y1={sy(d.bandAt(b0).lo)} x2={sx(b1)} y2={sy(d.bandAt(b1).lo)} stroke={SUCCESS} strokeWidth={1} strokeDasharray="4 3" />
          <text
            x={sx(b1) - 4}
            y={sy(d.bandAt(b1).lo) + 14}
            textAnchor="end"
            fontSize={10}
            fontFamily={FONT}
            fill={SUCCESS}
            stroke="#ffffff"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {`建議 +${GAIN_LOW_PER_MONTH}～${GAIN_HIGH_PER_MONTH} kg/月（起點 ${d.anchor.kg.toFixed(2)}）`}
          </text>
        </g>
      )}

      {/* 週平均：週內水平虛線 + 中點連線（粗） */}
      {layers.weekly && (
        <g>
          {d.weeks.map((w) => (
            <line
              key={w.n}
              x1={sx(Math.max(w.startI, 0) - 0.4)}
              y1={sy(w.avg)}
              x2={sx(Math.min(w.endI, d.lastI) + 0.4)}
              y2={sy(w.avg)}
              stroke={BLUE_300}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          ))}
          {d.weeks.length > 1 && <motion.path d={weeklyPath} fill="none" stroke={NAVY} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" {...draw(0.3)} />}
          {d.weeks.map((w) => (
            <circle key={w.n} cx={sx(w.mid)} cy={sy(w.avg)} r={4.5} fill="#ffffff" stroke={NAVY} strokeWidth={2} />
          ))}
        </g>
      )}

      {/* 每日體重：細線 + 點；週日／週一以橘點並標數值 */}
      {layers.daily && (
        <g>
          <motion.path d={dailyPath} fill="none" stroke={BLUE_400} strokeWidth={1.25} strokeLinejoin="round" {...draw(0)} />
          {d.pts.map((p) => {
            const hl = p.wd === 0 || p.wd === 1;
            return (
              <g key={p.date}>
                <circle cx={sx(p.i)} cy={sy(p.kg)} r={hl ? 4 : 2.5} fill={hl ? ORANGE : BLUE_400} stroke="#ffffff" strokeWidth={hl ? 1.5 : 0} />
                {hl && pxPerDay >= 14 && (
                  <text
                    x={sx(p.i)}
                    y={sy(p.kg) - 9}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fontFamily={MONO}
                    fill={ORANGE_700}
                    stroke="#ffffff"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {p.kg.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* x 軸：日期 + 星期（週日／週一為橘色） */}
      {d.pts.map((p) => {
        const show = labelEvery === 7 ? p.wd === 1 : p.i % labelEvery === 0;
        if (!show) return null;
        const hl = p.wd === 0 || p.wd === 1;
        return (
          <g key={`x${p.date}`}>
            <line x1={sx(p.i)} y1={base} x2={sx(p.i)} y2={base + 4} stroke={GRAY} strokeWidth={1} />
            <text x={sx(p.i)} y={base + 16} textAnchor="middle" fontSize={9.5} fontFamily={MONO} fill={hl ? ORANGE_700 : MUTED}>
              {mmdd(p.date)}
            </text>
            <text x={sx(p.i)} y={base + 30} textAnchor="middle" fontSize={9.5} fontFamily={FONT} fill={hl ? ORANGE_700 : MUTED} fontWeight={hl ? 700 : 400}>
              {WD[p.wd]}
            </text>
          </g>
        );
      })}

      {/* hover 游標與提示 */}
      {hp && (
        <g pointerEvents="none">
          <line x1={sx(hp.i)} y1={padT} x2={sx(hp.i)} y2={base} stroke={NAVY} strokeWidth={1} strokeOpacity={0.5} />
          <circle cx={sx(hp.i)} cy={sy(hp.kg)} r={5.5} fill="none" stroke={NAVY} strokeWidth={1.5} />
          {(() => {
            const bw = 150;
            const bh = 62;
            const right = sx(hp.i) + 12 + bw <= W - padR;
            const bx = right ? sx(hp.i) + 12 : sx(hp.i) - 12 - bw;
            const by = padT + 6;
            const wk = d.weeks[hp.week];
            const band = d.bandAt(hp.i);
            return (
              <g>
                <rect x={bx} y={by} width={bw} height={bh} rx={6} fill="#ffffff" stroke={BLUE_200} strokeWidth={1} />
                <text x={bx + 10} y={by + 17} fontSize={11} fontFamily={FONT} fill={STRONG} fontWeight={700}>
                  {`${mmdd(hp.date)}（${WD[hp.wd]}）`}
                  <tspan fontFamily={MONO} fill={hp.wd <= 1 ? ORANGE_700 : NAVY}>{`  ${hp.kg.toFixed(2)} kg`}</tspan>
                </text>
                <text x={bx + 10} y={by + 34} fontSize={10.5} fontFamily={FONT} fill={TEXT}>
                  {`第 ${wk.n} 週平均 `}
                  <tspan fontFamily={MONO}>{wk.avg.toFixed(2)}</tspan>
                </text>
                <text x={bx + 10} y={by + 50} fontSize={10.5} fontFamily={FONT} fill={TEXT}>
                  {hp.i >= d.anchor.i ? (
                    <>
                      {"建議區間 "}
                      <tspan fontFamily={MONO}>{`${band.lo.toFixed(2)}～${band.hi.toFixed(2)}`}</tspan>
                    </>
                  ) : (
                    "建議區間自第 1 週中點起算"
                  )}
                </text>
              </g>
            );
          })()}
        </g>
      )}
      <rect x={padL} y={padT} width={plotW} height={base - padT} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
    </svg>
  );
}

/* ---------- 根元件 ---------- */

const LAYER_DEFS: { k: keyof Layers; label: string; swatch: CSSProperties }[] = [
  { k: "daily", label: "每日體重", swatch: { height: 0, borderTop: `1.5px solid ${BLUE_400}` } },
  { k: "weekly", label: "週平均", swatch: { height: 0, borderTop: `3.5px solid ${NAVY}` } },
  { k: "band", label: "建議增重區間", swatch: { height: 8, background: "rgba(46,158,107,0.15)", borderTop: `1px dashed ${SUCCESS}`, borderBottom: `1px dashed ${SUCCESS}` } },
];

function Stat({ k, v, hint, color }: { k: string; v: string; hint: string; color: string }) {
  return (
    <div style={{ background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ fontSize: 11.5, color: MUTED, fontWeight: 700 }}>{k}</div>
      <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 800, color, marginTop: 2 }}>{v}</div>
      <div style={{ fontSize: 11.5, color: TEXT, marginTop: 2, lineHeight: 1.5 }}>{hint}</div>
    </div>
  );
}

export default function WeightTrend() {
  const reduce = useReducedMotion() ?? false;
  const [layers, setLayers] = useState<Layers>({ daily: true, weekly: true, band: true });
  const d = useMemo(() => (WEIGHTS.length ? analyze(WEIGHTS) : null), []);

  if (!d) return <div style={{ width: "100%", fontFamily: FONT, color: MUTED, fontSize: 13 }}>尚無體重資料</div>;

  const lastW = d.weeks[d.weeks.length - 1];
  const recLo = LOW_PER_DAY * 7;
  const recHi = HIGH_PER_DAY * 7;
  const over = d.rate !== null && d.rate > ADJUST_THRESHOLD_PER_WEEK;

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT, color: TEXT }}>
      <div role="group" aria-label="摘要" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <Stat k={`最新週平均（第 ${lastW.n} 週）`} v={`${lastW.avg.toFixed(2)} kg`} hint={d.weeks.map((w) => w.avg.toFixed(2)).join(" → ")} color={NAVY} />
        <Stat
          k="實際週增幅"
          v={d.rate !== null ? `${signed(d.rate)} kg/週` : "—"}
          hint={d.rate !== null ? `${over ? "高於" : "未超過"}筆記的調整門檻 ${ADJUST_THRESHOLD_PER_WEEK} kg/週` : "需至少兩週資料"}
          color={over ? ORANGE_700 : NAVY}
        />
        <Stat k="建議週增幅" v={`+${recLo.toFixed(2)}～${recHi.toFixed(2)}`} hint={`每月 +${GAIN_LOW_PER_MONTH}～${GAIN_HIGH_PER_MONTH} kg ÷ ${DAYS_PER_MONTH} 天 × 7`} color={SUCCESS} />
        <Stat
          k="週日＋週一 vs 其他日"
          v={d.sunMonAvg !== null && d.othersAvg !== null ? `${signed(d.sunMonAvg - d.othersAvg)} kg` : "—"}
          hint={d.sunMonAvg !== null && d.othersAvg !== null ? `平均 ${d.sunMonAvg.toFixed(2)} vs ${d.othersAvg.toFixed(2)}` : ""}
          color={ORANGE_700}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div role="group" aria-label="顯示圖層" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LAYER_DEFS.map((l) => {
            const on = layers[l.k];
            return (
              <button
                key={l.k}
                type="button"
                aria-pressed={on}
                onClick={() => setLayers((s) => ({ ...s, [l.k]: !s[l.k] }))}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 6,
                  border: `1px solid ${on ? BLUE_200 : GRAY_2}`,
                  background: "#ffffff",
                  color: on ? NAVY : MUTED,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: FONT,
                  cursor: "pointer",
                  opacity: on ? 1 : 0.6,
                }}
              >
                <span aria-hidden="true" style={{ width: 18, display: "inline-block", ...l.swatch }} />
                {l.label}
              </button>
            );
          })}
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: ORANGE, display: "inline-block" }} />
          週日／週一
        </span>
        <span style={{ fontSize: 12, color: MUTED, marginLeft: "auto" }}>滑過圖表看單日數值與當天的建議區間</span>
      </div>

      <Chart d={d} layers={layers} reduce={reduce} />
    </div>
  );
}
