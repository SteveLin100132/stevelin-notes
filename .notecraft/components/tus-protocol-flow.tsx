import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";

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
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

const MB = 1024 * 1024;
const TOTAL = 100 * MB;
const URL_ID = "/files/24e533e0";

type Outcome = "ok" | "created" | "broken" | "conflict" | "done";

interface Step {
  method: "OPTIONS" | "POST" | "HEAD" | "PATCH";
  path: string;
  req: string[];
  status: string; // 回應狀態列；斷線時為空
  res: string[];
  outcome: Outcome;
  server: number; // 本步驟結束時，伺服器上實際寫入的位元組
  client: number | null; // 本步驟結束時，用戶端認知的 offset（null = 尚未知道）
  sent?: [number, number]; // PATCH 本次送出的位元組範圍
  note: string;
}

interface Scenario {
  key: string;
  label: string;
  steps: Step[];
}

const n = (b: number) => b.toString();
const mb = (b: number) => `${Math.round(b / MB)} MB`;

const OPTIONS_STEP: Step = {
  method: "OPTIONS",
  path: "/files",
  req: [],
  status: "204 No Content",
  res: ["Tus-Resumable: 1.0.0", "Tus-Version: 1.0.0", "Tus-Extension: creation,termination,expiration", "Tus-Max-Size: 1073741824"],
  outcome: "ok",
  server: 0,
  client: null,
  note: "探測伺服器能力（選用）：支援哪些協議版本與擴充、單檔上限多大。這是唯一不需要帶 Tus-Resumable 的請求。",
};

const POST_STEP: Step = {
  method: "POST",
  path: "/files",
  req: ["Tus-Resumable: 1.0.0", `Upload-Length: ${n(TOTAL)}`, "Upload-Metadata: filename ZGVtby5tcDQ=,filetype dmlkZW8vbXA0"],
  status: "201 Created",
  res: ["Tus-Resumable: 1.0.0", `Location: https://tus.example.com${URL_ID}`],
  outcome: "created",
  server: 0,
  client: 0,
  note: "建立一筆上傳（creation 擴充）：先告訴伺服器總長度 100 MB 與 metadata（值用 Base64 編碼），伺服器回傳這筆上傳專屬的 URL。此時還沒有傳任何檔案內容。",
};

function patch(from: number, len: number, note: string, over?: Partial<Step>): Step {
  return {
    method: "PATCH",
    path: URL_ID,
    req: ["Tus-Resumable: 1.0.0", "Content-Type: application/offset+octet-stream", `Upload-Offset: ${n(from)}`, `Content-Length: ${n(len)}`],
    status: "204 No Content",
    res: ["Tus-Resumable: 1.0.0", `Upload-Offset: ${n(from + len)}`],
    outcome: from + len >= TOTAL ? "done" : "ok",
    server: from + len,
    client: from + len,
    sent: [from, from + len],
    note,
    ...over,
  };
}

const headStep = (offset: number, note: string): Step => ({
  method: "HEAD",
  path: URL_ID,
  req: ["Tus-Resumable: 1.0.0"],
  status: "200 OK",
  res: ["Tus-Resumable: 1.0.0", `Upload-Offset: ${n(offset)}`, `Upload-Length: ${n(TOTAL)}`, "Cache-Control: no-store"],
  outcome: "ok",
  server: offset,
  client: offset,
  note,
});

const SCENARIOS: Scenario[] = [
  {
    key: "normal",
    label: "順利上傳",
    steps: [
      OPTIONS_STEP,
      POST_STEP,
      patch(0, 40 * MB, "送出第一段 40 MB。請求必須帶 Upload-Offset 宣告「我從第幾個位元組開始寫」，伺服器寫入後回傳新的 offset。"),
      patch(40 * MB, 40 * MB, "用上一個回應的 Upload-Offset 當作下一段的起點，再送 40 MB。"),
      patch(80 * MB, 20 * MB, "最後 20 MB 送出後，Upload-Offset 等於 Upload-Length，上傳完成。"),
    ],
  },
  {
    key: "resume",
    label: "中途斷線",
    steps: [
      OPTIONS_STEP,
      POST_STEP,
      patch(0, 40 * MB, "送出第一段 40 MB，伺服器回傳 Upload-Offset = 40 MB。"),
      patch(40 * MB, 40 * MB, "第二段傳到一半網路中斷：伺服器實際寫入了 20 MB，但用戶端沒收到回應，不知道寫到哪裡。", {
        status: "",
        res: [],
        outcome: "broken",
        server: 60 * MB,
        client: 40 * MB,
      }),
      headStep(60 * MB, "網路恢復後先發 HEAD 詢問進度。伺服器回報 Upload-Offset = 60 MB；Cache-Control: no-store 確保拿到的不是快取。"),
      patch(60 * MB, 40 * MB, "從 60 MB 接著傳剩下的 40 MB。斷線前已寫入的 60 MB 完全不用重傳。"),
    ],
  },
  {
    key: "conflict",
    label: "offset 不一致",
    steps: [
      OPTIONS_STEP,
      POST_STEP,
      patch(0, 40 * MB, "送出第一段 40 MB，伺服器回傳 Upload-Offset = 40 MB。"),
      patch(40 * MB, 40 * MB, "第二段傳到一半網路中斷：伺服器實際寫入了 20 MB，用戶端只記得上次成功的 40 MB。", {
        status: "",
        res: [],
        outcome: "broken",
        server: 60 * MB,
        client: 40 * MB,
      }),
      patch(40 * MB, 60 * MB, "用戶端沒有先問，直接用自己記得的 40 MB 重送。伺服器發現與實際的 60 MB 不符，拒絕寫入並回 409，避免資料錯位。", {
        status: "409 Conflict",
        res: ["Tus-Resumable: 1.0.0"],
        outcome: "conflict",
        server: 60 * MB,
        client: 40 * MB,
      }),
      headStep(60 * MB, "收到 409 後改走正規流程：先 HEAD 取得伺服器的真實 offset（60 MB）。"),
      patch(60 * MB, 40 * MB, "從 60 MB 接著傳，上傳完成。offset 以伺服器為準，是 TUS 能安全續傳的關鍵。"),
    ],
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

/* ---------- 圖：上方 offset 條 + 下方時序圖 ---------- */

const MIN_W = 600;
const BAR_Y = 44;
const BAR_H = 20;
const SEQ_TOP = 124;
const ROW = 40;

function statusColor(o: Outcome): string {
  if (o === "broken" || o === "conflict") return ORANGE_DEEP;
  if (o === "done") return GREEN;
  return NAVY;
}

function Diagram({ width, steps, cur }: { width: number; steps: Step[]; cur: number }) {
  const W = Math.max(width, MIN_W);
  const bx0 = 132;
  const bx1 = W - 24;
  const bx = (b: number) => bx0 + ((bx1 - bx0) * b) / TOTAL;
  const cl = 110;
  const sv = W - 150;
  const H = SEQ_TOP + ROW * steps.length + 20;
  const s = steps[cur];
  const prevServer = cur > 0 ? steps[cur - 1].server : 0;
  const mismatch = s.client !== null && s.client !== s.server;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`TUS 協議時序圖，第 ${cur + 1} 步：${s.method} ${s.path}，${s.status || "連線中斷，沒有回應"}。伺服器已寫入 ${mb(s.server)}，用戶端認知的 offset ${s.client === null ? "尚未建立" : mb(s.client)}。`}
      style={{ display: "block" }}
    >
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill="#ffffff" stroke="#e1e6ee" />

      {/* offset 條 */}
      <text x={16} y={BAR_Y + 14} fontSize={11} fontWeight={800} fill={TEXT} fontFamily={FONT}>
        伺服器上的檔案
      </text>
      <rect x={bx0} y={BAR_Y} width={bx1 - bx0} height={BAR_H} rx={3} fill="#ffffff" stroke={GRAY} strokeWidth={1} />
      <motion.rect x={bx0} y={BAR_Y} height={BAR_H} rx={3} fill={NAVY} initial={false} animate={{ width: bx(prevServer) - bx0 }} transition={{ duration: 0.3, ease: "easeOut" }} />
      {s.server > prevServer && (
        <motion.rect
          key={`${cur}-new`}
          x={bx(prevServer)}
          y={BAR_Y}
          height={BAR_H}
          rx={3}
          fill={s.outcome === "broken" ? ORANGE_DEEP : BLUE_200}
          initial={{ width: 0 }}
          animate={{ width: bx(s.server) - bx(prevServer) }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      )}
      {[0, 25, 50, 75, 100].map((v) => (
        <text key={v} x={bx((v / 100) * TOTAL)} y={BAR_Y - 8} textAnchor={v === 0 ? "start" : v === 100 ? "end" : "middle"} fontSize={10} fill={MUTED} fontFamily={FONT}>
          {v} MB
        </text>
      ))}
      {/* 伺服器 offset 標記 */}
      <line x1={bx(s.server)} y1={BAR_Y - 2} x2={bx(s.server)} y2={BAR_Y + BAR_H + 8} stroke={NAVY_DEEP} strokeWidth={2} />
      <text x={bx(s.server)} y={BAR_Y + BAR_H + 20} textAnchor={s.server > TOTAL * 0.85 ? "end" : s.server < TOTAL * 0.15 ? "start" : "middle"} fontSize={10.5} fontWeight={800} fill={NAVY_DEEP} fontFamily={FONT}>
        伺服器 offset {mb(s.server)}
      </text>
      {/* 用戶端認知的 offset */}
      {s.client !== null && mismatch && (
        <g>
          <line x1={bx(s.client)} y1={BAR_Y - 2} x2={bx(s.client)} y2={BAR_Y + BAR_H + 8} stroke={ORANGE_DEEP} strokeWidth={2} strokeDasharray="3 2" />
          <text x={bx(s.client) - 4} y={BAR_Y + BAR_H + 20} textAnchor="end" fontSize={10.5} fontWeight={800} fill={ORANGE_700} fontFamily={FONT}>
            用戶端以為 {mb(s.client)}
          </text>
        </g>
      )}

      {/* 時序圖：兩條生命線 */}
      <line x1={16} y1={SEQ_TOP - 30} x2={W - 16} y2={SEQ_TOP - 30} stroke={GRAY_2} strokeWidth={1} />
      <text x={cl} y={SEQ_TOP - 10} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={NAVY_DEEP} fontFamily={FONT}>
        Client（Uppy）
      </text>
      <text x={sv} y={SEQ_TOP - 10} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={NAVY_DEEP} fontFamily={FONT}>
        TUS Server
      </text>
      <line x1={cl} y1={SEQ_TOP} x2={cl} y2={H - 12} stroke={GRAY} strokeWidth={1.5} />
      <line x1={sv} y1={SEQ_TOP} x2={sv} y2={H - 12} stroke={GRAY} strokeWidth={1.5} />

      {steps.map((st, i) => {
        if (i > cur) return null;
        const y = SEQ_TOP + 12 + ROW * i;
        const active = i === cur;
        const color = active ? statusColor(st.outcome) : GRAY;
        const reqColor = active ? NAVY : MUTED;
        const broken = st.outcome === "broken";
        const mid = (cl + sv) / 2;
        const reqEnd = broken ? mid + 30 : sv - 6;
        return (
          <motion.g key={`${i}`} initial={active ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
            {/* 請求 */}
            <line x1={cl} y1={y} x2={reqEnd} y2={y} stroke={reqColor} strokeWidth={active ? 1.75 : 1.25} />
            {!broken && <path d={`M${sv - 1} ${y} l-8 -4 v8 Z`} fill={reqColor} />}
            <text x={cl + 10} y={y - 5} fontSize={10.5} fontWeight={800} fill={reqColor} fontFamily={MONO}>
              {st.method} {st.path}
              {st.sent ? `  [${mb(st.sent[0])} → ${mb(st.sent[1])}]` : ""}
            </text>
            {broken && (
              <g>
                <path d={`M${reqEnd + 4} ${y - 6} l12 12 M${reqEnd + 16} ${y - 6} l-12 12`} stroke={ORANGE_DEEP} strokeWidth={2} />
                <text x={reqEnd + 22} y={y + 18} fontSize={10.5} fontWeight={800} fill={active ? ORANGE_700 : MUTED} fontFamily={FONT}>
                  網路中斷，沒有回應
                </text>
              </g>
            )}
            {/* 回應 */}
            {!broken && (
              <g>
                <line x1={sv} y1={y + 16} x2={cl + 6} y2={y + 16} stroke={color} strokeWidth={active ? 1.75 : 1.25} strokeDasharray="5 3" />
                <path d={`M${cl + 1} ${y + 16} l8 -4 v8 Z`} fill={color} />
                <text x={sv - 10} y={y + 12} textAnchor="end" fontSize={10.5} fontWeight={800} fill={active ? color : MUTED} fontFamily={MONO}>
                  {st.status}
                </text>
              </g>
            )}
            <circle cx={cl - 22} cy={y + 6} r={9} fill={active ? NAVY : "#ffffff"} stroke={active ? NAVY : GRAY} strokeWidth={1.25} />
            <text x={cl - 22} y={y + 9.5} textAnchor="middle" fontSize={10} fontWeight={800} fill={active ? "#ffffff" : MUTED} fontFamily={FONT}>
              {i + 1}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}

/* ---------- 標頭面板 ---------- */

function HeaderBlock({ title, line, headers, tone }: { title: string; line: string; headers: string[]; tone: "navy" | "orange" | "green" | "muted" }) {
  const c = tone === "orange" ? ORANGE_700 : tone === "green" ? GREEN : tone === "muted" ? MUTED : NAVY;
  return (
    <div style={{ flex: "1 1 260px", minWidth: 0, background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: MUTED, marginBottom: 6 }}>{title}</div>
      <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: c, marginBottom: 4, overflowWrap: "anywhere" }}>{line}</div>
      {headers.length === 0 ? (
        <div style={{ fontFamily: MONO, fontSize: 12, color: MUTED }}>（無額外標頭）</div>
      ) : (
        headers.map((h) => {
          const [k, ...rest] = h.split(": ");
          return (
            <div key={h} style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.7, color: TEXT, overflowWrap: "anywhere" }}>
              <span style={{ color: NAVY_DEEP, fontWeight: 700 }}>{k}:</span> {rest.join(": ")}
            </div>
          );
        })
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

export default function TusProtocolFlow() {
  const reduce = useReducedMotion();
  const [sKey, setSKey] = useState("resume");
  const [cur, setCur] = useState(0);
  const [auto, setAuto] = useState(false);
  const [wrapRef, width] = useWidth<HTMLDivElement>();

  const scenario = SCENARIOS.find((x) => x.key === sKey) ?? SCENARIOS[0];
  const steps = scenario.steps;
  const s = steps[cur];
  const last = cur === steps.length - 1;

  useEffect(() => {
    if (!auto) return;
    if (last) {
      setAuto(false);
      return;
    }
    const id = window.setTimeout(() => setCur((c) => Math.min(c + 1, steps.length - 1)), reduce ? 900 : 1800);
    return () => window.clearTimeout(id);
  }, [auto, cur, last, reduce, steps.length]);

  const pick = (k: string) => {
    setSKey(k);
    setCur(0);
    setAuto(false);
  };

  const tone: "navy" | "orange" | "green" | "muted" = s.outcome === "broken" ? "muted" : s.outcome === "conflict" ? "orange" : s.outcome === "done" ? "green" : "navy";
  const alert = s.outcome === "broken" || s.outcome === "conflict";

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div role="group" aria-label="選擇情境" style={{ display: "inline-flex", padding: 3, borderRadius: 10, background: BLUE_50, border: `1px solid ${BLUE_100}` }}>
          {SCENARIOS.map((sc) => {
            const on = sc.key === sKey;
            return (
              <button
                key={sc.key}
                type="button"
                aria-pressed={on}
                onClick={() => pick(sc.key)}
                style={{ ...btn, height: 30, border: "none", background: on ? NAVY : "transparent", color: on ? "#ffffff" : NAVY, fontSize: 13 }}
              >
                {sc.label}
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="步驟控制" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0} aria-label="上一步" style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200, opacity: cur === 0 ? 0.45 : 1, cursor: cur === 0 ? "default" : "pointer" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, minWidth: 48, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
            {cur + 1} / {steps.length}
          </span>
          <button type="button" onClick={() => setCur((c) => Math.min(steps.length - 1, c + 1))} disabled={last} aria-label="下一步" style={{ ...btn, background: NAVY, color: "#ffffff", borderColor: NAVY, opacity: last ? 0.45 : 1, cursor: last ? "default" : "pointer" }}>
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
          <button type="button" onClick={() => pick(sKey)} aria-label="重置" style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}>
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div ref={wrapRef} style={{ width: "100%" }}>
        <Diagram width={width} steps={steps} cur={cur} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${sKey}-${cur}`}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div
            style={{
              fontSize: 13.5,
              lineHeight: 1.7,
              color: TEXT,
              background: alert ? ORANGE_50 : BLUE_50,
              border: `1px solid ${alert ? ORANGE_100 : BLUE_100}`,
              borderRadius: 8,
              padding: "10px 14px",
            }}
          >
            <strong style={{ color: alert ? ORANGE_700 : NAVY_DEEP }}>
              {cur + 1}. {s.method}
              {s.outcome === "broken" ? " · 連線中斷" : s.outcome === "conflict" ? " · 409 Conflict" : s.outcome === "done" ? " · 上傳完成" : ""}
            </strong>
            <span style={{ margin: "0 8px", color: GRAY }}>|</span>
            {s.note}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <HeaderBlock title="REQUEST" line={`${s.method} ${s.path} HTTP/1.1`} headers={s.req} tone="navy" />
            <HeaderBlock title="RESPONSE" line={s.status ? `HTTP/1.1 ${s.status}` : "（沒有收到回應）"} headers={s.res} tone={tone} />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
