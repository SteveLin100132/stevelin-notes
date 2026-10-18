import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDownUp, Dumbbell, Layers, Repeat, RotateCcw } from "lucide-react";

/* ---------- 色票（trendlink-design token；Tailwind class 不會被編譯，改用常數） ---------- */

interface Palette {
  text: string;
  muted: string;
  panel: string; // 圖面底色
  border: string; // 圖面與列的細框
  base: string; // 非肌群部位（頭、手、骨盆）
  idle: string; // 未訓練肌群
  high: string; // 主色藍：有效組數 >= 6 / 主要
  some: string; // 輔色橘：有參與 / 次要
  track: string; // 迷你長條底軌
  accent: string; // 主色藍（文字、線）
  accentStrong: string; // 按下的按鈕底
  accentSoft: string; // 選取列底
  accentLine: string;
  orange: string;
  orangeSoft: string;
  outline: string; // hover 外框
}

const LIGHT: Palette = {
  text: "#3a4456", // --neutral-700
  muted: "#6c798e", // --neutral-500
  panel: "#ffffff",
  border: "#e1e6ee", // --neutral-200
  base: "#eef1f6", // --neutral-100
  idle: "#cbd3df", // --neutral-300
  high: "#1b4f9c", // --blue-700
  some: "#ed9b26", // --orange-400
  track: "#eef1f6",
  accent: "#1b4f9c", // --blue-700
  accentStrong: "#1b4f9c",
  accentSoft: "#eef4fb", // --blue-50
  accentLine: "#adc8e8", // --blue-200
  orange: "#c7641a", // --orange-600
  orangeSoft: "#fdf4e6", // --orange-50
  outline: "#161c28", // --neutral-900
};

const DARK: Palette = {
  text: "#e1e6ee",
  muted: "#9aa6b8", // --neutral-400
  panel: "#161c28", // --neutral-900
  border: "#3a4456",
  base: "#262e3d", // --neutral-800
  idle: "#4f5b6e", // --neutral-600
  high: "#4d84cb", // --blue-400
  some: "#ed9b26", // --orange-400
  track: "#262e3d",
  accent: "#7ba6da", // --blue-300
  accentStrong: "#2c6ebb", // --blue-500
  accentSoft: "#0b1f3e", // --blue-950
  accentLine: "#1f5aa6",
  orange: "#f2b955", // --orange-300
  orangeSoft: "#2a2116",
  outline: "#ffffff",
};

const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

/* ---------- 資料（全部取自筆記） ---------- */

type Day = "A" | "B";
type MuscleId =
  | "upperChest"
  | "midChest"
  | "frontDelt"
  | "sideDelt"
  | "rearDelt"
  | "triceps"
  | "biceps"
  | "forearm"
  | "traps"
  | "lats"
  | "abs"
  | "legs";

const MUSCLES: readonly MuscleId[] = [
  "triceps",
  "frontDelt",
  "midChest",
  "sideDelt",
  "upperChest",
  "traps",
  "rearDelt",
  "biceps",
  "forearm",
  "lats",
  "abs",
  "legs",
];

const MUSCLE_NAME: Record<MuscleId, string> = {
  upperChest: "上胸",
  midChest: "中下胸",
  frontDelt: "前三角",
  sideDelt: "側三角",
  rearDelt: "後三角",
  triceps: "三頭",
  biceps: "二頭",
  forearm: "前臂",
  traps: "斜方肌",
  lats: "背闊肌",
  abs: "腹肌",
  legs: "腿部",
};

type Floor = "free" | "machine";

interface Exercise {
  order: string;
  name: string;
  floor: Floor;
  superset: boolean;
  sets: number; // 正式組數
  reps: string;
  weight: string;
  warmup: string | null;
  rest: string;
  progression: string;
  primary: readonly MuscleId[];
  secondary: readonly MuscleId[];
  note?: string;
}

/* 動作目標肌群（P = 主要、S = 次要） */
const TARGETS: Record<string, { primary: MuscleId[]; secondary: MuscleId[]; note?: string }> = {
  槓鈴臥推: { primary: ["midChest"], secondary: ["upperChest", "frontDelt", "triceps"] },
  上斜啞鈴臥推: { primary: ["upperChest", "frontDelt"], secondary: ["midChest", "triceps"] },
  啞鈴肩推: { primary: ["frontDelt"], secondary: ["sideDelt", "triceps", "traps"] },
  啞鈴側平舉: { primary: ["sideDelt"], secondary: ["traps"] },
  輔助雙槓臂屈伸: { primary: ["midChest", "triceps"], secondary: ["frontDelt"] },
  蝴蝶機: { primary: ["midChest", "upperChest"], secondary: ["frontDelt"] },
  繩索過頭三頭伸展: { primary: ["triceps"], secondary: [], note: "三頭（長頭）" },
  繩索側平舉: { primary: ["sideDelt"], secondary: [] },
  繩索三頭下壓: { primary: ["triceps"], secondary: [] },
};

type RawExercise = Omit<Exercise, "primary" | "secondary" | "note">;

const withTargets = (e: RawExercise): Exercise => ({ ...e, ...TARGETS[e.name] });

const A_RAW: RawExercise[] = [
  { order: "1", name: "槓鈴臥推", floor: "free", superset: false, sets: 3, reps: "4～8", weight: "60kg", warmup: "2 組：40kg × 8 → 50kg × 3", rest: "3 分", progression: "3 組皆 6 下以上 → 62.5kg" },
  { order: "2", name: "上斜啞鈴臥推", floor: "free", superset: false, sets: 3, reps: "6～8", weight: "22.5kg", warmup: "1 組：15kg × 6", rest: "2～3 分", progression: "3 組皆 8 下 → 25kg" },
  { order: "3", name: "啞鈴肩推", floor: "free", superset: false, sets: 3, reps: "6～8", weight: "17.5kg", warmup: "1 組：10kg × 8", rest: "2 分", progression: "3 組皆 8 下 → 20kg" },
  { order: "4", name: "啞鈴側平舉", floor: "free", superset: false, sets: 3, reps: "12～15", weight: "8kg", warmup: null, rest: "60 秒", progression: "3 組皆 15 下 → 加一級" },
  { order: "5", name: "輔助雙槓臂屈伸", floor: "machine", superset: false, sets: 3, reps: "8～10", weight: "輔助 18kg", warmup: null, rest: "90 秒", progression: "3 組皆 10 下 → 輔助減 4～5kg" },
  { order: "6A", name: "繩索過頭三頭伸展", floor: "machine", superset: true, sets: 3, reps: "10～15", weight: "15～20kg", warmup: null, rest: "輪間 60～90 秒", progression: "3 組皆 15 下 → 加一格" },
  { order: "6B", name: "繩索側平舉", floor: "machine", superset: true, sets: 2, reps: "12～20", weight: "3～5kg", warmup: null, rest: "輪間 60～90 秒", progression: "2 組皆 20 下 → 加一格" },
  { order: "7", name: "繩索三頭下壓", floor: "machine", superset: false, sets: 3, reps: "8～10", weight: "30～32kg", warmup: null, rest: "60 秒", progression: "3 組皆 10 下 → 加一格" },
];

/* B 日 = A 日套用差異：1、2 對調並換重量，5 改蝴蝶機 */
const B_RAW: RawExercise[] = A_RAW.map((e): RawExercise => {
  if (e.order === "1")
    return { order: "1", name: "上斜啞鈴臥推", floor: "free", superset: false, sets: 3, reps: "6～10", weight: "22.5kg", warmup: "2 組：12.5kg × 10 → 17.5kg × 5", rest: "2～3 分", progression: "3 組皆 10 下 → 25kg" };
  if (e.order === "2")
    return { order: "2", name: "槓鈴臥推", floor: "free", superset: false, sets: 3, reps: "5～8", weight: "55kg", warmup: "1 組：40kg × 5", rest: "3 分", progression: "3 組皆 8 下 → 57.5kg" };
  if (e.order === "5")
    return { order: "5", name: "蝴蝶機", floor: "machine", superset: false, sets: 3, reps: "8～10", weight: "66kg", warmup: "30kg × 10（換樓層後身體冷掉先做）", rest: "90 秒", progression: "3 組皆 10 下 → 加一格" };
  return e;
});

const PLAN: Record<Day, Exercise[]> = { A: A_RAW.map(withTargets), B: B_RAW.map(withTargets) };

/* 有效組數：主要 1 組、次要 0.5 組（只計正式組） */
function computeEffective(list: readonly Exercise[]): Record<MuscleId, number> {
  const out = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<MuscleId, number>;
  for (const e of list) {
    for (const m of e.primary) out[m] += e.sets;
    for (const m of e.secondary) out[m] += e.sets * 0.5;
  }
  return out;
}

const EFFECTIVE: Record<Day, Record<MuscleId, number>> = { A: computeEffective(PLAN.A), B: computeEffective(PLAN.B) };

/* 筆記「有效組數」表格：計算結果必須一致 */
const NOTE_TABLE: Record<Day, Partial<Record<MuscleId, number>>> = {
  A: { triceps: 13.5, frontDelt: 9, midChest: 7.5, sideDelt: 6.5, upperChest: 4.5, traps: 3 },
  B: { triceps: 10.5, frontDelt: 9, upperChest: 7.5, midChest: 7.5, sideDelt: 6.5, traps: 3 },
};

(function assertMatchesNote() {
  const bad: string[] = [];
  (["A", "B"] as const).forEach((d) =>
    MUSCLES.forEach((m) => {
      const expected = NOTE_TABLE[d][m] ?? 0;
      if (EFFECTIVE[d][m] !== expected) bad.push(`${d} ${MUSCLE_NAME[m]}: ${EFFECTIVE[d][m]} != ${expected}`);
    }),
  );
  if (bad.length > 0 && typeof console !== "undefined") console.error("[push-muscle-map] 有效組數與筆記不符：", bad);
})();

const totalSets = (d: Day) => PLAN[d].reduce((s, e) => s + e.sets, 0);

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

/** 頁面實際背景是否為深色（body 透明則看 html；都透明視為瀏覽器預設白底） */
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

/* ---------- 人體幾何（原創幾何風格；只定義右半身，左半身鏡射） ---------- */

type Pt = readonly [number, number];

interface RegionDef {
  muscle: MuscleId;
  polys: readonly (readonly Pt[])[];
}

function chamfer(x: number, y: number, w: number, h: number, c: number): Pt[] {
  return [
    [x + c, y],
    [x + w - c, y],
    [x + w, y + c],
    [x + w, y + h - c],
    [x + w - c, y + h],
    [x + c, y + h],
    [x, y + h - c],
    [x, y + c],
  ];
}

const toPoints = (p: readonly Pt[], flip: boolean) => p.map(([x, y]) => `${flip ? -x : x},${y}`).join(" ");

const SIDE_DELT: Pt[] = [[49, 56], [58, 61], [64, 74], [62, 92], [54, 99], [49, 96], [54, 72]];
const FOREARM: Pt[] = [[51, 151], [64, 150], [70, 170], [70, 194], [65, 207], [58, 207], [54, 182]];
const FEET: Pt[] = [[16, 386], [30, 386], [34, 396], [14, 396]];

const FRONT: RegionDef[] = [
  { muscle: "traps", polys: [[[9, 46], [34, 59], [12, 60]]] },
  { muscle: "upperChest", polys: [[[2, 62], [32, 62], [36, 77], [2, 80]]] },
  { muscle: "midChest", polys: [[[2, 83], [37, 80], [41, 94], [36, 109], [18, 115], [2, 112]]] },
  { muscle: "frontDelt", polys: [[[35, 59], [48, 57], [52, 72], [47, 96], [43, 93], [39, 77]]] },
  { muscle: "sideDelt", polys: [SIDE_DELT] },
  { muscle: "biceps", polys: [[[49, 102], [59, 101], [65, 116], [64, 139], [58, 150], [52, 142], [49, 122]]] },
  { muscle: "triceps", polys: [[[42, 106], [46, 102], [47, 122], [50, 143], [46, 146], [41, 126]]] },
  { muscle: "forearm", polys: [FOREARM] },
  {
    muscle: "abs",
    polys: [
      chamfer(2, 119, 16, 17, 3),
      chamfer(2, 139, 16, 17, 3),
      chamfer(2, 159, 16, 20, 3),
      [[21, 118], [37, 112], [36, 140], [32, 174], [21, 180]],
    ],
  },
  {
    muscle: "legs",
    polys: [
      [[4, 205], [34, 197], [40, 228], [37, 276], [29, 298], [12, 298], [5, 258]],
      [[13, 306], [31, 304], [34, 336], [29, 382], [17, 382], [13, 338]],
    ],
  },
];

const FRONT_BASE: (readonly Pt[])[] = [
  [[0, 40], [8, 40], [9, 52], [0, 54]],
  [[0, 183], [31, 182], [33, 193], [0, 201]],
  FEET,
];

const BACK: RegionDef[] = [
  { muscle: "traps", polys: [[[1, 42], [10, 47], [35, 60], [19, 70], [7, 104], [1, 112]]] },
  { muscle: "rearDelt", polys: [[[36, 61], [48, 57], [52, 72], [47, 95], [42, 90], [38, 74]]] },
  { muscle: "sideDelt", polys: [SIDE_DELT] },
  { muscle: "lats", polys: [[[10, 104], [21, 73], [36, 79], [40, 95], [39, 118], [33, 150], [13, 168], [8, 132]]] },
  { muscle: "triceps", polys: [[[44, 100], [57, 100], [64, 114], [64, 140], [57, 150], [50, 143], [45, 122]]] },
  { muscle: "forearm", polys: [FOREARM] },
  {
    muscle: "legs",
    polys: [
      [[4, 222], [33, 220], [38, 246], [35, 280], [28, 298], [12, 298], [6, 262]],
      [[13, 306], [31, 304], [36, 328], [30, 368], [17, 368], [12, 330]],
    ],
  },
];

const BACK_BASE: (readonly Pt[])[] = [
  [[0, 40], [8, 40], [9, 52], [0, 54]],
  [[1, 116], [6, 110], [9, 134], [12, 172], [1, 178]],
  [[1, 183], [30, 180], [36, 200], [30, 216], [1, 218]],
  [[17, 371], [29, 371], [30, 383], [17, 383]],
  FEET,
];

type Level = "high" | "some" | "idle";

function Figure({
  cx,
  view,
  levelOf,
  hover,
  setHover,
  pal,
  reduce,
}: {
  cx: number;
  view: "front" | "back";
  levelOf: (m: MuscleId) => Level;
  hover: MuscleId | null;
  setHover: (m: MuscleId | null) => void;
  pal: Palette;
  reduce: boolean;
}) {
  const regions = view === "front" ? FRONT : BACK;
  const base = view === "front" ? FRONT_BASE : BACK_BASE;
  const color = (l: Level) => (l === "high" ? pal.high : l === "some" ? pal.some : pal.idle);
  const tr = { duration: reduce ? 0 : 0.28, ease: "easeOut" as const };
  return (
    <g transform={`translate(${cx} 14)`}>
      <ellipse cx={0} cy={22} rx={15} ry={19} fill={pal.base} />
      {base.map((p, i) =>
        [false, true].map((flip) => <polygon key={`b${i}${flip ? "l" : "r"}`} points={toPoints(p, flip)} fill={pal.base} />),
      )}
      {[false, true].map((flip) => (
        <ellipse key={`h${flip ? "l" : "r"}`} cx={flip ? -66 : 66} cy={218} rx={6} ry={10} fill={pal.base} />
      ))}
      {regions.map((r) => {
        const on = hover === r.muscle;
        return (
          <g
            key={r.muscle}
            onPointerEnter={() => setHover(r.muscle)}
            onPointerLeave={() => setHover(null)}
            onClick={() => setHover(r.muscle)}
            style={{ cursor: "pointer" }}
          >
            {r.polys.map((p, i) =>
              [false, true].map((flip) => (
                <motion.polygon
                  key={`${i}${flip ? "l" : "r"}`}
                  points={toPoints(p, flip)}
                  initial={false}
                  animate={{ fill: color(levelOf(r.muscle)) }}
                  transition={tr}
                  stroke={on ? pal.outline : pal.panel}
                  strokeWidth={on ? 1.5 : 1}
                  strokeLinejoin="round"
                />
              )),
            )}
          </g>
        );
      })}
    </g>
  );
}

/* ---------- 小元件 ---------- */

function Legend({ pal, items }: { pal: Palette; items: { c: string; t: string }[] }) {
  return (
    <div role="group" aria-label="圖例" style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, color: pal.muted }}>
      {items.map((it) => (
        <span key={it.t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: it.c, display: "inline-block" }} />
          {it.t}
        </span>
      ))}
    </div>
  );
}

const SCALE_MAX = 14;

function BarRow({
  pal,
  muscle,
  value,
  color,
  tag,
  hovered,
  setHover,
}: {
  pal: Palette;
  muscle: MuscleId;
  value: number;
  color: string;
  tag?: string;
  hovered: boolean;
  setHover: (m: MuscleId | null) => void;
}) {
  return (
    <div
      onPointerEnter={() => setHover(muscle)}
      onPointerLeave={() => setHover(null)}
      style={{ display: "grid", gridTemplateColumns: "52px 1fr 64px", alignItems: "center", gap: 8, fontSize: 12.5, color: pal.text, fontWeight: hovered ? 700 : 500 }}
    >
      <span>{MUSCLE_NAME[muscle]}</span>
      <span style={{ position: "relative", height: 8, borderRadius: 4, background: pal.track, display: "block" }}>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(value / SCALE_MAX) * 100}%`, borderRadius: 4, background: color, transition: "width 240ms ease-out" }} />
        <span style={{ position: "absolute", left: `${(6 / SCALE_MAX) * 100}%`, top: -3, bottom: -3, borderLeft: `1px dashed ${pal.muted}` }} />
      </span>
      <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right", whiteSpace: "nowrap" }}>
        {tag ? <span style={{ fontFamily: FONT, color: pal.muted, fontWeight: 500, marginRight: 4 }}>{tag}</span> : null}
        {value}
      </span>
    </div>
  );
}

function Detail({ pal, k, v, mono }: { pal: Palette; k: string; v: string; mono?: boolean }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: pal.muted, fontWeight: 700 }}>{k}</span>
      <span style={{ fontSize: 12.5, color: pal.text, fontFamily: mono ? MONO : FONT, overflowWrap: "anywhere" }}>{v}</span>
    </span>
  );
}

const ROW_COLS = "44px minmax(150px,1.4fr) 70px 86px minmax(130px,1.3fr) 92px minmax(140px,1.4fr)";

function ExerciseRow({
  e,
  pal,
  selected,
  stacked,
  onToggle,
}: {
  e: Exercise;
  pal: Palette;
  selected: boolean;
  stacked: boolean;
  onToggle: () => void;
}) {
  const badge: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 30,
    height: 24,
    padding: "0 6px",
    borderRadius: 6,
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: 800,
    background: e.superset ? pal.orangeSoft : pal.accentSoft,
    color: e.superset ? pal.orange : pal.accent,
    border: `1px solid ${e.superset ? pal.orange : pal.accentLine}`,
  };
  const muscles = (
    <span style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", fontSize: 11.5, color: pal.muted }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: pal.high, display: "inline-block" }} />
        {e.note ?? e.primary.map((m) => MUSCLE_NAME[m]).join("、")}
      </span>
      {e.secondary.length > 0 && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: pal.some, display: "inline-block" }} />
          {e.secondary.map((m) => MUSCLE_NAME[m]).join("、")}
        </span>
      )}
    </span>
  );
  const nameBlock = (
    <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 14, fontWeight: 700, color: pal.text }}>
        {e.name}
        {e.superset && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: pal.orange, border: `1px solid ${pal.orange}`, borderRadius: 999, padding: "0 6px", lineHeight: "16px" }}>超級組</span>
        )}
      </span>
      {muscles}
    </span>
  );
  const warm = e.warmup ?? "無";
  const base: CSSProperties = {
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
    cursor: "pointer",
    borderRadius: 8,
    border: `1px solid ${selected ? pal.accent : pal.border}`,
    background: selected ? pal.accentSoft : pal.panel,
    color: pal.text,
    padding: "8px 10px",
    transition: "background-color 160ms, border-color 160ms",
  };
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${e.order} ${e.name}，${selected ? "再點一次回到總覽" : "點選在人體圖顯示目標肌群"}`}
      onClick={onToggle}
      style={
        stacked
          ? { ...base, display: "flex", flexDirection: "column", gap: 8 }
          : { ...base, display: "grid", gridTemplateColumns: ROW_COLS, gap: 10, alignItems: "center" }
      }
    >
      {stacked ? (
        <>
          <span style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={badge}>{e.order}</span>
            {nameBlock}
          </span>
          <span style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "6px 12px" }}>
            <Detail pal={pal} k="組數 × 次數" v={`${e.sets} × ${e.reps}`} mono />
            <Detail pal={pal} k="重量" v={e.weight} mono />
            <Detail pal={pal} k="休息" v={e.rest} />
            <Detail pal={pal} k="熱身組" v={warm} />
            <span style={{ gridColumn: "1 / -1" }}>
              <Detail pal={pal} k="加重條件" v={e.progression} />
            </span>
          </span>
        </>
      ) : (
        <>
          <span style={badge}>{e.order}</span>
          {nameBlock}
          <span style={{ fontFamily: MONO, fontSize: 12.5 }}>{`${e.sets} × ${e.reps}`}</span>
          <span style={{ fontFamily: MONO, fontSize: 12.5 }}>{e.weight}</span>
          <span style={{ fontSize: 12.5, color: e.warmup ? pal.text : pal.muted }}>{warm}</span>
          <span style={{ fontSize: 12.5 }}>{e.rest}</span>
          <span style={{ fontSize: 12.5 }}>{e.progression}</span>
        </>
      )}
    </button>
  );
}

/* ---------- 主元件 ---------- */

export default function PushMuscleMap() {
  const reduce = useReducedMotion() ?? false;
  const dark = useDarkMode();
  const pal = dark ? DARK : LIGHT;
  const [rootRef, width] = useElementWidth<HTMLDivElement>();
  const narrow = width > 0 && width < 620; // 人體圖與資訊欄改上下排
  const stacked = width > 0 && width < 820; // 動作列改堆疊

  const [day, setDay] = useState<Day>("A");
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<MuscleId | null>(null);

  const list = PLAN[day];
  const eff = EFFECTIVE[day];
  const ex = list.find((e) => e.name === selected) ?? null;

  const levelOf = (m: MuscleId): Level => {
    if (ex) return ex.primary.includes(m) ? "high" : ex.secondary.includes(m) ? "some" : "idle";
    return eff[m] >= 6 ? "high" : eff[m] > 0 ? "some" : "idle";
  };

  const switchDay = (d: Day) => {
    setDay(d);
    // 同名動作在另一天也存在就保留選取
    if (selected && !PLAN[d].some((e) => e.name === selected)) setSelected(null);
  };

  const involved = MUSCLES.filter((m) => eff[m] > 0).sort((a, b) => eff[b] - eff[a]);
  const untrained = MUSCLES.filter((m) => eff[m] === 0);

  const hoverText = (() => {
    if (!hover) return "滑過或點選肌群，查看本日有效組數";
    const base = `${MUSCLE_NAME[hover]}：本日有效組數 ${eff[hover]} 組`;
    if (!ex) return eff[hover] === 0 ? `${MUSCLE_NAME[hover]}：本日未訓練` : base;
    const role = ex.primary.includes(hover) ? "主要" : ex.secondary.includes(hover) ? "次要" : "未參與";
    return `${base}；此動作：${role}`;
  })();

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

  const free = list.filter((e) => e.floor === "free");
  const machine = list.filter((e) => e.floor === "machine");

  const renderRows = (rows: Exercise[]) => {
    const out: ReactElement[] = [];
    for (let i = 0; i < rows.length; i++) {
      const e = rows[i];
      if (e.superset) {
        const group: Exercise[] = [];
        while (i < rows.length && rows[i].superset) group.push(rows[i++]);
        i--;
        out.push(
          <div key={`ss-${e.order}`} role="group" aria-label="超級組" style={{ display: "flex", flexDirection: "column", gap: 6, borderLeft: `2px solid ${pal.orange}`, paddingLeft: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: pal.orange }}>
              <Repeat size={14} /> 超級組：{group.map((g) => g.order).join(" → ")} 輪流做，輪間休息 60～90 秒
            </span>
            {group.map((g) => (
              <ExerciseRow key={g.name} e={g} pal={pal} selected={selected === g.name} stacked={stacked} onToggle={() => setSelected(selected === g.name ? null : g.name)} />
            ))}
          </div>,
        );
      } else {
        out.push(<ExerciseRow key={e.name} e={e} pal={pal} selected={selected === e.name} stacked={stacked} onToggle={() => setSelected(selected === e.name ? null : e.name)} />);
      }
    }
    return out;
  };

  const floorHead = (icon: ReactElement, title: string, sub: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: pal.accent, marginTop: 4 }}>
      {icon}
      {title}
      <span style={{ fontWeight: 500, fontSize: 12, color: pal.muted }}>{sub}</span>
    </div>
  );

  const header = !stacked && (
    <div style={{ display: "grid", gridTemplateColumns: ROW_COLS, gap: 10, padding: "0 11px", fontSize: 11, fontWeight: 700, color: pal.muted }}>
      <span>順序</span>
      <span>動作（主要／次要肌群）</span>
      <span>組 × 次</span>
      <span>重量</span>
      <span>熱身組</span>
      <span>休息</span>
      <span>加重條件</span>
    </div>
  );

  return (
    <div ref={rootRef} className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT, color: pal.text }}>
      {/* A／B 切換 + 模式標籤 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div role="group" aria-label="選擇推日" style={{ display: "inline-flex", border: `1.5px solid ${pal.accentLine}`, borderRadius: 999, overflow: "hidden" }}>
          {(["A", "B"] as const).map((d) => (
            <button key={d} type="button" aria-pressed={day === d} onClick={() => switchDay(d)} style={btn(day === d)}>
              推日 {d}（{d === "A" ? "臥推優先" : "上斜優先"}）
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12.5, color: pal.muted }} aria-live="polite">
          {ex ? (
            <>
              <strong style={{ color: pal.text }}>動作模式</strong>：{ex.order} {ex.name}
            </>
          ) : (
            <>
              <strong style={{ color: pal.text }}>總覽模式</strong>：推日 {day}，正式 {totalSets(day)} 組
            </>
          )}
        </span>
        {ex && (
          <button
            type="button"
            onClick={() => setSelected(null)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 28, padding: "0 10px", borderRadius: 999, border: `1px solid ${pal.accentLine}`, background: "transparent", color: pal.accent, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            <RotateCcw size={13} /> 回到總覽
          </button>
        )}
      </div>

      {/* 人體圖 + 資訊欄 */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0,1.15fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <svg
          viewBox="0 0 460 440"
          width="100%"
          role="img"
          aria-label={
            ex
              ? `人體肌群圖（正面與背面），顯示 ${ex.name} 的主要肌群 ${ex.primary.map((m) => MUSCLE_NAME[m]).join("、")}${ex.secondary.length ? `，次要肌群 ${ex.secondary.map((m) => MUSCLE_NAME[m]).join("、")}` : ""}。`
              : `人體肌群圖（正面與背面），推日 ${day} 總覽：有效組數 6 組以上為 ${involved.filter((m) => eff[m] >= 6).map((m) => MUSCLE_NAME[m]).join("、")}；其他參與為 ${involved.filter((m) => eff[m] < 6).map((m) => MUSCLE_NAME[m]).join("、")}。`
          }
          style={{ display: "block" }}
          onPointerLeave={() => setHover(null)}
        >
          <rect x={0.5} y={0.5} width={459} height={439} rx={8} fill={pal.panel} stroke={pal.border} strokeWidth={1} />
          <Figure cx={118} view="front" levelOf={levelOf} hover={hover} setHover={setHover} pal={pal} reduce={reduce} />
          <Figure cx={342} view="back" levelOf={levelOf} hover={hover} setHover={setHover} pal={pal} reduce={reduce} />
          <line x1={230} y1={24} x2={230} y2={410} stroke={pal.border} strokeWidth={1} />
          <text x={118} y={428} textAnchor="middle" fontSize={12} fontWeight={700} fill={pal.muted} fontFamily={FONT}>
            正面
          </text>
          <text x={342} y={428} textAnchor="middle" fontSize={12} fontWeight={700} fill={pal.muted} fontFamily={FONT}>
            背面
          </text>
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Legend
            pal={pal}
            items={
              ex
                ? [
                    { c: pal.high, t: "主要肌群" },
                    { c: pal.some, t: "次要肌群" },
                    { c: pal.idle, t: "未參與" },
                  ]
                : [
                    { c: pal.high, t: "有效組數 ≥ 6" },
                    { c: pal.some, t: "有參與（< 6）" },
                    { c: pal.idle, t: "未訓練" },
                  ]
            }
          />
          <div style={{ fontSize: 12.5, color: hover ? pal.text : pal.muted, fontWeight: hover ? 700 : 400, minHeight: 20 }} aria-live="polite">
            {hoverText}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: pal.muted }}>
              {ex ? `此動作貢獻的有效組數（${ex.sets} 組正式組）` : `推日 ${day} 有效組數（主要 1、次要 0.5；虛線 = 6 組）`}
            </div>
            {ex
              ? [...ex.primary.map((m) => ({ m, v: ex.sets, c: pal.high, tag: "主要" })), ...ex.secondary.map((m) => ({ m, v: ex.sets * 0.5, c: pal.some, tag: "次要" }))].map((r) => (
                  <BarRow key={r.m} pal={pal} muscle={r.m} value={r.v} color={r.c} tag={r.tag} hovered={hover === r.m} setHover={setHover} />
                ))
              : involved.map((m) => (
                  <BarRow key={m} pal={pal} muscle={m} value={eff[m]} color={eff[m] >= 6 ? pal.high : pal.some} hovered={hover === m} setHover={setHover} />
                ))}
            {!ex && (
              <div style={{ fontSize: 12, color: pal.muted, lineHeight: 1.6 }}>
                未訓練：{untrained.map((m) => MUSCLE_NAME[m]).join("、")}
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: pal.muted, lineHeight: 1.6 }}>點選下方動作列，人體圖會改為該動作的主要（藍）與次要（橘）肌群；再點一次回到總覽。</div>
        </div>
      </div>

      {/* 動作清單 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, color: pal.muted }}>0　一般熱身：動態伸展、肩關節活動，約 5 分鐘。啞鈴重量皆為單邊。</div>
        {header}
        {floorHead(<Dumbbell size={15} />, "自由重量樓層", `${free.length} 個動作`)}
        {renderRows(free)}
        <div role="separator" aria-label="換樓層，約 3 分鐘" style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0", color: pal.muted, fontSize: 12, fontWeight: 700 }}>
          <span style={{ flex: 1, borderTop: `1px dashed ${pal.idle}` }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <ArrowDownUp size={14} /> 換樓層　約 3 分鐘
          </span>
          <span style={{ flex: 1, borderTop: `1px dashed ${pal.idle}` }} />
        </div>
        {floorHead(<Layers size={15} />, "器械樓層", `${machine.length} 個動作`)}
        {renderRows(machine)}
      </div>
    </div>
  );
}
