import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { Check, Pause, Play, Route, TriangleAlert } from "lucide-react";

/* ---------- 色票（trendlink-design token；Tailwind class 不會被編譯，改用常數） ---------- */

interface Palette {
  text: string;
  muted: string;
  panel: string;
  border: string;
  mDark: string; // 肌群區塊：深
  mMid: string; // 肌群區塊：中
  mLight: string; // 肌群區塊：淺
  far: string; // 遠側肢體
  gap: string; // 肌群之間的分隔線（同面板底色）
  skin: string; // 頭、手、腳、髕骨
  skinEdge: string;
  pad: string; // 椅墊
  frame: string; // 椅架、地面
  plate: string;
  plateEdge: string;
  plateInner: string;
  sleeve: string;
  primary: string; // 主要肌群（用力最大時）
  primaryRest: string; // 主要肌群（放鬆時）
  secondary: string; // 次要肌群（用力最大時）
  secondaryRest: string; // 次要肌群（放鬆時）
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentLine: string;
  warn: string; // 錯誤姿勢線條 / 面
  warnText: string;
  warnSoft: string;
}

const LIGHT: Palette = {
  text: "#3a4456", // --neutral-700
  muted: "#6c798e", // --neutral-500
  panel: "#ffffff",
  border: "#e1e6ee", // --neutral-200
  mDark: "#5d6a80",
  mMid: "#6c798e", // --neutral-500
  mLight: "#8593a8",
  far: "#b4bfcd",
  gap: "#ffffff",
  skin: "#ffffff",
  skinEdge: "#9aa6b8", // --neutral-400
  pad: "#cbd3df", // --neutral-300
  frame: "#9aa6b8",
  plate: "#f6f8fb",
  plateEdge: "#9aa6b8",
  plateInner: "#cbd3df",
  sleeve: "#3a4456",
  primary: "#e37b24", // --orange-500
  primaryRest: "#f2b955", // --orange-300
  secondary: "#f2b955", // --orange-300
  secondaryRest: "#fbe7c6", // --orange-100
  accent: "#1b4f9c", // --blue-700
  accentStrong: "#1b4f9c",
  accentSoft: "#eef4fb", // --blue-50
  accentLine: "#adc8e8", // --blue-200
  warn: "#d64545", // --danger-500（錯誤姿勢屬警示狀態，與橘色目標肌群區隔）
  warnText: "#b83535",
  warnSoft: "#fbeaea", // --danger-50
};

const DARK: Palette = {
  text: "#e1e6ee",
  muted: "#9aa6b8",
  panel: "#161c28", // --neutral-900
  border: "#3a4456",
  mDark: "#4f5b6e", // --neutral-600
  mMid: "#6c798e",
  mLight: "#8593a8",
  far: "#3a4456",
  gap: "#161c28",
  skin: "#e1e6ee",
  skinEdge: "#9aa6b8",
  pad: "#3a4456",
  frame: "#6c798e",
  plate: "#262e3d", // --neutral-800
  plateEdge: "#9aa6b8",
  plateInner: "#4f5b6e",
  sleeve: "#e1e6ee",
  primary: "#ed9b26", // --orange-400
  primaryRest: "#a04f15", // --orange-700
  secondary: "#f6cd86", // --orange-200
  secondaryRest: "#c7641a", // --orange-600
  accent: "#7ba6da", // --blue-300
  accentStrong: "#2c6ebb", // --blue-500
  accentSoft: "#0b1f3e", // --blue-950
  accentLine: "#1f5aa6",
  warn: "#e5605a",
  warnText: "#f08a85",
  warnSoft: "#2a1716",
};

const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

/* ---------- 環境偵測（同 bench-press-motion 的作法） ---------- */

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

/* ---------- 節奏與階段（取自筆記：頂端鎖定 → 約 2 秒下放 → 底部停頓 → 推起） ---------- */

type PhaseId = 0 | 1 | 2 | 3;

interface Phase {
  id: PhaseId;
  name: string;
  start: number; // 秒
  dur: number;
  cue: string;
}

const PHASES: readonly Phase[] = [
  { id: 0, name: "推到頂端", start: 0, dur: 1, cue: "肩胛骨往後收、往下沉，上背貼緊椅背；啞鈴在肩關節正上方，掌心朝腳的方向。" },
  { id: 1, name: "下放（約 2 秒）", start: 1, dur: 2, cue: "約 2 秒控制下放，手肘往身體斜下方收，啞鈴落到上胸兩側；前臂維持垂直。" },
  { id: 2, name: "底部停頓", start: 3, dur: 0.5, cue: "在底部短暫停頓；臀部貼緊座墊與椅背交界，雙腳踩穩地面。" },
  { id: 3, name: "推起", start: 3.5, dur: 1, cue: "往上推回肩關節正上方；頂端兩顆啞鈴靠近但不互撞。" },
];

const CYCLE = 4.5;

function phaseAt(t: number): Phase {
  for (let i = PHASES.length - 1; i >= 0; i--) if (t >= PHASES[i].start) return PHASES[i];
  return PHASES[0];
}

type ErrorMode = "none" | "shallow" | "hips";

const ERRORS: readonly { id: ErrorMode; label: string; note: string }[] = [
  { id: "none", label: "無", note: "" },
  { id: "shallow", label: "下放太淺", note: "只做上半段，上胸最被拉長的那一段被省略。" },
  { id: "hips", label: "臀部離椅", note: "推起時臀部離開座墊，等於把角度改平，上斜的意義就不見了。" },
];

type BenchAngle = 30 | 45 | 60;
const ANGLES: readonly BenchAngle[] = [30, 45, 60];
const STEEP_NOTE = "超過 45 度，前三角接手越來越多，接近肩推";

/* ---------- 幾何與運動學（場景座標，頭在左上） ---------- */

type Pt = readonly [number, number];

/*
 * 人體沿用槓鈴臥推的頭長 A 比例（以平躺姿勢定義在「區域座標」）。
 * 上半身（軀幹、頭、椅背墊）整塊繞髖關節 HIP 旋轉椅背角度；腿與座墊不動。
 * 肩關節 = 區域肩點 SHOULDER_L 繞 HIP 旋轉後的位置，反向運動學以它為原點。
 */
const FLOOR_Y = 331;
const SEAT_TOP = 215; // 座墊高度與槓鈴臥推椅同高，大腿維持水平、腳踩地
const PAD_H = 13;
const SHOULDER_L: Pt = [140, 188];
const HIP: Pt = [292, 192]; // 上半身旋轉中心（髖關節）
const KNEE: Pt = [419, 196];
const BACK_PIVOT_L: Pt = [160, SEAT_TOP]; // 臀部離椅時軀幹繞上背接觸點轉
const GLUTE_L: Pt = [298, SEAT_TOP]; // 臀部與座墊接觸點（區域座標）
const L_UPPER_LOCK = 80; // 上臂（頂端時的側視投影）
const L_UPPER_BOTTOM = 76; // 上臂（底部時的側視投影目標，手肘斜收）
const L_FORE = 80; // 前臂
const BOTTOM_LOCAL_Y = -50; // 底部時啞鈴中心離肩點的軀幹法向高度（啞鈴較厚，比槓鈴高一些）
const DB_R = 22; // 啞鈴槓片半徑

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(p));
const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;

function rotateAbout(p: Pt, c: Pt, a: number): Pt {
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
}

interface Geo {
  angle: number; // 椅背角度（度）
  th: number; // 弧度
  shoulder: Pt;
  lockout: Pt; // 肩關節正上方（垂直地面）
  bottom: Pt; // 胸口兩側
  arcT1: number; // 底部時上臂方向
  luBottom: number; // 底部時上臂投影長度（前臂完全垂直）
}

/**
 * 依椅背角度求幾何。底部點定義在軀幹座標：肩點往腳側 a、往上 50（啞鈴中心在胸口上方），
 * 再隨椅背旋轉；前臂完全垂直時手肘在手正下方 80。以二分法找 a，讓上臂投影長接近 76
 * （超過上臂長度就不可能維持前臂垂直）。椅背越陡 a 越小，啞鈴越靠近鎖骨、肩前，接近肩推。
 */
function makeGeo(angle: number): Geo {
  const th = rad(angle);
  const shoulder = rotateAbout(SHOULDER_L, HIP, th);
  const handAt = (a: number): Pt => rotateAbout([SHOULDER_L[0] + a, SHOULDER_L[1] + BOTTOM_LOCAL_Y], HIP, th);
  const luAt = (a: number) => {
    const h = handAt(a);
    return Math.hypot(h[0] - shoulder[0], h[1] + L_FORE - shoulder[1]);
  };
  let lo = 0;
  let hi = 60;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (luAt(mid) < L_UPPER_BOTTOM) lo = mid;
    else hi = mid;
  }
  const a = (lo + hi) / 2;
  const bottom = handAt(a);
  const elbow: Pt = [bottom[0], bottom[1] + L_FORE];
  return {
    angle,
    th,
    shoulder,
    lockout: [shoulder[0], shoulder[1] - L_UPPER_LOCK - L_FORE],
    bottom,
    arcT1: Math.atan2(elbow[1] - shoulder[1], elbow[0] - shoulder[0]),
    luBottom: Math.hypot(elbow[0] - shoulder[0], elbow[1] - shoulder[1]),
  };
}

/** 上臂投影長度：依手的高度在頂端與底部之間內插 */
function upperLen(handY: number, g: Geo): number {
  return lerp(L_UPPER_LOCK, g.luBottom, clamp01((handY - g.lockout[1]) / (g.bottom[1] - g.lockout[1])));
}

/** 前臂完全垂直時，手的位置：手肘沿以肩為圓心的弧移動，手在手肘正上方 */
function verticalForearmArc(u: number, g: Geo): Pt {
  const th = lerp(-Math.PI / 2, g.arcT1, u);
  const lu = lerp(L_UPPER_LOCK, g.luBottom, u);
  return [g.shoulder[0] + lu * Math.cos(th), g.shoulder[1] + lu * Math.sin(th) - L_FORE];
}

/** 正確路徑：直線與「前臂垂直弧線」混合；推起混合比例較高 */
function correctHand(u: number, pressing: boolean, g: Geo): Pt {
  const w = pressing ? 0.9 : 0.7;
  const a = verticalForearmArc(u, g);
  const l: Pt = [lerp(g.lockout[0], g.bottom[0], u), lerp(g.lockout[1], g.bottom[1], u)];
  return [lerp(l[0], a[0], w), lerp(l[1], a[1], w)];
}

interface Arm {
  hand: Pt;
  elbow: Pt;
  upper: number; // 上臂投影長度
  elbowDeg: number;
  forearmDev: number; // 前臂偏離垂直角度（度，正 = 手偏向腳側）
}

/** 兩段連桿反向運動學；取手肘朝地板／腳側的解 */
function solveArm(hand: Pt, g: Geo): Arm {
  const S = g.shoulder;
  const lu = upperLen(hand[1], g);
  const dx = hand[0] - S[0];
  const dy = hand[1] - S[1];
  const raw = Math.hypot(dx, dy) || 0.01;
  const c = Math.min(Math.max(raw, Math.abs(lu - L_FORE) + 0.01), lu + L_FORE - 0.01);
  const a = (lu * lu - L_FORE * L_FORE + c * c) / (2 * c);
  const h = Math.sqrt(Math.max(0, lu * lu - a * a));
  const ux = dx / raw;
  const uy = dy / raw;
  const elbow: Pt = [S[0] + a * ux - h * uy, S[1] + a * uy + h * ux];
  const cosE = (lu * lu + L_FORE * L_FORE - c * c) / (2 * lu * L_FORE);
  return {
    hand,
    elbow,
    upper: lu,
    elbowDeg: deg(Math.acos(Math.min(1, Math.max(-1, cosE)))),
    forearmDev: deg(Math.atan2(hand[0] - elbow[0], elbow[1] - hand[1])),
  };
}

/** 正確動作：u = 0 頂端、1 底部 */
function correctU(t: number): { u: number; pressing: boolean } {
  if (t < 1) return { u: 0, pressing: false };
  if (t < 3) return { u: easeInOut((t - 1) / 2), pressing: false };
  if (t < 3.5) return { u: 1, pressing: false };
  return { u: 1 - easeInOut(t - 3.5), pressing: true };
}

function hipLift(t: number): number {
  if (t < 3.5) return 0;
  return 16 * Math.sin(Math.PI * clamp01(t - 3.5));
}

/** 肌群強度：推起最深 */
function intensity(t: number): number {
  if (t < 1) return 0.2;
  if (t < 3) return lerp(0.25, 0.55, (t - 1) / 2);
  if (t < 3.5) return 0.6;
  const p = t - 3.5;
  if (p < 0.12) return lerp(0.6, 1, p / 0.12);
  if (p > 0.85) return lerp(1, 0.2, (p - 0.85) / 0.15);
  return 1;
}

/** 椅背角度對上胸／前三角分工的影響（30°：1.0／0.75、45°：0.9／0.9、60°：0.6／1.0，中間線性內插） */
function emphasis(angle: number): { upper: number; delt: number } {
  if (angle <= 45) {
    const p = clamp01((angle - 30) / 15);
    return { upper: lerp(1, 0.9, p), delt: lerp(0.75, 0.9, p) };
  }
  const p = clamp01((angle - 45) / 15);
  return { upper: lerp(0.9, 0.6, p), delt: lerp(0.9, 1, p) };
}

interface Pose {
  arm: Arm;
  u: number;
}

function correctPose(t: number, g: Geo): Pose {
  const { u, pressing } = correctU(t);
  return { arm: solveArm(correctHand(u, pressing, g), g), u };
}

/** 下放太淺：只走一半就推回 */
function shallowPose(t: number, g: Geo): Pose {
  const { u, pressing } = correctU(t);
  const us = u * 0.5;
  return { arm: solveArm(correctHand(us, pressing, g), g), u: us };
}

/** 啞鈴高度（示意）：底部 0%、頂端 100% */
const dbHeightPct = (hand: Pt, g: Geo) => Math.round(((g.bottom[1] - hand[1]) / (g.bottom[1] - g.lockout[1])) * 100);

const FOREARM_OK = 10;

/* ---------- 人體（肌群區塊：石板灰剪影＋分隔線，目標肌群上色）與器材 ---------- */

// 軀幹（含頸部），區域座標：平躺、背貼 y = 215
const TORSO_D =
  "M98 214 C99 206 101 198 104 192 C110 186 116 180 119 174 C126 178 134 177 141 174 L148 170 C160 156 176 142 196 140 " +
  "C214 139 226 146 232 156 C240 166 252 172 266 172 C278 172 286 168 292 168 C298 169 302 173 304 178 L312 200 " +
  "C314 208 312 214 308 215 L276 215 C262 215 252 209 238 209 C224 209 216 215 204 215 L140 215 C126 214 116 213 98 214 Z";
// 頭部側面（蛋形頭骨、額、鼻、唇、下巴、下顎線）
const HEAD_D =
  "M98 214 C80 219 58 213 53 196 C48 178 62 165 84 164 C88 163 91 162 93 161 C96 159 99 156 101 153 C103 155 104 159 105 162 " +
  "C107 163 109 163 111 163 C113 163 114 164 116 164 C119 164 121 167 120 171 C116 179 110 186 104 192 C101 198 99 206 98 214 Z";
// 腿（大腿 2A、膝與髖同高、小腿往下到腳踝）
const LEG_D =
  "M292 168 C335 164 384 170 412 180 C420 182 427 188 427 196 C428 204 426 208 427 214 C432 240 436 276 439 300 L421 300 " +
  "C414 272 398 254 398 236 C398 226 402 220 406 214 C380 216 345 216 314 214 C306 212 300 200 296 186 Z";
const FOOT_D =
  "M420 298 L439 300 C448 306 466 315 484 321 C492 323 496 327 493 331 L426 331 C418 331 415 324 417 316 C418 308 419 302 420 298 Z";

type Tone = "mDark" | "mMid" | "mLight";

const TORSO_BLOCKS: readonly { d: string; tone: Tone }[] = [
  { d: "M102 212 C118 205 134 199 150 196 L156 214 L100 214 Z", tone: "mDark" }, // 斜方肌
  { d: "M104 192 C110 186 116 180 119 174 C128 178 138 176 146 172 C132 184 116 196 101 204 Z", tone: "mLight" }, // 胸鎖乳突肌
  { d: "M150 196 C180 194 208 192 234 186 C238 194 240 202 239 209 C224 209 216 215 204 215 L156 214 Z", tone: "mLight" }, // 背闊肌
  { d: "M200 188 L214 184 L218 190 L204 193 Z", tone: "mMid" }, // 前鋸肌
  { d: "M216 184 L228 178 L232 186 L220 190 Z", tone: "mMid" },
  { d: "M230 176 L236 168 L238 182 L234 186 Z", tone: "mMid" },
  { d: "M233 157 C238 162 243 165 248 166 L247 178 C242 177 238 176 236 175 Z", tone: "mMid" }, // 腹直肌
  { d: "M249 167 C254 169 259 170 263 171 L263 181 C258 181 253 180 248 178 Z", tone: "mMid" },
  { d: "M264 171 C269 171 274 171 279 170 L280 182 C275 182 270 182 264 182 Z", tone: "mMid" },
  { d: "M280 169 C285 168 289 168 292 168 C295 172 295 177 294 182 C289 182 284 183 280 183 Z", tone: "mMid" },
  { d: "M236 177 C252 181 272 185 294 185 C296 192 297 200 298 208 C280 206 258 206 240 206 C240 196 239 186 236 177 Z", tone: "mDark" }, // 腹外斜肌
  { d: "M295 185 C304 190 310 198 313 210 C312 214 310 215 306 215 L280 215 C288 212 296 210 298 208 C297 200 296 192 295 185 Z", tone: "mLight" }, // 臀大肌
];
const LEG_BLOCKS: readonly { d: string; tone: Tone }[] = [
  { d: "M296 172 C335 166 382 170 410 182 C406 190 394 192 380 190 C350 187 322 185 300 182 Z", tone: "mMid" }, // 股直肌
  { d: "M300 183 C335 187 375 192 410 196 C410 200 408 203 404 204 C370 203 335 201 306 199 Z", tone: "mLight" }, // 髂脛束
  { d: "M308 205 C345 207 378 209 406 210 C406 214 404 216 400 216 C370 217 338 216 314 214 Z", tone: "mDark" }, // 膕旁肌
  { d: "M427 216 C431 242 434 270 436 296 L428 296 C424 270 420 244 418 218 Z", tone: "mLight" }, // 脛前肌
  { d: "M416 218 C408 232 400 248 400 262 C404 276 412 286 419 293 C420 268 419 242 418 218 Z", tone: "mMid" }, // 腓腸肌
];
// 胸大肌（次要：中下胸）與鎖骨頭（主要：上胸，靠肩側、面積放大以凸顯上斜的重點）
const PEC_D = "M146 172 C160 156 176 142 196 140 C214 139 226 146 232 156 C226 172 214 182 198 186 C180 190 162 190 146 186 Z";
const UPPER_PEC_D = "M146 172 C156 160 168 150 182 145 C186 156 187 172 183 189 C168 190 156 189 146 186 Z";

// 上臂與前臂（區域座標：x 沿肢體方向；上臂以投影長 66 繪製，依實際長度沿 x 伸縮）
const UA_D = "M0 -14 C16 -17 32 -15 50 -12 C60 -11 70 -10 72 -4 C75 3 70 10 62 11 C44 13 24 15 6 14 C-8 13 -10 -10 0 -14 Z";
const UA_BICEPS = "M34 -12 C46 -14 60 -11 70 -6 C70 -2 66 0 58 0 C48 0 40 -2 32 -4 Z";
const UA_TRICEPS = "M16 12 C32 13 50 12 64 9 C70 8 73 4 72 1 C58 3 42 3 30 3 C24 4 18 8 16 12 Z";
const UA_REAR_DELT = "M-10 -2 C-12 6 2 14 16 12 C30 10 36 -2 34 -12 C30 -6 20 -2 6 -2 C-2 -2 -8 -3 -10 -2 Z";
const UA_FRONT_DELT = "M-10 -10 C0 -19 24 -18 34 -12 C30 -6 20 -2 6 -2 C-4 -2 -10 -6 -10 -10 Z";
const FA_D = "M-4 -12 C14 -14 34 -12 52 -9 C64 -8 72 -8 78 -8 L80 -8 L80 8 L78 8 C70 8 60 9 50 10 C32 13 14 14 -2 12 C-12 10 -12 -10 -4 -12 Z";
const FA_BRACHIORADIALIS = "M-4 -12 C14 -14 30 -12 44 -9 C52 -7 60 -6 66 -5 C56 -3 40 -2 24 -2 C10 -2 0 -3 -6 -5 C-8 -8 -7 -11 -4 -12 Z";
const UA_DRAWN = 66;

const pts = (p: readonly Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

const angleDeg = (a: Pt, b: Pt) => deg(Math.atan2(b[1] - a[1], b[0] - a[0]));

/** 兩個 #rrggbb 色票內插（目標肌群隨用力程度由淺橘到深橘，不用透明度以免疊在灰底上變濁） */
function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(lerp(v, pb[i], clamp01(t))).toString(16).padStart(2, "0")).join("")}`;
}

const SEAT_X0 = 262;
const SEAT_X1 = 352;
const POST_X = 322;
const BACK_PAD_X0 = 72;
const BACK_PAD_X1 = 298;
const STRUT_L: Pt = [196, SEAT_TOP + PAD_H]; // 椅背支架與背墊底面接點（區域座標）

/** 上斜椅：座墊水平、背墊隨椅背角度轉、椅腳與支架 */
function Bench({ pal, g }: { pal: Palette; g: Geo }) {
  const strutTop = rotateAbout(STRUT_L, HIP, g.th);
  const railX0 = strutTop[0] - 22;
  return (
    <g>
      {/* 支架與底座 */}
      <line x1={strutTop[0]} y1={strutTop[1]} x2={strutTop[0]} y2={FLOOR_Y - 6} stroke={pal.frame} strokeWidth={1.5} />
      <line x1={strutTop[0]} y1={FLOOR_Y - 46} x2={POST_X} y2={SEAT_TOP + PAD_H + 22} stroke={pal.frame} strokeWidth={1.25} />
      <line x1={POST_X} y1={SEAT_TOP + PAD_H} x2={POST_X} y2={FLOOR_Y - 6} stroke={pal.frame} strokeWidth={1.5} />
      <line x1={railX0} y1={FLOOR_Y - 6} x2={POST_X + 22} y2={FLOOR_Y - 6} stroke={pal.frame} strokeWidth={1.5} />
      <line x1={railX0} y1={FLOOR_Y} x2={railX0 + 18} y2={FLOOR_Y} stroke={pal.frame} strokeWidth={2} />
      <line x1={POST_X + 4} y1={FLOOR_Y} x2={POST_X + 22} y2={FLOOR_Y} stroke={pal.frame} strokeWidth={2} />
      {/* 座墊 */}
      <rect x={SEAT_X0} y={SEAT_TOP} width={SEAT_X1 - SEAT_X0} height={PAD_H} rx={4} fill={pal.pad} stroke={pal.frame} strokeWidth={0.75} />
      {/* 背墊（與上半身同一個旋轉） */}
      <rect
        x={BACK_PAD_X0}
        y={SEAT_TOP}
        width={BACK_PAD_X1 - BACK_PAD_X0}
        height={PAD_H}
        rx={4}
        transform={`rotate(${g.angle} ${HIP[0]} ${HIP[1]})`}
        fill={pal.pad}
        stroke={pal.frame}
        strokeWidth={0.75}
      />
    </g>
  );
}

/** 椅背角度標示：座墊延伸的水平參考線與背墊底面之間的弧 */
function AngleMark({ pal, g, fs }: { pal: Palette; g: Geo; fs: (n: number) => number }) {
  // 背墊底面線與座墊底面（y = SEAT_TOP + PAD_H）的交點
  const yb = SEAT_TOP + PAD_H;
  const p0: Pt = [HIP[0] - (yb - HIP[1]) * Math.sin(g.th), HIP[1] + (yb - HIP[1]) * Math.cos(g.th)];
  const k = (yb - p0[1]) / Math.sin(g.th);
  const K: Pt = [p0[0] + k * Math.cos(g.th), yb];
  const r = 44;
  const end: Pt = [K[0] - r * Math.cos(g.th), K[1] - r * Math.sin(g.th)];
  const mid = g.th / 2;
  const lab: Pt = [K[0] - (r + 16) * Math.cos(mid), K[1] - (r + 16) * Math.sin(mid) + fs(4)];
  return (
    <g>
      <line x1={K[0]} y1={K[1]} x2={K[0] - r - 18} y2={K[1]} stroke={pal.muted} strokeWidth={1} strokeDasharray="3 3" />
      <path d={`M${K[0] - r} ${K[1]} A${r} ${r} 0 0 1 ${end[0].toFixed(1)} ${end[1].toFixed(1)}`} fill="none" stroke={pal.accent} strokeWidth={1.25} />
      <text x={lab[0]} y={lab[1]} textAnchor="end" fontSize={fs(11.5)} fontWeight={700} fill={pal.accent} fontFamily={MONO}>
        {`${Math.round(g.angle)}°`}
      </text>
      <circle cx={K[0]} cy={K[1]} r={2.5} fill={pal.frame} />
    </g>
  );
}

/** 上半身（區域座標，外層以 rotate 擺到椅背角度）：軀幹、胸大肌、頭 */
function UpperBody({ pal, upperFill, sFill }: { pal: Palette; upperFill: string; sFill: string }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <path d={TORSO_D} fill={pal.mDark} />
      <g stroke={pal.gap} strokeWidth={0.9}>
        {TORSO_BLOCKS.map((b) => (
          <path key={b.d} d={b.d} fill={pal[b.tone]} />
        ))}
      </g>
      <path d={PEC_D} fill={sFill} stroke={pal.gap} strokeWidth={0.9} />
      <path d={UPPER_PEC_D} fill={upperFill} stroke={pal.gap} strokeWidth={0.9} />
      <path d={HEAD_D} fill={pal.skin} stroke={pal.skinEdge} strokeWidth={0.9} />
      <ellipse cx={90} cy={195} rx={5} ry={7.5} transform="rotate(-10 90 195)" fill="none" stroke={pal.skinEdge} strokeWidth={0.6} />
    </g>
  );
}

/** 近側腿：大腿水平坐在座墊上、腳踩地 */
function NearLeg({ pal }: { pal: Palette }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <path d={LEG_D} fill={pal.mDark} />
      <g stroke={pal.gap} strokeWidth={0.9}>
        {LEG_BLOCKS.map((b) => (
          <path key={b.d} d={b.d} fill={pal[b.tone]} />
        ))}
      </g>
      <ellipse cx={419} cy={196} rx={7} ry={10} fill={pal.skin} stroke={pal.skinEdge} strokeWidth={0.8} />
      <path d={FOOT_D} fill={pal.skin} stroke={pal.skinEdge} strokeWidth={0.9} />
    </g>
  );
}

/** 近側手臂：上臂（含三角肌）、前臂、拳頭；依反向運動學的肩、肘、手位置擺放 */
function NearArm({ pal, arm, shoulder, deltFill, sFill }: { pal: Palette; arm: Arm; shoulder: Pt; deltFill: string; sFill: string }) {
  const { elbow, hand, upper } = arm;
  const sx = upper / UA_DRAWN;
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <g transform={`translate(${shoulder[0]} ${shoulder[1]}) rotate(${angleDeg(shoulder, elbow)}) scale(${sx} 1)`} stroke={pal.gap} strokeWidth={0.9}>
        <path d={UA_D} fill={pal.mMid} stroke="none" />
        <path d={UA_BICEPS} fill={pal.mMid} />
        <path d={UA_TRICEPS} fill={sFill} />
        <path d={UA_REAR_DELT} fill={pal.mDark} />
        <path d={UA_FRONT_DELT} fill={deltFill} />
      </g>
      <g transform={`translate(${elbow[0]} ${elbow[1]}) rotate(${angleDeg(elbow, hand)}) scale(${Math.hypot(hand[0] - elbow[0], hand[1] - elbow[1]) / L_FORE} 1)`} stroke={pal.gap} strokeWidth={0.9}>
        <path d={FA_D} fill={pal.mMid} stroke="none" />
        <path d={FA_BRACHIORADIALIS} fill={pal.mLight} />
      </g>
      <rect x={hand[0] - 13} y={hand[1] - 15} width={27} height={30} rx={9} fill={pal.skin} stroke={pal.skinEdge} strokeWidth={0.9} />
      <path d={`M${hand[0] - 10} ${hand[1] - 7} h21 M${hand[0] - 10} ${hand[1] - 1} h21`} stroke={pal.plateInner} strokeWidth={0.6} />
    </g>
  );
}

/** 啞鈴（端視）：小圓槓片＋外環＋握把截面 */
function Dumbbell({ hand, stroke, fill, dashed, pal }: { hand: Pt; stroke: string; fill: string; dashed?: boolean; pal: Palette }) {
  return (
    <g>
      <circle cx={hand[0]} cy={hand[1]} r={DB_R} fill={fill} fillOpacity={dashed ? 0.08 : 1} stroke={stroke} strokeWidth={dashed ? 1.5 : 1} strokeDasharray={dashed ? "5 4" : undefined} />
      {!dashed && (
        <>
          <circle cx={hand[0]} cy={hand[1]} r={DB_R - 6} fill="none" stroke={pal.plateInner} strokeWidth={0.75} />
          <circle cx={hand[0]} cy={hand[1]} r={6} fill="none" stroke={stroke} strokeWidth={0.75} />
        </>
      )}
    </g>
  );
}

/* ---------- 小元件 ---------- */

function Readout({ pal, label, children, sub }: { pal: Palette; label: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "8px 10px", border: `1px solid ${pal.border}`, borderRadius: 8, background: pal.panel, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: pal.muted }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700, color: pal.text, fontFamily: MONO, display: "flex", alignItems: "center", gap: 6 }}>{children}</span>
      {sub ? <span style={{ fontSize: 11.5, color: pal.warnText, fontWeight: 700 }}>{sub}</span> : null}
    </div>
  );
}

/* ---------- 主元件 ---------- */

// 場景範圍涵蓋 30°～60° 所有姿勢（60° 頂端啞鈴最高、30° 頭與背墊最靠左）
const SCENE_X = 56;
const SCENE_Y = -142;
const SCENE_W = 452;
const SCENE_H = 482;
const MIN_W = 420;
const MAX_SCALE = 1.15;

export default function InclineDbPressMotion() {
  const reduce = useReducedMotion() ?? false;
  const dark = useDarkMode();
  const pal = dark ? DARK : LIGHT;
  const [rootRef, width] = useElementWidth<HTMLDivElement>();
  const [svgWrapRef, svgW] = useElementWidth<HTMLDivElement>();
  const wide = width >= 620;

  const [t, setT] = useState(0);
  const tRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1>(1);
  const [showPath, setShowPath] = useState(false);
  const [err, setErr] = useState<ErrorMode>("none");
  const [benchAngle, setBenchAngle] = useState<BenchAngle>(30);
  const [angleNow, setAngleNow] = useState<number>(30);
  const angleRef = useRef(30);

  // 預設不自動播放，停在頂端；減少動態時也確保停止
  useEffect(() => {
    if (reduce) setPlaying(false);
  }, [reduce]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      tRef.current = (tRef.current + dt * speed) % CYCLE;
      setT(tRef.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  // 切換椅背角度：上半身平滑轉到新角度（減少動態時直接跳）
  useEffect(() => {
    const from = angleRef.current;
    const to = benchAngle;
    if (reduce || from === to) {
      angleRef.current = to;
      setAngleNow(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const DUR = 450;
    const step = (now: number) => {
      const p = clamp01((now - t0) / DUR);
      const v = lerp(from, to, easeInOut(p));
      angleRef.current = v;
      setAngleNow(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [benchAngle, reduce]);

  const seek = (v: number) => {
    const nv = Math.min(Math.max(v, 0), CYCLE - 0.001);
    tRef.current = nv;
    setT(nv);
  };

  const g = makeGeo(angleNow);
  const S = g.shoulder;
  const phase = phaseAt(t);
  const pose = correctPose(t, g);
  const ghost = err === "shallow" ? shallowPose(t, g) : null;
  const lift = err === "hips" ? hipLift(t) : 0;
  const k = intensity(t);
  const { hand, elbow } = pose.arm;
  const okForearm = Math.abs(pose.arm.forearmDev) <= FOREARM_OK;
  const errInfo = ERRORS.find((e) => e.id === err) ?? ERRORS[0];
  const steep = benchAngle === 60;

  // 啞鈴路徑（整個循環取樣）
  const samples = 140;
  const pathOf = (fn: (tt: number) => Pt) => {
    const out: Pt[] = [];
    for (let i = 0; i <= samples; i++) out.push(fn((i / samples) * CYCLE * 0.9999));
    return pts(out);
  };
  const correctPath = pathOf((tt) => correctPose(tt, g).arm.hand);
  const ghostPath = err === "shallow" ? pathOf((tt) => shallowPose(tt, g).arm.hand) : "";

  // 場景縮放：viewBox 寬 = 像素寬（最小設計寬度 MIN_W），場景等比放入、文字維持 1:1
  const vw = Math.max(svgW || MIN_W, MIN_W);
  const s = Math.min(vw / SCENE_W, MAX_SCALE);
  const vh = Math.round(SCENE_H * s);
  const ox = (vw - SCENE_W * s) / 2;
  const fs = (n: number) => n / s;

  // 目標肌群：推起階段顏色最深；椅背越陡，上胸越淡、前三角越深
  const emph = emphasis(angleNow);
  const upperFill = mixHex(pal.primaryRest, pal.primary, k * emph.upper);
  const deltFill = mixHex(pal.primaryRest, pal.primary, k * emph.delt);
  const sFill = mixHex(pal.secondaryRest, pal.secondary, k);

  // 臀部離椅：軀幹繞上背接觸點轉動（把椅背角度改平）
  const pivotW = rotateAbout(BACK_PIVOT_L, HIP, g.th);
  const liftAngle = -Math.atan2(lift, Math.hypot(HIP[0] - pivotW[0], HIP[1] - pivotW[1]));
  const ghostHip = rotateAbout(HIP, pivotW, liftAngle);
  const gluteW = rotateAbout(GLUTE_L, HIP, g.th);
  const ghostGlute = rotateAbout(gluteW, pivotW, liftAngle);
  const effectiveAngle = Math.round(benchAngle + deg(liftAngle));

  const upperTransform = `rotate(${g.angle} ${HIP[0]} ${HIP[1]})`;

  const btnBase: CSSProperties = {
    height: 30,
    padding: "0 12px",
    borderRadius: 999,
    fontFamily: "inherit",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "background-color 160ms, color 160ms, border-color 160ms",
  };
  const toggleBtn = (on: boolean, warn = false): CSSProperties => ({
    ...btnBase,
    border: `1px solid ${on ? (warn ? pal.warn : pal.accentStrong) : warn ? pal.warn : pal.accentLine}`,
    background: on ? (warn ? pal.warn : pal.accentStrong) : "transparent",
    color: on ? "#ffffff" : warn ? pal.warnText : pal.accent,
  });
  const segBtn = (on: boolean, warn = false): CSSProperties => ({
    height: 30,
    padding: "0 12px",
    border: "none",
    fontFamily: "inherit",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: on ? (warn ? pal.warn : pal.accentStrong) : "transparent",
    color: on ? "#ffffff" : warn ? pal.warnText : pal.accent,
    transition: "background-color 160ms, color 160ms",
  });

  const ariaLabel =
    `上斜啞鈴臥推側面示意（頭在左上）。椅背 ${benchAngle} 度${steep ? "（過陡，接近肩推）" : ""}。` +
    `目前階段：${phase.name}；手肘角度約 ${Math.round(pose.arm.elbowDeg)} 度，` +
    `啞鈴高度 ${dbHeightPct(hand, g)}%，前臂${okForearm ? "接近垂直" : `偏離垂直 ${Math.abs(Math.round(pose.arm.forearmDev))} 度`}。` +
    (err !== "none" ? `紅色疊圖為錯誤姿勢：${errInfo.label}。` : "");

  const scene = (
    <svg viewBox={`0 0 ${vw} ${vh}`} width="100%" role="img" aria-label={ariaLabel} style={{ display: "block" }}>
      <rect x={0.5} y={0.5} width={vw - 1} height={vh - 1} rx={8} fill={pal.panel} stroke={pal.border} strokeWidth={1} />
      <g transform={`translate(${ox} 0) scale(${s}) translate(${-SCENE_X} ${-SCENE_Y})`}>
        {/* 地面 */}
        <line x1={SCENE_X} y1={FLOOR_Y + 0.5} x2={SCENE_X + SCENE_W} y2={FLOOR_Y + 0.5} stroke={pal.frame} strokeWidth={0.75} />

        {/* 啞鈴（端視，畫在身體後方，不遮住胸口） */}
        <Dumbbell hand={hand} stroke={pal.plateEdge} fill={pal.plate} pal={pal} />

        {/* 遠側腿、上斜椅、椅背角度 */}
        <path transform="translate(-9 1)" d={LEG_D} fill={pal.far} />
        <Bench pal={pal} g={g} />
        <AngleMark pal={pal} g={g} fs={fs} />

        {/* 上半身（繞髖關節轉到椅背角度）、近側腿 */}
        <g transform={upperTransform}>
          <UpperBody pal={pal} upperFill={upperFill} sFill={sFill} />
        </g>
        <NearLeg pal={pal} />

        {/* 錯誤：臀部離椅（警示色疊圖） */}
        {err === "hips" && lift > 0.3 && (
          <g>
            <path
              d={TORSO_D}
              transform={`rotate(${deg(liftAngle)} ${pivotW[0]} ${pivotW[1]}) ${upperTransform}`}
              fill={pal.warn}
              fillOpacity={0.12}
              stroke={pal.warn}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              strokeLinejoin="round"
            />
            <line x1={ghostHip[0]} y1={ghostHip[1]} x2={KNEE[0]} y2={KNEE[1]} stroke={pal.warn} strokeWidth={1.5} strokeDasharray="5 4" />
            <line x1={ghostGlute[0]} y1={SEAT_TOP - 1} x2={ghostGlute[0]} y2={ghostGlute[1]} stroke={pal.warn} strokeWidth={1.5} />
            <text x={326} y={148} fontSize={fs(11.5)} fontWeight={700} fill={pal.warnText} fontFamily={FONT}>
              臀部離椅
            </text>
            <text x={326} y={148 + fs(15)} fontSize={fs(11)} fill={pal.warnText} fontFamily={FONT}>
              {`角度變平：約 ${effectiveAngle}°`}
            </text>
          </g>
        )}

        {/* 近側手臂：上臂、前臂、拳頭（反向運動學） */}
        <NearArm pal={pal} arm={pose.arm} shoulder={S} deltFill={deltFill} sFill={sFill} />

        {/* 前臂垂直參考線 */}
        <line
          x1={elbow[0]}
          y1={elbow[1]}
          x2={elbow[0]}
          y2={elbow[1] - L_FORE - 6}
          stroke={okForearm ? pal.accent : pal.warn}
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* 啞鈴握把截面 */}
        <circle cx={hand[0]} cy={hand[1]} r={4} fill={pal.sleeve} />

        {/* 錯誤姿勢：下放太淺（啞鈴與手臂只走半程） */}
        {ghost && (
          <g>
            <Dumbbell hand={ghost.arm.hand} stroke={pal.warn} fill={pal.warn} dashed pal={pal} />
            <line x1={S[0]} y1={S[1]} x2={ghost.arm.elbow[0]} y2={ghost.arm.elbow[1]} stroke={pal.warn} strokeWidth={2} strokeLinecap="round" />
            <line x1={ghost.arm.elbow[0]} y1={ghost.arm.elbow[1]} x2={ghost.arm.hand[0]} y2={ghost.arm.hand[1]} stroke={pal.warn} strokeWidth={2} strokeLinecap="round" />
            <circle cx={ghost.arm.elbow[0]} cy={ghost.arm.elbow[1]} r={3} fill={pal.warn} />
            <circle cx={ghost.arm.hand[0]} cy={ghost.arm.hand[1]} r={4.5} fill={pal.warn} />
          </g>
        )}
        {err === "shallow" && t >= 2.6 && t < 3.6 && ghost && (
          <text x={ghost.arm.hand[0] + DB_R + 8} y={ghost.arm.hand[1] + 4} fontSize={fs(11.5)} fontWeight={700} fill={pal.warnText} fontFamily={FONT}>
            只到半程
          </text>
        )}

        {/* 啞鈴路徑 */}
        {showPath && (
          <g>
            <line x1={S[0]} y1={S[1]} x2={S[0]} y2={g.lockout[1] - 26} stroke={pal.muted} strokeWidth={1} strokeDasharray="2 4" />
            <polyline points={correctPath} fill="none" stroke={pal.accent} strokeWidth={1.5} strokeDasharray="5 4" />
            {ghostPath && <polyline points={ghostPath} fill="none" stroke={pal.warn} strokeWidth={1.5} strokeDasharray="5 4" />}
            <text x={S[0] + 8} y={g.lockout[1] - 18} fontSize={fs(11)} fill={pal.muted} fontFamily={FONT}>
              頂端：肩關節正上方
            </text>
            <line x1={g.bottom[0] + DB_R + 2} y1={g.bottom[1]} x2={g.bottom[0] + DB_R + 20} y2={g.bottom[1]} stroke={pal.muted} strokeWidth={1} />
            <text x={g.bottom[0] + DB_R + 24} y={g.bottom[1] + 4} fontSize={fs(11)} fill={pal.muted} fontFamily={FONT}>
              底部：上胸兩側
            </text>
          </g>
        )}
        <circle cx={hand[0]} cy={hand[1]} r={3} fill={pal.accent} stroke={pal.panel} strokeWidth={1} />

        {/* 階段標籤 */}
        <text x={SCENE_X + SCENE_W - 12} y={SCENE_Y + 20} textAnchor="end" fontSize={fs(12.5)} fontWeight={700} fill={pal.text} fontFamily={FONT}>
          {phase.name}
        </text>
        <text x={SCENE_X + SCENE_W - 12} y={SCENE_Y + 20 + fs(17)} textAnchor="end" fontSize={fs(11)} fill={pal.muted} fontFamily={MONO}>
          {`${t.toFixed(1)} / ${CYCLE.toFixed(1)} s`}
        </text>
      </g>
    </svg>
  );

  const forearmText = (arm: Arm) =>
    Math.abs(arm.forearmDev) <= FOREARM_OK ? "垂直" : `偏離 ${Math.abs(Math.round(arm.forearmDev))}°`;

  const heightPct = dbHeightPct(hand, g);

  const readouts = (
    <div style={{ display: "grid", gridTemplateColumns: wide ? "1fr" : "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, alignContent: "start" }}>
      <Readout pal={pal} label="手肘角度（側視示意）" sub={ghost ? `錯誤姿勢：${Math.round(ghost.arm.elbowDeg)}°` : undefined}>
        {Math.round(pose.arm.elbowDeg)}°
      </Readout>
      <Readout pal={pal} label="啞鈴高度（示意，底部 = 0%）" sub={ghost ? `錯誤姿勢：${dbHeightPct(ghost.arm.hand, g)}%` : undefined}>
        <span style={{ minWidth: 44 }}>{heightPct}%</span>
        <span style={{ flex: 1, height: 6, borderRadius: 3, background: pal.border, position: "relative", display: "block" }}>
          <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${clamp01(heightPct / 100) * 100}%`, borderRadius: 3, background: pal.accentStrong, display: "block" }} />
        </span>
      </Readout>
      <Readout pal={pal} label="前臂（±10° 內視為垂直）" sub={ghost ? `錯誤姿勢：${forearmText(ghost.arm)}` : undefined}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: okForearm ? pal.accent : pal.warnText, fontFamily: FONT }}>
          {okForearm ? <Check size={16} /> : <TriangleAlert size={16} />}
          {forearmText(pose.arm)}
        </span>
      </Readout>
      <Readout
        pal={pal}
        label="椅背角度"
        sub={err === "hips" && lift > 0.3 ? `錯誤姿勢：實際約 ${effectiveAngle}°` : steep ? "過陡：接近肩推" : undefined}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: steep ? pal.warnText : pal.text }}>
          {steep && <TriangleAlert size={16} />}
          {benchAngle}°
        </span>
      </Readout>
      <div role="group" aria-label="圖例" style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, color: pal.muted, padding: "2px 2px" }}>
        {[
          { c: pal.primary, t: "主要：上胸、前三角" },
          { c: pal.secondary, t: "次要：中下胸、三頭" },
          { c: pal.warn, t: "錯誤姿勢疊圖" },
        ].map((it) => (
          <span key={it.t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: it.c, display: "inline-block" }} />
            {it.t}
          </span>
        ))}
        <span>推起階段肌群顏色加深；椅背越陡，上胸越淡、前三角越深</span>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT, color: pal.text }}>
      {/* 階段 stepper */}
      <div role="group" aria-label="動作階段" style={{ display: "grid", gridTemplateColumns: width > 0 && width < 520 ? "repeat(2, minmax(0,1fr))" : "repeat(4, minmax(0,1fr))", gap: 6 }}>
        {PHASES.map((p) => {
          const on = phase.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setPlaying(false);
                seek(p.start);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 8,
                border: `1px solid ${on ? pal.accentStrong : pal.border}`,
                background: on ? pal.accentSoft : pal.panel,
                color: on ? pal.accent : pal.text,
                fontFamily: "inherit",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "left",
                transition: "background-color 160ms, border-color 160ms",
              }}
            >
              <span
                style={{
                  flex: "none",
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontSize: 11,
                  background: on ? pal.accentStrong : "transparent",
                  color: on ? "#ffffff" : pal.muted,
                  border: `1px solid ${on ? pal.accentStrong : pal.accentLine}`,
                }}
              >
                {p.id + 1}
              </span>
              {p.name}
            </button>
          );
        })}
      </div>
      <div aria-live="polite" style={{ fontSize: 13, lineHeight: 1.6, color: pal.text, borderLeft: `2px solid ${pal.accentStrong}`, padding: "2px 0 2px 10px" }}>
        <strong style={{ color: pal.accent }}>{phase.name}</strong>　{phase.cue}
      </div>

      {/* 示意圖 + 讀數 */}
      <div style={{ display: "grid", gridTemplateColumns: wide ? "minmax(0,1fr) 200px" : "1fr", gap: 12, alignItems: "start" }}>
        <div ref={svgWrapRef} style={{ minWidth: 0 }}>
          {scene}
        </div>
        {readouts}
      </div>

      {/* 播放控制與時間軸 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          aria-pressed={playing}
          aria-label={playing ? "暫停" : "播放"}
          onClick={() => setPlaying((v) => !v)}
          style={{ ...toggleBtn(playing), width: 34, padding: 0, justifyContent: "center" }}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <div role="group" aria-label="播放速度" style={{ display: "inline-flex", border: `1px solid ${pal.accentLine}`, borderRadius: 999, overflow: "hidden" }}>
          {([0.5, 1] as const).map((v) => (
            <button key={v} type="button" aria-pressed={speed === v} onClick={() => setSpeed(v)} style={segBtn(speed === v)}>
              {v}x
            </button>
          ))}
        </div>
        <div style={{ flex: "1 1 220px", minWidth: 180, display: "flex", flexDirection: "column", gap: 3 }}>
          <div aria-hidden="true" style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 2 }}>
            {PHASES.map((p) => (
              <span
                key={p.id}
                style={{
                  flex: p.dur,
                  background: phase.id === p.id ? pal.accentStrong : pal.accentLine,
                  opacity: phase.id === p.id ? 1 : 0.6,
                  display: "block",
                }}
              />
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={CYCLE}
            step={0.01}
            value={t}
            aria-label="時間軸"
            aria-valuetext={`${t.toFixed(1)} 秒，${phase.name}`}
            onChange={(e) => {
              setPlaying(false);
              seek(Number(e.currentTarget.value));
            }}
            style={{ width: "100%", margin: 0, accentColor: pal.accentStrong }}
          />
        </div>
        <button type="button" aria-pressed={showPath} onClick={() => setShowPath((v) => !v)} style={toggleBtn(showPath)}>
          <Route size={14} /> 標示啞鈴路徑
        </button>
      </div>

      {/* 椅背角度 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: pal.muted }}>椅背角度</span>
        <div
          role="group"
          aria-label="椅背角度"
          style={{ display: "inline-flex", border: `1px solid ${steep ? pal.warn : pal.accentLine}`, borderRadius: 999, overflow: "hidden" }}
        >
          {ANGLES.map((a) => (
            <button key={a} type="button" aria-pressed={benchAngle === a} onClick={() => setBenchAngle(a)} style={segBtn(benchAngle === a, a === 60)}>
              {a === 60 && <TriangleAlert size={13} />}
              {a}°
            </button>
          ))}
        </div>
        {steep && (
          <span aria-live="polite" style={{ fontSize: 12.5, fontWeight: 700, color: pal.warnText }}>
            {STEEP_NOTE}
          </span>
        )}
      </div>

      {/* 常見錯誤對照 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: pal.muted }}>常見錯誤對照</span>
        <div role="group" aria-label="常見錯誤對照" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ERRORS.map((e) => (
            <button key={e.id} type="button" aria-pressed={err === e.id} onClick={() => setErr(e.id)} style={toggleBtn(err === e.id, e.id !== "none")}>
              {e.id !== "none" && <TriangleAlert size={13} />}
              {e.label}
            </button>
          ))}
        </div>
      </div>
      {err !== "none" && (
        <div aria-live="polite" style={{ fontSize: 13, lineHeight: 1.6, color: pal.text, background: pal.warnSoft, borderLeft: `2px solid ${pal.warn}`, padding: "6px 10px", borderRadius: 4 }}>
          <strong style={{ color: pal.warnText }}>{errInfo.label}</strong>：{errInfo.note}
        </div>
      )}
    </div>
  );
}
