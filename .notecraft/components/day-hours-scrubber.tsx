import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import Term from "./ui/Term";

// 注意：筆記頁面的 .nc-prose 會覆寫 p / ul / li / h* 的樣式，本元件文字一律用 div / span。

// ---------- 情境設定（虛構例子，對應 00 篇「算給我看」） ----------
// 時間一律以「當天第幾分鐘」表示，避免浮點誤差。
const hm = (h: number, m = 0) => h * 60 + m;

const SCENARIO = {
  source: "虛構例子：00 全景〈算給我看〉的小明",
  schedule: [
    { from: hm(9), to: hm(12) },
    { from: hm(13), to: hm(18) },
  ],
  punchIn: hm(8, 52),
  punchOut: hm(19, 40),
  axis: { from: hm(8, 30), to: hm(20) },
};

type Cat = "outside" | "excluded" | "normal" | "break" | "overtime";
type SceneId = "before" | "arrive" | "work" | "lunch" | "overtime" | "chat" | "after";

type Segment = {
  id: string;
  from: number;
  to: number;
  label: string;
  cat: Cat;
  scene: SceneId;
  why: ReactNode;
};

const SEGMENTS: Segment[] = [
  {
    id: "early",
    from: SCENARIO.punchIn,
    to: hm(9),
    label: "提早到",
    cat: "excluded",
    scene: "arrive",
    why: <>已經打卡，但在放包包、倒水，還沒開始工作。班表 09:00 才開始，這 8 分鐘不算工時。</>,
  },
  {
    id: "am",
    from: hm(9),
    to: hm(12),
    label: "上午工作",
    cat: "normal",
    scene: "work",
    why: <>在班表時段內工作，算<Term k="正常工時" />。</>,
  },
  {
    id: "lunch",
    from: hm(12),
    to: hm(13),
    label: "午休",
    cat: "break",
    scene: "lunch",
    why: (
      <>
        班表排定的休息時間，不算工時。法律規定連續工作 4 小時，至少要休息 30 分鐘（勞基法第 35 條）。
      </>
    ),
  },
  {
    id: "pm",
    from: hm(13),
    to: hm(18),
    label: "下午工作",
    cat: "normal",
    scene: "work",
    why: <>在班表時段內工作，算<Term k="正常工時" />。上午 3 小時＋下午 5 小時＝8 小時。</>,
  },
  {
    id: "ot",
    from: hm(18),
    to: hm(19, 30),
    label: "趕報告",
    cat: "overtime",
    scene: "overtime",
    why: <>超過班表的 18:00，主管核對後確認確實在工作，算<Term k="延長工時" />（加班）。</>,
  },
  {
    id: "chat",
    from: hm(19, 30),
    to: SCENARIO.punchOut,
    label: "聊天、收東西",
    cat: "excluded",
    scene: "chat",
    why: (
      <>
        人還在公司，但沒有在工作。因為<Term k="出勤紀錄" />內的時間會被<Term k="推定" />為工作時間，公司要留下核對依據才能不算。
      </>
    ),
  },
];

const CAT_META: Record<Cat, { label: string; bar: string; chip: string }> = {
  outside: { label: "不在公司", bar: "", chip: "border-neutral-200 bg-white text-neutral-500" },
  excluded: {
    label: "在公司，不算工時",
    bar: "bg-neutral-100 border border-dashed border-neutral-400",
    chip: "border-dashed border-neutral-400 bg-neutral-50 text-neutral-700",
  },
  normal: { label: "正常工時", bar: "bg-blue-700", chip: "border-blue-700 bg-blue-700 text-white" },
  break: {
    label: "休息時間",
    bar: "bg-neutral-300",
    chip: "border-neutral-300 bg-neutral-100 text-neutral-700",
  },
  overtime: { label: "加班", bar: "bg-orange-500", chip: "border-orange-500 bg-orange-500 text-white" },
};

// ---------- 工具 ----------
const pad = (n: number) => String(n).padStart(2, "0");
const clock = (t: number) => `${pad(Math.floor(t / 60))}:${pad(Math.round(t % 60))}`;
const dur = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} 分`;
  return m === 0 ? `${h} 小時` : `${h} 小時 ${m} 分`;
};
const pctOf = (t: number) => ((t - SCENARIO.axis.from) / (SCENARIO.axis.to - SCENARIO.axis.from)) * 100;
const overlap = (a: number, b: number, t: number) => Math.max(0, Math.min(b, t) - a);

function segmentAt(t: number): Segment | null {
  return SEGMENTS.find((s) => t >= s.from && t < s.to) ?? null;
}

function sceneAt(t: number): SceneId {
  if (t < SCENARIO.punchIn) return "before";
  if (t >= SCENARIO.punchOut) return "after";
  return segmentAt(t)?.scene ?? "work";
}

const TOTAL = {
  onSite: SCENARIO.punchOut - SCENARIO.punchIn,
  normal: SEGMENTS.filter((s) => s.cat === "normal").reduce((a, s) => a + s.to - s.from, 0),
  overtime: SEGMENTS.filter((s) => s.cat === "overtime").reduce((a, s) => a + s.to - s.from, 0),
};

// ---------- 插圖 ----------
const C = {
  navy: "var(--blue-700)",
  blue: "var(--blue-500)",
  blue100: "var(--blue-100)",
  blue200: "var(--blue-200)",
  blue50: "var(--blue-50)",
  night: "var(--blue-900)",
  orange: "var(--orange-400)",
  orangeDeep: "var(--orange-500)",
  orange200: "var(--orange-200)",
  orange100: "var(--orange-100)",
  orange50: "var(--orange-50)",
  n100: "var(--neutral-100)",
  n200: "var(--neutral-200)",
  n300: "var(--neutral-300)",
  n400: "var(--neutral-400)",
  n500: "var(--neutral-500)",
  paper: "#ffffff",
};

function skyAt(t: number) {
  if (t < hm(17)) return { sky: C.blue200, orb: C.orange, night: false };
  if (t < hm(18, 30)) return { sky: C.orange200, orb: C.orangeDeep, night: false };
  return { sky: C.night, orb: C.orange100, night: true };
}

// 小明：坐姿或站姿
function Person({ x, pose }: { x: number; pose: "sit" | "stand" }) {
  if (pose === "sit") {
    return (
      <g transform={`translate(${x} 0)`}>
        <rect x="-4" y="148" width="26" height="8" rx="4" fill={C.navy} />
        <rect x="16" y="148" width="8" height="30" rx="4" fill={C.navy} />
        <rect x="-10" y="112" width="22" height="40" rx="9" fill={C.blue} />
        <circle cx="1" cy="100" r="11" fill={C.orange100} stroke={C.navy} strokeWidth="1.5" />
        <path d="M-10 98 a11 11 0 0 1 22 -2 l-4 -3 l-6 3 z" fill={C.navy} />
        <rect x="6" y="122" width="22" height="7" rx="3.5" fill={C.blue} />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="-9" y="148" width="8" height="34" rx="4" fill={C.navy} />
      <rect x="1" y="148" width="8" height="34" rx="4" fill={C.navy} />
      <rect x="-11" y="108" width="22" height="44" rx="9" fill={C.blue} />
      <circle cx="0" cy="95" r="11" fill={C.orange100} stroke={C.navy} strokeWidth="1.5" />
      <path d="M-11 93 a11 11 0 0 1 22 -2 l-4 -3 l-6 3 z" fill={C.navy} />
    </g>
  );
}

function Office({ t, scene, reduce }: { t: number; scene: SceneId; reduce: boolean }) {
  const { sky, orb, night } = skyAt(t);
  const hourAngle = ((t / 60) % 12) * 30;
  const minuteAngle = (t % 60) * 6;
  const monitorOn = scene === "work" || scene === "overtime";
  const fade = reduce ? { duration: 0 } : { duration: 0.25 };

  return (
    <svg viewBox="0 0 360 220" width="100%" role="img" aria-label={`小明 ${clock(t)} 的辦公室插圖`} style={{ fontFamily: "var(--font-sans)" }}>
      {/* 牆與地板 */}
      <rect x="0" y="0" width="360" height="220" rx="12" fill={night ? C.n100 : C.blue50} />
      <rect x="0" y="182" width="360" height="38" fill={C.n200} />
      <line x1="0" y1="182" x2="360" y2="182" stroke={C.n300} strokeWidth="2" />

      {/* 窗戶：天色隨時間變化 */}
      <rect x="24" y="26" width="92" height="78" rx="6" fill={sky} stroke={C.navy} strokeWidth="3" style={{ transition: "fill 400ms" }} />
      <circle cx={night ? 92 : 50} cy={night ? 46 : 52} r="11" fill={orb} style={{ transition: "all 400ms" }} />
      {night && (
        <g fill={C.paper}>
          <circle cx="42" cy="40" r="1.5" />
          <circle cx="60" cy="74" r="1.2" />
          <circle cx="102" cy="82" r="1.5" />
        </g>
      )}
      <line x1="70" y1="26" x2="70" y2="104" stroke={C.navy} strokeWidth="3" />
      <line x1="24" y1="65" x2="116" y2="65" stroke={C.navy} strokeWidth="3" />

      {/* 掛鐘：指針跟著時間 */}
      <circle cx="176" cy="48" r="22" fill={C.paper} stroke={C.navy} strokeWidth="3" />
      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1="176" y1="30" x2="176" y2="34" stroke={C.navy} strokeWidth="2" transform={`rotate(${a} 176 48)`} />
      ))}
      <line x1="176" y1="48" x2="176" y2="36" stroke={C.navy} strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${hourAngle} 176 48)`} />
      <line x1="176" y1="48" x2="176" y2="31" stroke={C.orange} strokeWidth="2" strokeLinecap="round" transform={`rotate(${minuteAngle} 176 48)`} />
      <circle cx="176" cy="48" r="2.5" fill={C.orange} />

      {/* 門與打卡機 */}
      <rect x="292" y="66" width="50" height="116" rx="3" fill={C.orange100} stroke={C.navy} strokeWidth="2.5" />
      <circle cx="301" cy="128" r="3" fill={C.navy} />
      <rect x="258" y="96" width="22" height="30" rx="4" fill={C.paper} stroke={C.navy} strokeWidth="2" />
      <rect x="262" y="101" width="14" height="8" rx="1.5" fill={scene === "arrive" || scene === "chat" ? C.orange : C.n200} />
      <text x="269" y="121" fontSize="6.5" fill={C.n500} textAnchor="middle">打卡</text>

      {/* 桌子、螢幕、椅子 */}
      <rect x="112" y="136" width="120" height="7" rx="2" fill={C.navy} />
      <line x1="120" y1="143" x2="120" y2="182" stroke={C.navy} strokeWidth="4" />
      <line x1="224" y1="143" x2="224" y2="182" stroke={C.navy} strokeWidth="4" />
      <rect x="170" y="100" width="48" height="32" rx="3" fill={monitorOn ? C.blue100 : C.n300} stroke={C.navy} strokeWidth="2.5" />
      {monitorOn && (
        <g stroke={C.blue} strokeWidth="2" strokeLinecap="round">
          <line x1="177" y1="109" x2="200" y2="109" />
          <line x1="177" y1="116" x2="210" y2="116" />
          <line x1="177" y1="123" x2="194" y2="123" />
        </g>
      )}
      <rect x="190" y="132" width="8" height="4" fill={C.navy} />
      <rect x="126" y="150" width="30" height="6" rx="3" fill={C.n400} />
      <line x1="141" y1="156" x2="141" y2="178" stroke={C.n400} strokeWidth="3" />
      <line x1="130" y1="180" x2="152" y2="180" stroke={C.n400} strokeWidth="3" strokeLinecap="round" />

      {/* 依情境換小明的動作與道具 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.g key={scene} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
          {scene === "before" && (
            <g>
              <rect x="120" y="60" width="120" height="22" rx="11" fill={C.paper} stroke={C.n300} />
              <text x="180" y="75" fontSize="10" fill={C.n500} textAnchor="middle">小明還沒到公司</text>
            </g>
          )}
          {scene === "arrive" && (
            <g>
              <Person x={228} pose="stand" />
              <rect x="236" y="128" width="16" height="20" rx="3" fill={C.orange} stroke={C.navy} strokeWidth="1.5" />
              <path d="M239 128 a5 5 0 0 1 10 0" fill="none" stroke={C.navy} strokeWidth="1.5" />
            </g>
          )}
          {(scene === "work" || scene === "overtime") && (
            <g>
              <Person x={144} pose="sit" />
              {scene === "overtime" && (
                <g>
                  <path d="M222 136 l0 -26 l-10 -6" fill="none" stroke={C.navy} strokeWidth="2.5" />
                  <path d="M204 100 l16 0 l-4 -10 l-8 0 z" fill={C.orange} stroke={C.navy} strokeWidth="1.5" />
                  <path d="M206 100 l-10 36 l36 0 l-10 -36 z" fill={C.orange} opacity="0.15" />
                  {[0, 1, 2].map((i) => (
                    <rect key={i} x={116 + i * 2} y={130 - i * 4} width="30" height="4" rx="1" fill={C.paper} stroke={C.n400} />
                  ))}
                </g>
              )}
            </g>
          )}
          {scene === "lunch" && (
            <g>
              <Person x={144} pose="sit" />
              <rect x="164" y="126" width="26" height="10" rx="3" fill={C.orange} stroke={C.navy} strokeWidth="1.5" />
              <line x1="166" y1="124" x2="186" y2="118" stroke={C.navy} strokeWidth="1.5" />
              <line x1="168" y1="125" x2="188" y2="120" stroke={C.navy} strokeWidth="1.5" />
            </g>
          )}
          {scene === "chat" && (
            <g>
              <Person x={228} pose="stand" />
              <rect x="208" y="124" width="10" height="12" rx="2" fill={C.paper} stroke={C.navy} strokeWidth="1.5" />
              <path d="M208 127 a4 4 0 0 0 0 6" fill="none" stroke={C.navy} strokeWidth="1.5" />
              <rect x="236" y="130" width="16" height="20" rx="3" fill={C.orange} stroke={C.navy} strokeWidth="1.5" />
              <g>
                <rect x="232" y="58" width="44" height="22" rx="11" fill={C.paper} stroke={C.navy} strokeWidth="1.5" />
                <path d="M240 80 l-4 8 l10 -8 z" fill={C.paper} stroke={C.navy} strokeWidth="1.5" />
                <text x="254" y="73" fontSize="10" fill={C.navy} textAnchor="middle">聊聊</text>
              </g>
            </g>
          )}
          {scene === "after" && (
            <g>
              <rect x="120" y="60" width="120" height="22" rx="11" fill={C.paper} stroke={C.n300} />
              <text x="180" y="75" fontSize="10" fill={C.n500} textAnchor="middle">小明已經下班</text>
            </g>
          )}
        </motion.g>
      </AnimatePresence>

      {/* 底部時間 */}
      <rect x="128" y="190" width="104" height="22" rx="11" fill={C.navy} />
      <text x="180" y="205" fontSize="11" fontWeight="700" fill={C.paper} textAnchor="middle" fontFamily="var(--font-mono)">
        {clock(t)}
      </text>
    </svg>
  );
}

// ---------- 主元件 ----------
const STEP_MIN = 3; // 播放時每一格前進的分鐘數
const TICK_MS = 45;

export default function DayHoursScrubber() {
  const reduce = useReducedMotion() ?? false;
  const [t, setT] = useState<number>(hm(10));
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setT((prev) => {
        const next = prev + STEP_MIN;
        if (next >= SCENARIO.axis.to) {
          setPlaying(false);
          return SCENARIO.axis.to;
        }
        return next;
      });
    }, TICK_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing]);

  const togglePlay = () => {
    if (!playing && t >= SCENARIO.axis.to) setT(SCENARIO.axis.from);
    setPlaying((p) => !p);
  };

  const seg = t >= SCENARIO.punchOut ? null : segmentAt(t);
  const cat: Cat = seg?.cat ?? "outside";
  const scene = sceneAt(t);

  const onSiteSoFar = overlap(SCENARIO.punchIn, SCENARIO.punchOut, t);
  const normalSoFar = SEGMENTS.filter((s) => s.cat === "normal").reduce((a, s) => a + overlap(s.from, s.to, t), 0);
  const otSoFar = SEGMENTS.filter((s) => s.cat === "overtime").reduce((a, s) => a + overlap(s.from, s.to, t), 0);
  const confirmedSoFar = normalSoFar + otSoFar;

  const lanes: { label: string; hint: string; bars: { from: number; to: number; cls: string; id?: string }[] }[] = [
    {
      label: "班表",
      hint: "預定",
      bars: SCENARIO.schedule.map((b) => ({ ...b, cls: "border border-dashed border-blue-500 bg-blue-50" })),
    },
    {
      label: "打卡",
      hint: "實際",
      bars: [{ from: SCENARIO.punchIn, to: SCENARIO.punchOut, cls: "bg-orange-400" }],
    },
    {
      label: "確認",
      hint: "確認後",
      bars: SEGMENTS.map((s) => ({ from: s.from, to: s.to, cls: CAT_META[s.cat].bar, id: s.id })),
    },
  ];

  // 手機寬度下只留 09:00、12:00、18:00，避免刻度文字重疊
  const ticks = [
    { t: hm(9), wide: false },
    { t: hm(12), wide: false },
    { t: hm(13), wide: true },
    { t: hm(18), wide: false },
    { t: hm(19, 30), wide: true },
  ];

  const equation: { id: string; label: string; value: number; sign: "" | "−" | "=" }[] = [
    { id: "onsite", label: "在公司", value: TOTAL.onSite, sign: "" },
    { id: "early", label: "提早到", value: hm(9) - SCENARIO.punchIn, sign: "−" },
    { id: "lunch", label: "午休", value: 60, sign: "−" },
    { id: "chat", label: "下班後閒聊", value: SCENARIO.punchOut - hm(19, 30), sign: "−" },
    { id: "confirmed", label: "確認工時", value: TOTAL.normal + TOTAL.overtime, sign: "=" },
  ];

  return (
    <div className="not-prose space-y-4">
      {/* 插圖＋目前狀態 */}
      <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl">
          <Office t={t} scene={scene} reduce={reduce} />
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-2xl font-bold leading-none text-blue-900">{clock(t)}</span>
            <span className={clsx("rounded-pill border px-2 py-0.5 text-xs font-semibold", CAT_META[cat].chip)}>
              {CAT_META[cat].label}
            </span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={seg?.id ?? scene}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="space-y-1"
            >
              <div className="text-sm font-bold text-neutral-900">
                {seg ? `${seg.label}（${clock(seg.from)}–${clock(seg.to)}）` : scene === "before" ? "還沒上班" : "已經下班"}
              </div>
              <div className="text-sm leading-relaxed text-neutral-700">
                {seg ? seg.why : scene === "before" ? "還沒打卡，不在公司。" : "19:40 打卡下班，今天結束。"}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* 累計 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
              <div className="text-[11px] font-semibold text-orange-700">在公司（打卡）</div>
              <div className="font-mono text-base font-bold text-orange-700">{dur(onSiteSoFar)}</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <div className="text-[11px] font-semibold text-blue-700">確認工時</div>
              <div className="font-mono text-base font-bold text-blue-800">{dur(confirmedSoFar)}</div>
              <div className="text-[11px] text-neutral-500">
                正常 {dur(normalSoFar)}
                {otSoFar > 0 && <span className="text-orange-600">＋加班 {dur(otSoFar)}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 三條時間軸＋可拖曳的時間指針 */}
      <div className="rounded-xl border border-neutral-200 bg-white px-3 pb-3 pt-2 sm:px-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-500">拖動滑桿或點色塊，看每個時段怎麼算</span>
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-blue-700 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-800"
          >
            {playing ? <Pause size={12} /> : t >= SCENARIO.axis.to ? <RotateCcw size={12} /> : <Play size={12} />}
            {playing ? "暫停" : t >= SCENARIO.axis.to ? "重播" : "播放一天"}
          </button>
        </div>

        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2 gap-y-2">
          {lanes.map((lane) => (
            <div key={lane.label} className="contents">
              <div className="flex flex-col justify-center leading-tight">
                <span className="text-xs font-bold text-neutral-700">{lane.label}</span>
                <span className="text-[10px] text-neutral-400">{lane.hint}</span>
              </div>
              <div className="relative h-7 rounded-md bg-neutral-50">
                {lane.bars.map((b, i) => {
                  const clickable = Boolean(b.id);
                  return (
                    <button
                      key={i}
                      type="button"
                      tabIndex={clickable ? 0 : -1}
                      disabled={!clickable}
                      onClick={() => {
                        setPlaying(false);
                        setT(b.from + Math.min(10, (b.to - b.from) / 2));
                      }}
                      aria-label={clickable ? `跳到 ${clock(b.from)}` : undefined}
                      className={clsx(
                        "absolute top-1 bottom-1 rounded-[5px] transition",
                        b.cls,
                        clickable && "cursor-pointer hover:brightness-110",
                        clickable && seg?.id === b.id && "ring-2 ring-orange-300 ring-offset-1",
                      )}
                      style={{ left: `${pctOf(b.from)}%`, width: `${pctOf(b.to) - pctOf(b.from)}%` }}
                    />
                  );
                })}
                {/* 指針 */}
                <div className="pointer-events-none absolute -top-1 -bottom-1 w-0.5 bg-orange-500" style={{ left: `${pctOf(t)}%` }} />
              </div>
            </div>
          ))}

          {/* 刻度與滑桿 */}
          <div />
          <div className="relative h-4">
            {ticks.map((tk) => (
              <span
                key={tk.t}
                className={clsx(
                  "absolute -translate-x-1/2 font-mono text-[10px] text-neutral-400",
                  tk.wide && "hidden sm:inline",
                )}
                style={{ left: `${pctOf(tk.t)}%` }}
              >
                {clock(tk.t)}
              </span>
            ))}
          </div>
          <div />
          <input
            type="range"
            min={SCENARIO.axis.from}
            max={SCENARIO.axis.to}
            step={1}
            value={t}
            onChange={(e) => {
              setPlaying(false);
              setT(Number(e.target.value));
            }}
            aria-label="選擇時間"
            className="w-full accent-orange-500"
          />
        </div>

        {/* 圖例 */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500">
          {(["normal", "overtime", "break", "excluded"] as Cat[]).map((c) => (
            <span key={c} className="inline-flex items-center gap-1">
              <span className={clsx("inline-block h-2.5 w-4 rounded-sm", CAT_META[c].bar)} />
              {CAT_META[c].label}
            </span>
          ))}
        </div>
      </div>

      {/* 整天的算式 */}
      <div className="rounded-xl bg-neutral-50 px-3 py-3 sm:px-4">
        <div className="mb-2 text-xs font-semibold text-neutral-500">整天算下來</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {equation.map((e) => {
            const active = (seg && seg.id === e.id) || (e.id === "confirmed" && t >= SCENARIO.punchOut);
            return (
              <span key={e.id} className="inline-flex items-center gap-1.5">
                {e.sign && <span className="font-mono text-sm font-bold text-neutral-400">{e.sign}</span>}
                <span
                  className={clsx(
                    "inline-flex flex-col rounded-lg border px-2.5 py-1 leading-tight transition",
                    e.id === "confirmed"
                      ? "border-blue-700 bg-blue-700 text-white"
                      : e.id === "onsite"
                        ? "border-orange-300 bg-orange-50 text-orange-700"
                        : "border-dashed border-neutral-300 bg-white text-neutral-700",
                    active && "ring-2 ring-orange-300 ring-offset-1",
                  )}
                >
                  <span className="text-[10px] opacity-80">{e.label}</span>
                  <span className="font-mono text-xs font-bold">{dur(e.value)}</span>
                </span>
              </span>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] text-neutral-500">
          確認工時 {dur(TOTAL.normal + TOTAL.overtime)}＝正常 {dur(TOTAL.normal)}＋加班 {dur(TOTAL.overtime)}。計薪用的是這個數字，不是在公司的 {dur(TOTAL.onSite)}。
        </div>
      </div>
    </div>
  );
}
