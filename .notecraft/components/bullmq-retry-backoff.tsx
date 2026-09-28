import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CircleCheck, CircleX, Play, RotateCcw, Timer } from "lucide-react";

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
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const SUCCESS = "#2e9e6b";
const DANGER = "#c8412f";
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

const RUN = 0.6; // 每次嘗試的執行時間（秒，示意）

type Backoff = "fixed" | "exponential";

interface Seg {
  kind: "run" | "wait";
  start: number;
  end: number;
  attempt: number; // 第幾次嘗試（1-indexed）
  ok?: boolean;
}

/** 依設定展開時間軸：successAt = 0 代表每次都失敗 */
function buildTimeline(type: Backoff, delay: number, attempts: number, successAt: number): { segs: Seg[]; total: number; ok: boolean; tries: number } {
  const segs: Seg[] = [];
  let t = 0;
  for (let n = 1; n <= attempts; n++) {
    const ok = successAt === n;
    segs.push({ kind: "run", start: t, end: t + RUN, attempt: n, ok });
    t += RUN;
    if (ok) return { segs, total: t, ok: true, tries: n };
    if (n < attempts) {
      const wait = type === "fixed" ? delay : delay * 2 ** (n - 1);
      segs.push({ kind: "wait", start: t, end: t + wait, attempt: n });
      t += wait;
    }
  }
  return { segs, total: t, ok: false, tries: attempts };
}

/* ---------- 量測 ---------- */

const MIN_W = 640;

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

function niceStep(max: number): number {
  const raw = max / 8;
  const steps = [0.5, 1, 2, 5, 10, 20];
  return steps.find((s) => s >= raw) ?? 50;
}

/* ---------- 圖：時間軸 ---------- */

function Timeline({ type, delay, attempts, successAt, cursor, reduce }: { type: Backoff; delay: number; attempts: number; successAt: number; cursor: number | null; reduce: boolean }) {
  const [ref, W] = useMeasuredWidth(MIN_W);
  const { segs, total, ok } = buildTimeline(type, delay, attempts, successAt);
  // 軸長固定取「exponential、全失敗、最大 attempts」的一部分，讓切換設定時比例可比較
  const other = buildTimeline(type === "fixed" ? "exponential" : "fixed", delay, attempts, successAt);
  const axisMax = Math.max(total, other.total) * 1.06;
  const X0 = 20;
  const X1 = W - 96;
  const sx = (s: number) => X0 + ((X1 - X0) * s) / axisMax;
  const laneY = 58;
  const laneH = 34;
  const axisY = laneY + laneH + 36;
  const H = axisY + 30;
  const step = niceStep(axisMax);
  const ticks = Array.from({ length: Math.floor(axisMax / step) + 1 }, (_, i) => i * step);
  const tr = { duration: reduce ? 0 : 0.3, ease: "easeOut" as const };

  const endX = sx(total);
  const reached = cursor === null || cursor >= total;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`重試時間軸：backoff ${type}、delay ${delay} 秒、attempts ${attempts}。${ok ? `第 ${successAt} 次成功` : `${attempts} 次皆失敗`}，總耗時約 ${total.toFixed(1)} 秒。`}
    >
      <rect width={W} height={H} rx={10} fill={PANEL} />

      {/* 格線與刻度 */}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={sx(v)} y1={laneY - 26} x2={sx(v)} y2={axisY} stroke={GRAY_2} strokeWidth={1} />
          <text x={sx(v)} y={axisY + 16} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={MONO}>
            {v}
          </text>
        </g>
      ))}
      <line x1={X0} y1={axisY} x2={X1} y2={axisY} stroke={GRAY} strokeWidth={1} />
      <text x={X1 + 8} y={axisY + 16} fontSize={10} fill={MUTED} fontFamily={FONT}>
        秒
      </text>

      {/* 區段 */}
      {segs.map((s, i) => {
        const x = sx(s.start);
        const w = Math.max(sx(s.end) - x, 2);
        const visible = cursor === null || cursor >= s.start;
        const partial = cursor !== null && cursor < s.end ? Math.max(0, (cursor - s.start) / (s.end - s.start)) : 1;
        if (s.kind === "wait") {
          return (
            <motion.g key={`w${i}`} initial={false} animate={{ opacity: visible ? 1 : 0.25 }} transition={tr}>
              <rect x={x} y={laneY + laneH / 2 - 1} width={w} height={2} fill={ORANGE_100} />
              <rect x={x} y={laneY + laneH / 2 - 1} width={w * partial} height={2} fill={ORANGE_DEEP} />
              <line x1={x} y1={laneY + 6} x2={x} y2={laneY + laneH - 6} stroke={ORANGE_DEEP} strokeWidth={1} />
              <line x1={x + w} y1={laneY + 6} x2={x + w} y2={laneY + laneH - 6} stroke={ORANGE_DEEP} strokeWidth={1} />
              {w > 34 && (
                <text x={x + w / 2} y={laneY + laneH / 2 - 7} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={ORANGE_700} fontFamily={MONO}>
                  {+(s.end - s.start).toFixed(2)}s
                </text>
              )}
              {w > 60 && (
                <text x={x + w / 2} y={laneY + laneH / 2 + 15} textAnchor="middle" fontSize={9.5} fill={MUTED} fontFamily={FONT}>
                  delayed
                </text>
              )}
            </motion.g>
          );
        }
        const color = s.ok ? SUCCESS : DANGER;
        return (
          <motion.g key={`r${i}`} initial={false} animate={{ opacity: visible ? 1 : 0.25 }} transition={tr}>
            <rect x={x} y={laneY} width={w} height={laneH} rx={4} fill="#ffffff" stroke={color} strokeWidth={1.4} />
            <rect x={x} y={laneY} width={w * partial} height={laneH} rx={4} fill={color} opacity={0.14} />
            <text x={x + w / 2} y={laneY - 10} textAnchor="middle" fontSize={10} fontWeight={700} fill={MUTED} fontFamily={FONT}>
              #{s.attempt}
            </text>
            {w > 16 && (
              <path
                d={
                  s.ok
                    ? `M${x + w / 2 - 5} ${laneY + laneH / 2} l4 4 l7 -8`
                    : `M${x + w / 2 - 4.5} ${laneY + laneH / 2 - 4.5} l9 9 M${x + w / 2 + 4.5} ${laneY + laneH / 2 - 4.5} l-9 9`
                }
                fill="none"
                stroke={color}
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            )}
          </motion.g>
        );
      })}

      {/* 終點狀態 */}
      <motion.g initial={false} animate={{ opacity: reached ? 1 : 0 }} transition={tr}>
        <rect x={endX + 8} y={laneY + 5} width={78} height={24} rx={12} fill={ok ? SUCCESS : DANGER} />
        <text x={endX + 47} y={laneY + 21} textAnchor="middle" fontSize={11} fontWeight={800} fill="#ffffff" fontFamily={MONO}>
          {ok ? "completed" : "failed"}
        </text>
      </motion.g>

      {/* 播放游標 */}
      {cursor !== null && cursor < total && (
        <g>
          <line x1={sx(cursor)} y1={laneY - 24} x2={sx(cursor)} y2={axisY} stroke={NAVY_DEEP} strokeWidth={1.5} />
          <rect x={sx(cursor) - 24} y={laneY - 44} width={48} height={16} rx={3} fill={NAVY_DEEP} />
          <text x={sx(cursor)} y={laneY - 32.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#ffffff" fontFamily={MONO}>
            {cursor.toFixed(1)}s
          </text>
        </g>
      )}
    </svg>
  );
}

/* ---------- 主元件 ---------- */

const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  borderRadius: 8,
  border: "1.5px solid transparent",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 160ms, color 160ms, border-color 160ms",
};

function Seg2<T extends string | number>({ label, options, value, onChange, render }: { label: string; options: T[]; value: T; onChange: (v: T) => void; render: (v: T) => string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: TEXT, minWidth: 64 }}>{label}</span>
      <div role="group" aria-label={label} style={{ display: "inline-flex", border: `1.5px solid ${BLUE_200}`, borderRadius: 8, overflow: "hidden" }}>
        {options.map((o, i) => {
          const on = o === value;
          return (
            <button
              key={String(o)}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o)}
              style={{
                height: 30,
                padding: "0 12px",
                border: "none",
                borderLeft: i === 0 ? "none" : `1px solid ${BLUE_100}`,
                background: on ? NAVY : "#ffffff",
                color: on ? "#ffffff" : NAVY,
                fontFamily: MONO,
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {render(o)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BullmqRetryBackoff() {
  const reduce = useReducedMotion() ?? false;
  const [type, setType] = useState<Backoff>("exponential");
  const [delay, setDelay] = useState(1);
  const [attempts, setAttempts] = useState(5);
  const [successAt, setSuccessAt] = useState(4);
  const [cursor, setCursor] = useState<number | null>(null);

  const safeSuccess = successAt > attempts ? 0 : successAt;
  const { segs, total, ok, tries } = buildTimeline(type, delay, attempts, safeSuccess);
  const waits = segs.filter((s) => s.kind === "wait").map((s) => +(s.end - s.start).toFixed(2));

  /* playId 每按一次播放就遞增；0 代表停止並顯示完整時間軸 */
  const [playId, setPlayId] = useState(0);
  const totalRef = useRef(total);
  totalRef.current = total;

  useEffect(() => {
    if (playId === 0) return;
    const end = totalRef.current;
    if (reduce) {
      setCursor(end);
      return;
    }
    let raf = 0;
    let last: number | null = null;
    let c = 0;
    const speed = Math.max(1, end / 6); // 約 6 秒播完
    const tick = (now: number) => {
      if (last === null) last = now;
      c = Math.min(end, c + ((now - last) / 1000) * speed);
      last = now;
      setCursor(c);
      if (c < end) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playId, reduce]);

  const stop = () => {
    setPlayId(0);
    setCursor(null);
  };
  const play = () => {
    setCursor(0);
    setPlayId((p) => p + 1);
  };
  const change = <T,>(fn: (v: T) => void) => (v: T) => {
    stop();
    fn(v);
  };

  const successOptions = [...Array.from({ length: attempts }, (_, i) => i + 1), 0];

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "10px 24px" }}>
        <Seg2<Backoff> label="backoff" options={["fixed", "exponential"]} value={type} onChange={change(setType)} render={(v) => v} />
        <Seg2<number> label="delay" options={[0.5, 1, 2]} value={delay} onChange={change(setDelay)} render={(v) => `${v * 1000}ms`} />
        <Seg2<number> label="attempts" options={[1, 2, 3, 4, 5, 6]} value={attempts} onChange={change(setAttempts)} render={(v) => String(v)} />
        <Seg2<number> label="成功於" options={successOptions} value={safeSuccess} onChange={change(setSuccessAt)} render={(v) => (v === 0 ? "全失敗" : `#${v}`)} />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={play}
          style={{ ...btn, background: NAVY, color: "#ffffff", borderColor: NAVY }}
        >
          <Play size={15} /> 播放
        </button>
        <button type="button" aria-label="顯示完整時間軸" onClick={stop} style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200, padding: "0 9px" }}>
          <RotateCcw size={15} />
        </button>
        <span style={{ fontSize: 12, color: MUTED }}>紅框為失敗的嘗試、綠框為成功；嘗試之間的橘線是 Job 停在 delayed 的等待時間</span>
      </div>

      <Timeline type={type} delay={delay} attempts={attempts} successAt={safeSuccess} cursor={cursor} reduce={reduce} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { k: "最終狀態", v: ok ? "completed" : "failed", c: ok ? SUCCESS : DANGER, icon: ok ? <CircleCheck size={14} /> : <CircleX size={14} /> },
              { k: "嘗試次數", v: `${tries} / ${attempts}`, c: NAVY, icon: null },
              { k: "總耗時", v: `${total.toFixed(1)}s`, c: NAVY, icon: <Timer size={14} /> },
            ].map((m) => (
              <div key={m.k} style={{ background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>{m.k}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 14, fontWeight: 800, color: m.c, marginTop: 2 }}>
                  {m.icon}
                  {m.v}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.7, color: TEXT, background: type === "exponential" ? ORANGE_50 : BLUE_50, border: `1px solid ${type === "exponential" ? ORANGE_100 : BLUE_100}`, borderRadius: 8, padding: "8px 12px" }}>
            <strong style={{ color: type === "exponential" ? ORANGE_700 : NAVY }}>{type === "exponential" ? "exponential：等待時間倍增" : "fixed：每次等一樣久"}</strong>
            <br />
            等待序列：{waits.length ? waits.map((w) => `${w}s`).join(" → ") : "（沒有重試）"}
            <br />
            {type === "exponential" ? "第 n 次重試前等待 delay × 2^(n−1)。對方服務暫時掛掉時，給它越來越多的恢復時間，也避免重試把它打得更慘。" : "適合失敗原因與時間無關、只是偶發抖動的情境；對方長時間故障時，固定間隔會持續施壓。"}
          </div>
        </div>
        <pre style={{ margin: 0, border: "none", background: NAVY_DEEP, color: BLUE_100, borderRadius: 8, padding: "12px 14px", fontFamily: MONO, fontSize: 12, lineHeight: 1.75, overflowX: "auto" }}>
          <span style={{ color: "#8fa3c0" }}>{"// 加入 Job 時設定重試策略\n"}</span>
          {"await queue.add('sync', data, {\n"}
          {"  attempts: "}
          <span style={{ color: "#ed9b26", fontWeight: 700 }}>{attempts}</span>
          {",\n  backoff: {\n    type: "}
          <span style={{ color: "#ed9b26", fontWeight: 700 }}>{`'${type}'`}</span>
          {",\n    delay: "}
          <span style={{ color: "#ed9b26", fontWeight: 700 }}>{delay * 1000}</span>
          {",\n  },\n});"}
        </pre>
      </div>
    </div>
  );
}
