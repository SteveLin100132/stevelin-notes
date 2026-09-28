import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";

/* trendlink-design 色票（生成元件的 Tailwind class 不會被編譯，直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700
const NAVY_DEEP = "#112f5d"; // --blue-900
const BLUE_50 = "#eef4fb";
const BLUE_100 = "#d6e4f5";
const BLUE_200 = "#adc8e8";
const ORANGE = "#e37b24"; // --orange-500
const ORANGE_50 = "#fdf4e6";
const ORANGE_700 = "#a04f15";
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const SUCCESS = "#2e9e6b";
const DANGER = "#c8412f";
const WARN = "#d9a21b";
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

/* ---------- 版本狀態 ---------- */

type VState = "none" | "upToDate" | "modified" | "stale" | "modifiedStale" | "syncFailure";

const STATE_META: Record<Exclude<VState, "none">, { label: string; en: string; color: string; hint: string }> = {
  upToDate: { label: "最新", en: "Up to date", color: SUCCESS, hint: "與 Registry 上的最新版本一致" },
  modified: { label: "本地已修改", en: "Locally modified", color: MUTED, hint: "有尚未 commit 的本地修改" },
  stale: { label: "過期", en: "Stale", color: DANGER, hint: "Registry 上已有更新的版本" },
  modifiedStale: { label: "已修改且過期", en: "Locally modified and stale", color: DANGER, hint: "兩者皆是，必須先處理本地修改才能升版" },
  syncFailure: { label: "同步失敗", en: "Sync failure", color: WARN, hint: "連不到 Registry 或無法比對版本" },
};

function StateIcon({ state, x, y, r = 8 }: { state: Exclude<VState, "none">; x: number; y: number; r?: number }) {
  const c = STATE_META[state].color;
  const s = r / 8;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r={8} fill={c} />
      {state === "upToDate" && <path d="M-3.8 0.2 L-1 3 L4 -2.8" fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
      {state === "modified" && (
        <g stroke="#ffffff" strokeWidth={1.7} strokeLinecap="round">
          <line x1={0} y1={-4} x2={0} y2={4} />
          <line x1={-3.5} y1={-2} x2={3.5} y2={2} />
          <line x1={-3.5} y1={2} x2={3.5} y2={-2} />
        </g>
      )}
      {state === "stale" && <path d="M0 4 V-3.6 M-3.4 -0.4 L0 -3.8 L3.4 -0.4" fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
      {state === "modifiedStale" && (
        <g stroke="#ffffff" strokeWidth={1.9} strokeLinecap="round">
          <line x1={0} y1={-4} x2={0} y2={1} />
          <line x1={0} y1={4} x2={0} y2={4} />
        </g>
      )}
      {state === "syncFailure" && (
        <g fill="none" stroke="#ffffff" strokeWidth={1.7} strokeLinecap="round">
          <path d="M-2.6 -1.8 A2.7 2.7 0 1 1 0.6 0.8 Q0 1.2 0 2" />
          <line x1={0} y1={4.4} x2={0} y2={4.4} />
        </g>
      )}
    </g>
  );
}

/* ---------- 走查資料 ---------- */

type Env = "DEV" | "QAS" | "PRD";
interface EnvState {
  ver: number; // 0 = 尚未匯入
  state: VState;
}
interface Step {
  title: string;
  desc: string;
  menu: string;
  versions: number;
  arrow: { env: Env; dir: "up" | "down"; label: string } | null;
  envs: Record<Env, EnvState>;
  focus: Env;
}

const STEPS: Step[] = [
  {
    title: "開始版控",
    desc: "DEV 的 Process Group 開發完成後啟用版控：選擇 Bucket、為 Flow 命名並填寫 comment，Registry 產生 v1。",
    menu: "右鍵 Process Group → Version → Start version control",
    versions: 1,
    arrow: { env: "DEV", dir: "up", label: "Commit v1" },
    envs: { DEV: { ver: 1, state: "upToDate" }, QAS: { ver: 0, state: "none" }, PRD: { ver: 0, state: "none" } },
    focus: "DEV",
  },
  {
    title: "QAS 匯入",
    desc: "QAS 從 Registry 匯入 v1。同名的 Parameter Context 若已存在就直接沿用，環境差異不需要在流程裡改。",
    menu: "拖入 Process Group → Import from Registry → 選 Bucket / Flow / v1",
    versions: 1,
    arrow: { env: "QAS", dir: "down", label: "Import v1" },
    envs: { DEV: { ver: 1, state: "upToDate" }, QAS: { ver: 1, state: "upToDate" }, PRD: { ver: 0, state: "none" } },
    focus: "QAS",
  },
  {
    title: "DEV 修改",
    desc: "開發者在 DEV 調整 Processor 設定。狀態變成「本地已修改」，可先用 Show local changes 檢視差異。",
    menu: "右鍵 Process Group → Version → Show local changes",
    versions: 1,
    arrow: null,
    envs: { DEV: { ver: 1, state: "modified" }, QAS: { ver: 1, state: "upToDate" }, PRD: { ver: 0, state: "none" } },
    focus: "DEV",
  },
  {
    title: "Commit v2",
    desc: "DEV commit 本地修改，Registry 多出 v2。還停在 v1 的 QAS 立刻被標成「過期」，提醒這裡有新版可升。",
    menu: "右鍵 Process Group → Version → Commit local changes",
    versions: 2,
    arrow: { env: "DEV", dir: "up", label: "Commit v2" },
    envs: { DEV: { ver: 2, state: "upToDate" }, QAS: { ver: 1, state: "stale" }, PRD: { ver: 0, state: "none" } },
    focus: "DEV",
  },
  {
    title: "QAS 被直接改",
    desc: "有人在 QAS 畫布上直接改了設定。QAS 同時有本地修改又落後版本，此時 NiFi 不允許直接 Change version。",
    menu: "（沒有對應操作：這正是要避免的情況）",
    versions: 2,
    arrow: null,
    envs: { DEV: { ver: 2, state: "upToDate" }, QAS: { ver: 1, state: "modifiedStale" }, PRD: { ver: 0, state: "none" } },
    focus: "QAS",
  },
  {
    title: "還原本地修改",
    desc: "先把 QAS 的本地修改丟棄，回到乾淨的 v1。環境相關的值應該放在 Parameter Context，而不是改在流程上。",
    menu: "右鍵 Process Group → Version → Revert local changes",
    versions: 2,
    arrow: null,
    envs: { DEV: { ver: 2, state: "upToDate" }, QAS: { ver: 1, state: "stale" }, PRD: { ver: 0, state: "none" } },
    focus: "QAS",
  },
  {
    title: "QAS 升版",
    desc: "QAS 切換到 v2。NiFi 會停止受影響的元件、套用差異、再恢復執行，佇列中的資料會保留。",
    menu: "右鍵 Process Group → Version → Change version → v2",
    versions: 2,
    arrow: { env: "QAS", dir: "down", label: "Change version" },
    envs: { DEV: { ver: 2, state: "upToDate" }, QAS: { ver: 2, state: "upToDate" }, PRD: { ver: 0, state: "none" } },
    focus: "QAS",
  },
  {
    title: "PRD 部署",
    desc: "驗證通過後，PRD 匯入同一個 v2。三個環境跑的是同一份流程定義，差異只在各自的 Parameter Context。",
    menu: "拖入 Process Group → Import from Registry → 選 v2",
    versions: 2,
    arrow: { env: "PRD", dir: "down", label: "Import v2" },
    envs: { DEV: { ver: 2, state: "upToDate" }, QAS: { ver: 2, state: "upToDate" }, PRD: { ver: 2, state: "upToDate" } },
    focus: "PRD",
  },
];

const ENVS: Env[] = ["DEV", "QAS", "PRD"];

/* ---------- 量測 ---------- */

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

/* ---------- 圖 ---------- */

function Stage({ step, reduce }: { step: number; reduce: boolean }) {
  const [ref, W] = useMeasuredWidth(640);
  const s = STEPS[step];
  const H = 300;
  const pad = 20;
  const regY = 20;
  const regH = 78;
  const envY = 176;
  const envH = 100;
  const colW = Math.min(230, (W - pad * 2 - 40) / 3);
  const gap = (W - pad * 2 - colW * 3) / 2;
  const envX = (i: number) => pad + i * (colW + gap);
  const dur = reduce ? 0 : 0.35;

  const vx0 = pad + 250;
  const vStep = Math.min(110, (W - vx0 - pad - 60) / 2);
  const vx = (v: number) => vx0 + (v - 1) * vStep;
  const vy = regY + regH / 2 + 8;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`步驟 ${step + 1}「${s.title}」：Registry 有 ${s.versions} 個版本；${ENVS.map((e) => {
        const es = s.envs[e];
        return es.state === "none" ? `${e} 尚未部署` : `${e} 在 v${es.ver}，狀態 ${STATE_META[es.state].label}`;
      }).join("，")}。`}
    >
      <defs>
        <marker id="lc-navy" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill={NAVY} />
        </marker>
        <marker id="lc-orange" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill={ORANGE} />
        </marker>
      </defs>
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill="#ffffff" stroke="#e1e6ee" />

      {/* Registry */}
      <rect x={pad} y={regY} width={W - pad * 2} height={regH} rx={10} fill="#ffffff" stroke={NAVY} strokeWidth={1.5} />
      <text x={pad + 16} y={regY + 26} fontSize={13.5} fontWeight={800} fill={NAVY} fontFamily={FONT}>
        NiFi Registry
      </text>
      <text x={pad + 16} y={regY + 46} fontSize={10.5} fill={MUTED} fontFamily={MONO}>
        bucket: etl-order
      </text>
      <text x={pad + 16} y={regY + 62} fontSize={10.5} fill={MUTED} fontFamily={MONO}>
        flow: order-sync
      </text>
      <line x1={vx(1)} y1={vy} x2={vx(2)} y2={vy} stroke={BLUE_200} strokeWidth={2} strokeDasharray={s.versions < 2 ? "4 4" : undefined} />
      {[1, 2].map((v) => {
        const has = v <= s.versions;
        const latest = v === s.versions;
        return (
          <g key={v}>
            <motion.circle
              cx={vx(v)}
              cy={vy}
              r={14}
              initial={false}
              animate={{ fill: latest ? NAVY : has ? "#ffffff" : PANEL, stroke: has ? NAVY : GRAY }}
              transition={{ duration: dur }}
              strokeWidth={1.5}
              strokeDasharray={has ? undefined : "3 3"}
            />
            <text x={vx(v)} y={vy + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={latest ? "#ffffff" : has ? NAVY : GRAY} fontFamily={MONO}>
              v{v}
            </text>
            {latest && (
              <text x={vx(v)} y={vy - 22} textAnchor="middle" fontSize={9.5} fontWeight={800} fill={NAVY} fontFamily={FONT} letterSpacing="0.06em">
                LATEST
              </text>
            )}
          </g>
        );
      })}

      {/* 箭頭 */}
      {ENVS.map((e, i) => {
        const cx = envX(i) + colW / 2;
        const active = s.arrow?.env === e;
        const up = s.arrow?.dir === "up";
        const color = up ? ORANGE : NAVY;
        return (
          <g key={e}>
            <line x1={cx} y1={regY + regH + 6} x2={cx} y2={envY - 6} stroke={GRAY_2} strokeWidth={1.25} />
            {active && s.arrow && (
              <motion.g key={`${step}-${e}`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur }}>
                <line
                  x1={cx}
                  y1={up ? envY - 6 : regY + regH + 6}
                  x2={cx}
                  y2={up ? regY + regH + 8 : envY - 8}
                  stroke={color}
                  strokeWidth={2}
                  markerEnd={`url(#${up ? "lc-orange" : "lc-navy"})`}
                />
                <rect x={cx + 8} y={(regY + regH + envY) / 2 - 11} width={s.arrow.label.length * 7 + 14} height={22} rx={11} fill={up ? ORANGE_50 : BLUE_50} stroke={color} />
                <text x={cx + 15} y={(regY + regH + envY) / 2 + 4} fontSize={11} fontWeight={800} fill={up ? ORANGE_700 : NAVY} fontFamily={MONO}>
                  {s.arrow.label}
                </text>
              </motion.g>
            )}
          </g>
        );
      })}

      {/* 環境 */}
      {ENVS.map((e, i) => {
        const x = envX(i);
        const es = s.envs[e];
        const focus = s.focus === e;
        const deployed = es.state !== "none";
        return (
          <g key={e}>
            <rect x={x} y={envY} width={colW} height={envH} rx={10} fill="#ffffff" stroke={focus ? ORANGE : BLUE_200} strokeWidth={focus ? 1.75 : 1.25} />
            <text x={x + 14} y={envY + 22} fontSize={12.5} fontWeight={800} fill={NAVY_DEEP} fontFamily={FONT}>
              NiFi {e}
            </text>
            {deployed ? (
              <motion.g key={`${e}-${es.ver}-${es.state}`} initial={reduce ? false : { opacity: 0.3 }} animate={{ opacity: 1 }} transition={{ duration: dur }}>
                <rect x={x + 12} y={envY + 34} width={colW - 24} height={54} rx={6} fill={es.state === "upToDate" ? BLUE_50 : ORANGE_50} stroke={es.state === "upToDate" ? BLUE_100 : "#fbe7c6"} />
                <StateIcon state={es.state as Exclude<VState, "none">} x={x + 32} y={envY + 61} r={10} />
                <text x={x + 50} y={envY + 56} fontSize={11.5} fontWeight={800} fill={NAVY_DEEP} fontFamily={MONO}>
                  order-sync · v{es.ver}
                </text>
                <text x={x + 50} y={envY + 74} fontSize={10.5} fontWeight={700} fill={STATE_META[es.state as Exclude<VState, "none">].color} fontFamily={FONT}>
                  {STATE_META[es.state as Exclude<VState, "none">].label}
                </text>
              </motion.g>
            ) : (
              <g>
                <rect x={x + 12} y={envY + 34} width={colW - 24} height={54} rx={6} fill="none" stroke={GRAY} strokeDasharray="4 4" />
                <text x={x + colW / 2} y={envY + 65} textAnchor="middle" fontSize={11} fill={MUTED} fontFamily={FONT}>
                  尚未部署
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- 狀態圖例 ---------- */

function Legend({ step }: { step: number }) {
  const s = STEPS[step];
  const present = new Set(ENVS.map((e) => s.envs[e].state));
  const keys = Object.keys(STATE_META) as Exclude<VState, "none">[];
  return (
    <div role="group" aria-label="版本狀態圖例" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
      {keys.map((k) => {
        const m = STATE_META[k];
        const on = present.has(k);
        return (
          <div
            key={k}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "8px 10px",
              borderRadius: 8,
              background: on ? "#ffffff" : "transparent",
              border: `1px solid ${on ? m.color : GRAY_2}`,
              opacity: on ? 1 : 0.6,
              transition: "opacity 200ms, border-color 200ms",
            }}
          >
            <svg width={18} height={18} viewBox="-9 -9 18 18" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
              <StateIcon state={k} x={0} y={0} r={8} />
            </svg>
            <div style={{ lineHeight: 1.45 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: NAVY_DEEP }}>
                {m.label} <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 500, color: MUTED }}>{m.en}</span>
              </div>
              <div style={{ fontSize: 11.5, color: TEXT }}>{m.hint}</div>
            </div>
          </div>
        );
      })}
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
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 160ms, color 160ms, border-color 160ms",
};

export default function NifiRegistryFlowLifecycle() {
  const reduce = useReducedMotion() ?? false;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = STEPS.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (step >= last) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((v) => Math.min(last, v + 1)), 2200);
    return () => clearTimeout(t);
  }, [playing, step, last]);

  const s = STEPS[step];
  const go = (i: number) => {
    setPlaying(false);
    setStep(Math.max(0, Math.min(last, i)));
  };

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT, color: TEXT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <div role="group" aria-label="步驟" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {STEPS.map((x, i) => {
            const on = i === step;
            const past = i < step;
            return (
              <button
                key={x.title}
                type="button"
                onClick={() => go(i)}
                aria-pressed={on}
                style={{
                  ...btn,
                  height: 32,
                  fontSize: 13,
                  background: on ? NAVY : past ? BLUE_50 : "#ffffff",
                  color: on ? "#ffffff" : past ? NAVY : MUTED,
                  borderColor: on ? NAVY : past ? BLUE_100 : GRAY_2,
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 11.5 }}>{i + 1}</span>
                {x.title}
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="播放控制" style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <button type="button" aria-label="上一步" onClick={() => go(step - 1)} disabled={step === 0} style={{ ...btn, padding: "0 8px", background: "#ffffff", color: step === 0 ? GRAY : NAVY, borderColor: BLUE_200 }}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" aria-label="下一步" onClick={() => go(step + 1)} disabled={step === last} style={{ ...btn, padding: "0 8px", background: "#ffffff", color: step === last ? GRAY : NAVY, borderColor: BLUE_200 }}>
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (playing) {
                setPlaying(false);
                return;
              }
              if (step === last) setStep(0);
              setPlaying(true);
            }}
            style={{ ...btn, background: NAVY, color: "#ffffff", borderColor: NAVY }}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
            {playing ? "暫停" : "自動播放"}
          </button>
          <button type="button" aria-label="重置" onClick={() => go(0)} style={{ ...btn, padding: "0 8px", background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}>
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <Stage step={step} reduce={reduce} />

      <div style={{ background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          <strong style={{ color: NAVY }}>
            {step + 1}. {s.title}
          </strong>
          <span style={{ margin: "0 8px", color: GRAY }}>|</span>
          {s.desc}
        </div>
        <div style={{ fontSize: 12, fontFamily: MONO, color: s.arrow || s.menu.startsWith("右鍵") ? NAVY_DEEP : ORANGE_700 }}>{s.menu}</div>
      </div>

      <Legend step={step} />
    </div>
  );
}
