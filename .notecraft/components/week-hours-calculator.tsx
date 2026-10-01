import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CircleAlert, Minus, Plus, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import Term from "./ui/Term";

// 注意：筆記頁面的 .nc-prose 會覆寫 p / ul / li / h* 的字級與間距，
// 所以本元件的文字一律用 div / span，不用那些元素。

// ---------- 法定上限（集中管理） ----------

const LIMITS = {
  dailyNormalHours: { value: 8, effectiveFrom: "現行", source: "勞動基準法第 30 條第 1 項" },
  weeklyNormalHours: { value: 40, effectiveFrom: "2016-01-01", source: "勞動基準法第 30 條第 1 項" },
  dailyTotalMax: { value: 12, effectiveFrom: "現行", source: "勞動基準法第 32 條第 2 項：延長工時連同正常工時，一日不得超過十二小時" },
  monthlyOvertimeMax: { value: 46, effectiveFrom: "現行", source: "勞動基準法第 32 條第 2 項" },
} as const;

// 延長工時的認定：每日超過 8 小時、每週超過 40 小時的部分，以及休息日工作的時間
// 來源：勞動基準法施行細則第 20-1 條

// ---------- 資料 ----------

type DayType = "work" | "rest" | "regular";
type Day = { key: string; label: string; type: DayType; leave: number };

const DAYS: Day[] = [
  { key: "mon", label: "一", type: "work", leave: 0 },
  { key: "tue", label: "二", type: "work", leave: 0 },
  { key: "wed", label: "三", type: "work", leave: 0 },
  { key: "thu", label: "四", type: "work", leave: 0 },
  { key: "fri", label: "五", type: "work", leave: 4 },
  { key: "sat", label: "六", type: "rest", leave: 0 },
  { key: "sun", label: "日", type: "regular", leave: 0 },
];

// 與筆記表格同一週：週二 7 小時 48 分、週三加班 1.5 小時、週五請假 4 小時、週六休息日上班 4 小時
const PRESET: Record<string, number> = { mon: 8, tue: 7.8, wed: 9.5, thu: 8, fri: 4, sat: 4, sun: 0 };

const MAX_H = 13; // 圖上畫到 13 小時，讓 12 小時上限線有空間
const STEP = 0.1; // 6 分鐘

const round1 = (n: number) => Math.round(n * 10) / 10;
const fmtH = (h: number) => {
  const whole = Math.floor(h + 1e-9);
  const min = Math.round((h - whole) * 60);
  return min ? `${whole} 小時 ${min} 分` : `${whole} 小時`;
};
const num = (h: number) => `${+round1(h).toFixed(1)}`;

// ---------- 插圖設定 ----------

const C = {
  navy: "var(--blue-700)",
  blue: "var(--blue-500)",
  blue200: "var(--blue-200)",
  blue100: "var(--blue-100)",
  blue50: "var(--blue-50)",
  orange: "var(--orange-400)",
  orangeDeep: "var(--orange-500)",
  orange100: "var(--orange-100)",
  orange50: "var(--orange-50)",
  n100: "var(--neutral-100)",
  n200: "var(--neutral-200)",
  n300: "var(--neutral-300)",
  n400: "var(--neutral-400)",
  n500: "var(--neutral-500)",
  paper: "#ffffff",
};

const VB_W = 360;
const VB_H = 250;
const BASE = 212; // 地面 y
const TOP = 30;
const UNIT = (BASE - TOP) / MAX_H; // 每小時高度
const COL_X0 = 34;
const COL_W = 30;
const COL_GAP = 8;
const TANK_X = COL_X0 + 7 * (COL_W + COL_GAP) + 10;
const y = (h: number) => BASE - h * UNIT;
const colX = (i: number) => COL_X0 + i * (COL_W + COL_GAP);

// ---------- 計算 ----------

function compute(hours: Record<string, number>) {
  const perDay = DAYS.map((d) => {
    const h = hours[d.key] ?? 0;
    if (d.type === "rest") return { ...d, h, normal: 0, ot: h };
    if (d.type === "regular") return { ...d, h: 0, normal: 0, ot: 0 };
    const normal = Math.min(h, LIMITS.dailyNormalHours.value);
    return { ...d, h, normal, ot: Math.max(0, h - LIMITS.dailyNormalHours.value) };
  });
  const normalRaw = perDay.reduce((s, d) => s + d.normal, 0);
  const weeklyExcess = Math.max(0, normalRaw - LIMITS.weeklyNormalHours.value);
  const weekdayOt = perDay.filter((d) => d.type === "work").reduce((s, d) => s + d.ot, 0);
  const restOt = perDay.filter((d) => d.type === "rest").reduce((s, d) => s + d.ot, 0);
  const leave = perDay.reduce((s, d) => s + d.leave, 0);
  return {
    perDay,
    normal: normalRaw - weeklyExcess,
    normalRaw,
    weeklyExcess,
    weekdayOt,
    restOt,
    ot: weekdayOt + restOt + weeklyExcess,
    leave,
    overCap: perDay.filter((d) => d.h + 1e-9 > LIMITS.dailyTotalMax.value),
  };
}

// ---------- 主元件 ----------

export default function WeekHoursCalculator() {
  const reduce = useReducedMotion() ?? false;
  const [hours, setHours] = useState<Record<string, number>>(PRESET);
  const [active, setActive] = useState<string>("wed");
  const svgRef = useRef<SVGSVGElement>(null);
  const dragKey = useRef<string | null>(null);

  const r = compute(hours);
  const activeDay = DAYS.find((d) => d.key === active) ?? DAYS[0];
  const locked = activeDay.type === "regular";

  const setDay = (key: string, h: number) => {
    const day = DAYS.find((d) => d.key === key);
    if (!day || day.type === "regular") return;
    const cap = MAX_H - day.leave;
    setHours((prev) => ({ ...prev, [key]: Math.max(0, Math.min(cap, round1(h))) }));
  };

  const hoursFromPointer = (e: ReactPointerEvent<SVGElement>) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return Math.round((BASE - pt.y) / UNIT / STEP) * STEP;
  };

  const onDown = (key: string, leave: number) => (e: ReactPointerEvent<SVGGElement>) => {
    if (DAYS.find((d) => d.key === key)?.type === "regular") return;
    dragKey.current = key;
    setActive(key);
    svgRef.current?.setPointerCapture(e.pointerId);
    const h = hoursFromPointer(e);
    if (h !== null) setDay(key, h - leave);
  };
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const key = dragKey.current;
    if (!key) return;
    const leave = DAYS.find((d) => d.key === key)?.leave ?? 0;
    const h = hoursFromPointer(e);
    if (h !== null) setDay(key, h - leave);
  };
  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    dragKey.current = null;
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
  };

  const tankFill = Math.min(r.normalRaw, 48) / 48;
  const tank40 = LIMITS.weeklyNormalHours.value / 48;
  const TANK_TOP = 44;
  const TANK_H = BASE - TANK_TOP;

  const weekdays = r.perDay.filter((d) => d.type === "work");
  const normalFormula = weekdays.map((d) => num(d.normal)).join(" ＋ ");
  const otParts = [
    r.weekdayOt > 0 ? `平日 ${num(r.weekdayOt)}` : null,
    r.restOt > 0 ? `休息日 ${num(r.restOt)}` : null,
    r.weeklyExcess > 0 ? `超過每週 ${LIMITS.weeklyNormalHours.value} 小時 ${num(r.weeklyExcess)}` : null,
  ].filter(Boolean);

  return (
    <div className="not-prose mx-auto max-w-3xl space-y-4">
      {/* 插圖：工時積木牆 */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        className="mx-auto block h-auto max-w-[520px] touch-none select-none"
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="img"
        aria-label="一週工時積木圖，可以拖動每天的柱子調整工作時數"
      >
        {/* 地面與格線 */}
        <rect x="0" y={BASE} width={VB_W} height={VB_H - BASE} fill={C.n100} />
        <line x1="20" y1={BASE} x2={VB_W - 8} y2={BASE} stroke={C.n400} strokeWidth="1.5" />
        {[4, 8, 12].map((h) => (
          <text key={h} x="24" y={y(h) + 3} fontSize="9" fontWeight={h === 4 ? 400 : 700} fill={h === 8 ? C.navy : h === 12 ? C.orangeDeep : C.n400} textAnchor="end">
            {h}h
          </text>
        ))}

        {/* 8 小時線與 12 小時上限線 */}
        <line x1={COL_X0 - 4} y1={y(8)} x2={colX(6) + COL_W + 4} y2={y(8)} stroke={C.navy} strokeWidth="1.2" strokeDasharray="4 3" />
        <line x1={COL_X0 - 4} y1={y(12)} x2={colX(6) + COL_W + 4} y2={y(12)} stroke={C.orangeDeep} strokeWidth="1.2" strokeDasharray="2 3" />

        {/* 每天的積木 */}
        {r.perDay.map((d, i) => {
          const x = colX(i);
          const isActive = d.key === active;
          const hitH = BASE - TOP;
          return (
            <g
              key={d.key}
              onPointerDown={onDown(d.key, d.leave)}
              className={d.type === "regular" ? "cursor-not-allowed" : "cursor-ns-resize"}
            >
              {/* 點擊區 */}
              <rect x={x - 3} y={TOP} width={COL_W + 6} height={hitH} fill={isActive ? C.blue50 : "transparent"} rx="6" />
              {d.type === "rest" && <rect x={x - 3} y={TOP} width={COL_W + 6} height={hitH} fill={C.orange50} opacity={isActive ? 0.9 : 0.6} rx="6" />}

              {d.type === "regular" ? (
                // 例假：一張床和月亮
                <g>
                  <rect x={x + 1} y={BASE - 16} width={COL_W - 2} height="10" rx="3" fill={C.blue100} stroke={C.navy} strokeWidth="1.2" />
                  <rect x={x + 1} y={BASE - 22} width="9" height="7" rx="2" fill={C.paper} stroke={C.navy} strokeWidth="1.2" />
                  <line x1={x + 2} y1={BASE - 6} x2={x + 2} y2={BASE} stroke={C.navy} strokeWidth="1.5" />
                  <line x1={x + COL_W - 2} y1={BASE - 6} x2={x + COL_W - 2} y2={BASE} stroke={C.navy} strokeWidth="1.5" />
                  <path d={`M${x + 20} ${BASE - 48} a8 8 0 1 0 6 12 a6 6 0 1 1 -6 -12 z`} fill={C.orange} />
                  <text x={x + COL_W / 2} y={BASE - 60} fontSize="9" fill={C.orangeDeep} textAnchor="middle">例假</text>
                </g>
              ) : (
                <g>
                  {/* 請假：灰色積木，放在最底下 */}
                  {d.leave > 0 && (
                    <g>
                      <rect x={x} y={y(d.leave)} width={COL_W} height={d.leave * UNIT} rx="3" fill={C.n200} stroke={C.n300} />
                      <text x={x + COL_W / 2} y={y(d.leave / 2) + 3} fontSize="7" fill={C.n500} textAnchor="middle">請假</text>
                    </g>
                  )}
                  {/* 正常工時 */}
                  <motion.rect
                    x={x}
                    width={COL_W}
                    rx="3"
                    fill={C.navy}
                    initial={false}
                    animate={{ y: y(d.leave + d.normal), height: d.normal * UNIT }}
                    transition={reduce ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
                  />
                  {/* 延長工時（平日超過 8 小時，或休息日全部） */}
                  <motion.rect
                    x={x}
                    width={COL_W}
                    rx="3"
                    fill={C.orange}
                    stroke={C.orangeDeep}
                    strokeWidth="0.8"
                    initial={false}
                    animate={{ y: y(d.leave + d.normal + d.ot), height: d.ot * UNIT }}
                    transition={reduce ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
                  />
                  {/* 積木的橫紋：每小時一格 */}
                  {Array.from({ length: Math.floor(d.leave + d.h) }, (_, k) => k + 1).map((k) => (
                    <line key={k} x1={x + 2} x2={x + COL_W - 2} y1={y(k)} y2={y(k)} stroke={C.paper} strokeOpacity="0.35" />
                  ))}
                  {/* 拖動把手 */}
                  <rect x={x + 6} y={y(d.leave + d.h) - 5} width={COL_W - 12} height="4" rx="2" fill={isActive ? C.orangeDeep : C.n400} />
                  <text x={x + COL_W / 2} y={y(d.leave + d.h) - 9} fontSize="10" fontWeight="700" fill={C.navy} textAnchor="middle">
                    {num(d.h)}
                  </text>
                  {d.type === "rest" && (
                    <text x={x + COL_W / 2} y={TOP + 10} fontSize="9" fill={C.orangeDeep} textAnchor="middle">休息日</text>
                  )}
                </g>
              )}
              <text x={x + COL_W / 2} y={BASE + 16} fontSize="10" fontWeight={isActive ? 700 : 500} fill={isActive ? C.navy : C.n500} textAnchor="middle">
                週{d.label}
              </text>
            </g>
          );
        })}

        {/* 每週 40 小時水箱 */}
        <g>
          <text x={TANK_X + 16} y={TANK_TOP - 18} fontSize="9" fill={C.n500} textAnchor="middle">本週</text>
          <text x={TANK_X + 16} y={TANK_TOP - 8} fontSize="9" fill={C.n500} textAnchor="middle">正常工時</text>
          <rect x={TANK_X} y={TANK_TOP} width="32" height={TANK_H} rx="8" fill={C.paper} stroke={C.navy} strokeWidth="2" />
          <motion.rect
            x={TANK_X + 3}
            width="26"
            rx="5"
            fill={r.weeklyExcess > 0 ? C.orange : C.blue}
            initial={false}
            animate={{ y: TANK_TOP + 3 + (TANK_H - 6) * (1 - tankFill), height: (TANK_H - 6) * tankFill }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
          />
          <line x1={TANK_X - 3} x2={TANK_X + 35} y1={TANK_TOP + 3 + (TANK_H - 6) * (1 - tank40)} y2={TANK_TOP + 3 + (TANK_H - 6) * (1 - tank40)} stroke={C.orangeDeep} strokeWidth="1.5" />
          <text x={TANK_X + 16} y={TANK_TOP + (TANK_H - 6) * (1 - tank40) - 1} fontSize="9" fontWeight="700" fill={C.orangeDeep} textAnchor="middle">40</text>
          <text x={TANK_X + 16} y={BASE + 16} fontSize="10" fontWeight="700" fill={C.navy} textAnchor="middle">{num(r.normalRaw)}</text>
        </g>
      </svg>

      {/* 調整列 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2">
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="選擇要調整的日子">
          {DAYS.map((d) => (
            <button
              key={d.key}
              type="button"
              role="radio"
              aria-checked={d.key === active}
              onClick={() => setActive(d.key)}
              className={clsx(
                "rounded-md border px-2 py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                d.key === active ? "border-blue-700 bg-blue-50 text-blue-800" : "border-neutral-200 bg-white text-neutral-600 hover:border-blue-300",
              )}
            >
              週{d.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label="減少 30 分鐘"
            disabled={locked}
            onClick={() => setDay(active, (hours[active] ?? 0) - 0.5)}
            className="rounded-md border border-neutral-200 bg-white p-1 text-neutral-700 hover:border-blue-300 disabled:opacity-40"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-[6.5rem] text-center font-mono text-sm font-semibold text-blue-800">
            {locked ? "例假不排班" : fmtH(hours[active] ?? 0)}
          </span>
          <button
            type="button"
            aria-label="增加 30 分鐘"
            disabled={locked}
            onClick={() => setDay(active, (hours[active] ?? 0) + 0.5)}
            className="rounded-md border border-neutral-200 bg-white p-1 text-neutral-700 hover:border-blue-300 disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={() => setHours(PRESET)}
            className="ml-1 inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 hover:border-blue-300"
          >
            <RotateCcw size={12} />
            還原範例
          </button>
        </div>
      </div>

      {/* 圖例 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-4 rounded-sm bg-blue-700" /><Term k="正常工時" /></span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-4 rounded-sm bg-orange-400" /><Term k="延長工時" /></span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-4 rounded-sm bg-neutral-200" />請假</span>
        <span className="flex items-center gap-1"><i className="inline-block w-4 border-t-2 border-dashed border-blue-700" />每天 {LIMITS.dailyNormalHours.value} 小時</span>
        <span className="flex items-center gap-1"><i className="inline-block w-4 border-t-2 border-dotted border-orange-500" />一天上限 {LIMITS.dailyTotalMax.value} 小時</span>
        <span className="text-neutral-400">拖動柱子頂端，或選日子後按 ＋／－</span>
      </div>

      {/* 算式 */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1 rounded-lg bg-blue-50 px-3 py-2.5">
          <span className="block text-xs text-blue-700">本週正常工時</span>
          <span className="block font-mono text-lg font-bold text-blue-800">{num(r.normal)} 小時</span>
          <span className="block font-mono text-xs text-blue-800/80">
            {normalFormula} ＝ {num(r.normalRaw)}
            {r.weeklyExcess > 0 && `，超過 ${LIMITS.weeklyNormalHours.value} 的 ${num(r.weeklyExcess)} 改算延長工時`}
          </span>
          <span className="block text-[11px] text-blue-700">每天最多算 {LIMITS.dailyNormalHours.value} 小時；每週上限 {LIMITS.weeklyNormalHours.value} 小時</span>
        </div>
        <div className="space-y-1 rounded-lg bg-orange-50 px-3 py-2.5">
          <span className="block text-xs text-orange-700">本週延長工時</span>
          <span className="block font-mono text-lg font-bold text-orange-700">{num(r.ot)} 小時</span>
          <span className="block font-mono text-xs text-orange-800/80">
            {otParts.length > 0 ? `${otParts.join(" ＋ ")} ＝ ${num(r.ot)}` : "沒有延長工時"}
          </span>
          <span className="block text-[11px] text-orange-700">休息日上班一律算延長工時；計入每月 {LIMITS.monthlyOvertimeMax.value} 小時上限</span>
        </div>
      </div>

      {r.leave > 0 && (
        <div className="text-xs text-neutral-500">請假 {num(r.leave)} 小時另外依假別計算（第 04 篇），不算正常工時，也不算延長工時。</div>
      )}

      {r.overCap.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-800">
          <CircleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            週{r.overCap.map((d) => d.label).join("、週")}超過一天 {LIMITS.dailyTotalMax.value} 小時：正常工時連同延長工時，一天不能超過 {LIMITS.dailyTotalMax.value} 小時（勞基法第 32 條）。天災、事變等突發狀況另有規定。
          </span>
        </div>
      )}
    </div>
  );
}
