import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Braces, Check, ChevronLeft, ChevronRight, MousePointerClick, PenLine, Sparkles } from "lucide-react";

type StepKey = "write" | "mark" | "generate" | "read";

interface Step {
  key: StepKey;
  title: string;
  banner: string;
  body: string;
  Icon: typeof PenLine;
}

const STEPS: Step[] = [
  { key: "write", title: "寫下文字", banner: "在 docs/ 新增 MDX，先把概念寫清楚", body: "在 docs/ 用 MDX 寫筆記，先把概念用文字講清楚。", Icon: PenLine },
  { key: "mark", title: "下標記", banner: "在需要圖表的位置加上 @ai-visualize", body: "只在有助理解的位置寫 @ai-visualize，描述互動方式與要畫的圖形。", Icon: Braces },
  { key: "generate", title: "AI 生成", banner: "Claude Code 產出元件並寫回筆記", body: "請 Claude 處理標記：產出 React 元件、寫回筆記，標記狀態改為 generated。", Icon: Sparkles },
  { key: "read", title: "圖文閱讀", banner: "瀏覽器自動刷新，元件可直接操作", body: "npm run serve 自動刷新，讀者可以直接操作圖表。", Icon: MousePointerClick },
];

/* trendlink-design 色票（viewer 的 Tailwind 不掃描 .notecraft/components，故直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700
const NAVY_DEEP = "#112f5d"; // --blue-900
const BLUE = "#2c6ebb"; // --blue-500
const BLUE_50 = "#eef4fb";
const BLUE_100 = "#d6e4f5";
const BLUE_200 = "#adc8e8";
const ORANGE = "#ed9b26"; // --orange-400
const ORANGE_DEEP = "#e37b24"; // --orange-500
const ORANGE_50 = "#fdf4e6";
const ORANGE_700 = "#a04f15";
const INK = "#2b3550";
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const SUCCESS = "#2e9e6b";
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "ui-monospace,Menlo,Consolas,monospace";

function Fade({ children, delay = 0, reduce }: { children: ReactNode; delay?: number; reduce: boolean }) {
  return (
    <motion.g initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay, ease: "easeOut" }}>
      {children}
    </motion.g>
  );
}

/* ---------- 視窗外框（編輯器、面板、瀏覽器共用） ---------- */

function Window({ x, y, w, h, title, accent = GRAY }: { x: number; y: number; w: number; h: number; title: string; accent?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="#ffffff" stroke={accent} strokeWidth={1.5} />
      <path d={`M${x} ${y + 8} Q${x} ${y} ${x + 8} ${y} H${x + w - 8} Q${x + w} ${y} ${x + w} ${y + 8} V${y + 22} H${x} Z`} fill={PANEL} />
      <line x1={x} y1={y + 22} x2={x + w} y2={y + 22} stroke={GRAY_2} strokeWidth={1} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x + 12 + i * 9} cy={y + 11} r={2.5} fill={GRAY} />
      ))}
      <text x={x + 42} y={y + 15} fontSize={9} fill={MUTED} fontFamily={MONO}>
        {title}
      </text>
    </g>
  );
}

/* ---------- 左側：MDX 編輯器 ---------- */

/* 版面依容器寬度計算：SVG viewBox 寬 = 實際像素寬，文字維持 1:1，圖面橫向延展 */
const MIN_W = 640;
const H = 276;

interface Layout {
  W: number;
  ED: { x: number; y: number; w: number; h: number };
  BOX: { x: number; y: number; w: number; h: number };
  RX: number;
  RW: number;
}

function layout(W: number): Layout {
  const pad = 32;
  const gap = 40;
  const avail = W - pad * 2 - gap;
  const edW = Math.round(avail * 0.55);
  const ED = { x: pad, y: 60, w: edW, h: 196 };
  return { W, ED, BOX: { x: pad + 38, y: 164, w: edW - 50, h: 80 }, RX: pad + edW + gap, RW: avail - edW };
}

/** 量測 SVG 的實際寬度（不小於設計最小寬度） */
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

function Editor({ L, pose, reduce }: { L: Layout; pose: StepKey; reduce: boolean }) {
  const { ED, BOX } = L;
  const showMarker = pose !== "write";
  const showChart = pose === "generate" || pose === "read";
  const base = BOX.y + BOX.h - 14;
  const bars = [16, 30, 24, 40, 34];
  return (
    <g>
      <Window x={ED.x} y={ED.y} w={ED.w} h={ED.h} title="docs/getting-started.mdx" />
      {/* 行號欄 */}
      <rect x={ED.x} y={ED.y + 22} width={26} height={ED.h - 22} fill={PANEL} />
      {Array.from({ length: 8 }, (_, i) => (
        <text key={i} x={ED.x + 18} y={ED.y + 42 + i * 20} textAnchor="end" fontSize={8} fill={GRAY} fontFamily={MONO}>
          {i + 1}
        </text>
      ))}
      <rect x={BOX.x} y={ED.y + 34} width={120} height={7} rx={2} fill={NAVY} />
      {[200, 172, 186].map((w, i) => (
        <rect key={i} x={BOX.x} y={ED.y + 56 + i * 14} width={w} height={5} rx={2} fill={GRAY} />
      ))}
      {/* 寫作游標 */}
      {pose === "write" && <rect className="nw-caret" x={BOX.x + 188} y={ED.y + 82} width={1.5} height={11} fill={NAVY} />}
      {showMarker && (
        <Fade reduce={reduce || pose !== "mark"}>
          <rect
            x={BOX.x}
            y={BOX.y}
            width={BOX.w}
            height={BOX.h}
            rx={6}
            fill={showChart ? "#ffffff" : ORANGE_50}
            stroke={showChart ? BLUE_200 : ORANGE}
            strokeWidth={1.5}
            strokeDasharray={showChart ? undefined : "5 4"}
          />
          {!showChart && (
            <g>
              <text x={BOX.x + 14} y={BOX.y + 26} fontSize={11} fontWeight={700} fill={ORANGE_DEEP} fontFamily={MONO}>
                {"{/* @ai-visualize"}
              </text>
              <text x={BOX.x + 14} y={BOX.y + 44} fontSize={9.5} fill={ORANGE_700} fontFamily={MONO}>
                id: note-workflow
              </text>
              <text x={BOX.x + 14} y={BOX.y + 60} fontSize={9.5} fill={ORANGE_700} fontFamily={MONO}>
                status: pending
              </text>
            </g>
          )}
        </Fade>
      )}
      {showChart && (
        <Fade reduce={reduce || pose !== "generate"} delay={0.35}>
          <text x={BOX.x + 10} y={BOX.y + 16} fontSize={8.5} fill={MUTED} fontFamily={MONO}>
            {"<NoteWorkflow client:visible />"}
          </text>
          <line x1={BOX.x + 14} y1={base} x2={BOX.x + 150} y2={base} stroke={GRAY} strokeWidth={1} />
          {bars.map((h, i) => (
            <rect key={i} x={BOX.x + 20 + i * 26} y={base - h} width={16} height={h} rx={1.5} fill={i === 3 ? ORANGE : BLUE} opacity={i === 3 ? 1 : 0.85} />
          ))}
          <line x1={BOX.x + BOX.w - 80} y1={BOX.y + 40} x2={BOX.x + BOX.w - 14} y2={BOX.y + 40} stroke={GRAY_2} strokeWidth={3} strokeLinecap="round" />
          <line x1={BOX.x + BOX.w - 80} y1={BOX.y + 40} x2={BOX.x + BOX.w - 38} y2={BOX.y + 40} stroke={BLUE} strokeWidth={3} strokeLinecap="round" />
          <circle cx={BOX.x + BOX.w - 38} cy={BOX.y + 40} r={4.5} fill="#ffffff" stroke={BLUE} strokeWidth={1.5} />
          <rect x={BOX.x + BOX.w - 80} y={BOX.y + 52} width={48} height={5} rx={2} fill={GRAY_2} />
        </Fade>
      )}
    </g>
  );
}

/* ---------- 右側：依步驟切換的產物 ---------- */

/** 檔案樹：新筆記加在 docs/ 底下 */
function FileTree({ L, reduce }: { L: Layout; reduce: boolean }) {
  const { ED, BOX, RX, RW } = L;
  const rows: { depth: number; name: string; dir: boolean; hi?: boolean }[] = [
    { depth: 0, name: "docs/", dir: true },
    { depth: 1, name: "assets/", dir: true },
    { depth: 1, name: "knowledge/", dir: true },
    { depth: 2, name: "project/", dir: true },
    { depth: 1, name: "getting-started.mdx", dir: false, hi: true },
    { depth: 0, name: ".notecraft/", dir: true },
  ];
  return (
    <Fade reduce={reduce}>
      <Window x={RX} y={ED.y} w={RW} h={ED.h} title="EXPLORER" />
      {rows.map((r, i) => {
        const y = ED.y + 44 + i * 24;
        const x = RX + 16 + r.depth * 16;
        return (
          <g key={r.name}>
            {r.hi && <rect x={RX + 6} y={y - 13} width={RW - 12} height={20} rx={4} fill={BLUE_50} stroke={BLUE_200} strokeWidth={1} />}
            {r.dir ? (
              <path d={`M${x} ${y - 7} h5 l2 2 h7 v8 h-14 Z`} fill={BLUE_200} />
            ) : (
              <path d={`M${x + 1} ${y - 9} h8 l4 4 v10 h-12 Z`} fill="#ffffff" stroke={NAVY} strokeWidth={1.2} />
            )}
            <text x={x + 20} y={y + 1} fontSize={10.5} fill={r.hi ? NAVY : TEXT} fontWeight={r.hi ? 700 : 400} fontFamily={MONO}>
              {r.name}
            </text>
            {r.hi && (
              <text x={RX + RW - 14} y={y + 1} textAnchor="end" fontSize={9} fontWeight={700} fill={SUCCESS} fontFamily={FONT}>
                新增
              </text>
            )}
          </g>
        );
      })}
    </Fade>
  );
}

/** 標記欄位：程式碼片段，以連接線指向編輯器中的標記框 */
function MarkerSpec({ L, reduce }: { L: Layout; reduce: boolean }) {
  const { ED, BOX, RX, RW } = L;
  const lines: [string, string][] = [
    ["{/* @ai-visualize", ORANGE_DEEP],
    ["id: note-workflow", TEXT],
    ["type: motion", TEXT],
    ["prompt: |", TEXT],
    ["  核心洞察：…", MUTED],
    ["  互動：…", MUTED],
    ["  圖形：…", MUTED],
    ["status: pending", ORANGE_700],
    ["*/}", ORANGE_DEEP],
  ];
  return (
    <Fade reduce={reduce}>
      <path d={`M${RX} ${ED.y + 120} C${RX - 24} ${ED.y + 120} ${BOX.x + BOX.w + 20} ${BOX.y + 20} ${BOX.x + BOX.w} ${BOX.y + 20}`} fill="none" stroke={ORANGE} strokeWidth={1.5} strokeDasharray="4 3" />
      <circle cx={BOX.x + BOX.w} cy={BOX.y + 20} r={3} fill={ORANGE} />
      <Window x={RX} y={ED.y} w={RW} h={ED.h} title="標記欄位" accent={ORANGE} />
      {lines.map(([t, c], i) => (
        <text key={i} x={RX + 16} y={ED.y + 44 + i * 17} fontSize={10.5} fill={c} fontWeight={c === ORANGE_DEEP ? 700 : 400} fontFamily={t.startsWith("  ") && !t.includes(":|") ? FONT : MONO}>
          {t}
        </text>
      ))}
    </Fade>
  );
}

/** 生成流程：標記 → Claude Code → 元件檔 → 寫回筆記 */
function Pipeline({ L, reduce }: { L: Layout; reduce: boolean }) {
  const { ED, BOX, RX, RW } = L;
  const nodes = [
    { y: ED.y + 8, title: "Claude Code", sub: "content-visualize skill", tone: NAVY },
    { y: ED.y + 76, title: "note-workflow.tsx", sub: ".notecraft/components/", tone: BLUE },
    { y: ED.y + 144, title: "寫回筆記", sub: "status: generated", tone: SUCCESS },
  ];
  return (
    <g>
      {nodes.map((n, i) => (
        <Fade key={n.title} reduce={reduce} delay={i * 0.12}>
          <rect x={RX + 20} y={n.y} width={RW - 40} height={48} rx={6} fill="#ffffff" stroke={GRAY} strokeWidth={1.5} />
          <rect x={RX + 20} y={n.y} width={4} height={48} rx={2} fill={n.tone} />
          <text x={RX + 36} y={n.y + 21} fontSize={12} fontWeight={700} fill={INK} fontFamily={i === 1 ? MONO : FONT}>
            {n.title}
          </text>
          <text x={RX + 36} y={n.y + 37} fontSize={9.5} fill={MUTED} fontFamily={MONO}>
            {n.sub}
          </text>
          {i < nodes.length - 1 && (
            <g>
              <line className="nw-flow" x1={RX + RW / 2} y1={n.y + 48} x2={RX + RW / 2} y2={n.y + 72} stroke={BLUE} strokeWidth={1.5} strokeDasharray="4 3" />
              <path d={`M${RX + RW / 2 - 4} ${n.y + 67} L${RX + RW / 2} ${n.y + 74} L${RX + RW / 2 + 4} ${n.y + 67}`} fill="none" stroke={BLUE} strokeWidth={1.5} />
            </g>
          )}
        </Fade>
      ))}
      <Fade reduce={reduce} delay={0.3}>
        <path className="nw-flow" d={`M${RX + 20} ${ED.y + 168} C${RX - 20} ${ED.y + 168} ${BOX.x + BOX.w + 24} ${BOX.y + 56} ${BOX.x + BOX.w} ${BOX.y + 56}`} fill="none" stroke={SUCCESS} strokeWidth={1.5} strokeDasharray="4 3" />
        <path d={`M${BOX.x + BOX.w + 7} ${BOX.y + 52} L${BOX.x + BOX.w} ${BOX.y + 56} L${BOX.x + BOX.w + 7} ${BOX.y + 60}`} fill="none" stroke={SUCCESS} strokeWidth={1.5} />
      </Fade>
    </g>
  );
}

/** 瀏覽器：自動刷新後顯示成品 */
function Browser({ L, reduce }: { L: Layout; reduce: boolean }) {
  const { ED, BOX, RX, RW } = L;
  const x = RX;
  const y = ED.y;
  const base = y + 136;
  return (
    <Fade reduce={reduce}>
      <Window x={x} y={y} w={RW} h={ED.h} title="localhost:4321/notes/getting-started" accent={BLUE_200} />
      <rect x={x + 16} y={y + 36} width={96} height={7} rx={2} fill={NAVY} />
      <rect x={x + 16} y={y + 50} width={160} height={4} rx={2} fill={GRAY_2} />
      <rect x={x + 16} y={y + 64} width={RW - 32} height={112} rx={6} fill={PANEL} stroke={GRAY_2} strokeWidth={1} />
      <line x1={x + 28} y1={base} x2={x + RW - 28} y2={base} stroke={GRAY} strokeWidth={1} />
      {[18, 34, 26, 46, 38].map((h, i) => (
        <rect key={i} x={x + 40 + i * ((RW - 80 - 20) / 4)} y={base - h} width={20} height={h} rx={1.5} fill={i === 3 ? ORANGE : BLUE} opacity={i === 3 ? 1 : 0.85} />
      ))}
      <line x1={x + 32} y1={base + 22} x2={x + RW - 32} y2={base + 22} stroke={GRAY_2} strokeWidth={3} strokeLinecap="round" />
      <line x1={x + 32} y1={base + 22} x2={x + 150} y2={base + 22} stroke={BLUE} strokeWidth={3} strokeLinecap="round" />
      <circle cx={x + 150} cy={base + 22} r={5} fill="#ffffff" stroke={BLUE} strokeWidth={1.5} />
      <path transform={`translate(${x + 154} ${base + 25})`} d="M0 0 L0 13 L3.2 10 L5.6 15.5 L7.8 14.5 L5.4 9 L9.5 9 Z" fill="#ffffff" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <circle cx={x + 20} cy={y + ED.h - 10} r={3} fill={SUCCESS} />
      <text x={x + 28} y={y + ED.h - 7} fontSize={9} fill={MUTED} fontFamily={FONT}>
        npm run serve · 已自動刷新
      </text>
    </Fade>
  );
}

function Right({ L, pose, reduce }: { L: Layout; pose: StepKey; reduce: boolean }) {
  return (
    <g key={pose}>
      {pose === "write" && <FileTree L={L} reduce={reduce} />}
      {pose === "mark" && <MarkerSpec L={L} reduce={reduce} />}
      {pose === "generate" && <Pipeline L={L} reduce={reduce} />}
      {pose === "read" && <Browser L={L} reduce={reduce} />}
    </g>
  );
}

/* ---------- 主元件 ---------- */

const cardBase: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 8,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1.5px solid",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
  transition: "background-color 160ms, border-color 160ms",
};

const navButton = (disabled: boolean): CSSProperties => ({
  flex: "none",
  display: "inline-flex",
  width: 36,
  height: 36,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: `1.5px solid ${disabled ? GRAY_2 : BLUE_200}`,
  color: disabled ? GRAY : NAVY,
  backgroundColor: "#ffffff",
  cursor: disabled ? "default" : "pointer",
});

export default function NoteWorkflow() {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion() ?? false;
  const step = STEPS[index];
  const [svgRef, width] = useMeasuredWidth(MIN_W);
  const L = layout(width);

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <style>{`@keyframes nw-dash{to{stroke-dashoffset:-14}}@keyframes nw-blink{50%{opacity:0}}.nw-flow{animation:nw-dash .9s linear infinite}.nw-caret{animation:nw-blink 1s step-end infinite}@media (prefers-reduced-motion:reduce){.nw-flow,.nw-caret{animation:none!important}}`}</style>
      <svg ref={svgRef} viewBox={`0 0 ${L.W} ${H}`} width="100%" role="img" aria-label={`筆記工作流程示意，目前步驟：${step.title}。${step.banner}`}>
        <rect width={L.W} height={H} rx={12} fill={BLUE_50} />
        <text x={32} y={36} fontSize={11} fontWeight={700} fill={ORANGE_DEEP} fontFamily={FONT} letterSpacing="0.06em">
          STEP {index + 1} / {STEPS.length}
        </text>
        <motion.text key={step.key} x={104} y={36} fontSize={13} fontWeight={700} fill={NAVY_DEEP} fontFamily={FONT} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          {step.banner}
        </motion.text>
        <Editor L={L} pose={step.key} reduce={reduce} />
        <Right L={L} pose={step.key} reduce={reduce} />
      </svg>

      <div role="group" aria-label="流程步驟" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {STEPS.map((s, i) => {
          const active = i === index;
          const done = i < index;
          const Icon = s.Icon;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setIndex(i)}
              aria-current={active ? "step" : undefined}
              style={{ ...cardBase, borderColor: active ? NAVY : done ? BLUE_200 : GRAY_2, backgroundColor: active ? BLUE_50 : "#ffffff" }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: active ? NAVY : MUTED }}>
                STEP {i + 1}
                {done && <Check size={12} strokeWidth={3} color={SUCCESS} aria-label="已完成" />}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon size={16} strokeWidth={2} color={active ? ORANGE_DEEP : MUTED} />
                <span style={{ fontSize: 15, fontWeight: 700, color: active ? NAVY : TEXT }}>{s.title}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} aria-label="上一步" style={navButton(index === 0)}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ flex: 1, minHeight: 52, padding: "10px 14px", borderRadius: 10, backgroundColor: PANEL, border: `1px solid ${GRAY_2}` }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={step.key}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: TEXT }}
            >
              <strong style={{ color: NAVY, marginRight: 6 }}>{step.title}</strong>
              {step.body}
            </motion.p>
          </AnimatePresence>
        </div>
        <button type="button" onClick={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))} disabled={index === STEPS.length - 1} aria-label="下一步" style={navButton(index === STEPS.length - 1)}>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
