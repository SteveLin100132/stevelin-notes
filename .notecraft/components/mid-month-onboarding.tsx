import { useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Info } from "lucide-react";
import { clsx } from "clsx";
import Term from "./ui/Term";

// 注意：筆記頁面的 .nc-prose 會覆寫 p / ul / li / h* 的字級與間距，
// 所以本元件的文字一律用 div / span，不用那些元素。

// ---------- 數字設定（集中管理） ----------

const CONFIG = {
  month: { year: 2026, month: 9, days: 30, source: "示範情境：2026 年 9 月，共 30 天" },
  payrollDivisor: {
    value: 30,
    effectiveFrom: "企業制度",
    source: "月中到職的月薪折算：勞基法沒有規定公式，「月薪 ÷ 30 × 在職天數」是企業制度的常見做法（示範假設）",
  },
  laborInsuranceDaysPerMonth: { value: 30, effectiveFrom: "現行", source: "勞工保險條例施行細則第 28-1 條：保險費每月以三十日計算" },
  pensionDaysPerMonth: { value: 30, effectiveFrom: "現行", source: "勞工退休金條例施行細則第 22 條：繳款單每月以三十日計算" },
  pensionEmployerMin: { value: 0.06, effectiveFrom: "現行", source: "勞工退休金條例第 14 條第 1 項" },
  pensionEmployeeMax: { value: 0.06, effectiveFrom: "現行", source: "勞工退休金條例第 14 條第 3 項" },
  minimumWageMonthly: {
    value: 29_500,
    effectiveFrom: "2026-01-01",
    source: "勞動部公告最低工資（查證 2026-09-24）https://www.mol.gov.tw/1607/1632/1633/84947/post",
  },
} as const;

const { year: YEAR, month: MONTH, days: DAYS } = CONFIG.month;
const WEEK = ["一", "二", "三", "四", "五", "六", "日"];
// 9/1 是星期幾（週一 = 0）
const FIRST_COL = (new Date(YEAR, MONTH - 1, 1).getDay() + 6) % 7;

const fmt = (n: number) => n.toLocaleString("zh-TW");
const pct = (r: number) => `${+(r * 100).toFixed(2)}%`;

// ---------- 插圖：月曆 ----------

const C = {
  navy: "var(--blue-700)",
  blue: "var(--blue-500)",
  blue200: "var(--blue-200)",
  blue100: "var(--blue-100)",
  blue50: "var(--blue-50)",
  orange: "var(--orange-400)",
  orangeDeep: "var(--orange-500)",
  orange50: "var(--orange-50)",
  n100: "var(--neutral-100)",
  n200: "var(--neutral-200)",
  n400: "var(--neutral-400)",
  n500: "var(--neutral-500)",
  paper: "#ffffff",
};

const CELL = 40;
const GAP = 4;
const PAD_X = 12;
const TOP = 58;
const ROWS = Math.ceil((FIRST_COL + DAYS) / 7);
const VB_W = PAD_X * 2 + 7 * CELL + 6 * GAP;
const VB_H = TOP + ROWS * (CELL + GAP) + 30;

function cellPos(day: number) {
  const idx = FIRST_COL + day - 1;
  const col = idx % 7;
  const row = Math.floor(idx / 7);
  return { x: PAD_X + col * (CELL + GAP), y: TOP + row * (CELL + GAP) };
}

function CalendarArt({ start, onPick, reduce }: { start: number; onPick: (d: number) => void; reduce: boolean }) {
  const p = cellPos(start);
  const last = cellPos(DAYS);
  const onKey = (d: number) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick(d);
    }
  };
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" className="h-auto max-w-[360px]" role="group" aria-label={`${YEAR} 年 ${MONTH} 月月曆，點日期選到職日`}>
      {/* 紙張與掛環 */}
      <rect x="2" y="10" width={VB_W - 4} height={VB_H - 14} rx="14" fill={C.paper} stroke={C.navy} strokeWidth="2.5" />
      <path d={`M2 24 a14 14 0 0 1 14 -14 h${VB_W - 32} a14 14 0 0 1 14 14 v10 h-${VB_W - 4} z`} fill={C.navy} />
      <rect x={VB_W * 0.25 - 3} y="2" width="6" height="16" rx="3" fill={C.orange} />
      <rect x={VB_W * 0.75 - 3} y="2" width="6" height="16" rx="3" fill={C.orange} />
      <text x={VB_W / 2} y="28" fontSize="11" fontWeight="700" fill={C.paper} textAnchor="middle">
        {YEAR} 年 {MONTH} 月
      </text>
      {WEEK.map((w, i) => (
        <text key={w} x={PAD_X + i * (CELL + GAP) + CELL / 2} y="50" fontSize="9" fill={i >= 5 ? C.orangeDeep : C.n500} textAnchor="middle">
          {w}
        </text>
      ))}

      {/* 日期格 */}
      {Array.from({ length: DAYS }, (_, i) => i + 1).map((d) => {
        const { x, y } = cellPos(d);
        const employed = d >= start;
        const isStart = d === start;
        return (
          <g
            key={d}
            role="button"
            tabIndex={0}
            aria-label={`${MONTH}/${d} 到職`}
            aria-pressed={isStart}
            onClick={() => onPick(d)}
            onKeyDown={onKey(d)}
            className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[3]"
          >
            <rect
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx="8"
              fill={employed ? C.blue50 : C.n100}
              stroke={isStart ? C.navy : employed ? C.blue200 : C.n200}
              strokeWidth={isStart ? 2.5 : 1.2}
            />
            <text x={x + 6} y={y + 13} fontSize="10" fontWeight={isStart ? 700 : 500} fill={employed ? C.navy : C.n400}>
              {d}
            </text>
            {employed && !isStart && <circle cx={x + CELL - 9} cy={y + CELL - 9} r="3" fill={C.blue} opacity="0.55" />}
          </g>
        );
      })}

      {/* 月底旗子：健保看這一天 */}
      <g pointerEvents="none">
        <line x1={last.x + CELL - 6} y1={last.y + CELL - 4} x2={last.x + CELL - 6} y2={last.y + 16} stroke={C.orangeDeep} strokeWidth="1.8" />
        <path d={`M${last.x + CELL - 6} ${last.y + 16} l-14 4 l14 5 z`} fill={C.orange} />
      </g>
      <text x={VB_W - PAD_X} y={VB_H - 10} fontSize="9" fill={C.orangeDeep} textAnchor="end">
        旗子：月底這天在保，健保就收全月
      </text>
      <text x={PAD_X} y={VB_H - 10} fontSize="9" fill={C.n500}>
        藍色：在職
      </text>

      {/* 到職日的小人 */}
      <motion.g
        pointerEvents="none"
        initial={false}
        animate={{ x: p.x, y: p.y }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
      >
        <circle cx={CELL / 2 + 6} cy="19" r="5" fill={C.navy} />
        <path d={`M${CELL / 2 - 2} 36 v-6 a8 8 0 0 1 16 0 v6 z`} fill={C.navy} />
        <rect x={CELL / 2 + 9} y="26" width="7" height="5" rx="1" fill={C.orange} />
      </motion.g>
    </svg>
  );
}

// ---------- 結果列 ----------

type Row = {
  key: string;
  label: ReactNode;
  who: string;
  whoTone: string;
  formula: string;
  result: string;
  ratio: number | null; // null = 不畫比例條
  barTone: string;
  note?: string;
};

function Bar({ ratio, tone, reduce }: { ratio: number; tone: string; reduce: boolean }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-100">
      <motion.div
        className={clsx("absolute inset-y-0 left-0 rounded-full", tone)}
        initial={false}
        animate={{ width: `${ratio * 100}%` }}
        transition={reduce ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}

export default function MidMonthOnboarding() {
  const reduce = useReducedMotion() ?? false;
  const [start, setStart] = useState<number>(16);
  const [salary, setSalary] = useState<number>(36_000);
  const [selfRate, setSelfRate] = useState<number>(0.06);

  const days = DAYS - start + 1;
  const div = CONFIG.payrollDivisor.value;
  const pay = Math.round((salary / div) * days);
  const liRatio = days / CONFIG.laborInsuranceDaysPerMonth.value;
  const penRatio = days / CONFIG.pensionDaysPerMonth.value;
  const dayFrac = `${days} ／ ${CONFIG.laborInsuranceDaysPerMonth.value}`;

  const rows: Row[] = [
    {
      key: "pay",
      label: `${MONTH} 月薪資`,
      who: "公司發",
      whoTone: "bg-blue-50 text-blue-700",
      formula: `${fmt(salary)} ÷ ${div} × ${days}`,
      result: `${fmt(pay)} 元`,
      ratio: days / div,
      barTone: "bg-blue-700",
      note: "折算公式是企業制度（示範假設），勞基法沒有規定",
    },
    {
      key: "li",
      label: <Term k="勞保" />,
      who: "按天",
      whoTone: "bg-blue-50 text-blue-700",
      formula: `一個月保費 × ${dayFrac}`,
      result: days === DAYS ? "全月" : `${days} 天份`,
      ratio: liRatio,
      barTone: "bg-blue-500",
    },
    {
      key: "occ",
      label: <Term k="職災保險" />,
      who: "公司全額",
      whoTone: "bg-neutral-100 text-neutral-700",
      formula: `${MONTH}/${start} 到職當天生效`,
      result: "費率見第 05 篇",
      ratio: null,
      barTone: "",
    },
    {
      key: "pen-co",
      label: "勞退公司提繳",
      who: "公司出",
      whoTone: "bg-blue-50 text-blue-700",
      formula: `月提繳工資 × ${pct(CONFIG.pensionEmployerMin.value)} × ${days} ／ ${CONFIG.pensionDaysPerMonth.value}`,
      result: days === DAYS ? "全月" : `${days} 天份`,
      ratio: penRatio,
      barTone: "bg-blue-500",
    },
    {
      key: "pen-self",
      label: <Term k="個人自提" />,
      who: selfRate > 0 ? "從薪水扣" : "不扣",
      whoTone: selfRate > 0 ? "bg-orange-50 text-orange-700" : "bg-neutral-100 text-neutral-500",
      formula: selfRate > 0 ? `月提繳工資 × ${pct(selfRate)} × ${days} ／ ${CONFIG.pensionDaysPerMonth.value}` : "沒有選自提",
      result: selfRate > 0 ? (days === DAYS ? "全月" : `${days} 天份`) : "0",
      ratio: selfRate > 0 ? penRatio : 0,
      barTone: "bg-orange-400",
    },
    {
      key: "nhi",
      label: <Term k="健保" />,
      who: "看月底",
      whoTone: "bg-orange-50 text-orange-700",
      formula: `${MONTH}/${DAYS} 仍在保 → 投保當月繳全月`,
      result: "全月",
      ratio: 1,
      barTone: "bg-orange-500",
    },
  ];

  const insight =
    start === DAYS
      ? `只在職 1 天：勞保、勞退都只算 1 ／ ${CONFIG.laborInsuranceDaysPerMonth.value}，健保卻收整個月。`
      : start === 1
        ? "整個月都在職：每一項都是整月，看不出差別。往後拖動到職日試試。"
        : `在職 ${days} 天：勞保、勞退按 ${days} 天算，健保照樣收整個月。`;

  return (
    <div className="not-prose mx-auto grid max-w-4xl gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* 左：月曆與控制 */}
      <div className="min-w-0 space-y-4">
        <div className="flex justify-center">
          <CalendarArt start={start} onPick={setStart} reduce={reduce} />
        </div>

        <div className="space-y-3 rounded-lg bg-neutral-50 px-3 py-3">
          <label className="block space-y-1">
            <span className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-neutral-800">到職日</span>
              <span className="font-mono font-semibold text-blue-800">
                {MONTH}/{start}（在職 {days} 天）
              </span>
            </span>
            <input
              type="range"
              min={1}
              max={DAYS}
              step={1}
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
              className="w-full accent-blue-700"
            />
          </label>
          <label className="block space-y-1">
            <span className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-neutral-800">月薪</span>
              <span className="font-mono font-semibold text-blue-800">{fmt(salary)} 元</span>
            </span>
            <input
              type="range"
              min={CONFIG.minimumWageMonthly.value}
              max={80_000}
              step={500}
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              className="w-full accent-blue-700"
            />
            <span className="block text-[11px] text-neutral-500">
              最低 {fmt(CONFIG.minimumWageMonthly.value)} 元（{CONFIG.minimumWageMonthly.effectiveFrom} 起的最低工資）
            </span>
          </label>
          <div className="space-y-1">
            <span className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-neutral-800">個人自提率</span>
              <span className="font-mono font-semibold text-orange-700">{pct(selfRate)}</span>
            </span>
            <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="個人自提率">
              {[0, 1, 2, 3, 4, 5, 6].map((n) => {
                const r = n / 100;
                const active = Math.abs(r - selfRate) < 1e-9;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={r > CONFIG.pensionEmployeeMax.value}
                    onClick={() => setSelfRate(r)}
                    className={clsx(
                      "rounded-md border py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",
                      active ? "border-orange-400 bg-orange-50 text-orange-700" : "border-neutral-200 bg-white text-neutral-600 hover:border-orange-300",
                    )}
                  >
                    {n}%
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 右：逐項試算 */}
      <div className="min-w-0 space-y-3">
        <div className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {rows.map((r) => (
            <div key={r.key} className="space-y-1.5 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-800">{r.label}</span>
                  <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-semibold", r.whoTone)}>{r.who}</span>
                </span>
                <span className="font-mono text-sm font-bold text-neutral-800">{r.result}</span>
              </div>
              <div className="font-mono text-xs text-neutral-500">{r.formula}</div>
              {r.ratio !== null && <Bar ratio={r.ratio} tone={r.barTone} reduce={reduce} />}
              {r.note && <div className="text-[11px] text-neutral-400">{r.note}</div>}
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>
            {insight}
            <span className="mt-1 block text-xs text-blue-800/80">
              月提繳工資、投保薪資要對照分級表，實際金額在第 05、06 篇再算。
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
