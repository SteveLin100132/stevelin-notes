import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Package, Layers, Check, TriangleAlert } from "lucide-react";

/* trendlink-design 色票（生成元件的 Tailwind class 不會被編譯，直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700
const NAVY_DEEP = "#112f5d"; // --blue-900
const BLUE_50 = "#eef4fb";
const BLUE_100 = "#d6e4f5";
const BLUE_200 = "#adc8e8";
const ORANGE_DEEP = "#e37b24"; // --orange-500
const ORANGE_50 = "#fdf4e6";
const ORANGE_100 = "#fbe7c6";
const ORANGE_700 = "#a04f15";
const GREEN = "#2e9e6b";
const GREEN_50 = "#e9f6ef";
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

type Tone = "navy" | "green" | "orange" | "muted";

interface LaneState {
  /** 消費方 B 的頁面上實際呈現的版本 */
  version: string | null;
  tone: Tone;
  /** 版本旁的小字 */
  tag: string;
  note: string;
  /** B 端要額外做的事 */
  todo?: string[];
}

interface Step {
  short: string;
  title: string;
  /** 提供方 A 在本步驟的動作（兩條泳道各自的用語） */
  npmAction?: string;
  mfeAction?: string;
  npm: LaneState;
  mfe: LaneState;
}

const STEPS: Step[] = [
  {
    short: "A 開發 V1.0",
    title: "開發者 A 開發 V1.0",
    npmAction: "開發 V1.0",
    mfeAction: "開發 V1.0",
    npm: { version: null, tone: "muted", tag: "尚未取用", note: "A 在自己的 repo 開發共用元件，打算以 npm 套件的形式提供給其他團隊複用。" },
    mfe: { version: null, tone: "muted", tag: "尚未部署", note: "A 開發的是一個可以獨立運行的子應用，打算部署到自己的網址，由容器應用在執行期載入。" },
  },
  {
    short: "發布 V1.0",
    title: "V1.0 發布 / 部署",
    npmAction: "publish 1.0.0",
    mfeAction: "部署 V1.0",
    npm: { version: null, tone: "muted", tag: "尚未取用", note: "A 把 1.0.0 發布到 npm registry。此時 B 的應用完全沒有變化，registry 上多了一個版本而已。" },
    mfe: { version: "V1.0", tone: "green", tag: "自動呈現", note: "A 把子應用部署到 header.example.com。容器應用下一次載入時就會拿到 V1.0，B 不需要做任何事。" },
  },
  {
    short: "B 取用",
    title: "開發者 B 取用",
    npm: {
      version: "V1.0",
      tone: "navy",
      tag: "安裝並 build 進應用",
      note: "B 執行 npm install，把 1.0.0 打包進自己的應用；要重新 build、重新部署後，頁面上才會看到 A 的元件。",
      todo: ["npm install shared-header@1.0.0", "重新 build B 的應用", "重新部署 B 的應用"],
    },
    mfe: { version: "V1.0", tone: "green", tag: "執行期載入", note: "B 什麼都不用做：容器應用在瀏覽器裡直接載入 A 部署好的子應用，兩邊的建置與部署完全解耦。" },
  },
  {
    short: "A 開發 V1.1",
    title: "開發者 A 開發 V1.1",
    npmAction: "開發 V1.1",
    mfeAction: "開發 V1.1",
    npm: { version: "V1.0", tone: "muted", tag: "維持 V1.0", note: "A 修了一個錯誤，正在開發 V1.1。B 的頁面仍然是打包當時的 V1.0。" },
    mfe: { version: "V1.0", tone: "muted", tag: "維持 V1.0", note: "A 修了一個錯誤，正在開發 V1.1。線上目前仍是 V1.0，沒有差別。" },
  },
  {
    short: "發布 V1.1",
    title: "V1.1 發布 / 部署",
    npmAction: "publish 1.1.0",
    mfeAction: "部署 V1.1",
    npm: { version: "V1.0", tone: "orange", tag: "沒收到升級通知", note: "registry 上有了 1.1.0，但 B 的 package.json 仍鎖在 1.0.0。除非 B 主動去看 changelog，否則根本不知道有新版。" },
    mfe: { version: "V1.1", tone: "green", tag: "自動呈現", note: "A 部署完成的瞬間，使用者下一次開頁面就看到 V1.1。A 的修正不需要經過 B 就到達所有使用者。" },
  },
  {
    short: "一段時間後",
    title: "一段時間後",
    npm: {
      version: "V1.0",
      tone: "orange",
      tag: "仍是舊版",
      note: "B 若沒有主動追蹤，會一直用著 V1.0；就算知道了，也要再走一次「升級、build、部署」。有幾個消費方，就要重複幾次。",
      todo: ["更新 package.json 到 1.1.0", "重新 build B 的應用", "重新部署 B 的應用", "其他消費方各自再做一遍"],
    },
    mfe: { version: "V1.1", tone: "green", tag: "已是最新", note: "所有嵌入這個子應用的頁面都已是 V1.1。升級是 A 一個人的事，顆粒度大、主從關係清楚。" },
  },
];

/* 量測容器實際寬度，讓 viewBox 寬 = 像素寬，文字維持 1:1 */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function toneColor(t: Tone): { fg: string; bg: string; border: string } {
  if (t === "green") return { fg: GREEN, bg: GREEN_50, border: GREEN };
  if (t === "orange") return { fg: ORANGE_700, bg: ORANGE_50, border: ORANGE_DEEP };
  if (t === "muted") return { fg: MUTED, bg: "#ffffff", border: GRAY };
  return { fg: NAVY, bg: BLUE_50, border: NAVY };
}

/* ---------- 圖：兩條泳道的時間軸 ---------- */

const MIN_W = 660;
const LEFT = 128;
const TOP = 44;
const LANE_H = 132;
const LANE_GAP = 14;
const ROW_A = 56;
const ROW_B = 102;

interface LaneProps {
  y: number;
  title: string;
  sub: string;
  icon: "package" | "layers";
  cur: number;
  xs: (i: number) => number;
  action: (s: Step) => string | undefined;
  state: (s: Step) => LaneState;
  /** 發布步驟 → 生效步驟 的對應（畫箭頭用） */
  links: Array<{ from: number; to: number; label: string; tone: Tone; dashed?: boolean }>;
  width: number;
  reduce: boolean;
}

function Lane({ y, title, sub, icon, cur, xs, action, state, links, width, reduce }: LaneProps) {
  const yA = y + ROW_A;
  const yB = y + ROW_B;
  return (
    <g>
      <rect x={12} y={y} width={width - 24} height={LANE_H} rx={8} fill="#ffffff" stroke={GRAY_2} strokeWidth={1} />
      {/* 左側標題 */}
      <g transform={`translate(24 ${y + 20})`} fill={NAVY_DEEP}>
        {icon === "package" ? (
          <path d="M8 1.5 14 5v6l-6 3.5L2 11V5l6-3.5Z M2 5l6 3.5L14 5 M8 8.5v6" fill="none" stroke={NAVY_DEEP} strokeWidth={1.4} strokeLinejoin="round" transform="translate(0 -9)" />
        ) : (
          <path d="M8 1.5 14 4.5 8 7.5 2 4.5Z M2 8.5l6 3 6-3 M2 12l6 3 6-3" fill="none" stroke={NAVY_DEEP} strokeWidth={1.4} strokeLinejoin="round" transform="translate(0 -9)" />
        )}
        <text x={22} y={0} fontSize={12} fontWeight={800} fontFamily={FONT}>
          {title}
        </text>
      </g>
      <text x={24} y={y + 34} fontSize={9.5} fill={MUTED} fontFamily={FONT}>
        {sub}
      </text>
      <text x={LEFT - 10} y={yA + 4} textAnchor="end" fontSize={10} fontWeight={700} fill={MUTED} fontFamily={FONT}>
        提供方 A
      </text>
      <text x={LEFT - 10} y={yB + 4} textAnchor="end" fontSize={10} fontWeight={700} fill={MUTED} fontFamily={FONT}>
        消費方 B 的頁面
      </text>
      {/* 兩條時間線 */}
      <line x1={LEFT} y1={yA} x2={width - 24} y2={yA} stroke={GRAY_2} strokeWidth={1} />
      <line x1={LEFT} y1={yB} x2={width - 24} y2={yB} stroke={GRAY_2} strokeWidth={1} />

      {/* 發布 → 生效 的箭頭 */}
      {links.map((l) => {
        if (l.from > cur) return null;
        const c = toneColor(l.tone);
        const x1 = xs(l.from);
        const x2 = xs(l.to);
        const active = l.to <= cur;
        const mid = (x1 + x2) / 2;
        return (
          <g key={`${l.from}-${l.to}`} opacity={active ? 1 : 0.45}>
            <motion.path
              d={`M${x1} ${yA + 12} C ${x1} ${yA + 40}, ${x2} ${yB - 40}, ${x2} ${yB - 12}`}
              fill="none"
              stroke={c.border}
              strokeWidth={1.5}
              strokeDasharray={l.dashed ? "4 3" : undefined}
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
            <path d={`M${x2} ${yB - 10} l-4 -7 h8 Z`} fill={c.border} />
            {(() => {
              const lw = Array.from(l.label).reduce((acc, ch) => acc + (ch.charCodeAt(0) > 255 ? 9.5 : 5.6), 0) + 10;
              const lx = x1 === x2 ? mid + 8 : mid - lw / 2;
              const ly = (yA + yB) / 2 - 8;
              return (
                <g>
                  <rect x={lx} y={ly} width={lw} height={16} rx={4} fill="#ffffff" stroke={c.border} strokeWidth={0.75} />
                  <text x={lx + lw / 2} y={ly + 11.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={c.fg} fontFamily={FONT}>
                    {l.label}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}

      {/* A 的動作 */}
      {STEPS.map((s, i) => {
        const a = action(s);
        if (!a || i > cur) return null;
        const active = i === cur;
        const w = Math.max(60, Array.from(a).reduce((acc, ch) => acc + (ch.charCodeAt(0) > 255 ? 10 : 6), 0) + 16);
        return (
          <motion.g key={`a-${i}`} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <rect x={xs(i) - w / 2} y={yA - 11} width={w} height={22} rx={11} fill={active ? NAVY : BLUE_50} stroke={active ? NAVY : BLUE_200} strokeWidth={1} />
            <text x={xs(i)} y={yA + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={active ? "#ffffff" : NAVY} fontFamily={a.startsWith("publish") ? MONO : FONT}>
              {a}
            </text>
          </motion.g>
        );
      })}

      {/* B 的頁面版本 */}
      {STEPS.map((s, i) => {
        if (i > cur) return null;
        const st = state(s);
        const c = toneColor(st.tone);
        const active = i === cur;
        return (
          <motion.g key={`b-${i}`} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <rect x={xs(i) - 24} y={yB - 11} width={48} height={22} rx={5} fill={st.version ? c.bg : "#ffffff"} stroke={c.border} strokeWidth={active ? 1.75 : 1} strokeDasharray={st.version ? undefined : "3 2"} />
            <text x={xs(i)} y={yB + 4} textAnchor="middle" fontSize={10.5} fontWeight={800} fill={c.fg} fontFamily={MONO}>
              {st.version ?? "--"}
            </text>
            {active && (
              <text x={xs(i)} y={yB + 24} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={c.fg} fontFamily={FONT}>
                {st.tag}
              </text>
            )}
          </motion.g>
        );
      })}
    </g>
  );
}

function Diagram({ width, cur, reduce }: { width: number; cur: number; reduce: boolean }) {
  const W = Math.max(width, MIN_W);
  const n = STEPS.length;
  const x0 = LEFT + 44;
  const x1 = W - 60;
  const xs = (i: number) => x0 + ((x1 - x0) * i) / (n - 1);
  const H = TOP + LANE_H * 2 + LANE_GAP + 12;
  const cs = STEPS[cur];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`共用 npm 套件與微前端的升級流程比較，第 ${cur + 1} 步：${cs.title}。npm 這邊 B 的頁面版本 ${cs.npm.version ?? "尚未取用"}（${cs.npm.tag}）；微前端這邊 ${cs.mfe.version ?? "尚未部署"}（${cs.mfe.tag}）。`}
      style={{ display: "block" }}
    >
      <rect width={W} height={H} rx={10} fill={PANEL} />
      {/* 頂部步驟刻度 */}
      {STEPS.map((s, i) => {
        const done = i <= cur;
        const active = i === cur;
        return (
          <g key={s.short}>
            <line x1={xs(i)} y1={TOP - 8} x2={xs(i)} y2={H - 12} stroke={active ? BLUE_200 : GRAY_2} strokeWidth={1} strokeDasharray="2 3" />
            <circle cx={xs(i)} cy={18} r={8} fill={active ? NAVY : done ? BLUE_100 : "#ffffff"} stroke={done ? NAVY : GRAY} strokeWidth={1.25} />
            <text x={xs(i)} y={21.5} textAnchor="middle" fontSize={9.5} fontWeight={800} fill={active ? "#ffffff" : done ? NAVY : MUTED} fontFamily={FONT}>
              {i + 1}
            </text>
            <text x={xs(i)} y={TOP - 12 + 4} textAnchor="middle" fontSize={9.5} fontWeight={active ? 800 : 600} fill={active ? NAVY_DEEP : MUTED} fontFamily={FONT}>
              {s.short}
            </text>
          </g>
        );
      })}

      <Lane
        y={TOP + 4}
        title="共用 npm 套件（Module）"
        sub="整體構建、整體發布，顆粒度小"
        icon="package"
        cur={cur}
        xs={xs}
        action={(s) => s.npmAction}
        state={(s) => s.npm}
        links={[
          { from: 1, to: 2, label: "install + build + deploy", tone: "navy" },
          { from: 4, to: 5, label: "沒有通知，得自己升級", tone: "orange", dashed: true },
        ]}
        width={W}
        reduce={reduce}
      />
      <Lane
        y={TOP + 4 + LANE_H + LANE_GAP}
        title="微前端（子應用）"
        sub="單獨構建、單獨發布，主從架構，顆粒度大"
        icon="layers"
        cur={cur}
        xs={xs}
        action={(s) => s.mfeAction}
        state={(s) => s.mfe}
        links={[
          { from: 1, to: 1, label: "自動呈現", tone: "green" },
          { from: 4, to: 4, label: "自動呈現", tone: "green" },
        ]}
        width={W}
        reduce={reduce}
      />
    </svg>
  );
}

/* ---------- 說明卡 ---------- */

function LaneCard({ title, icon, state }: { title: string; icon: "package" | "layers"; state: LaneState }) {
  const c = toneColor(state.tone);
  return (
    <div style={{ flex: "1 1 280px", minWidth: 0, background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: NAVY_DEEP }}>
          {icon === "package" ? <Package size={15} /> : <Layers size={15} />}
          {title}
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: c.fg, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 999, padding: "2px 8px", fontFamily: MONO }}>
          {state.tone === "green" ? <Check size={12} /> : state.tone === "orange" ? <TriangleAlert size={12} /> : null}
          {state.version ?? "--"}
          <span style={{ fontFamily: FONT, fontWeight: 700 }}>· {state.tag}</span>
        </span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: TEXT }}>{state.note}</div>
      {state.todo && (
        <div role="group" aria-label="B 端要做的事" style={{ background: ORANGE_50, border: `1px solid ${ORANGE_100}`, borderRadius: 6, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", color: ORANGE_700 }}>B 端要做的事</div>
          {state.todo.map((t) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: ORANGE_700, fontFamily: t.startsWith("npm") || t.includes("package.json") ? MONO : FONT }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: ORANGE_DEEP, flex: "0 0 auto" }} />
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- 主元件 ---------- */

const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 12px",
  borderRadius: 8,
  border: "1.5px solid transparent",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 160ms, color 160ms, border-color 160ms",
};

export default function MicroFrontendModuleVsMfe() {
  const reduce = useReducedMotion() ?? false;
  const [cur, setCur] = useState(0);
  const [auto, setAuto] = useState(false);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const last = cur === STEPS.length - 1;
  const s = STEPS[cur];

  useEffect(() => {
    if (!auto) return;
    if (last) {
      setAuto(false);
      return;
    }
    const id = window.setTimeout(() => setCur((c) => Math.min(c + 1, STEPS.length - 1)), reduce ? 900 : 1700);
    return () => window.clearTimeout(id);
  }, [auto, cur, last, reduce]);

  const reset = () => {
    setCur(0);
    setAuto(false);
  };

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: NAVY_DEEP }}>
          <span style={{ color: MUTED, fontWeight: 700, marginRight: 8 }}>
            步驟 {cur + 1} / {STEPS.length}
          </span>
          {s.title}
        </div>
        <div role="group" aria-label="步驟控制" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0} aria-label="上一步" style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200, opacity: cur === 0 ? 0.45 : 1, cursor: cur === 0 ? "default" : "pointer" }}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => setCur((c) => Math.min(STEPS.length - 1, c + 1))} disabled={last} aria-label="下一步" style={{ ...btn, background: NAVY, color: "#ffffff", borderColor: NAVY, opacity: last ? 0.45 : 1, cursor: last ? "default" : "pointer" }}>
            下一步 <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (auto) setAuto(false);
              else {
                if (last) setCur(0);
                setAuto(true);
              }
            }}
            style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}
          >
            {auto ? <Pause size={16} /> : <Play size={16} />} {auto ? "暫停" : "自動播放"}
          </button>
          <button type="button" onClick={reset} aria-label="重置" style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}>
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div ref={wrapRef} style={{ width: "100%" }}>
        <Diagram width={width} cur={cur} reduce={reduce} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={cur}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
        >
          <LaneCard title="共用 npm 套件" icon="package" state={s.npm} />
          <LaneCard title="微前端" icon="layers" state={s.mfe} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
