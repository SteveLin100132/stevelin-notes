import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Clock, ListPlus, Pause, Play, RotateCcw, Zap } from "lucide-react";

/* trendlink-design 色票（生成元件的 Tailwind class 不會被編譯，直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700
const NAVY_DEEP = "#112f5d"; // --blue-900
const BLUE = "#2c6ebb"; // --blue-500
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
const SUCCESS_50 = "#e8f5ee";
const DANGER = "#c8412f";
const DANGER_50 = "#fbeceA";
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

/* ---------- 模擬參數 ---------- */

const TICK = 100; // ms
const PROC = 2000; // 每個 Job 的處理時間
const DELAY = 3000; // 延遲 Job 的 delay
const BACKOFF = 1000; // exponential backoff 的基礎 delay
const ATTEMPTS = 3; // attempts：含第一次共嘗試 3 次
const KEEP = 6; // completed / failed 只保留最近幾筆在圖上

type State = "delayed" | "prioritized" | "wait" | "active" | "completed" | "failed";

interface Job {
  id: number;
  state: State;
  priority: number; // 0 = 未設定
  enq: number; // 進入目前佇列的時間，用於排序
  until: number; // delayed 到期時間
  startedAt: number;
  attemptsMade: number;
  retrying: boolean;
}

interface LogLine {
  id: number;
  t: number;
  text: string;
  tone: "info" | "ok" | "warn" | "bad";
}

interface Sim {
  t: number;
  nextId: number;
  logId: number;
  jobs: Job[];
  paused: boolean;
  completed: number;
  failed: number;
  log: LogLine[];
}

function pushLog(sim: Sim, text: string, tone: LogLine["tone"]): void {
  sim.log = [{ id: sim.logId++, t: sim.t, text, tone }, ...sim.log].slice(0, 6);
}

function readyState(priority: number): State {
  return priority > 0 ? "prioritized" : "wait";
}

function addJob(prev: Sim, kind: "normal" | "delayed" | "p1" | "p10"): Sim {
  const sim: Sim = { ...prev, jobs: [...prev.jobs] };
  const priority = kind === "p1" ? 1 : kind === "p10" ? 10 : 0;
  const id = sim.nextId++;
  const state: State = kind === "delayed" ? "delayed" : readyState(priority);
  sim.jobs.push({ id, state, priority, enq: sim.t + id * 1e-6, until: sim.t + DELAY, startedAt: 0, attemptsMade: 0, retrying: false });
  if (kind === "delayed") pushLog(sim, `#${id} 加入 delayed，${DELAY / 1000} 秒後到期`, "info");
  else if (priority) pushLog(sim, `#${id} 加入 prioritized（priority ${priority}）`, "info");
  else pushLog(sim, `#${id} 加入 wait`, "info");
  return sim;
}

function trimFinished(jobs: Job[]): Job[] {
  const keep = new Set<number>();
  (["completed", "failed"] as const).forEach((st) => {
    jobs
      .filter((j) => j.state === st)
      .slice(-KEEP)
      .forEach((j) => keep.add(j.id));
  });
  return jobs.filter((j) => (j.state === "completed" || j.state === "failed" ? keep.has(j.id) : true));
}

function advance(prev: Sim, concurrency: number, failRate: number, rand: () => number): Sim {
  const sim: Sim = { ...prev, t: prev.t + TICK, jobs: prev.jobs.map((j) => ({ ...j })) };
  const { t } = sim;

  // 1. delayed 到期 → wait / prioritized
  sim.jobs
    .filter((j) => j.state === "delayed" && j.until <= t)
    .sort((a, b) => a.until - b.until)
    .forEach((j) => {
      j.state = readyState(j.priority);
      j.enq = t + j.id * 1e-6;
      pushLog(sim, `#${j.id} delayed 到期 → ${j.state}`, "info");
    });

  // 2. active 處理完成
  sim.jobs
    .filter((j) => j.state === "active" && t - j.startedAt >= PROC)
    .forEach((j) => {
      if (rand() < failRate) {
        j.attemptsMade += 1;
        if (j.attemptsMade < ATTEMPTS) {
          const wait = BACKOFF * 2 ** (j.attemptsMade - 1);
          j.state = "delayed";
          j.until = t + wait;
          j.retrying = true;
          pushLog(sim, `#${j.id} 失敗，第 ${j.attemptsMade} 次重試排在 ${wait / 1000}s 後（delayed）`, "warn");
        } else {
          j.state = "failed";
          j.enq = t + j.id * 1e-6;
          sim.failed += 1;
          pushLog(sim, `#${j.id} 已嘗試 ${ATTEMPTS} 次 → failed`, "bad");
        }
      } else {
        j.state = "completed";
        j.enq = t + j.id * 1e-6;
        sim.completed += 1;
        pushLog(sim, `#${j.id} active → completed${j.attemptsMade ? `（重試 ${j.attemptsMade} 次後成功）` : ""}`, "ok");
      }
    });

  // 3. Worker 取新 Job：先 wait（FIFO），再 prioritized（數字小者優先）
  if (!sim.paused) {
    let active = sim.jobs.filter((j) => j.state === "active").length;
    while (active < concurrency) {
      const waiting = sim.jobs.filter((j) => j.state === "wait").sort((a, b) => a.enq - b.enq);
      const prio = sim.jobs.filter((j) => j.state === "prioritized").sort((a, b) => a.priority - b.priority || a.enq - b.enq);
      const next = waiting[0] ?? prio[0];
      if (!next) break;
      pushLog(sim, `#${next.id} ${next.state} → active`, "info");
      next.state = "active";
      next.startedAt = t;
      active += 1;
    }
  }

  sim.jobs = trimFinished(sim.jobs);
  return sim;
}

function initialSim(): Sim {
  let sim: Sim = { t: 0, nextId: 1, logId: 1, jobs: [], paused: false, completed: 0, failed: 0, log: [] };
  sim = addJob(sim, "normal");
  sim = addJob(sim, "normal");
  sim = addJob(sim, "p10");
  sim = addJob(sim, "delayed");
  return sim;
}

/* ---------- 量測 ---------- */

const MIN_W = 720;

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

/* ---------- 圖：狀態機 ---------- */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const CHIP_W = 52;
const CHIP_H = 26;
const TOP = 30;
const COL_H = 250;

function layout(W: number) {
  const pad = 16;
  const gap = 44;
  const usable = W - pad * 2 - gap * 3;
  const w1 = usable * 0.22;
  const w2 = usable * 0.27;
  const w3 = usable * 0.2;
  const w4 = usable - w1 - w2 - w3;
  const x1 = pad;
  const x2 = x1 + w1 + gap;
  const x3 = x2 + w2 + gap;
  const x4 = x3 + w3 + gap;
  const half = (COL_H - 14) / 2;
  const boxes: Record<State, Box> = {
    delayed: { x: x1, y: TOP, w: w1, h: COL_H },
    wait: { x: x2, y: TOP, w: w2, h: half },
    prioritized: { x: x2, y: TOP + half + 14, w: w2, h: half },
    active: { x: x3, y: TOP, w: w3, h: COL_H },
    completed: { x: x4, y: TOP, w: w4, h: half },
    failed: { x: x4, y: TOP + half + 14, w: w4, h: half },
  };
  return boxes;
}

function chipPos(box: Box, i: number, vertical: boolean): { x: number; y: number; hidden: boolean } {
  if (vertical) {
    const x = box.x + (box.w - CHIP_W) / 2;
    const y = box.y + 40 + i * 48;
    return { x, y, hidden: y + CHIP_H > box.y + box.h - 6 };
  }
  const perRow = Math.max(1, Math.floor((box.w - 20 + 6) / (CHIP_W + 6)));
  const rows = Math.max(1, Math.floor((box.h - 38) / (CHIP_H + 6)));
  const col = i % perRow;
  const row = Math.floor(i / perRow);
  return { x: box.x + 10 + col * (CHIP_W + 6), y: box.y + 34 + row * (CHIP_H + 6), hidden: row >= rows };
}

const META: Record<State, { label: string; zh: string; color: string; soft: string }> = {
  delayed: { label: "delayed", zh: "延遲中", color: ORANGE_700, soft: ORANGE_50 },
  wait: { label: "wait", zh: "等待", color: NAVY, soft: "#ffffff" },
  prioritized: { label: "prioritized", zh: "依優先序等待", color: NAVY, soft: "#ffffff" },
  active: { label: "active", zh: "處理中", color: BLUE, soft: BLUE_50 },
  completed: { label: "completed", zh: "完成", color: SUCCESS, soft: SUCCESS_50 },
  failed: { label: "failed", zh: "失敗", color: DANGER, soft: DANGER_50 },
};

function Machine({ sim, concurrency, reduce }: { sim: Sim; concurrency: number; reduce: boolean }) {
  const [ref, W] = useMeasuredWidth(MIN_W);
  const B = layout(W);
  const H = TOP + COL_H + 58;
  /* SSR 時 motion 的位移不會輸出成 SVG transform，晶片等 hydrate 後才畫，避免閃現在左上角 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const groups: Record<State, Job[]> = { delayed: [], prioritized: [], wait: [], active: [], completed: [], failed: [] };
  sim.jobs.forEach((j) => groups[j.state].push(j));
  groups.delayed.sort((a, b) => a.until - b.until);
  groups.wait.sort((a, b) => a.enq - b.enq);
  groups.prioritized.sort((a, b) => a.priority - b.priority || a.enq - b.enq);
  groups.active.sort((a, b) => a.startedAt - b.startedAt || a.id - b.id);
  groups.completed.sort((a, b) => b.enq - a.enq);
  groups.failed.sort((a, b) => b.enq - a.enq);

  const counts: Record<State, number> = {
    delayed: groups.delayed.length,
    prioritized: groups.prioritized.length,
    wait: groups.wait.length,
    active: groups.active.length,
    completed: sim.completed,
    failed: sim.failed,
  };

  const positions = new Map<number, { x: number; y: number; hidden: boolean }>();
  const overflow: Partial<Record<State, number>> = {};
  (Object.keys(groups) as State[]).forEach((st) => {
    let hiddenCount = 0;
    groups[st].forEach((j, i) => {
      const p = chipPos(B[st], i, st === "active");
      if (p.hidden) hiddenCount += 1;
      positions.set(j.id, p);
    });
    if (hiddenCount) overflow[st] = hiddenCount;
  });

  const arrow = (d: string, key: string, color = NAVY, dashed = false) => (
    <path key={key} d={d} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray={dashed ? "5 4" : undefined} markerEnd={`url(#lc-${color === NAVY ? "navy" : color === GRAY ? "gray" : "orange"})`} />
  );

  const midY = (b: Box) => b.y + b.h / 2;
  const flowColor = sim.paused ? GRAY : NAVY;
  const transition = { duration: reduce ? 0 : 0.35, ease: "easeOut" as const };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`BullMQ Job 狀態機模擬。delayed ${counts.delayed} 個、wait ${counts.wait} 個、prioritized ${counts.prioritized} 個、active ${counts.active} 個（concurrency ${concurrency}）、累計 completed ${counts.completed} 個、failed ${counts.failed} 個${sim.paused ? "；佇列已暫停" : ""}。`}
    >
      <defs>
        {[
          ["navy", NAVY],
          ["gray", GRAY],
          ["orange", ORANGE_DEEP],
        ].map(([k, c]) => (
          <marker key={k} id={`lc-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 Z" fill={c} />
          </marker>
        ))}
      </defs>
      <rect width={W} height={H} rx={10} fill={PANEL} />

      {/* 狀態方塊 */}
      {(Object.keys(B) as State[]).map((st) => {
        const b = B[st];
        const m = META[st];
        const isQueue = st === "wait" || st === "prioritized";
        return (
          <g key={st}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill={m.soft} stroke={st === "active" ? BLUE_200 : GRAY} strokeWidth={1.25} strokeDasharray={isQueue && sim.paused ? "5 4" : undefined} />
            <text x={b.x + 10} y={b.y + 19} fontSize={11.5} fontWeight={800} fill={m.color} fontFamily={MONO}>
              {m.label}
            </text>
            <text x={b.x + b.w - 10} y={b.y + 19} textAnchor="end" fontSize={11.5} fontWeight={800} fill={m.color} fontFamily={MONO} style={{ fontVariantNumeric: "tabular-nums" }}>
              {st === "active" ? `${counts.active}/${concurrency}` : counts[st]}
            </text>
            {b.w > 150 && (
              <text x={b.x + 10 + m.label.length * 7.4 + 8} y={b.y + 19} fontSize={10} fill={MUTED} fontFamily={FONT}>
                {m.zh}
              </text>
            )}
            {isQueue && sim.paused && (
              <g>
                <rect x={b.x + b.w - 70} y={b.y + b.h - 24} width={60} height={16} rx={3} fill={ORANGE_100} />
                <text x={b.x + b.w - 40} y={b.y + b.h - 12.5} textAnchor="middle" fontSize={9.5} fontWeight={800} fill={ORANGE_700} fontFamily={MONO}>
                  PAUSED
                </text>
              </g>
            )}
            {overflow[st] ? (
              <text x={b.x + 10} y={b.y + b.h - 10} fontSize={10} fontWeight={700} fill={MUTED} fontFamily={FONT}>
                還有 {overflow[st]} 個
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Active 的 worker 插槽 */}
      {Array.from({ length: concurrency }, (_, i) => {
        const b = B.active;
        const y = b.y + 40 + i * 48;
        return <rect key={i} x={b.x + (b.w - CHIP_W) / 2 - 5} y={y - 5} width={CHIP_W + 10} height={CHIP_H + 18} rx={6} fill="#ffffff" stroke={BLUE_100} strokeDasharray="3 3" />;
      })}

      {/* 轉換箭頭 */}
      {arrow(`M${B.delayed.x + B.delayed.w + 4} ${midY(B.wait)} H${B.wait.x - 6}`, "d-w")}
      {arrow(`M${B.delayed.x + B.delayed.w + 4} ${midY(B.prioritized)} H${B.prioritized.x - 6}`, "d-p")}
      <text x={B.delayed.x + B.delayed.w + 22} y={midY(B.wait) - 7} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={MUTED} fontFamily={FONT}>
        到期
      </text>
      {arrow(`M${B.wait.x + B.wait.w + 4} ${midY(B.wait)} H${B.active.x - 6}`, "w-a", flowColor, sim.paused)}
      {arrow(`M${B.prioritized.x + B.prioritized.w + 4} ${midY(B.prioritized)} H${B.active.x - 6}`, "p-a", flowColor, sim.paused)}
      <text x={B.wait.x + B.wait.w + 22} y={midY(B.wait) - 7} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={MUTED} fontFamily={FONT}>
        先
      </text>
      <text x={B.prioritized.x + B.prioritized.w + 22} y={midY(B.prioritized) - 7} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={MUTED} fontFamily={FONT}>
        後
      </text>
      {arrow(`M${B.active.x + B.active.w + 4} ${midY(B.completed)} H${B.completed.x - 6}`, "a-c")}
      {arrow(`M${B.active.x + B.active.w + 4} ${midY(B.failed)} H${B.failed.x - 6}`, "a-f")}
      {/* 重試：active → delayed */}
      {arrow(`M${B.active.x + B.active.w / 2} ${B.active.y + B.active.h + 4} V${TOP + COL_H + 26} H${B.delayed.x + B.delayed.w / 2} V${B.delayed.y + B.delayed.h + 6}`, "a-d", ORANGE_DEEP, true)}
      <rect x={(B.delayed.x + B.active.x + B.active.w) / 2 - 118} y={TOP + COL_H + 17} width={236} height={18} fill={PANEL} />
      <text x={(B.delayed.x + B.active.x + B.active.w) / 2} y={TOP + COL_H + 30} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={ORANGE_700} fontFamily={FONT}>
        失敗且未達 attempts：退避後重試（1s、2s）
      </text>

      {/* Job 晶片 */}
      <AnimatePresence initial={false}>
        {mounted && sim.jobs.map((j) => {
          const p = positions.get(j.id);
          if (!p) return null;
          const st = j.state;
          const isActive = st === "active";
          const done = st === "completed";
          const bad = st === "failed";
          const retry = j.retrying && (st === "delayed" || st === "wait" || st === "prioritized" || st === "active");
          const stroke = done ? SUCCESS : bad ? DANGER : retry ? ORANGE_DEEP : j.priority ? NAVY : BLUE_200;
          const fill = done ? "#ffffff" : bad ? "#ffffff" : isActive ? "#ffffff" : st === "delayed" ? "#ffffff" : BLUE_50;
          const label = `#${j.id}${j.priority ? ` P${j.priority}` : ""}`;
          const frac = isActive ? Math.min(1, (sim.t - j.startedAt) / PROC) : st === "delayed" ? Math.max(0, (j.until - sim.t) / (j.retrying ? BACKOFF * 2 ** Math.max(0, j.attemptsMade - 1) : DELAY)) : 0;
          return (
            <motion.g
              key={j.id}
              initial={{ x: p.x, y: p.y - 10, opacity: 0 }}
              animate={{ x: p.x, y: p.y, opacity: p.hidden ? 0 : 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            >
              <rect width={CHIP_W} height={CHIP_H} rx={4} fill={fill} stroke={stroke} strokeWidth={1.4} strokeDasharray={retry && st !== "active" ? "3 2" : undefined} />
              <text x={CHIP_W / 2} y={CHIP_H / 2 + 4} textAnchor="middle" fontSize={10.5} fontWeight={800} fill={done ? SUCCESS : bad ? DANGER : NAVY_DEEP} fontFamily={MONO}>
                {label}
              </text>
              {(isActive || st === "delayed") && (
                <g>
                  <rect x={0} y={CHIP_H + 4} width={CHIP_W} height={4} rx={2} fill={GRAY_2} />
                  <rect x={0} y={CHIP_H + 4} width={CHIP_W * frac} height={4} rx={2} fill={isActive ? BLUE : ORANGE_DEEP} />
                </g>
              )}
              {isActive && j.attemptsMade > 0 && (
                <text x={CHIP_W + 8} y={CHIP_H / 2 + 4} fontSize={9.5} fontWeight={700} fill={ORANGE_700} fontFamily={FONT}>
                  第 {j.attemptsMade + 1} 次
                </text>
              )}
            </motion.g>
          );
        })}
      </AnimatePresence>
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

const ghost: CSSProperties = { ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 };

const TONE: Record<LogLine["tone"], string> = { info: MUTED, ok: SUCCESS, warn: ORANGE_700, bad: DANGER };

function Slider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: TEXT, flex: "1 1 240px" }}>
      <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ flex: 1, minWidth: 0, accentColor: NAVY }} />
      <span style={{ minWidth: 44, textAlign: "right", fontFamily: MONO, fontWeight: 800, color: NAVY }}>
        {value}
        {unit}
      </span>
    </label>
  );
}

export default function BullmqJobLifecycle() {
  const reduce = useReducedMotion() ?? false;
  const [sim, setSim] = useState<Sim>(initialSim);
  const [concurrency, setConcurrency] = useState(2);
  const [failPct, setFailPct] = useState(30);
  const cfg = useRef({ concurrency, failPct });
  cfg.current = { concurrency, failPct };

  useEffect(() => {
    const timer = setInterval(() => {
      setSim((prev) => advance(prev, cfg.current.concurrency, cfg.current.failPct / 100, Math.random));
    }, TICK);
    return () => clearInterval(timer);
  }, []);

  const add = (kind: "normal" | "delayed" | "p1" | "p10", n = 1) =>
    setSim((prev) => {
      let s = prev;
      for (let i = 0; i < n; i++) s = addJob(s, kind);
      return s;
    });

  const togglePause = () =>
    setSim((prev) => {
      const s: Sim = { ...prev, paused: !prev.paused };
      pushLog(s, s.paused ? "queue.pause()：Worker 不再取新 Job，進行中的會做完" : "queue.resume()：恢復取件", s.paused ? "warn" : "info");
      return s;
    });

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <div role="group" aria-label="加入 Job" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button type="button" onClick={() => add("normal")} style={{ ...btn, background: NAVY, color: "#ffffff", borderColor: NAVY }}>
            <ListPlus size={15} /> 一般 Job
          </button>
          <button type="button" onClick={() => add("delayed")} style={ghost}>
            <Clock size={15} /> delay 3s
          </button>
          <button type="button" onClick={() => add("p1")} style={ghost}>
            priority 1
          </button>
          <button type="button" onClick={() => add("p10")} style={ghost}>
            priority 10
          </button>
          <button type="button" onClick={() => add("normal", 5)} style={ghost}>
            <Zap size={15} /> 突發 5 個
          </button>
        </div>
        <div role="group" aria-label="佇列控制" style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <button
            type="button"
            onClick={togglePause}
            aria-pressed={sim.paused}
            style={{ ...btn, background: sim.paused ? ORANGE_DEEP : "#ffffff", color: sim.paused ? "#ffffff" : ORANGE_700, borderColor: ORANGE_DEEP }}
          >
            {sim.paused ? <Play size={15} /> : <Pause size={15} />}
            {sim.paused ? "resume()" : "pause()"}
          </button>
          <button type="button" aria-label="重置模擬" onClick={() => setSim(initialSim())} style={{ ...ghost, padding: "0 9px" }}>
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px" }}>
        <Slider label="Worker concurrency" value={concurrency} min={1} max={4} step={1} unit="" onChange={setConcurrency} />
        <Slider label="失敗機率" value={failPct} min={0} max={60} step={10} unit="%" onChange={setFailPct} />
      </div>

      <Machine sim={sim} concurrency={concurrency} reduce={reduce} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        <div style={{ background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: "0.06em", marginBottom: 4 }}>EVENTS</div>
          <div role="log" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sim.log.map((l) => (
              <div key={l.id} style={{ display: "flex", gap: 10, fontSize: 12, lineHeight: 1.6 }}>
                <span style={{ fontFamily: MONO, color: GRAY, minWidth: 44, fontVariantNumeric: "tabular-nums" }}>{(l.t / 1000).toFixed(1)}s</span>
                <span style={{ color: TONE[l.tone], fontWeight: l.tone === "info" ? 500 : 700 }}>{l.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.75, color: TEXT, background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "10px 12px" }}>
          <strong style={{ color: NAVY }}>觀察重點</strong>
          <br />
          處理時間固定 {PROC / 1000}s、attempts {ATTEMPTS}、exponential backoff {BACKOFF / 1000}s。
          <br />
          加入 priority 1 後再加一般 Job：<strong>沒設 priority 的反而先被取走</strong>，prioritized 只在 wait 清空後依數字由小到大處理。
          <br />
          按 pause()：進行中的 Job 仍會做完，新的只會堆在 wait。
        </div>
      </div>
    </div>
  );
}
