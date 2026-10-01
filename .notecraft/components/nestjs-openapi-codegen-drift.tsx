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
const ORANGE_100 = "#fbe7c6";
const ORANGE_700 = "#a04f15";
const GREEN = "#2e9e6b";
const GREEN_50 = "#e9f6f0";
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

const STAGES = ["後端修改", "PR review", "前端 build", "部署", "使用者操作"];

/**
 * pass：照常往下走、沒人察覺
 * signal：看得到變化（diff），但不會擋
 * error：被擋下，後面的階段不會發生
 * bug：錯誤的行為到了使用者手上
 * ok：沒有問題
 */
type Kind = "pass" | "signal" | "error" | "bug" | "ok";

interface Mark {
  kind: Kind;
  text: string;
  code?: string;
}

interface Change {
  id: string;
  label: string;
  backend: string;
  manual: Mark[];
  codegen: Mark[];
  verdict: string;
}

/* tsc 錯誤訊息皆為實際以 Orval 8 重新產生後，對同一段前端程式碼執行 tsc 的輸出 */
const CHANGES: Change[] = [
  {
    id: "rename",
    label: "欄位改名",
    backend: "PingDto 的 pong 改名為 alive",
    manual: [
      { kind: "pass", text: "後端改名、測試通過", code: "-  pong!: boolean;\n+  alive!: boolean;" },
      { kind: "pass", text: "diff 只有後端檔案，前端手寫的型別不在這次變更裡" },
      { kind: "pass", text: "前端 interface 仍寫著 pong，tsc 通過", code: "interface Ping { pong: boolean }" },
      { kind: "pass", text: "照常部署" },
      { kind: "bug", text: "data.pong 永遠是 undefined，畫面一直顯示「無回應」", code: '"data": { "alive": true }' },
    ],
    codegen: [
      { kind: "pass", text: "後端改名後重跑 api:client:generate", code: "-  pong!: boolean;\n+  alive!: boolean;" },
      { kind: "signal", text: "openapi.json 與 model/pingDto.ts 一起出現在 diff，reviewer 一眼看出這是 breaking change", code: "-  pong: boolean;\n+  alive: boolean;" },
      { kind: "error", text: "前端還在讀 pong 的地方編譯失敗", code: "error TS2339: Property 'pong' does not exist\non type 'PingDto'." },
      { kind: "pass", text: "" },
      { kind: "pass", text: "" },
    ],
    verdict: "改名是最典型的漂移：手寫型別要等使用者回報才發現，codegen 在 build 就擋下。",
  },
  {
    id: "type",
    label: "欄位改型別",
    backend: "pong 從 boolean 改成 string",
    manual: [
      { kind: "pass", text: "後端改型別", code: "-  pong!: boolean;\n+  pong!: string;" },
      { kind: "pass", text: "前端型別不在 diff 裡" },
      { kind: "pass", text: "前端仍以為是 boolean，tsc 通過" },
      { kind: "pass", text: "照常部署" },
      { kind: "bug", text: "字串 \"false\" 是 truthy，服務異常時畫面仍顯示「可連線」", code: '"data": { "pong": "false" }' },
    ],
    codegen: [
      { kind: "pass", text: "後端改型別後重新產生", code: "-  pong!: boolean;\n+  pong!: string;" },
      { kind: "signal", text: "model/pingDto.ts 的 diff 直接顯示型別變了", code: "-  pong: boolean;\n+  pong: string;" },
      {
        kind: "error",
        text: "回傳型別標成 boolean 的地方編譯失敗；但只拿來做條件判斷（pong ? … : …）的寫法不會報錯",
        code: "error TS2322: Type 'string | false' is not\nassignable to type 'boolean'.",
      },
      { kind: "pass", text: "" },
      { kind: "pass", text: "" },
    ],
    verdict: "codegen 只能擋下「型別對不上」的使用方式；truthy 判斷在 TypeScript 裡本來就合法，仍需要 review 補位。",
  },
  {
    id: "method",
    label: "method 改名",
    backend: "Controller 的 getPing() 改名為 ping()，路由不變",
    manual: [
      { kind: "pass", text: "只改 method 名稱，GET /ping 不變", code: "-  getPing(): PingDto {\n+  ping(): PingDto {" },
      { kind: "pass", text: "與前端無關的重構" },
      { kind: "ok", text: "前端呼叫的是 fetch(\"/ping\")，不受影響" },
      { kind: "ok", text: "照常部署" },
      { kind: "ok", text: "行為完全一樣" },
    ],
    codegen: [
      { kind: "pass", text: "operationId 取 method 名稱，跟著從 getPing 變成 ping", code: '-  "operationId": "getPing",\n+  "operationId": "ping",' },
      { kind: "signal", text: "產出的函式與 hook 全部改名", code: "-export function useGetPing(\n+export function usePing(" },
      {
        kind: "error",
        text: "前端 import 失效。這是 operationId 取 method 名稱的代價：後端純重構也變成前端的 breaking change",
        code: "error TS2724: has no exported member named\n'useGetPing'. Did you mean 'usePing'?",
      },
      { kind: "pass", text: "" },
      { kind: "pass", text: "" },
    ],
    verdict: "這一題反過來：手寫 fetch 不受影響，codegen 反而被擋。對外穩定的名稱請用 @ApiOperation({ operationId }) 固定下來。",
  },
  {
    id: "add",
    label: "新增欄位",
    backend: "PingDto 新增 latencyMs: number",
    manual: [
      { kind: "pass", text: "後端新增欄位", code: "+  latencyMs!: number;" },
      { kind: "pass", text: "前端不在 diff 裡，沒人知道多了欄位" },
      { kind: "ok", text: "tsc 通過，但前端型別裡沒有 latencyMs" },
      { kind: "ok", text: "照常部署" },
      { kind: "ok", text: "不會出錯；要等有人通知，前端才會手動補型別" },
    ],
    codegen: [
      { kind: "pass", text: "後端新增欄位後重新產生", code: "+  latencyMs!: number;" },
      { kind: "signal", text: "model 多一個欄位，mock 也自動產生假資料", code: "+  latencyMs: number;\n+  latencyMs: faker.number.float(…)" },
      { kind: "ok", text: "tsc 通過，新欄位直接出現在編輯器的自動完成" },
      { kind: "ok", text: "照常部署" },
      { kind: "ok", text: "非 breaking change，兩邊都不會出錯" },
    ],
    verdict: "向下相容的變更兩邊都不會壞，差別在 codegen 讓前端「立刻知道」有新東西可用。",
  },
];

interface Lane {
  key: "manual" | "codegen";
  title: string;
}
const LANES: Lane[] = [
  { key: "manual", title: "手寫型別" },
  { key: "codegen", title: "Codegen" },
];

/** 第一個 error 之後的階段不會發生 */
function stopAt(marks: Mark[]): number {
  const i = marks.findIndex((m) => m.kind === "error");
  return i === -1 ? marks.length - 1 : i;
}

function tone(kind: Kind) {
  switch (kind) {
    case "error":
      return { fg: ORANGE_700, bg: ORANGE_50, line: ORANGE, label: "擋下" };
    case "bug":
      return { fg: ORANGE_700, bg: ORANGE_50, line: ORANGE, label: "使用者遇到錯誤" };
    case "signal":
      return { fg: NAVY, bg: BLUE_50, line: NAVY, label: "看得到變化" };
    case "ok":
      return { fg: GREEN, bg: GREEN_50, line: GREEN, label: "沒有問題" };
    default:
      return { fg: MUTED, bg: "#ffffff", line: GRAY, label: "沒人察覺" };
  }
}

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

/* ---------- 泳道圖：兩條路徑沿五個階段推進 ---------- */

const MIN_W = 600;
const H = 196;
const LANE_Y = [86, 150];

function Lanes({ width, change, cursor }: { width: number; change: Change; cursor: number }) {
  const reduce = useReducedMotion();
  const W = Math.max(width, MIN_W);
  const x0 = 120;
  const x1 = W - 56;
  const sx = (i: number) => x0 + ((x1 - x0) * i) / (STAGES.length - 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`變更「${change.backend}」推進到「${STAGES[cursor]}」：${LANES.map((l) => {
        const marks = change[l.key];
        const stop = stopAt(marks);
        return `${l.title}${cursor > stop ? `在${STAGES[stop]}被擋下` : `目前${tone(marks[Math.min(cursor, stop)].kind).label}`}`;
      }).join("；")}。`}
      style={{ display: "block" }}
    >
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill="#ffffff" stroke={GRAY_2} />

      {/* 階段欄 */}
      {STAGES.map((s, i) => (
        <g key={s}>
          <line x1={sx(i)} y1={46} x2={sx(i)} y2={H - 18} stroke={GRAY_2} strokeWidth={1} />
          <text x={sx(i)} y={32} textAnchor="middle" fontSize={11.5} fontWeight={i === cursor ? 800 : 600} fill={i === cursor ? NAVY_DEEP : MUTED} fontFamily={FONT}>
            {s}
          </text>
        </g>
      ))}
      {/* 時間游標 */}
      <motion.rect
        y={42}
        width={64}
        height={H - 56}
        rx={8}
        fill={BLUE_50}
        opacity={0.6}
        initial={false}
        animate={{ x: sx(cursor) - 32 }}
        transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}
      />

      {LANES.map((lane, li) => {
        const marks = change[lane.key];
        const stop = stopAt(marks);
        const y = LANE_Y[li];
        const reach = Math.min(cursor, stop);
        return (
          <g key={lane.key}>
            <text x={16} y={y + 4} fontSize={12.5} fontWeight={800} fill={NAVY_DEEP} fontFamily={FONT}>
              {lane.title}
            </text>
            {/* 底線 */}
            <line x1={sx(0)} y1={y} x2={sx(stop)} y2={y} stroke={GRAY_2} strokeWidth={2} />
            {stop < STAGES.length - 1 && <line x1={sx(stop)} y1={y} x2={sx(STAGES.length - 1)} y2={y} stroke={GRAY_2} strokeWidth={1} strokeDasharray="3 4" />}
            {/* 已走過的路 */}
            <motion.line
              x1={sx(0)}
              y1={y}
              y2={y}
              stroke={NAVY}
              strokeWidth={2}
              initial={false}
              animate={{ x2: sx(reach) }}
              transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}
            />
            {marks.map((m, i) => {
              const x = sx(i);
              if (i > stop) {
                return (
                  <text key={i} x={x} y={y + 4} textAnchor="middle" fontSize={10} fill={GRAY} fontFamily={FONT}>
                    不會發生
                  </text>
                );
              }
              const reached = i <= cursor;
              const t = tone(m.kind);
              const strong = reached && m.kind !== "pass";
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={strong ? 9 : 6} fill={reached ? (strong ? t.bg : "#ffffff") : "#ffffff"} stroke={reached ? t.line : GRAY} strokeWidth={strong ? 2 : 1.5} />
                  {strong && (m.kind === "error" || m.kind === "bug") && (
                    <path d={`M${x - 3.5} ${y - 3.5} L${x + 3.5} ${y + 3.5} M${x + 3.5} ${y - 3.5} L${x - 3.5} ${y + 3.5}`} stroke={t.line} strokeWidth={1.75} />
                  )}
                  {strong && m.kind === "ok" && <path d={`M${x - 4} ${y} L${x - 1} ${y + 3} L${x + 4} ${y - 3}`} fill="none" stroke={t.line} strokeWidth={1.75} />}
                  {strong && m.kind === "signal" && <circle cx={x} cy={y} r={3} fill={t.line} />}
                  {strong && (
                    <text x={x} y={y - 15} textAnchor="middle" fontSize={10} fontWeight={800} fill={t.fg} fontFamily={FONT}>
                      {t.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- 下方兩張卡：目前階段兩條路各自發生什麼 ---------- */

function Detail({ lane, change, cursor }: { lane: Lane; change: Change; cursor: number }) {
  const reduce = useReducedMotion();
  const marks = change[lane.key];
  const stop = stopAt(marks);
  const halted = cursor > stop;
  const m = marks[Math.min(cursor, stop)];
  const t = tone(m.kind);
  const accent = halted ? ORANGE_700 : t.fg;
  return (
    <div style={{ flex: "1 1 280px", minWidth: 0, border: `1px solid ${halted || m.kind === "error" || m.kind === "bug" ? ORANGE_100 : m.kind === "signal" ? BLUE_100 : GRAY_2}`, borderRadius: 8, background: "#ffffff", padding: "10px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: NAVY_DEEP }}>{lane.title}</span>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: accent }}>{halted ? `已在「${STAGES[stop]}」擋下` : t.label}</span>
      </div>
      <motion.div key={`${change.id}-${lane.key}-${cursor}`} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: TEXT }}>{halted ? "變更停在 build，不會被部署，也不會到使用者手上。擋下它的錯誤：" : m.text}</div>
        {m.code && (
          <pre
            style={{
              margin: "8px 0 0",
              padding: "8px 10px",
              borderRadius: 6,
              background: m.kind === "error" || m.kind === "bug" ? ORANGE_50 : BLUE_50,
              fontFamily: MONO,
              fontSize: 11.5,
              lineHeight: 1.6,
              color: m.kind === "error" || m.kind === "bug" ? ORANGE_700 : NAVY_DEEP,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {m.code}
          </pre>
        )}
      </motion.div>
    </div>
  );
}

const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 14px",
  borderRadius: 6,
  border: "1px solid",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT,
};

export default function NestjsOpenapiCodegenDrift() {
  const reduce = useReducedMotion();
  const [changeIdx, setChangeIdx] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const change = CHANGES[changeIdx];
  const last = STAGES.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (cursor >= last) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setCursor((c) => Math.min(last, c + 1)), reduce ? 400 : 1100);
    return () => window.clearTimeout(id);
  }, [playing, cursor, last, reduce]);

  const pick = (i: number) => {
    setChangeIdx(i);
    setCursor(0);
    setPlaying(false);
  };

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div role="group" aria-label="後端變更類型" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CHANGES.map((c, i) => {
          const on = i === changeIdx;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(i)}
              style={{ ...btn, height: 30, padding: "0 12px", fontSize: 12.5, background: on ? NAVY : "#ffffff", color: on ? "#ffffff" : NAVY, borderColor: on ? NAVY : BLUE_200 }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 13.5, color: TEXT }}>
        <span style={{ fontWeight: 800, color: NAVY_DEEP }}>後端變更：</span>
        <span style={{ fontFamily: MONO, fontSize: 12.5 }}>{change.backend}</span>
      </div>

      <div ref={wrapRef} style={{ width: "100%" }}>
        <Lanes width={width} change={change} cursor={cursor} />
      </div>

      <div role="group" aria-label="階段控制" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={cursor === 0} style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200, opacity: cursor === 0 ? 0.45 : 1 }}>
          <ChevronLeft size={16} /> 上一階段
        </button>
        <button type="button" onClick={() => setCursor((c) => Math.min(last, c + 1))} disabled={cursor === last} style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200, opacity: cursor === last ? 0.45 : 1 }}>
          下一階段 <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (cursor >= last) setCursor(0);
            setPlaying((p) => !p);
          }}
          style={{ ...btn, background: NAVY, color: "#ffffff", borderColor: NAVY }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? "暫停" : cursor >= last ? "重新播放" : "播放"}
        </button>
        <button
          type="button"
          onClick={() => {
            setCursor(0);
            setPlaying(false);
          }}
          aria-label="重置"
          style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}
        >
          <RotateCcw size={16} /> 重置
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {LANES.map((l) => (
          <Detail key={l.key} lane={l} change={change} cursor={cursor} />
        ))}
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.7, color: TEXT, opacity: cursor === last ? 1 : 0.55, transition: "opacity 200ms ease-out" }}>
        <span style={{ fontWeight: 800, color: NAVY_DEEP }}>結論：</span>
        {change.verdict}
      </div>
    </div>
  );
}
