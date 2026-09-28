import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Database, Pause, Play, RotateCcw } from "lucide-react";

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
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

/* ---------- 走查資料 ---------- */

type Place = "producer" | "queue" | "worker" | "done";
type FieldKey = "state" | "data" | "progress" | "logs" | "returnvalue" | "processedOn" | "finishedOn";

interface Step {
  title: string;
  desc: string;
  place: Place;
  code: number[]; // 高亮的程式碼行（0-indexed）
  record: Record<FieldKey, string>;
  changed: FieldKey[];
}

const CODE: string[] = [
  "// producer.ts",
  "await queue.add('sum', { a: 1, b: 2 });",
  "",
  "// worker.ts",
  "new Worker('etl', async (job) => {",
  "  await job.log('start');",
  "  const c = job.data.a + job.data.b;",
  "  await job.updateProgress(50);",
  "  await job.log('c = ' + c);",
  "  await job.updateProgress(100);",
  "  return { ...job.data, c };",
  "}, { connection });",
];

const EMPTY = "—";

const STEPS: Step[] = [
  {
    title: "加入佇列",
    desc: "Producer 呼叫 queue.add()，BullMQ 在 Redis 建立一筆 Job，帶著初始資料，狀態是 wait。",
    place: "queue",
    code: [1],
    record: { state: "wait", data: "{ a: 1, b: 2 }", progress: "0", logs: EMPTY, returnvalue: EMPTY, processedOn: EMPTY, finishedOn: EMPTY },
    changed: ["state", "data", "progress"],
  },
  {
    title: "Worker 取出",
    desc: "閒置的 Worker 從 Queue 取出這筆 Job，狀態轉為 active，並記下開始處理的時間。",
    place: "worker",
    code: [4, 5],
    record: { state: "active", data: "{ a: 1, b: 2 }", progress: "0", logs: "[start]", returnvalue: EMPTY, processedOn: "10:00:01", finishedOn: EMPTY },
    changed: ["state", "logs", "processedOn"],
  },
  {
    title: "運算與回報進度",
    desc: "processor 內做邏輯運算，並用 updateProgress() 回報進度、log() 寫日誌；這些都即時寫回 Redis，監控端看得到。",
    place: "worker",
    code: [6, 7, 8],
    record: { state: "active", data: "{ a: 1, b: 2 }", progress: "50", logs: "[start, c = 3]", returnvalue: EMPTY, processedOn: "10:00:01", finishedOn: EMPTY },
    changed: ["progress", "logs"],
  },
  {
    title: "完成並保存結果",
    desc: "processor 回傳的值成為 returnvalue，狀態轉為 completed。運算前的 data 與運算後的結果同時留在 Redis，可供事後追查。",
    place: "done",
    code: [9, 10],
    record: { state: "completed", data: "{ a: 1, b: 2 }", progress: "100", logs: "[start, c = 3]", returnvalue: "{ a: 1, b: 2, c: 3 }", processedOn: "10:00:01", finishedOn: "10:00:02" },
    changed: ["state", "progress", "returnvalue", "finishedOn"],
  },
];

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "state", label: "state" },
  { key: "data", label: "data" },
  { key: "progress", label: "progress" },
  { key: "logs", label: "logs" },
  { key: "returnvalue", label: "returnvalue" },
  { key: "processedOn", label: "processedOn" },
  { key: "finishedOn", label: "finishedOn" },
];

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

/* ---------- 圖：Producer → Queue(Redis) → Worker ---------- */

function Flow({ step, reduce }: { step: number; reduce: boolean }) {
  const [ref, W] = useMeasuredWidth(MIN_W);
  const H = 176;
  /* SSR 時 motion 的位移不會輸出成 SVG transform，Job 方塊等 hydrate 後才畫 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const s = STEPS[step];
  const pad = 20;
  const colW = Math.min(180, (W - pad * 2 - 80) / 3);
  const gap = (W - pad * 2 - colW * 3) / 2;
  const xs = [pad, pad + colW + gap, pad + (colW + gap) * 2];
  const boxY = 44;
  const boxH = 92;
  const progress = Number(s.record.progress);

  const jobX = (() => {
    if (s.place === "producer") return xs[0] + colW / 2;
    if (s.place === "queue") return xs[1] + colW - 38;
    return xs[2] + colW / 2;
  })();
  const jobY = boxY + boxH / 2 - 2;
  const done = s.place === "done";

  const box = (x: number, label: string, sub: string, active: boolean, key: string) => (
    <g key={key}>
      <rect x={x} y={boxY} width={colW} height={boxH} rx={8} fill="#ffffff" stroke={active ? NAVY : BLUE_200} strokeWidth={active ? 1.75 : 1.25} />
      <text x={x + 12} y={boxY - 10} fontSize={10.5} fontWeight={800} fill={MUTED} fontFamily={FONT} letterSpacing="0.08em">
        {label}
      </text>
      <text x={x + 12} y={boxY + 20} fontSize={10.5} fill={MUTED} fontFamily={MONO}>
        {sub}
      </text>
    </g>
  );

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`單一 Job 的處理流程，目前第 ${step + 1} 步「${s.title}」：Job 狀態 ${s.record.state}，進度 ${s.record.progress}%。`}
    >
      <rect width={W} height={H} rx={10} fill={PANEL} />
      <defs>
        <marker id="ja-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill={NAVY} />
        </marker>
      </defs>
      {box(xs[0], "PRODUCER", "queue.add()", step === 0, "p")}
      {box(xs[1], "QUEUE · REDIS", "etl", step === 0, "q")}
      {box(xs[2], "WORKER", "processor(job)", step >= 1, "w")}

      {/* 佇列中的其他 Job（占位） */}
      {[0, 1].map((i) => (
        <rect key={i} x={xs[1] + 12 + i * 30} y={jobY - 14} width={24} height={28} rx={4} fill={BLUE_50} stroke={BLUE_100} />
      ))}

      <line x1={xs[0] + colW + 6} y1={boxY + boxH / 2} x2={xs[1] - 6} y2={boxY + boxH / 2} stroke={NAVY} strokeWidth={1.5} markerEnd="url(#ja-arrow)" />
      <text x={(xs[0] + colW + xs[1]) / 2} y={boxY + boxH / 2 - 8} textAnchor="middle" fontSize={9.5} fontWeight={800} fill={NAVY} fontFamily={FONT} letterSpacing="0.06em">
        ENQUEUE
      </text>
      <line x1={xs[1] + colW + 6} y1={boxY + boxH / 2} x2={xs[2] - 6} y2={boxY + boxH / 2} stroke={NAVY} strokeWidth={1.5} markerEnd="url(#ja-arrow)" />
      <text x={(xs[1] + colW + xs[2]) / 2} y={boxY + boxH / 2 - 8} textAnchor="middle" fontSize={9.5} fontWeight={800} fill={NAVY} fontFamily={FONT} letterSpacing="0.06em">
        DEQUEUE
      </text>

      {/* 回寫 Redis */}
      {step >= 2 && (
        <g>
          <path
            d={`M${xs[2] + colW / 2} ${boxY + boxH} V${boxY + boxH + 18} H${xs[1] + colW / 2} V${boxY + boxH + 4}`}
            fill="none"
            stroke={ORANGE_DEEP}
            strokeWidth={1.25}
            strokeDasharray="5 4"
          />
          <text x={(xs[1] + xs[2] + colW) / 2} y={boxY + boxH + 32} textAnchor="middle" fontSize={10} fontWeight={700} fill={ORANGE_700} fontFamily={FONT}>
            {step === 2 ? "寫回 progress 與 logs" : "寫回 returnvalue 與狀態"}
          </text>
        </g>
      )}

      {/* 這筆 Job */}
      {mounted && (
      <motion.g initial={{ x: jobX, y: jobY }} animate={{ x: jobX, y: jobY }} transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}>
        <rect x={-26} y={-16} width={52} height={32} rx={5} fill={done ? SUCCESS : ORANGE_50} stroke={done ? SUCCESS : ORANGE_DEEP} strokeWidth={1.5} />
        <text x={0} y={4} textAnchor="middle" fontSize={11} fontWeight={800} fill={done ? "#ffffff" : ORANGE_700} fontFamily={MONO}>
          Job
        </text>
        {/* 進度條 */}
        <rect x={-26} y={20} width={52} height={5} rx={2.5} fill={GRAY_2} />
        <motion.rect
          x={-26}
          y={20}
          height={5}
          rx={2.5}
          fill={done ? SUCCESS : ORANGE_DEEP}
          initial={false}
          animate={{ width: (52 * progress) / 100 }}
          transition={{ duration: reduce ? 0 : 0.4 }}
        />
        <text x={0} y={37} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={MUTED} fontFamily={MONO}>
          {progress}%
        </text>
      </motion.g>
      )}
    </svg>
  );
}

/* ---------- 程式碼面板 ---------- */

function CodePanel({ lines }: { lines: number[] }) {
  return (
    <div style={{ background: NAVY_DEEP, borderRadius: 8, overflowX: "auto" }}>
      {/* 筆記頁的 prose 會替 pre 加底色與內距，這裡全部明確覆寫 */}
      <pre style={{ margin: 0, padding: "10px 0", border: "none", borderRadius: 0, background: NAVY_DEEP, fontFamily: MONO, fontSize: 12, lineHeight: 1.75, color: "#d6e4f5" }}>
        {CODE.map((line, i) => {
          const hot = lines.includes(i);
          const comment = line.startsWith("//");
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                padding: "0 12px 0 0",
                background: hot ? "rgba(237,155,38,0.18)" : "transparent",
                borderLeft: `3px solid ${hot ? ORANGE_DEEP : "transparent"}`,
                transition: "background-color 200ms",
              }}
            >
              <span style={{ width: 22, textAlign: "right", color: "#6c798e", flexShrink: 0 }}>{i + 1}</span>
              <span style={{ color: comment ? "#8fa3c0" : hot ? "#ffffff" : "#d6e4f5", whiteSpace: "pre" }}>{line || " "}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

/* ---------- Redis 紀錄面板 ---------- */

function RecordPanel({ step }: { step: number }) {
  const s = STEPS[step];
  const stateColor = s.record.state === "completed" ? SUCCESS : s.record.state === "active" ? BLUE : MUTED;
  return (
    <div style={{ background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: BLUE_50, borderBottom: `1px solid ${BLUE_100}` }}>
        <Database size={15} style={{ color: NAVY }} />
        <span style={{ fontSize: 12.5, fontWeight: 800, color: NAVY }}>Redis 中的 Job 紀錄</span>
        <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: MONO, color: MUTED }}>bull:etl:1</span>
      </div>
      <div role="table" aria-label="Job 欄位" style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
        {FIELDS.map((f) => {
          const hot = s.changed.includes(f.key);
          const v = s.record[f.key];
          return (
            <div key={f.key} role="row" style={{ display: "contents" }}>
              <span
                role="cell"
                style={{ fontFamily: MONO, fontSize: 11.5, color: MUTED, padding: "6px 12px", borderTop: `1px solid ${GRAY_2}`, background: hot ? ORANGE_50 : "transparent" }}
              >
                {f.label}
              </span>
              <span
                role="cell"
                style={{
                  fontFamily: MONO,
                  fontSize: 11.5,
                  fontWeight: hot ? 700 : 500,
                  color: f.key === "state" ? stateColor : v === EMPTY ? GRAY : TEXT,
                  padding: "6px 12px",
                  borderTop: `1px solid ${GRAY_2}`,
                  background: hot ? ORANGE_50 : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {v}
                {hot && (
                  <span style={{ marginLeft: "auto", fontFamily: FONT, fontSize: 10, fontWeight: 700, color: ORANGE_700, background: ORANGE_100, borderRadius: 4, padding: "1px 6px" }}>
                    更新
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
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

export default function BullmqJobAnatomy() {
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
    const t = setTimeout(() => setStep((v) => Math.min(last, v + 1)), 1800);
    return () => clearTimeout(t);
  }, [playing, step, last]);

  const s = STEPS[step];

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <div role="group" aria-label="步驟" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {STEPS.map((x, i) => {
            const on = i === step;
            const past = i < step;
            return (
              <button
                key={x.title}
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setStep(i);
                }}
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
          <button
            type="button"
            aria-label="上一步"
            onClick={() => {
              setPlaying(false);
              setStep((v) => Math.max(0, v - 1));
            }}
            disabled={step === 0}
            style={{ ...btn, padding: "0 8px", background: "#ffffff", color: step === 0 ? GRAY : NAVY, borderColor: BLUE_200, cursor: step === 0 ? "default" : "pointer" }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="下一步"
            onClick={() => {
              setPlaying(false);
              setStep((v) => Math.min(last, v + 1));
            }}
            disabled={step === last}
            style={{ ...btn, padding: "0 8px", background: "#ffffff", color: step === last ? GRAY : NAVY, borderColor: BLUE_200, cursor: step === last ? "default" : "pointer" }}
          >
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
          <button
            type="button"
            aria-label="重置"
            onClick={() => {
              setPlaying(false);
              setStep(0);
            }}
            style={{ ...btn, padding: "0 8px", background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <Flow step={step} reduce={reduce} />

      <div style={{ fontSize: 13.5, lineHeight: 1.7, color: TEXT, background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "10px 14px" }}>
        <strong style={{ color: NAVY }}>
          {step + 1}. {s.title}
        </strong>
        <span style={{ margin: "0 8px", color: GRAY }}>|</span>
        {s.desc}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        <CodePanel lines={s.code} />
        <RecordPanel step={step} />
      </div>
    </div>
  );
}
