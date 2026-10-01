import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleAlert, Clock } from "lucide-react";
import { clsx } from "clsx";
import Term from "./ui/Term";
import KindBadge from "./ui/KindBadge";

// 注意：筆記頁面的 .nc-prose 會覆寫 p / ul / li / h* 的字級與間距，
// 所以本元件的文字一律用 div / span，不用那些元素。

// ---------- 法定上限（集中管理） ----------

const LIMITS = {
  weeklyNormalHours: { value: 40, effectiveFrom: "2016-01-01（每週 40 小時）", source: "勞動基準法第 30 條第 1 項" },
  dailyNormalHours: { value: 8, effectiveFrom: "現行", source: "勞動基準法第 30 條第 1 項" },
  monthlyOvertimeHours: { value: 46, effectiveFrom: "現行", source: "勞動基準法第 32 條第 2 項" },
} as const;

// ---------- 彈性上下班（企業制度範例，不是法定數字） ----------

const FLEX = {
  startFrom: "08:00", // 最早上班
  startTo: "10:00", // 最晚上班，超過才算遲到
  coreFrom: "10:00", // 核心時段：一定要在
  coreTo: "16:00",
  lunch: { from: "12:00", to: "13:00" },
  dailyHours: 8,
  source: "企業制度範例；法定只有勞基法第 30 條最後一項（照顧家庭成員，雇主得允許 1 小時內彈性）",
} as const;

type Mode = "fixed" | "flex";

// ---------- 資料 ----------

const AXIS_START = 7; // 07:00
const AXIS_END = 21; // 21:00

type DayType = "work" | "rest" | "regular";
type SegKind = "normal" | "overtime" | "leave";

type Span = { from: string; to: string; note?: string };
type Seg = Span & { kind: SegKind };

type Day = {
  key: string;
  label: string;
  type: DayType;
  schedule: Span[]; // 預定
  punch: (Span & { fixed?: boolean })[]; // 實際；fixed = 補登
  confirmed: Seg[]; // 確認
  reason: ReactNode;
  law: string;
  hours: { normal: number; leave: number; overtime: number };
  flex?: {
    shouldEnd: string; // 實際上班＋8 小時＋午休
    confirmed: Seg[];
    reason: ReactNode;
    law: string;
    hours: { normal: number; leave: number; overtime: number };
  };
};

const STD: Span[] = [
  { from: "09:00", to: "12:00" },
  { from: "13:00", to: "18:00" },
];

const DAYS: Day[] = [
  {
    key: "mon",
    label: "一",
    type: "work",
    schedule: STD,
    punch: [{ from: "08:55", to: "18:03" }],
    confirmed: [
      { from: "09:00", to: "12:00", kind: "normal" },
      { from: "13:00", to: "18:00", kind: "normal" },
    ],
    reason: <>提早 5 分鐘到、晚 3 分鐘走，都不算工時。扣掉午休，正常工時 8 小時。</>,
    law: "勞基法第 30、35 條",
    hours: { normal: 8, leave: 0, overtime: 0 },
    flex: {
      shouldEnd: "17:55",
      confirmed: [
        { from: "08:55", to: "12:00", kind: "normal" },
        { from: "13:00", to: "17:55", kind: "normal" },
      ],
      reason: <>08:55 到，從這時開始算，做滿 8 小時就是 17:55。17:55–18:03 沒有工作事實，不算加班。</>,
      law: "企業制度（彈性上下班）",
      hours: { normal: 8, leave: 0, overtime: 0 },
    },
  },
  {
    key: "tue",
    label: "二",
    type: "work",
    schedule: STD,
    punch: [{ from: "09:12", to: "18:01" }],
    confirmed: [
      { from: "09:12", to: "12:00", kind: "normal" },
      { from: "13:00", to: "18:00", kind: "normal" },
    ],
    reason: <>09:12 才到，少了 12 分鐘，正常工時 7 小時 48 分。遲到怎麼扣薪是企業制度，第 07 篇再談。</>,
    law: "勞基法第 30 條",
    hours: { normal: 7.8, leave: 0, overtime: 0 },
    flex: {
      shouldEnd: "18:12",
      confirmed: [
        { from: "09:12", to: "12:00", kind: "normal" },
        { from: "13:00", to: "18:01", kind: "normal" },
      ],
      reason: (
        <>
          09:12 在彈性區間內，<b>不算遲到</b>。但應下班時間跟著往後移到 18:12，18:01 就走了，當天少 11 分鐘，正常工時 7 小時 49 分。
          少的時數算缺勤還是隔天補，是企業制度要先定清楚的事。
        </>
      ),
      law: "企業制度（彈性上下班）",
      hours: { normal: 7 + 49 / 60, leave: 0, overtime: 0 },
    },
  },
  {
    key: "wed",
    label: "三",
    type: "work",
    schedule: STD,
    punch: [{ from: "08:52", to: "19:40" }],
    confirmed: [
      { from: "09:00", to: "12:00", kind: "normal" },
      { from: "13:00", to: "18:00", kind: "normal" },
      { from: "18:00", to: "19:30", kind: "overtime", note: "趕報告" },
    ],
    reason: (
      <>
        主管確認 18:00–19:30 在趕報告，算<Term k="延長工時" /> 1.5 小時；19:30 後在聊天、收東西，不算。
        因為出勤紀錄會被<Term k="推定" />為工時，「不算」的理由要記下來。
      </>
    ),
    law: "勞基法第 32 條、勞動事件法第 38 條",
    hours: { normal: 8, leave: 0, overtime: 1.5 },
    flex: {
      shouldEnd: "17:52",
      confirmed: [
        { from: "08:52", to: "12:00", kind: "normal" },
        { from: "13:00", to: "17:52", kind: "normal" },
        { from: "17:52", to: "19:30", kind: "overtime", note: "趕報告" },
      ],
      reason: (
        <>
          08:52 到就開始算，做滿 8 小時是 17:52，所以<b>加班從 17:52 起算</b>，不是 18:00。
          確認在趕報告到 19:30，<Term k="延長工時" />變成 1 小時 38 分。
        </>
      ),
      law: "勞基法第 32 條；彈性規則屬企業制度",
      hours: { normal: 8, leave: 0, overtime: 1 + 38 / 60 },
    },
  },
  {
    key: "thu",
    label: "四",
    type: "work",
    schedule: STD,
    punch: [
      { from: "08:58", to: "08:58" },
      { from: "18:05", to: "18:05", fixed: true },
    ],
    confirmed: [
      { from: "09:00", to: "12:00", kind: "normal" },
      { from: "13:00", to: "18:00", kind: "normal" },
    ],
    reason: (
      <>
        忘了打下班卡，事後<Term k="補登" /> 18:05，主管核准。原始紀錄只有一筆上班卡，補登是另外一筆資料，不覆寫原始紀錄。
      </>
    ),
    law: "勞基法第 30 條第 5、6 項",
    hours: { normal: 8, leave: 0, overtime: 0 },
    flex: {
      shouldEnd: "17:58",
      confirmed: [
        { from: "08:58", to: "12:00", kind: "normal" },
        { from: "13:00", to: "17:58", kind: "normal" },
      ],
      reason: <>08:58 到，應下班 17:58。補登的 18:05 晚於應下班時間，多出的 7 分鐘沒有工作事實，不算加班。</>,
      law: "勞基法第 30 條第 5、6 項",
      hours: { normal: 8, leave: 0, overtime: 0 },
    },
  },
  {
    key: "fri",
    label: "五",
    type: "work",
    schedule: STD,
    punch: [{ from: "09:00", to: "14:02" }],
    confirmed: [
      { from: "09:00", to: "12:00", kind: "normal" },
      { from: "13:00", to: "14:00", kind: "normal" },
      { from: "14:00", to: "18:00", kind: "leave", note: "事假" },
    ],
    reason: <>14:00 後請事假 4 小時，假單已核准。上班 09–12、13–14 共 4 小時，請假 4 小時。</>,
    law: "勞工請假規則（第 04 篇）",
    hours: { normal: 4, leave: 4, overtime: 0 },
    flex: {
      shouldEnd: "18:00",
      confirmed: [
        { from: "09:00", to: "12:00", kind: "normal" },
        { from: "13:00", to: "14:00", kind: "normal" },
        { from: "14:00", to: "18:00", kind: "leave", note: "事假" },
      ],
      reason: <>09:00 到，應下班 18:00，和固定班一樣。彈性上班時請假，要先定好請假時段怎麼對應應下班時間。</>,
      law: "勞工請假規則（第 04 篇）",
      hours: { normal: 4, leave: 4, overtime: 0 },
    },
  },
  {
    key: "sat",
    label: "六",
    type: "rest",
    schedule: [{ from: "09:00", to: "13:00" }],
    punch: [{ from: "08:59", to: "13:04" }],
    confirmed: [{ from: "09:00", to: "13:00", kind: "overtime", note: "休息日" }],
    reason: (
      <>
        <Term k="休息日" />經員工同意上班 4 小時。這週正常工時還不到 40 小時，但休息日上班<b>一律算延長工時</b>，不能拿來補滿。
      </>
    ),
    law: "勞基法第 36 條、施行細則第 20-1 條",
    hours: { normal: 0, leave: 0, overtime: 4 },
  },
  {
    key: "sun",
    label: "日",
    type: "regular",
    schedule: [],
    punch: [],
    confirmed: [],
    reason: <><Term k="例假" />，原則上不能叫員工上班。</>,
    law: "勞基法第 36 條",
    hours: { normal: 0, leave: 0, overtime: 0 },
  },
];

const DAY_TYPE: Record<DayType, { label: string; tone: string }> = {
  work: { label: "工作日", tone: "text-neutral-500" },
  rest: { label: "休息日", tone: "text-orange-600" },
  regular: { label: "例假", tone: "text-orange-700" },
};

const SEG_TONE: Record<SegKind, string> = {
  normal: "bg-blue-700",
  overtime: "bg-orange-500",
  leave: "bg-neutral-300",
};

// ---------- 工具 ----------

const toH = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h + m / 60;
};
const pct = (s: string) => ((toH(s) - AXIS_START) / (AXIS_END - AXIS_START)) * 100;
const fmtH = (h: number) => {
  const total = Math.round(h * 60);
  const whole = Math.floor(total / 60);
  const min = total % 60;
  return min ? `${whole} 小時 ${min} 分` : `${whole} 小時`;
};

const applyMode = (d: Day, mode: Mode): Day =>
  mode === "flex" && d.flex ? { ...d, confirmed: d.flex.confirmed, reason: d.flex.reason, law: d.flex.law, hours: d.flex.hours } : d;
const isFlexDay = (d: Day, mode: Mode) => mode === "flex" && Boolean(d.flex);

const spanHours = (spans: Span[]) => spans.reduce((acc, sp) => acc + toH(sp.to) - toH(sp.from), 0);
const scheduleText = (d: Day, mode: Mode) => {
  if (isFlexDay(d, mode)) {
    return `彈性上班 ${FLEX.startFrom}–${FLEX.startTo}、核心 ${FLEX.coreFrom}–${FLEX.coreTo}、做滿 ${FLEX.dailyHours} 小時（休息 ${FLEX.lunch.from}–${FLEX.lunch.to}）`;
  }
  if (d.schedule.length === 0) return d.type === "regular" ? "例假，不排班" : "未排班";
  const parts = d.schedule.map((sp) => `${sp.from}–${sp.to}`).join("、");
  const gaps = d.schedule.slice(1).map((sp, k) => `${d.schedule[k].to}–${sp.from}`);
  return gaps.length ? `${parts}（休息 ${gaps.join("、")}）` : parts;
};
const punchText = (d: Day) =>
  d.punch.length === 0
    ? "無"
    : d.punch.map((p) => (p.from === p.to ? `${p.from}${p.fixed ? "（補登）" : ""}` : `${p.from}–${p.to}`)).join("、");

// ---------- 子元件 ----------

function Lane({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 shrink-0 text-right text-[10px] text-neutral-400">{label}</span>
      <div className="relative h-3 flex-1">{children}</div>
    </div>
  );
}

function Bar({ span, className, delay, reduce, title }: { span: Span; className: string; delay: number; reduce: boolean; title?: string }) {
  const left = pct(span.from);
  const width = Math.max(pct(span.to) - left, 0.6);
  return (
    <motion.div
      title={title}
      className={clsx("absolute top-0 h-3 rounded-sm", className)}
      style={{ left: `${left}%`, width: `${width}%`, transformOrigin: "left center" }}
      initial={reduce ? false : { scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut", delay: reduce ? 0 : delay }}
    />
  );
}

// ---------- 主元件 ----------

export default function ScheduleVsPunchVsConfirmed() {
  const reduce = useReducedMotion() ?? false;
  const [active, setActive] = useState<string>("wed");
  const [mode, setMode] = useState<Mode>("fixed");
  const days = DAYS.map((d) => applyMode(d, mode));
  const day = days.find((d) => d.key === active) ?? days[0];

  const total = days.reduce(
    (acc, d) => ({
      normal: acc.normal + d.hours.normal,
      leave: acc.leave + d.hours.leave,
      overtime: acc.overtime + d.hours.overtime,
    }),
    { normal: 0, leave: 0, overtime: 0 },
  );
  const withinWeekly = total.normal <= LIMITS.weeklyNormalHours.value;
  const ticks = Array.from({ length: (AXIS_END - AXIS_START) / 2 + 1 }, (_, i) => AXIS_START + i * 2);

  return (
    <div className="not-prose mx-auto max-w-4xl space-y-4">
      {/* 上下班制度切換 */}
      <div className="space-y-1.5">
        <div role="tablist" aria-label="上下班制度" className="inline-flex rounded-pill border border-neutral-200 bg-neutral-50 p-1">
          {([
            { key: "fixed", label: "正常上下班", sub: "09:00–18:00" },
            { key: "flex", label: "彈性上下班", sub: `${FLEX.startFrom}–${FLEX.startTo} 到` },
          ] as const).map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={mode === m.key}
              onClick={() => setMode(m.key)}
              className={clsx(
                "rounded-pill px-3 py-1.5 text-left text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400",
                mode === m.key ? "bg-blue-700 text-white shadow-sm" : "text-neutral-600 hover:text-blue-700",
              )}
            >
              <span className="font-bold">{m.label}</span>
              <span className={clsx("block font-mono text-[11px] sm:ml-1.5 sm:inline sm:text-xs", mode === m.key ? "text-blue-100" : "text-neutral-400")}>{m.sub}</span>
            </button>
          ))}
        </div>
        <div className="text-xs leading-relaxed text-neutral-500">
          {mode === "fixed" ? (
            <>固定 09:00 上班、18:00 下班。超過 09:00 到算遲到，18:00 後確認在工作才算加班。</>
          ) : (
            <>
              {FLEX.startFrom}–{FLEX.startTo} 之間到都可以，{FLEX.coreFrom}–{FLEX.coreTo} 一定要在，做滿 {FLEX.dailyHours} 小時。
              <b className="text-neutral-700">應下班時間＝實際上班＋8 小時＋午休</b>，加班從這個時間起算。打卡資料和固定班完全相同。
            </>
          )}
        </div>
      </div>

      {/* 圖例 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-600">
        <span className="flex items-center gap-1.5"><KindBadge kind="planned" /> 班表</span>
        <span className="flex items-center gap-1.5"><KindBadge kind="actual" /> 打卡</span>
        <span className="flex items-center gap-1.5"><KindBadge kind="confirmed" /> 確認工時：</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-4 rounded-sm bg-blue-700" />正常</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-4 rounded-sm bg-orange-500" />延長</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-4 rounded-sm bg-neutral-300" />請假</span>
        {mode === "flex" && (
          <>
            <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-4 rounded-sm border border-dotted border-blue-300 bg-blue-50" />彈性區間</span>
            <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-4 rounded-sm border border-dashed border-blue-500 bg-blue-100" />核心時段</span>
            <span className="flex items-center gap-1"><i className="inline-block h-3 w-0.5 rounded-full bg-blue-700" />應下班</span>
          </>
        )}
      </div>

      {/* 時間軸 */}
      <div className="space-y-1">
        <div className="flex gap-2 pl-[6rem]">
          <div className="relative h-4 flex-1">
            {ticks.map((h, k) => (
              <span
                key={h}
                className={clsx(
                  "absolute font-mono text-[10px] text-neutral-400",
                  k === 0 ? "" : k === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2",
                )}
                style={{ left: `${((h - AXIS_START) / (AXIS_END - AXIS_START)) * 100}%` }}
              >
                {String(h).padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>

        {days.map((d, i) => {
          const flexDay = isFlexDay(d, mode);
          const selected = d.key === active;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setActive(d.key)}
              onMouseEnter={() => setActive(d.key)}
              onFocus={() => setActive(d.key)}
              aria-pressed={selected}
              aria-label={`週${d.label}，${DAY_TYPE[d.type].label}`}
              className={clsx(
                "flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                selected ? "bg-blue-50" : "hover:bg-neutral-50",
              )}
            >
              <div className="w-12 shrink-0 text-center">
                <span className={clsx("block text-sm font-bold", selected ? "text-blue-800" : "text-neutral-800")}>週{d.label}</span>
                <span className={clsx("block text-[10px]", DAY_TYPE[d.type].tone)}>{DAY_TYPE[d.type].label}</span>
              </div>
              <div className="relative flex-1 space-y-1">
                <Lane label="班表">
                  {flexDay ? (
                    <>
                      <Bar span={{ from: FLEX.startFrom, to: FLEX.startTo }} delay={i * 0.03} reduce={reduce} className="border border-dotted border-blue-300 bg-blue-50/60" title="彈性上班區間" />
                      <Bar span={{ from: FLEX.coreFrom, to: FLEX.lunch.from }} delay={i * 0.03} reduce={reduce} className="border border-dashed border-blue-500 bg-blue-100" title="核心時段" />
                      <Bar span={{ from: FLEX.lunch.to, to: FLEX.coreTo }} delay={i * 0.03} reduce={reduce} className="border border-dashed border-blue-500 bg-blue-100" title="核心時段" />
                      {d.flex && (
                        <span
                          title={`應下班 ${d.flex.shouldEnd}`}
                          className="absolute -top-0.5 h-4 w-0.5 -translate-x-1/2 rounded-full bg-blue-700"
                          style={{ left: `${pct(d.flex.shouldEnd)}%` }}
                        />
                      )}
                    </>
                  ) : (
                    d.schedule.map((sp, k) => (
                      <Bar key={k} span={sp} delay={i * 0.03} reduce={reduce} className="border border-dashed border-blue-400 bg-blue-50" />
                    ))
                  )}
                  {d.type === "regular" && <span className="absolute left-0 top-0 text-[10px] leading-3 text-orange-700">例假，不排班</span>}
                </Lane>
                <Lane label="打卡">
                  {d.punch.map((p, k) =>
                    p.from === p.to ? (
                      <span
                        key={k}
                        title={p.fixed ? `補登 ${p.from}` : `打卡 ${p.from}`}
                        className={clsx(
                          "absolute top-0 h-3 w-1.5 -translate-x-1/2 rounded-sm",
                          p.fixed ? "border border-dashed border-orange-500 bg-white" : "bg-orange-400",
                        )}
                        style={{ left: `${pct(p.from)}%` }}
                      />
                    ) : (
                      <Bar key={k} span={p} delay={0.1 + i * 0.03} reduce={reduce} className="bg-orange-300" title={`${p.from}–${p.to}`} />
                    ),
                  )}
                </Lane>
                <Lane label="確認">
                  {d.confirmed.map((c, k) => (
                    <Bar key={k} span={c} delay={0.2 + i * 0.03} reduce={reduce} className={SEG_TONE[c.kind]} title={`${c.from}–${c.to}`} />
                  ))}
                </Lane>
              </div>
            </button>
          );
        })}
      </div>

      {/* 差異說明 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={day.key}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
          className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3"
        >
          <div className="text-sm font-bold text-neutral-800">
            週{day.label}｜{DAY_TYPE[day.type].label}
          </div>
          <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5 text-neutral-500">
              <i className="inline-block h-2.5 w-4 rounded-sm border border-dashed border-blue-400 bg-blue-50" />
              班表
            </span>
            <span className="text-neutral-800">
              <span className="font-mono">{scheduleText(day, mode)}</span>
              {isFlexDay(day, mode) && day.flex ? (
                <span className="ml-2 font-semibold text-blue-800">應下班 {day.flex.shouldEnd}</span>
              ) : (
                day.schedule.length > 0 && <span className="ml-2 text-neutral-500">預定 {fmtH(spanHours(day.schedule))}</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 text-neutral-500">
              <i className="inline-block h-2.5 w-4 rounded-sm bg-orange-300" />
              打卡
            </span>
            <span className="font-mono text-neutral-800">{punchText(day)}</span>
          </div>
          <div className="mt-2 text-sm leading-relaxed text-neutral-700">{day.reason}</div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="text-blue-800">正常 {fmtH(day.hours.normal)}</span>
            {day.hours.leave > 0 && <span className="text-neutral-600">請假 {fmtH(day.hours.leave)}</span>}
            {day.hours.overtime > 0 && <span className="text-orange-700">延長 {fmtH(day.hours.overtime)}</span>}
            <span className="text-neutral-400">{day.law}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 本週彙總 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-blue-50 px-3 py-2">
          <span className="block text-xs text-blue-700">本週正常工時</span>
          <span className="block font-mono text-lg font-bold text-blue-800">{fmtH(total.normal)}</span>
          <span className={clsx("mt-0.5 flex items-center gap-1 text-[11px]", withinWeekly ? "text-blue-700" : "text-orange-700")}>
            {withinWeekly ? <Clock size={12} /> : <CircleAlert size={12} />}
            {withinWeekly ? "未超過" : "超過"}每週 {LIMITS.weeklyNormalHours.value} h
          </span>
        </div>
        <div className="rounded-lg bg-neutral-100 px-3 py-2">
          <span className="block text-xs text-neutral-600">請假</span>
          <span className="block font-mono text-lg font-bold text-neutral-800">{fmtH(total.leave)}</span>
          <span className="mt-0.5 block text-[11px] text-neutral-500">依假別另算（第 04 篇）</span>
        </div>
        <div className="rounded-lg bg-orange-50 px-3 py-2">
          <span className="block text-xs text-orange-700">延長工時</span>
          <span className="block font-mono text-lg font-bold text-orange-700">{fmtH(total.overtime)}</span>
          <span className="mt-0.5 block text-[11px] text-orange-700">計入每月 {LIMITS.monthlyOvertimeHours.value} h 上限</span>
        </div>
      </div>
    </div>
  );
}
