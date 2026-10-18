import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CircleAlert, CircleCheck, Minus, Plus, Timer } from "lucide-react";

/* ---------- 色票（trendlink-design token；Tailwind class 不會被編譯，改用常數） ---------- */

interface Palette {
  text: string;
  muted: string;
  panel: string; // 圖面底色
  border: string; // 圖面細框
  grid: string; // 格線
  warm: string; // 熱身組長條
  warmText: string;
  work: string; // 正式組長條（主色藍）
  workLight: string; // 門檻前完成格
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentLine: string;
  orange: string;
  orangeSoft: string;
  success: string;
  successSoft: string;
  idle: string; // 未完成格外框
}

const LIGHT: Palette = {
  text: "#3a4456", // --neutral-700
  muted: "#6c798e", // --neutral-500
  panel: "#ffffff",
  border: "#e1e6ee", // --neutral-200
  grid: "#eef1f6", // --neutral-100
  warm: "#adc8e8", // --blue-200
  warmText: "#1b4f9c",
  work: "#1b4f9c", // --blue-700
  workLight: "#7ba6da", // --blue-300
  accent: "#1b4f9c",
  accentStrong: "#1b4f9c",
  accentSoft: "#eef4fb", // --blue-50
  accentLine: "#adc8e8", // --blue-200
  orange: "#c7641a", // --orange-600
  orangeSoft: "#fdf4e6", // --orange-50
  success: "#2e9e6b", // --success-500
  successSoft: "#e7f6ee", // --success-50
  idle: "#cbd3df", // --neutral-300
};

const DARK: Palette = {
  text: "#e1e6ee",
  muted: "#9aa6b8", // --neutral-400
  panel: "#161c28", // --neutral-900
  border: "#3a4456",
  grid: "#262e3d",
  warm: "#1f5aa6",
  warmText: "#adc8e8",
  work: "#4d84cb", // --blue-400
  workLight: "#2c6ebb",
  accent: "#7ba6da", // --blue-300
  accentStrong: "#2c6ebb", // --blue-500
  accentSoft: "#0b1f3e", // --blue-950
  accentLine: "#1f5aa6",
  orange: "#f2b955", // --orange-300
  orangeSoft: "#2a2116",
  success: "#5cc497",
  successSoft: "#12291f",
  idle: "#4f5b6e", // --neutral-600
};

const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

/* ---------- 資料（全部取自筆記） ---------- */

type Day = "A" | "B";

interface WarmSet {
  kg: number;
  reps: number;
}

interface DayPlan {
  label: string;
  warmups: readonly WarmSet[];
  workKg: number;
  sets: number;
  lo: number;
  hi: number;
  threshold: number; // 3 組皆達到此次數 → 加重
  nextKg: number;
  rest: string;
}

const PLAN: Record<Day, DayPlan> = {
  A: {
    label: "推日 A（第 1 個動作）",
    warmups: [
      { kg: 40, reps: 8 },
      { kg: 50, reps: 3 },
    ],
    workKg: 60,
    sets: 3,
    lo: 4,
    hi: 8,
    threshold: 6,
    nextKg: 62.5,
    rest: "3 分",
  },
  B: {
    label: "推日 B（第 2 個動作）",
    warmups: [{ kg: 40, reps: 5 }],
    workKg: 55,
    sets: 3,
    lo: 5,
    hi: 8,
    threshold: 8,
    nextKg: 57.5,
    rest: "3 分",
  },
};

const Y_MAX = 70;
const Y_TICKS = [0, 10, 20, 30, 40, 50, 60, 70];

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const initReps = (d: Day) => Array.from({ length: PLAN[d].sets }, () => PLAN[d].lo);

/* ---------- 環境偵測 ---------- */

function parseRgb(s: string): [number, number, number, number] | null {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
}

function pageBgIsDark(): boolean {
  for (const el of [document.body, document.documentElement]) {
    if (!el) continue;
    const c = parseRgb(getComputedStyle(el).backgroundColor);
    if (!c || c[3] === 0) continue;
    return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 < 0.45;
  }
  return false;
}

function detectDark(mq: MediaQueryList): boolean {
  const html = document.documentElement;
  const theme = html.getAttribute("data-theme");
  if (html.classList.contains("dark") || theme === "dark") return true;
  if (html.classList.contains("light") || theme === "light") return false;
  return mq.matches && pageBgIsDark();
}

function useDarkMode(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDark(detectDark(mq));
    update();
    const mo = new MutationObserver(update);
    const opts: MutationObserverInit = { attributes: true, attributeFilter: ["class", "data-theme", "style"] };
    mo.observe(document.documentElement, opts);
    if (document.body) mo.observe(document.body, opts);
    mq.addEventListener("change", update);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);
  return dark;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.round(el.getBoundingClientRect().width));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/* ---------- 左：重量階梯 ---------- */

interface Bar {
  key: string;
  kind: "warm" | "work";
  kg: number;
  reps: number;
  name: string;
}

const LADDER_H = 300;
const LADDER_MIN_W = 320;

function WeightLadder({
  day,
  reps,
  met,
  pal,
  reduce,
  width,
}: {
  day: Day;
  reps: readonly number[];
  met: boolean;
  pal: Palette;
  reduce: boolean;
  width: number;
}) {
  const plan = PLAN[day];
  const W = Math.max(width, LADDER_MIN_W);
  const padL = 46;
  const padR = 14;
  const padT = 34;
  const padB = 52;
  const plotW = W - padL - padR;
  const plotH = LADDER_H - padT - padB;
  const baseY = padT + plotH;
  const yOf = (kg: number) => baseY - (kg / Y_MAX) * plotH;

  const bars: Bar[] = [
    ...plan.warmups.map((w, i): Bar => ({ key: `w${i}`, kind: "warm", kg: w.kg, reps: w.reps, name: `熱身 ${i + 1}` })),
    ...reps.map((r, i): Bar => ({ key: `s${i}`, kind: "work", kg: plan.workKg, reps: r, name: `第 ${i + 1} 組` })),
  ];
  const slots = bars.length + 1; // 最後一格保留給「下次」
  const slotW = plotW / slots;
  const barW = Math.min(slotW * 0.56, 70);
  const cx = (i: number) => padL + slotW * (i + 0.5);
  const tr = { duration: reduce ? 0 : 0.35, ease: "easeOut" as const };

  // 階梯線：連接每根長條頂端中點
  const stair = bars
    .map((b, i) => {
      const y = yOf(b.kg);
      const x0 = cx(i) - barW / 2;
      const x1 = cx(i) + barW / 2;
      return `${i === 0 ? "M" : "L"}${x0},${y} L${x1},${y}`;
    })
    .join(" ");

  const nextX = cx(bars.length);
  const nextY = yOf(plan.nextKg);

  const aria = `重量階梯圖：${day} 日熱身 ${plan.warmups.map((w) => `${w.kg}kg×${w.reps}`).join("、")}，正式組 ${plan.workKg}kg 三組，目前次數 ${reps.join("、")} 下；${
    met ? `已達加重條件，下次 ${plan.nextKg}kg` : `尚未達加重條件，維持 ${plan.workKg}kg`
  }。`;

  return (
    <svg viewBox={`0 0 ${W} ${LADDER_H}`} width="100%" role="img" aria-label={aria} style={{ display: "block" }}>
      <rect x={0.5} y={0.5} width={W - 1} height={LADDER_H - 1} rx={8} fill={pal.panel} stroke={pal.border} strokeWidth={1} />
      <text x={14} y={20} fontSize={12} fontWeight={700} fill={pal.muted} fontFamily={FONT}>
        重量階梯（kg）
      </text>

      {/* y 軸格線與刻度 */}
      {Y_TICKS.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={yOf(t)} y2={yOf(t)} stroke={t === 0 ? pal.idle : pal.grid} strokeWidth={1} />
          <text x={padL - 8} y={yOf(t) + 4} textAnchor="end" fontSize={10.5} fill={pal.muted} fontFamily={MONO}>
            {t}
          </text>
        </g>
      ))}

      <motion.path
        key={`stair-${day}`}
        d={stair}
        fill="none"
        stroke={pal.muted}
        strokeWidth={1}
        strokeDasharray="3 3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={tr}
      />

      {bars.map((b, i) => {
        const y = yOf(b.kg);
        const h = baseY - y;
        const fill = b.kind === "warm" ? pal.warm : pal.work;
        return (
          <g key={`${day}-${b.key}`}>
            <motion.rect
              x={cx(i) - barW / 2}
              y={y}
              width={barW}
              height={h}
              rx={3}
              fill={fill}
              style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ ...tr, delay: reduce ? 0 : i * 0.04 }}
            />
            <text x={cx(i)} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill={b.kind === "warm" ? pal.warmText : pal.accent} fontFamily={MONO}>
              {b.kg}kg
            </text>
            <text x={cx(i)} y={baseY + 18} textAnchor="middle" fontSize={11.5} fill={pal.muted} fontFamily={FONT}>
              {b.name}
            </text>
            <text x={cx(i)} y={baseY + 35} textAnchor="middle" fontSize={12} fontWeight={700} fill={pal.text} fontFamily={MONO}>
              × {b.reps}
            </text>
          </g>
        );
      })}

      {/* 下次重量：達標才出現 */}
      <motion.g initial={false} animate={{ opacity: met ? 1 : 0.55 }} transition={tr}>
        {met ? (
          <>
            <rect
              x={nextX - barW / 2}
              y={nextY}
              width={barW}
              height={baseY - nextY}
              rx={3}
              fill="none"
              stroke={pal.success}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <text x={nextX} y={nextY - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill={pal.success} fontFamily={MONO}>
              {plan.nextKg}kg
            </text>
          </>
        ) : (
          <text x={nextX} y={yOf(plan.workKg) - 8} textAnchor="middle" fontSize={11.5} fill={pal.muted} fontFamily={MONO}>
            {plan.workKg}kg
          </text>
        )}
        <text x={nextX} y={baseY + 18} textAnchor="middle" fontSize={11.5} fill={met ? pal.success : pal.muted} fontWeight={met ? 700 : 400} fontFamily={FONT}>
          下次
        </text>
        <text x={nextX} y={baseY + 35} textAnchor="middle" fontSize={11} fill={pal.muted} fontFamily={FONT}>
          {met ? "加重" : "維持"}
        </text>
      </motion.g>
    </svg>
  );
}

/* ---------- 右：正式組次數格 ---------- */

function SetRow({
  index,
  value,
  plan,
  pal,
  reduce,
  onChange,
}: {
  index: number;
  value: number;
  plan: DayPlan;
  pal: Palette;
  reduce: boolean;
  onChange: (v: number) => void;
}) {
  const cells = range(plan.lo, plan.hi);
  const n = cells.length;
  const thrPct = ((plan.threshold - plan.lo) / n) * 100;
  const ok = value >= plan.threshold;

  const stepBtn = (disabled: boolean): CSSProperties => ({
    width: 28,
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    border: `1px solid ${disabled ? pal.border : pal.accentLine}`,
    background: "transparent",
    color: disabled ? pal.idle : pal.accent,
    cursor: disabled ? "not-allowed" : "pointer",
    padding: 0,
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "54px 104px minmax(0,1fr)", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: pal.text }}>第 {index + 1} 組</span>
      <div role="group" aria-label={`第 ${index + 1} 組次數`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          aria-label={`第 ${index + 1} 組減少一下`}
          disabled={value <= plan.lo}
          onClick={() => onChange(Math.max(plan.lo, value - 1))}
          style={stepBtn(value <= plan.lo)}
        >
          <Minus size={14} />
        </button>
        <span aria-live="polite" style={{ minWidth: 30, textAlign: "center", fontFamily: MONO, fontSize: 14, fontWeight: 800, color: ok ? pal.accent : pal.text }}>
          {value}
        </span>
        <button
          type="button"
          aria-label={`第 ${index + 1} 組增加一下`}
          disabled={value >= plan.hi}
          onClick={() => onChange(Math.min(plan.hi, value + 1))}
          style={stepBtn(value >= plan.hi)}
        >
          <Plus size={14} />
        </button>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, minmax(0,1fr))`, gap: 4 }}>
          {cells.map((c) => {
            const done = c <= value;
            const zone = c >= plan.threshold;
            const fill = done ? (zone ? pal.work : pal.workLight) : zone ? pal.accentSoft : pal.panel;
            return (
              <motion.div
                key={c}
                initial={false}
                animate={{ backgroundColor: fill }}
                transition={{ duration: reduce ? 0 : 0.2 }}
                style={{
                  height: 26,
                  borderRadius: 4,
                  border: `1px ${done || zone ? "solid" : "dashed"} ${done ? fill : zone ? pal.accentLine : pal.idle}`,
                  boxSizing: "border-box",
                }}
              />
            );
          })}
        </div>
        <span
          aria-hidden="true"
          style={{ position: "absolute", top: -4, bottom: -4, left: `calc(${thrPct}% - 2px)`, borderLeft: `2px solid ${pal.orange}` }}
        />
      </div>
    </div>
  );
}

function CellScale({ plan, pal }: { plan: DayPlan; pal: Palette }) {
  const cells = range(plan.lo, plan.hi);
  const n = cells.length;
  const thrPct = ((plan.threshold - plan.lo) / n) * 100;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "54px 104px minmax(0,1fr)", gap: 10, alignItems: "end" }}>
      <span />
      <span style={{ fontSize: 11, fontWeight: 700, color: pal.muted }}>完成次數</span>
      <div style={{ position: "relative", paddingTop: 18 }}>
        <span
          style={{
            position: "absolute",
            top: 0,
            left: `calc(${thrPct}% - 2px)`,
            fontSize: 11,
            fontWeight: 700,
            color: pal.orange,
            whiteSpace: "nowrap",
            transform: thrPct > 70 ? "translateX(-100%)" : "none",
            paddingLeft: thrPct > 70 ? 0 : 4,
            paddingRight: thrPct > 70 ? 4 : 0,
          }}
        >
          門檻 {plan.threshold} 下
        </span>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, minmax(0,1fr))`, gap: 4 }}>
          {cells.map((c) => (
            <span key={c} style={{ textAlign: "center", fontFamily: MONO, fontSize: 11, color: c >= plan.threshold ? pal.accent : pal.muted, fontWeight: c >= plan.threshold ? 700 : 400 }}>
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Swatch({ pal, color, dashed, border, label }: { pal: Palette; color: string; dashed?: boolean; border?: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: color,
          border: `1px ${dashed ? "dashed" : "solid"} ${border ?? color}`,
          boxSizing: "border-box",
          display: "inline-block",
        }}
      />
      <span style={{ color: pal.muted }}>{label}</span>
    </span>
  );
}

/* ---------- 主元件 ---------- */

export default function BenchPressProgression() {
  const reduce = useReducedMotion() ?? false;
  const dark = useDarkMode();
  const pal = dark ? DARK : LIGHT;
  const [rootRef, rootW] = useElementWidth<HTMLDivElement>();
  const [ladderRef, ladderW] = useElementWidth<HTMLDivElement>();
  const narrow = rootW > 0 && rootW < 620;

  const [day, setDay] = useState<Day>("A");
  const [repsByDay, setRepsByDay] = useState<Record<Day, number[]>>({ A: initReps("A"), B: initReps("B") });

  const plan = PLAN[day];
  const reps = repsByDay[day];
  const short = reps.map((r, i) => ({ i, gap: plan.threshold - r })).filter((s) => s.gap > 0);
  const met = short.length === 0;

  const setRep = (i: number, v: number) =>
    setRepsByDay((prev) => ({ ...prev, [day]: prev[day].map((r, j) => (j === i ? v : r)) }));

  const reset = () => setRepsByDay((prev) => ({ ...prev, [day]: initReps(day) }));

  const btn = (on: boolean): CSSProperties => ({
    height: 32,
    padding: "0 14px",
    border: "none",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    background: on ? pal.accentStrong : "transparent",
    color: on ? "#ffffff" : pal.accent,
    transition: "background-color 160ms, color 160ms",
  });

  return (
    <div ref={rootRef} className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT, color: pal.text }}>
      {/* A／B 切換 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div role="group" aria-label="選擇訓練日" style={{ display: "inline-flex", border: `1.5px solid ${pal.accentLine}`, borderRadius: 999, overflow: "hidden" }}>
          {(["A", "B"] as const).map((d) => (
            <button key={d} type="button" aria-pressed={day === d} onClick={() => setDay(d)} style={btn(day === d)}>
              {PLAN[d].label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12.5, color: pal.muted, display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          正式組 <strong style={{ color: pal.text, fontFamily: MONO }}>{plan.workKg}kg</strong> · {plan.sets} 組 × {plan.lo}～{plan.hi} 下
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            · <Timer size={13} /> 組間休息 {plan.rest}
          </span>
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0,1fr) minmax(0,1.1fr)", gap: 16, alignItems: "stretch" }}>
        <div ref={ladderRef} style={{ minWidth: 0 }}>
          <WeightLadder day={day} reps={reps} met={met} pal={pal} reduce={reduce} width={ladderW} />
        </div>

        <div
          style={{
            minWidth: 0,
            background: pal.panel,
            border: `1px solid ${pal.border}`,
            borderRadius: 8,
            padding: "14px 14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: pal.muted }}>正式組實際次數（3 組皆 ≥ {plan.threshold} 下才加重）</span>
            <button
              type="button"
              onClick={reset}
              style={{ height: 26, padding: "0 10px", borderRadius: 999, border: `1px solid ${pal.accentLine}`, background: "transparent", color: pal.accent, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              重設為下限
            </button>
          </div>
          <CellScale plan={plan} pal={pal} />
          {reps.map((r, i) => (
            <SetRow key={`${day}-${i}`} index={i} value={r} plan={plan} pal={pal} reduce={reduce} onChange={(v) => setRep(i, v)} />
          ))}
          <div role="group" aria-label="圖例" style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 11.5, marginTop: 2 }}>
            <Swatch pal={pal} color={pal.workLight} label="已完成（門檻前）" />
            <Swatch pal={pal} color={pal.work} label="已完成（達門檻）" />
            <Swatch pal={pal} color={pal.accentSoft} border={pal.accentLine} label="門檻區（未完成）" />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 0, height: 12, borderLeft: `2px solid ${pal.orange}`, display: "inline-block" }} />
              <span style={{ color: pal.muted }}>門檻線</span>
            </span>
          </div>
        </div>
      </div>

      {/* 結果 */}
      <motion.div
        key={`${day}-${met ? "ok" : "no"}`}
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.25 }}
        aria-live="polite"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 8,
          border: `1px solid ${met ? pal.success : pal.orange}`,
          background: met ? pal.successSoft : pal.orangeSoft,
          color: met ? pal.success : pal.orange,
        }}
      >
        {met ? <CircleCheck size={18} style={{ flexShrink: 0, marginTop: 1 }} /> : <CircleAlert size={18} style={{ flexShrink: 0, marginTop: 1 }} />}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 13.5 }}>
          {met ? (
            <>
              <strong style={{ fontSize: 14 }}>下次加重：{plan.nextKg}kg</strong>
              <span style={{ color: pal.text }}>
                3 組皆達 {plan.threshold} 下以上（{reps.join("、")} 下），下次 {day} 日正式組改用 {plan.nextKg}kg。
              </span>
            </>
          ) : (
            <>
              <strong style={{ fontSize: 14 }}>未達加重條件，下次維持 {plan.workKg}kg</strong>
              <span>
                {short.map((s) => `第 ${s.i + 1} 組還差 ${s.gap} 下`).join("、")}（門檻 {plan.threshold} 下）
              </span>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
