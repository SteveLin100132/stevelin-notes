import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Power, RotateCcw, Zap } from "lucide-react";

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
const GREEN = "#2e9e6b";
const GREEN_50 = "#e9f6ef";
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

const AXIS_MAX = 16; // 秒
const HOOKS = 0.2; // 請求完成後，關閉資料庫連線等 lifecycle hook 的時間（秒）
const SPEED = 2; // 模擬秒 / 實際秒

type Phase = "idle" | "running" | "ended";
type Outcome = "complete" | "timeout" | "forced";

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

function endOf(remaining: number, timeout: number, forcedAt: number | null): { at: number; outcome: Outcome } {
  const close = remaining + HOOKS;
  const candidates: { at: number; outcome: Outcome }[] = [
    { at: close, outcome: "complete" },
    { at: timeout, outcome: "timeout" },
  ];
  if (forcedAt !== null) candidates.push({ at: forcedAt, outcome: "forced" });
  return candidates.reduce((a, b) => (b.at < a.at ? b : a));
}

/* ---------- 圖：兩條賽跑的長條 ---------- */

const MIN_W = 560;
const REQ_Y = 58;
const TMR_Y = 112;
const BAR_H = 24;
const AXIS_Y = 166;
const H = 196;

function Race({ width, remaining, timeout, t, phase, end }: { width: number; remaining: number; timeout: number; t: number; phase: Phase; end: { at: number; outcome: Outcome } }) {
  const W = Math.max(width, MIN_W);
  const x0 = 132;
  const x1 = W - 24;
  const sx = (s: number) => x0 + ((x1 - x0) * Math.min(s, AXIS_MAX)) / AXIS_MAX;
  const now = phase === "idle" ? 0 : t;
  const reqDone = Math.min(now, remaining, end.at);
  const cut = phase === "ended" && end.outcome !== "complete" && remaining > end.at;
  const endColor = end.outcome === "complete" ? GREEN : ORANGE;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`優雅關機模擬：進行中請求還需 ${remaining} 秒，逾時 ${timeout} 秒。${
        phase === "ended" ? `結果：${end.outcome === "complete" ? "請求完成，exit 0" : end.outcome === "timeout" ? "逾時，exit 1" : "第二次訊號強制結束，exit 1"}` : phase === "running" ? `已經過 ${t.toFixed(1)} 秒` : "尚未送出 SIGTERM"
      }`}
      style={{ display: "block" }}
    >
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill="#ffffff" stroke={GRAY_2} />

      {[0, 2, 4, 6, 8, 10, 12, 14, 16].map((s) => (
        <g key={s}>
          <line x1={sx(s)} y1={REQ_Y - 14} x2={sx(s)} y2={AXIS_Y} stroke={GRAY_2} />
          <text x={sx(s)} y={AXIS_Y + 16} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={FONT}>
            {s}s
          </text>
        </g>
      ))}
      <line x1={x0} y1={AXIS_Y} x2={x1} y2={AXIS_Y} stroke={GRAY} />

      {/* SIGTERM 起點 */}
      <line x1={sx(0)} y1={REQ_Y - 22} x2={sx(0)} y2={AXIS_Y} stroke={NAVY_DEEP} strokeWidth={2} />
      <text x={sx(0) + 6} y={REQ_Y - 20} fontSize={10.5} fontWeight={800} fill={NAVY_DEEP} fontFamily={MONO}>
        SIGTERM
      </text>

      {/* 進行中的請求 */}
      <text x={16} y={REQ_Y + 16} fontSize={11.5} fontWeight={800} fill={NAVY_DEEP} fontFamily={FONT}>
        進行中的請求
      </text>
      {remaining > 0 ? (
        <>
          <rect x={sx(0)} y={REQ_Y} width={sx(remaining) - sx(0)} height={BAR_H} rx={4} fill="#ffffff" stroke={BLUE_200} />
          <motion.rect x={sx(0)} y={REQ_Y} height={BAR_H} rx={4} fill={NAVY} initial={false} animate={{ width: Math.max(0, sx(reqDone) - sx(0)) }} transition={{ duration: 0.08, ease: "linear" }} />
          {remaining > AXIS_MAX - 0.01 ? null : (
            <text x={sx(remaining) + 6} y={REQ_Y + 16} fontSize={10} fill={MUTED} fontFamily={FONT}>
              需要 {remaining}s
            </text>
          )}
        </>
      ) : (
        <text x={sx(0) + 8} y={REQ_Y + 16} fontSize={10.5} fill={MUTED} fontFamily={FONT}>
          沒有進行中的請求
        </text>
      )}
      {cut && (
        <g>
          <rect x={sx(end.at)} y={REQ_Y} width={Math.max(0, sx(remaining) - sx(end.at))} height={BAR_H} rx={4} fill={ORANGE_50} stroke={ORANGE} strokeDasharray="4 3" />
          <path d={`M${sx(end.at) - 6} ${REQ_Y + 6} l12 12 M${sx(end.at) + 6} ${REQ_Y + 6} l-12 12`} stroke={ORANGE} strokeWidth={2} />
        </g>
      )}

      {/* 逾時計時器 */}
      <text x={16} y={TMR_Y + 16} fontSize={11.5} fontWeight={800} fill={NAVY_DEEP} fontFamily={FONT}>
        逾時計時器
      </text>
      <rect x={sx(0)} y={TMR_Y} width={sx(timeout) - sx(0)} height={BAR_H} rx={4} fill="#ffffff" stroke={ORANGE} strokeDasharray="5 3" />
      <motion.rect x={sx(0)} y={TMR_Y} height={BAR_H} rx={4} fill={ORANGE_100} initial={false} animate={{ width: Math.max(0, sx(Math.min(now, timeout, end.at)) - sx(0)) }} transition={{ duration: 0.08, ease: "linear" }} />
      <text x={sx(timeout) - 6} y={TMR_Y + 16} textAnchor="end" fontSize={10.5} fontWeight={800} fill={ORANGE_700} fontFamily={MONO}>
        timeout {timeout}s
      </text>

      {/* 時間游標 */}
      {phase === "running" && <line x1={sx(t)} y1={REQ_Y - 8} x2={sx(t)} y2={AXIS_Y} stroke={NAVY} strokeWidth={1.5} strokeDasharray="3 3" />}

      {/* 結束點 */}
      {phase === "ended" && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <line x1={sx(end.at)} y1={REQ_Y - 8} x2={sx(end.at)} y2={AXIS_Y} stroke={endColor} strokeWidth={2} />
          <rect x={sx(end.at) - 34} y={AXIS_Y - 22} width={68} height={18} rx={9} fill={endColor} />
          <text x={sx(end.at)} y={AXIS_Y - 9} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#ffffff" fontFamily={MONO}>
            exit {end.outcome === "complete" ? 0 : 1}
          </text>
        </motion.g>
      )}
    </svg>
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

export default function NestjsScaffoldGracefulShutdown() {
  const reduce = useReducedMotion();
  const [remaining, setRemaining] = useState(3);
  const [timeout, setTimeoutSec] = useState<5 | 10 | 15>(10);
  const [phase, setPhase] = useState<Phase>("idle");
  const [t, setT] = useState(0);
  const [forcedAt, setForcedAt] = useState<number | null>(null);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const tRef = useRef(0);
  tRef.current = t;

  const end = endOf(remaining, timeout, forcedAt);
  const endRef = useRef(end);
  endRef.current = end;

  useEffect(() => {
    if (phase !== "running") return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = ((now - prev) / 1000) * (reduce ? 8 : SPEED);
      prev = now;
      const next = tRef.current + dt;
      if (next >= endRef.current.at) {
        setT(endRef.current.at);
        setPhase("ended");
        return;
      }
      setT(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduce]);

  const reset = () => {
    setPhase("idle");
    setT(0);
    setForcedAt(null);
  };

  const start = () => {
    setT(0);
    setForcedAt(null);
    setPhase("running");
  };

  const conns = phase === "idle" ? (remaining > 0 ? 1 : 0) : t < remaining && !(phase === "ended" && end.outcome !== "complete") ? 1 : 0;
  const ms = (s: number) => Math.round(s * 1000);

  const logs: { text: string; tone: "navy" | "green" | "orange" }[] = [];
  if (phase !== "idle") {
    logs.push({ tone: "navy", text: `{"event":"shutdown_start","shutdown_signal":"SIGTERM","active_connections_count":${remaining > 0 ? 1 : 0},"timeout_ms":${timeout * 1000}}` });
  }
  if (phase === "ended") {
    if (end.outcome === "complete") logs.push({ tone: "green", text: `{"event":"shutdown_complete","shutdown_duration_ms":${ms(end.at)},"timeout_triggered":false,"exit_code":0}` });
    if (end.outcome === "timeout") logs.push({ tone: "orange", text: `{"event":"shutdown_timeout","shutdown_duration_ms":${ms(end.at)},"timeout_triggered":true,"exit_code":1}` });
    if (end.outcome === "forced") logs.push({ tone: "orange", text: `{"event":"forced_exit","shutdown_signal":"SIGINT","exit_code":1}` });
  }

  const summary =
    phase === "idle"
      ? "調整請求還需要的時間與逾時設定，然後送出 SIGTERM。"
      : phase === "running"
        ? "app.close() 已停止接受新連線，正在等進行中的請求完成；計時器同時在跑。關機中可以再送一次訊號試試看。"
        : end.outcome === "complete"
          ? `請求在 ${remaining}s 完成，lifecycle hook 收尾後在 ${end.at.toFixed(1)}s 正常結束，exit code 0。`
          : end.outcome === "timeout"
            ? `請求需要 ${remaining}s，但逾時設為 ${timeout}s：計時器先到，程序以 exit code 1 結束，請求被中斷。逾時要設得比最慢的請求長，但要比 Kubernetes 的 terminationGracePeriodSeconds 短。`
            : "關機中又收到一次訊號，不再等待，直接以 exit code 1 結束。開發時連按兩次 Ctrl+C 就是這個情況。";

  const card = (label: string, value: string, tone: "navy" | "green" | "orange" | "muted") => {
    const c = tone === "green" ? GREEN : tone === "orange" ? ORANGE_700 : tone === "muted" ? MUTED : NAVY_DEEP;
    return (
      <div style={{ flex: "1 1 0", minWidth: 0, background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "8px 12px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", color: MUTED }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      </div>
    );
  };

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 20px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: TEXT }}>
          請求還需要
          <input
            type="range"
            min={0}
            max={15}
            step={1}
            value={remaining}
            onChange={(e) => {
              setRemaining(Number(e.target.value));
              reset();
            }}
            aria-label="進行中請求還需要的秒數"
            style={{ width: 140, accentColor: NAVY }}
          />
          <span style={{ fontFamily: MONO, minWidth: 36, color: NAVY_DEEP }}>{remaining}s</span>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: MONO }}>SHUTDOWN_TIMEOUT_MS</span>
          <div role="group" aria-label="關機逾時" style={{ display: "inline-flex", padding: 3, borderRadius: 10, background: BLUE_50, border: `1px solid ${BLUE_100}` }}>
            {([5, 10, 15] as const).map((o) => {
              const on = o === timeout;
              return (
                <button
                  key={o}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setTimeoutSec(o);
                    reset();
                  }}
                  style={{ ...btn, height: 28, padding: "0 10px", border: "none", background: on ? NAVY : "transparent", color: on ? "#ffffff" : NAVY, fontSize: 13 }}
                >
                  {o * 1000}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div role="group" aria-label="模擬控制" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" onClick={start} disabled={phase === "running"} style={{ ...btn, background: NAVY, color: "#ffffff", borderColor: NAVY, opacity: phase === "running" ? 0.45 : 1 }}>
          <Power size={16} /> 送出 SIGTERM
        </button>
        <button
          type="button"
          onClick={() => setForcedAt(t)}
          disabled={phase !== "running"}
          style={{ ...btn, background: "#ffffff", color: ORANGE_700, borderColor: ORANGE, opacity: phase !== "running" ? 0.45 : 1, cursor: phase !== "running" ? "default" : "pointer" }}
        >
          <Zap size={16} /> 再按一次 Ctrl+C
        </button>
        <button type="button" onClick={reset} aria-label="重置" style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}>
          <RotateCcw size={16} /> 重置
        </button>
      </div>

      <div ref={wrapRef} style={{ width: "100%" }}>
        <Race width={width} remaining={remaining} timeout={timeout} t={t} phase={phase} end={end} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {card("接受新請求", phase === "idle" ? "是" : "否", phase === "idle" ? "green" : "orange")}
        {card("進行中連線", String(conns), conns > 0 ? "navy" : "muted")}
        {card("exit code", phase === "ended" ? String(end.outcome === "complete" ? 0 : 1) : "—", phase !== "ended" ? "muted" : end.outcome === "complete" ? "green" : "orange")}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${phase}-${end.outcome}`}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            fontSize: 13.5,
            lineHeight: 1.7,
            color: TEXT,
            background: phase === "ended" ? (end.outcome === "complete" ? GREEN_50 : ORANGE_50) : BLUE_50,
            border: `1px solid ${phase === "ended" ? (end.outcome === "complete" ? "#bfe3cf" : ORANGE_100) : BLUE_100}`,
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          {summary}
        </motion.div>
      </AnimatePresence>

      <div style={{ background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: MUTED, marginBottom: 6 }}>STDOUT（結構化日誌，timestamp 省略）</div>
        {logs.length === 0 ? (
          <div style={{ fontSize: 12.5, color: MUTED }}>還沒有輸出。</div>
        ) : (
          logs.map((l) => (
            <motion.div
              key={l.text}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: l.tone === "green" ? GREEN : l.tone === "orange" ? ORANGE_700 : NAVY_DEEP, overflowWrap: "anywhere", padding: "2px 0" }}
            >
              {l.text}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
