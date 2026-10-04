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

// ---------- 插圖：辦公室平面示意 ----------
// 俯視平面圖：小明的位置標記在各區之間移動，窗戶顏色表示天色，打卡機記錄上下班時間。
const C = {
  ink: "#3a4456", // neutral-700：牆線、主要文字
  line: "#9aa6b8", // neutral-400：家具線
  faint: "#cbd3df", // neutral-300：分區虛線
  frame: "#e1e6ee", // neutral-200：外框
  muted: "#6c798e", // neutral-500：次要文字
  blue: "#1b4f9c", // blue-700
  blue500: "#2c6ebb",
  blue100: "#d6e4f5",
  orange: "#e37b24", // orange-500
  white: "#ffffff",
};

function skyAt(t: number) {
  if (t < hm(17)) return { fill: "#adc8e8", label: "白天" }; // blue-200
  if (t < hm(18, 30)) return { fill: "#f6cd86", label: "傍晚" }; // orange-200
  return { fill: "#112f5d", label: "入夜" }; // blue-900
}

type Spot = { x: number; y: number; where: string; tag: "above" | "below" | "left" };

const DESKS = [34, 92, 150]; // 桌子左緣 x；中間那張是小明的座位
const TABLE = { x: 100, y: 168 };

const SPOTS: Record<SceneId, Spot> = {
  before: { x: 326, y: 182, where: "公司外", tag: "above" },
  after: { x: 326, y: 182, where: "公司外", tag: "above" },
  arrive: { x: 264, y: 90, where: "置物櫃前", tag: "below" },
  work: { x: 115, y: 92, where: "座位", tag: "below" },
  overtime: { x: 115, y: 92, where: "座位", tag: "below" },
  lunch: { x: TABLE.x - 20, y: TABLE.y, where: "休息區", tag: "left" },
  chat: { x: 160, y: 170, where: "茶水間", tag: "above" },
};

const PILL: Record<Cat, { fill: string; stroke: string; text: string; dash?: string }> = {
  normal: { fill: C.blue, stroke: C.blue, text: C.white },
  overtime: { fill: C.orange, stroke: C.orange, text: C.white },
  break: { fill: C.frame, stroke: C.frame, text: C.ink },
  excluded: { fill: C.white, stroke: C.line, text: C.ink, dash: "3 2" },
  outside: { fill: C.white, stroke: C.faint, text: C.muted },
};

// 同事位置：上班時段在座位，午休在休息區，閒聊時在茶水間
function colleaguesAt(t: number, scene: SceneId) {
  const inSchedule = SCENARIO.schedule.some((b) => t >= b.from && t < b.to);
  if (inSchedule) return { atDesk: true, others: [] as { x: number; y: number }[] };
  if (t >= hm(12) && t < hm(13)) return { atDesk: false, others: [{ x: TABLE.x + 20, y: TABLE.y }, { x: TABLE.x, y: TABLE.y - 19 }] };
  if (scene === "chat") return { atDesk: false, others: [{ x: 184, y: 178 }] };
  return { atDesk: false, others: [] };
}

function Tag({ text, cat, tag }: { text: string; cat: Cat; tag: Spot["tag"] }) {
  const s = PILL[cat];
  const w = text.length * 9.5 + 14;
  const h = 16;
  const x = tag === "left" ? -11 - w : -w / 2;
  const y = tag === "above" ? -12 - h : tag === "below" ? 12 : -h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={s.fill} stroke={s.stroke} strokeWidth="1" strokeDasharray={s.dash} />
      <text x={x + w / 2} y={y + 11.2} fontSize="9.5" fontWeight="600" fill={s.text} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

function Office({ t, scene, seg, reduce }: { t: number; scene: SceneId; seg: Segment | null; reduce: boolean }) {
  const sky = skyAt(t);
  const spot = SPOTS[scene];
  const cat: Cat = seg?.cat ?? "outside";
  const tagText = seg?.label ?? (scene === "before" ? "尚未到班" : "已下班");
  const { atDesk, others } = colleaguesAt(t, scene);
  const myMonitorOn = scene === "work" || scene === "overtime";
  const punching = scene === "arrive" || scene === "chat";
  const hourAngle = ((t / 60) % 12) * 30;
  const minuteAngle = (t % 60) * 6;
  const move = reduce ? { duration: 0 } : { type: "tween" as const, duration: 0.55, ease: "easeInOut" as const };
  const fade = reduce ? { duration: 0 } : { duration: 0.2 };

  return (
    <svg
      viewBox="0 0 360 220"
      width="100%"
      role="img"
      aria-label={`辦公室平面示意：${clock(t)} 小明在${spot.where}，${tagText}`}
      style={{ display: "block", fontFamily: "var(--font-sans)" }}
    >
      <rect x="0.5" y="0.5" width="359" height="219" rx="8" fill={C.white} stroke={C.frame} />

      {/* 標題列：圖例、天色、時鐘 */}
      <text x="16" y="23" fontSize="10" fontWeight="600" fill={C.ink}>辦公室平面</text>
      <circle cx="84" cy="19.5" r="4" fill={C.blue} />
      <text x="92" y="23" fontSize="9" fill={C.muted}>小明</text>
      <circle cx="122" cy="19.5" r="3.5" fill={C.white} stroke={C.line} strokeWidth="1.2" />
      <text x="130" y="23" fontSize="9" fill={C.muted}>同事</text>

      <rect x="240" y="15" width="9" height="9" rx="2" fill={sky.fill} stroke={C.line} strokeWidth="0.75" style={{ transition: "fill 400ms" }} />
      <text x="253" y="23" fontSize="9" fill={C.muted}>{sky.label}</text>
      <circle cx="290" cy="19.5" r="8" fill={C.white} stroke={C.ink} strokeWidth="1" />
      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1="290" y1="12.5" x2="290" y2="14" stroke={C.line} strokeWidth="1" transform={`rotate(${a} 290 19.5)`} />
      ))}
      <line x1="290" y1="19.5" x2="290" y2="15" stroke={C.ink} strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${hourAngle} 290 19.5)`} />
      <line x1="290" y1="19.5" x2="290" y2="13" stroke={C.orange} strokeWidth="1" strokeLinecap="round" transform={`rotate(${minuteAngle} 290 19.5)`} />
      <text x="344" y="23.5" fontSize="11" fontWeight="700" fill={C.ink} textAnchor="end" fontFamily="var(--font-mono)">
        {clock(t)}
      </text>

      {/* 牆：右牆留門口 */}
      <path d="M296 166 V40 H16 V206 H296 V200" fill="none" stroke={C.ink} strokeWidth="1.5" />
      {/* 窗戶：天色隨時間變化 */}
      {[40, 98, 156].map((x) => (
        <rect key={x} x={x} y="38" width="40" height="4" fill={sky.fill} stroke={C.ink} strokeWidth="1" style={{ transition: "fill 400ms" }} />
      ))}
      {/* 門 */}
      <line x1="296" y1="166" x2="262" y2="166" stroke={C.ink} strokeWidth="1.5" />
      <path d="M262 166 A34 34 0 0 0 296 200" fill="none" stroke={C.line} strokeWidth="1" strokeDasharray="3 3" />
      <text x="326" y="56" fontSize="8.5" fill={C.muted} textAnchor="middle">室外</text>

      {/* 分區 */}
      <line x1="228" y1="40" x2="228" y2="206" stroke={C.faint} strokeWidth="1" strokeDasharray="2 3" />
      <line x1="16" y1="138" x2="228" y2="138" stroke={C.faint} strokeWidth="1" strokeDasharray="2 3" />
      <text x="22" y="132" fontSize="8.5" fill={C.muted}>工作區</text>
      <text x="22" y="200" fontSize="8.5" fill={C.muted}>休息區</text>
      <text x="234" y="200" fontSize="8.5" fill={C.muted}>入口</text>

      {/* 座位：桌、螢幕、椅子 */}
      {DESKS.map((x, i) => {
        const mine = i === 1;
        const on = mine ? myMonitorOn : atDesk;
        return (
          <g key={x}>
            <rect x={x} y="52" width="46" height="18" rx="2" fill={C.white} stroke={mine ? C.blue500 : C.line} strokeWidth={mine ? 1.25 : 1} />
            <rect x={x + 11} y="56" width="24" height="4" rx="1" fill={on ? C.blue500 : C.frame} style={{ transition: "fill 250ms" }} />
            <rect x={x + 16} y="86" width="14" height="12" rx="3" fill={C.white} stroke={C.line} strokeWidth="1" />
            {!mine && atDesk && <circle cx={x + 23} cy="92" r="6" fill={C.white} stroke={C.ink} strokeWidth="1.2" />}
          </g>
        );
      })}
      <text x="115" y="80" fontSize="7.5" fill={C.blue500} textAnchor="middle">小明座位</text>

      {/* 休息區：圓桌與茶水檯 */}
      <circle cx={TABLE.x} cy={TABLE.y} r="13" fill={C.white} stroke={C.line} strokeWidth="1" />
      {[
        [-20, 0],
        [20, 0],
        [0, -19],
        [0, 19],
      ].map(([dx, dy]) => (
        <rect key={`${dx},${dy}`} x={TABLE.x + dx - 5} y={TABLE.y + dy - 5} width="10" height="10" rx="2.5" fill={C.white} stroke={C.line} strokeWidth="1" />
      ))}
      <rect x="150" y="192" width="50" height="10" rx="1.5" fill={C.white} stroke={C.line} strokeWidth="1" />
      <text x="175" y="199.6" fontSize="7" fill={C.muted} textAnchor="middle">茶水</text>

      {/* 入口：置物櫃與打卡機 */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={244 + i * 11} y="46" width="11" height="14" fill={C.white} stroke={C.line} strokeWidth="1" />
      ))}
      <text x="266" y="71" fontSize="7.5" fill={C.muted} textAnchor="middle">置物櫃</text>
      <rect x="286" y="124" width="8" height="16" rx="1.5" fill={punching ? C.orange : C.white} stroke={C.ink} strokeWidth="1" style={{ transition: "fill 250ms" }} />
      <text x="280" y="131" fontSize="8" fill={C.muted} textAnchor="end">打卡機</text>
      {t >= SCENARIO.punchIn && (
        <text x="280" y="143" fontSize="8" fill={C.ink} textAnchor="end" fontFamily="var(--font-mono)">
          上 {clock(SCENARIO.punchIn)}
        </text>
      )}
      {t >= SCENARIO.punchOut && (
        <text x="280" y="154" fontSize="8" fill={C.ink} textAnchor="end" fontFamily="var(--font-mono)">
          下 {clock(SCENARIO.punchOut)}
        </text>
      )}

      {/* 同事（休息區、茶水間） */}
      {others.map((o) => (
        <circle key={`${o.x},${o.y}`} cx={o.x} cy={o.y} r="6" fill={C.white} stroke={C.ink} strokeWidth="1.2" />
      ))}

      {/* 小明：位置標記在各區之間移動，旁邊標目前時段與分類 */}
      <motion.g initial={false} animate={{ x: spot.x, y: spot.y }} transition={move}>
        <circle r="7.5" fill={C.blue} stroke={C.white} strokeWidth="1.5" />
        <text y="3.2" fontSize="8.5" fontWeight="700" fill={C.white} textAnchor="middle">明</text>
        <AnimatePresence mode="wait" initial={false}>
          <motion.g key={`${scene}-${seg?.id ?? ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
            <Tag text={tagText} cat={cat} tag={spot.tag} />
          </motion.g>
        </AnimatePresence>
      </motion.g>
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
        <div>
          <Office t={t} scene={scene} seg={seg} reduce={reduce} />
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
