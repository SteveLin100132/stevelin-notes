import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Activity, ClipboardCheck, Utensils } from "lucide-react";

/* trendlink-design 色票（生成元件的 Tailwind class 不會被編譯，直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700
const NAVY_DEEP = "#112f5d"; // --blue-900
const BLUE_50 = "#eef4fb";
const BLUE_100 = "#d6e4f5";
const BLUE_200 = "#adc8e8";
const ORANGE = "#e37b24"; // --orange-500
const ORANGE_50 = "#fdf4e6";
const ORANGE_100 = "#fbe7c6";
const ORANGE_700 = "#a04f15";
const TEXT = "#3a4456"; // --neutral-700
const GRAY_2 = "#e1e6ee"; // --neutral-200
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_4 = "#9aa6b8"; // --neutral-400
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

/* ---------- 資料（全部取自筆記；標「推算」者由筆記數值相乘而來） ---------- */

type Phase = "bulk" | "cut" | "next";

const START_YEAR = 2026;
const START_MONTH = 10; // 2026/10 起
const AXIS_MONTHS = 24; // 軸顯示到 2028/10
const BULK_MIN = 8;
const BULK_MAX = 12;
const CUT_MIN = 3;
const CUT_MAX = 4;
const RATE_LO = 0.25; // kg / 月
const RATE_HI = 0.5;

/** 第 m 個月（0 = 2026/10）的年月 */
function ym(m: number): { y: number; mo: number } {
  const idx = START_MONTH - 1 + m;
  return { y: START_YEAR + Math.floor(idx / 12), mo: (idx % 12) + 1 };
}
function fmt(m: number): string {
  const { y, mo } = ym(m);
  return `${y}/${String(mo).padStart(2, "0")}`;
}
function kg(v: number): string {
  return `${+v.toFixed(2)}`;
}

interface Detail {
  title: string;
  meta: string;
  diet: string[];
  cardio: string[];
  check: string[];
}

const NONE = "（筆記尚未細列）";

function details(bulk: number, cut: number): Record<Phase, Detail> {
  return {
    bulk: {
      title: "增肌期",
      meta: `8～12 個月（目前選 ${bulk} 個月：2026/10 → ${fmt(bulk)}）・停止點：體脂約 15% 或腰圍明顯變粗`,
      diet: [
        "熱量盈餘：比維持熱量多 200～300 大卡",
        "蛋白質：每公斤 1.6～2.2g，約每天 115～155g，分 3～4 餐",
        "多出來的熱量優先給碳水，放在訓練前後",
      ],
      cardio: [
        "取消重訓後爬坡走（增肌期不需要）",
        "晨跑每週 3～4 次，其中 1 次間歇：快跑 1 分鐘、慢跑 2 分鐘 × 6～8 輪",
        "腿日當天或隔天早上可休息不跑",
      ],
      check: [
        "每天早上空腹量體重，看週平均",
        "每月 +0.25～0.5kg；一個月超過 1kg 代表吃太多",
        "每 2 週量腰圍（肚臍高度、早上空腹）並拍照",
        "腰圍漲得比體重快 → 熱量往下調 100～200 大卡",
        "體重漲但主要動作力量沒漲 → 檢查訓練",
      ],
    },
    cut: {
      title: "減脂期",
      meta: `3～4 個月（目前選 ${cut} 個月：${fmt(bulk)} → ${fmt(bulk + cut)}）`,
      diet: [NONE],
      cardio: [NONE],
      check: ["起點條件 = 增肌期停止點：體脂約 15% 或腰圍明顯變粗", `長度 3～4 個月；依增肌長度，最早 ${fmt(BULK_MIN + CUT_MIN)}、最晚 ${fmt(BULK_MAX + CUT_MAX)} 結束`],
    },
    next: {
      title: "第二輪（視情況）",
      meta: `筆記預估整體 1.5～2.5 年；一輪增肌＋減脂約 ${BULK_MIN + CUT_MIN}～${BULK_MAX + CUT_MAX} 個月（推算）`,
      diet: [NONE],
      cardio: [NONE],
      check: ["是否進入第二輪：筆記寫「視情況」", `1.5 年約落在 ${fmt(18)}、2.5 年約落在 ${fmt(30)}`],
    },
  };
}

const ACCENT: Record<Phase, { main: string; soft: string; border: string; ink: string }> = {
  bulk: { main: NAVY, soft: BLUE_50, border: BLUE_100, ink: NAVY },
  cut: { main: ORANGE, soft: ORANGE_50, border: ORANGE_100, ink: ORANGE_700 },
  next: { main: GRAY_4, soft: "#ffffff", border: GRAY_2, ink: TEXT },
};

/* ---------- 量測 ---------- */

const MIN_W = 640;

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

/* ---------- 圖：時間軸 ---------- */

interface TimelineProps {
  bulk: number;
  cut: number;
  phase: Phase;
  onPick: (p: Phase) => void;
  reduce: boolean;
}

function Timeline({ bulk, cut, phase, onPick, reduce }: TimelineProps) {
  const [ref, W] = useMeasuredWidth(MIN_W);
  const uid = useId().replace(/:/g, "");
  const hatchBlue = `hb-${uid}`;
  const hatchOrange = `ho-${uid}`;

  const X0 = 48;
  const X1 = W - 20;
  const pxm = (X1 - X0) / AXIS_MONTHS;
  const sx = (m: number) => X0 + pxm * m;

  // 版面
  const kgTop = 34;
  const kgBot = 100;
  const KG_MAX = 6;
  const sy = (v: number) => kgBot - ((kgBot - kgTop) * v) / KG_MAX;
  const r1 = 116; // 增肌停止點區間
  const r2 = 136; // 減脂結束區間
  const rH = 12;
  const laneY = 162;
  const laneH = 34;
  const axisY = 220;
  const H = axisY + 42;

  const tr = { duration: reduce ? 0 : 0.35, ease: "easeOut" as const };
  const labelEvery = pxm >= 30 ? 1 : 3;
  const dim = (p: Phase) => (phase === p ? 1 : 0.5);

  const cutEnd = bulk + cut;
  const gainLo = RATE_LO * bulk;
  const gainHi = RATE_HI * bulk;
  const band = `M${sx(0)} ${sy(0)} L${sx(bulk)} ${sy(gainHi)} L${sx(bulk)} ${sy(gainLo)} Z`;

  const bulkW = sx(bulk) - sx(0);
  const cutW = sx(cutEnd) - sx(bulk);
  const nextW = sx(AXIS_MONTHS) - sx(cutEnd) - 8;

  const clickable = (p: Phase): { onClick: () => void; style: CSSProperties } => ({ onClick: () => onPick(p), style: { cursor: "pointer" } });

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`增肌計畫時間軸：2026/10 起增肌期 ${bulk} 個月（範圍 8～12 個月，停止點落在 2027/06～2027/10），接減脂期 ${cut} 個月（範圍 3～4 個月，${fmt(BULK_MIN + CUT_MIN)}～${fmt(BULK_MAX + CUT_MAX)} 結束），之後視情況進入第二輪。依每月 0.25～0.5kg 推算，增肌期累積約 +${kg(gainLo)}～${kg(gainHi)}kg。`}
    >
      <defs>
        <pattern id={hatchBlue} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={6} stroke={BLUE_200} strokeWidth={1.5} />
        </pattern>
        <pattern id={hatchOrange} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={6} stroke={ORANGE_100} strokeWidth={2} />
        </pattern>
      </defs>

      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill="#ffffff" stroke={GRAY_2} strokeWidth={1} />

      {/* 月格線與刻度 */}
      {Array.from({ length: AXIS_MONTHS + 1 }, (_, m) => {
        const { y, mo } = ym(m);
        const showLabel = m % labelEvery === 0;
        const showYear = m === 0 || mo === 1;
        return (
          <g key={m}>
            <line x1={sx(m)} y1={kgTop - 6} x2={sx(m)} y2={axisY} stroke={showYear ? GRAY : GRAY_2} strokeWidth={1} />
            <line x1={sx(m)} y1={axisY} x2={sx(m)} y2={axisY + 4} stroke={GRAY} strokeWidth={1} />
            {showLabel && (
              <text x={sx(m)} y={axisY + 16} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={MONO}>
                {mo}
              </text>
            )}
            {showYear && (
              <text x={sx(m) + 3} y={axisY + 32} fontSize={10.5} fontWeight={700} fill={TEXT} fontFamily={MONO}>
                {y}
              </text>
            )}
          </g>
        );
      })}
      <line x1={X0} y1={axisY} x2={X1} y2={axisY} stroke={GRAY_4} strokeWidth={1} />

      {/* 1.5 年預估線 */}
      <line x1={sx(18)} y1={kgTop - 6} x2={sx(18)} y2={axisY} stroke={MUTED} strokeWidth={1} strokeDasharray="3 3" />
      <text x={sx(18) - 4} y={kgTop - 12} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT}>
        預估最快 1.5 年（{fmt(18)}）
      </text>
      <text x={X1} y={kgTop - 12} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT}>
        2.5 年 → {fmt(30)}
      </text>

      {/* 累積增重帶（推算） */}
      <text x={X0} y={18} fontSize={10.5} fontWeight={700} fill={TEXT} fontFamily={FONT}>
        累積增重（推算：每月 +0.25～0.5kg × 月數）
      </text>
      {[0, 2, 4, 6].map((v) => (
        <g key={v}>
          <line x1={X0} y1={sy(v)} x2={sx(BULK_MAX)} y2={sy(v)} stroke={GRAY_2} strokeWidth={1} strokeDasharray={v === 0 ? undefined : "2 3"} />
          <text x={X0 - 6} y={sy(v) + 3.5} textAnchor="end" fontSize={9.5} fill={MUTED} fontFamily={MONO}>
            +{v}kg
          </text>
        </g>
      ))}
      <motion.g initial={false} animate={{ opacity: dim("bulk") }} transition={tr} {...clickable("bulk")}>
        <motion.path initial={false} animate={{ d: band }} transition={tr} fill={BLUE_100} stroke={NAVY} strokeWidth={1} strokeLinejoin="round" />
        <motion.text initial={false} animate={{ x: sx(bulk) + 6, y: sy(gainHi) + 4 }} transition={tr} fontSize={10.5} fontWeight={700} fill={NAVY} fontFamily={MONO}>
          +{kg(gainLo)}～{kg(gainHi)}kg
        </motion.text>
      </motion.g>

      {/* 範圍區間（誠實呈現不確定性） */}
      <g {...clickable("bulk")} opacity={dim("bulk")}>
        <rect x={sx(BULK_MIN)} y={r1} width={sx(BULK_MAX) - sx(BULK_MIN)} height={rH} fill={`url(#${hatchBlue})`} stroke={BLUE_200} strokeWidth={1} />
        <text x={sx(BULK_MAX) + 6} y={r1 + 10} fontSize={10} fill={NAVY} fontFamily={FONT}>
          增肌停止點區間 {fmt(BULK_MIN)}～{fmt(BULK_MAX)}
        </text>
      </g>
      <g {...clickable("cut")} opacity={dim("cut")}>
        <rect x={sx(BULK_MIN + CUT_MIN)} y={r2} width={sx(BULK_MAX + CUT_MAX) - sx(BULK_MIN + CUT_MIN)} height={rH} fill={`url(#${hatchOrange})`} stroke={ORANGE_100} strokeWidth={1} />
        <text x={sx(BULK_MIN + CUT_MIN) - 6} y={r2 + 10} textAnchor="end" fontSize={10} fill={ORANGE_700} fontFamily={FONT}>
          減脂結束區間 {fmt(BULK_MIN + CUT_MIN)}～{fmt(BULK_MAX + CUT_MAX)}
        </text>
      </g>

      {/* 主時間軸 */}
      {/* 增肌：8 個月為實色最短段，選擇超過 8 個月的延長段為斜線 */}
      <motion.g initial={false} animate={{ opacity: dim("bulk") }} transition={tr} {...clickable("bulk")}>
        <rect x={sx(0)} y={laneY} width={sx(BULK_MIN) - sx(0)} height={laneH} rx={4} fill={NAVY} />
        <motion.rect
          initial={false}
          animate={{ width: Math.max(0, sx(bulk) - sx(BULK_MIN)) }}
          transition={tr}
          x={sx(BULK_MIN)}
          y={laneY}
          height={laneH}
          fill={`url(#${hatchBlue})`}
          stroke={NAVY}
          strokeWidth={1}
        />
        <text x={sx(0) + 10} y={laneY + 15} fontSize={12} fontWeight={700} fill="#ffffff" fontFamily={FONT}>
          增肌期
        </text>
        <text x={sx(0) + 10} y={laneY + 28} fontSize={10} fill={BLUE_100} fontFamily={MONO}>
          {bulkW > 170 ? `${bulk} 個月・盈餘 +200～300 大卡` : `${bulk} 個月`}
        </text>
      </motion.g>

      {/* 減脂 */}
      <motion.g initial={false} animate={{ opacity: dim("cut") }} transition={tr} {...clickable("cut")}>
        <motion.rect initial={false} animate={{ x: sx(bulk), width: cutW }} transition={tr} y={laneY} height={laneH} rx={4} fill={ORANGE} />
        <motion.text initial={false} animate={{ x: sx(bulk) + cutW / 2 }} transition={tr} y={laneY + 15} textAnchor="middle" fontSize={12} fontWeight={700} fill="#ffffff" fontFamily={FONT}>
          減脂期
        </motion.text>
        <motion.text initial={false} animate={{ x: sx(bulk) + cutW / 2 }} transition={tr} y={laneY + 28} textAnchor="middle" fontSize={10} fill="#ffffff" fontFamily={MONO}>
          {cut} 個月
        </motion.text>
      </motion.g>

      {/* 第二輪（開放式） */}
      <motion.g initial={false} animate={{ opacity: dim("next") }} transition={tr} {...clickable("next")}>
        <motion.rect
          initial={false}
          animate={{ x: sx(cutEnd) + 4, width: Math.max(0, nextW) }}
          transition={tr}
          y={laneY + 0.5}
          height={laneH - 1}
          rx={4}
          fill="#ffffff"
          stroke={GRAY_4}
          strokeWidth={1.2}
          strokeDasharray="5 4"
        />
        <path d={`M${X1 - 2} ${laneY + laneH / 2} l-7 -5 M${X1 - 2} ${laneY + laneH / 2} l-7 5`} stroke={GRAY_4} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        {nextW > 96 && (
          <motion.text initial={false} animate={{ x: sx(cutEnd) + 14 }} transition={tr} y={laneY + laneH / 2 + 4} fontSize={11.5} fontWeight={700} fill={TEXT} fontFamily={FONT}>
            第二輪（視情況）
          </motion.text>
        )}
      </motion.g>

      {/* 階段交界標記 */}
      <motion.g initial={false} animate={{ x: sx(bulk) }} transition={tr}>
        <line x1={0} y1={laneY - 6} x2={0} y2={laneY + laneH + 6} stroke={NAVY_DEEP} strokeWidth={1.5} />
      </motion.g>
      <text x={sx(0)} y={laneY + laneH + 14} fontSize={9.5} fill={MUTED} fontFamily={MONO}>
        {fmt(0)}
      </text>
      <motion.text initial={false} animate={{ x: sx(bulk) }} transition={tr} y={laneY + laneH + 14} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={NAVY_DEEP} fontFamily={MONO}>
        {fmt(bulk)}
      </motion.text>
      <motion.text initial={false} animate={{ x: sx(cutEnd) }} transition={tr} y={laneY + laneH + 14} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={ORANGE_700} fontFamily={MONO}>
        {fmt(cutEnd)}
      </motion.text>
    </svg>
  );
}

/* ---------- 控制項 ---------- */

function SegGroup<T extends string | number>({ label, options, value, onChange, render }: { label: string; options: T[]; value: T; onChange: (v: T) => void; render: (v: T) => string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: TEXT, minWidth: 64 }}>{label}</span>
      <div role="group" aria-label={label} style={{ display: "inline-flex", border: `1.5px solid ${BLUE_200}`, borderRadius: 8, overflow: "hidden" }}>
        {options.map((o, i) => {
          const on = o === value;
          return (
            <button
              key={String(o)}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o)}
              style={{
                height: 30,
                padding: "0 11px",
                border: "none",
                borderLeft: i === 0 ? "none" : `1px solid ${BLUE_100}`,
                background: on ? NAVY : "#ffffff",
                color: on ? "#ffffff" : NAVY,
                fontFamily: MONO,
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {render(o)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, items, accent }: { icon: ReactNode; label: string; items: string[]; accent: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(92px, auto) 1fr", gap: 12, padding: "10px 0", borderTop: `1px solid ${GRAY_2}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, alignSelf: "start", fontSize: 12.5, fontWeight: 700, color: accent }}>
        {icon}
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((t) => (
          <div key={t} style={{ fontSize: 13, lineHeight: 1.65, color: t === NONE ? MUTED : TEXT, paddingLeft: 10, borderLeft: `2px solid ${t === NONE ? GRAY_2 : accent}` }}>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 主元件 ---------- */

const PHASES: Phase[] = ["bulk", "cut", "next"];
const PHASE_LABEL: Record<Phase, string> = { bulk: "增肌期", cut: "減脂期", next: "第二輪" };

export default function BulkingRoadmap() {
  const reduce = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<Phase>("bulk");
  const [bulk, setBulk] = useState(10);
  const [cut, setCut] = useState(3);

  const d = details(bulk, cut)[phase];
  const a = ACCENT[phase];

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px 24px" }}>
        <SegGroup<number> label="增肌長度" options={[8, 9, 10, 11, 12]} value={bulk} onChange={setBulk} render={(v) => `${v} 月`} />
        <SegGroup<number> label="減脂長度" options={[3, 4]} value={cut} onChange={setCut} render={(v) => `${v} 月`} />
      </div>

      <Timeline bulk={bulk} cut={cut} phase={phase} onPick={setPhase} reduce={reduce} />

      <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
        實色為最短長度，斜線為依停止點延長的範圍；上方斜線帶標出停止點與減脂結束可能落在的月份。點時間軸上的階段或下方分頁看各階段準則。
      </div>

      <div role="group" aria-label="選擇階段" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PHASES.map((p) => {
          const on = p === phase;
          const c = ACCENT[p];
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              onClick={() => setPhase(p)}
              style={{
                height: 32,
                padding: "0 14px",
                borderRadius: 8,
                border: `1.5px solid ${on ? c.main : GRAY}`,
                background: on ? c.soft : "#ffffff",
                color: on ? c.ink : TEXT,
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "background-color 160ms, color 160ms, border-color 160ms",
              }}
            >
              {PHASE_LABEL[p]}
            </button>
          );
        })}
      </div>

      <motion.div
        key={phase}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.25 }}
        style={{ background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "12px 16px 4px" }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, color: a.ink }}>{d.title}</div>
        <div style={{ fontSize: 12.5, color: MUTED, margin: "2px 0 8px", lineHeight: 1.6 }}>{d.meta}</div>
        <DetailRow icon={<Utensils size={14} />} label="飲食重點" items={d.diet} accent={a.ink} />
        <DetailRow icon={<Activity size={14} />} label="有氧安排" items={d.cardio} accent={a.ink} />
        <DetailRow icon={<ClipboardCheck size={14} />} label="檢查指標" items={d.check} accent={a.ink} />
      </motion.div>
    </div>
  );
}
