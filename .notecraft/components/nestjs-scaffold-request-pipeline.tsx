import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

type LayerKey = "client" | "middleware" | "guard" | "interceptor" | "controller";
type At = LayerKey | "filter";
type Phase = "req" | "res" | "err" | "filter" | "done";
type Level = "LOG" | "WARN" | "ERROR";

interface LogLine {
  level: Level;
  text: string;
  detail?: string[];
}

interface Step {
  at: At;
  phase: Phase;
  focus: string[];
  title: string;
  note: string;
  logs?: LogLine[];
  metrics?: { requests?: number; errors?: number };
  headers?: string[];
  response?: { status: string; body: string[] };
}

interface Scenario {
  key: string;
  label: string;
  request: string;
  client: string;
  handler: [string, string];
  traceId: string;
  errorFrom?: LayerKey;
  skipped: At[];
  steps: Step[];
}

const LAYERS: { key: LayerKey; tag: string }[] = [
  { key: "client", tag: "CLIENT" },
  { key: "middleware", tag: "MIDDLEWARE" },
  { key: "guard", tag: "GUARD" },
  { key: "interceptor", tag: "INTERCEPTOR" },
  { key: "controller", tag: "CONTROLLER" },
];
const colIndex = (k: LayerKey) => LAYERS.findIndex((l) => l.key === k);

const HELMET_HEADERS = ["X-Content-Type-Options: nosniff", "X-Frame-Options: SAMEORIGIN", "Strict-Transport-Security: max-age=31536000; includeSubDomains"];
const JSON_TYPE = "Content-Type: application/json; charset=utf-8";

const SCENARIOS: Scenario[] = [
  {
    key: "ok",
    label: "正常請求",
    request: "GET /health",
    client: "負載平衡器",
    handler: ["HealthController", ".getHealth()"],
    traceId: "3f2a9c1e",
    skipped: ["filter"],
    steps: [
      { at: "client", phase: "req", focus: ["client"], title: "送出請求", note: "負載平衡器定期呼叫 GET /health 確認服務狀態，請求沒有帶 X-Trace-Id。" },
      {
        at: "middleware",
        phase: "req",
        focus: ["helmet", "trace"],
        title: "Middleware：安全標頭與 traceId",
        note: "Helmet 先在 response 上設好安全標頭；TraceMiddleware 發現沒有 X-Trace-Id，產生新的 UUID 並建立 AsyncLocalStorage context，之後每一層讀到的都是同一個 traceId。",
        headers: HELMET_HEADERS,
      },
      { at: "guard", phase: "req", focus: ["throttler"], title: "Guard：豁免限流", note: "HealthController 標了 @SkipThrottle()，ThrottlerGuard 直接放行：不計數，也不設 X-RateLimit-* 標頭。" },
      { at: "interceptor", phase: "req", focus: ["logging", "response"], title: "Interceptor 前段", note: "LoggingInterceptor（外層）記下開始時間；ResponseInterceptor（內層）確認沒有 @SkipResponseWrapper，準備包裝回傳值。" },
      { at: "controller", phase: "req", focus: ["handler"], title: "Controller：執行業務邏輯", note: "HealthService 對資料庫執行 SELECT 1 成功，Controller 直接 return { status: \"ok\" }，不需要自己組回應格式。" },
      {
        at: "interceptor",
        phase: "res",
        focus: ["response", "logging"],
        title: "Interceptor 後段：包裝並記錄",
        note: "由內而外：ResponseInterceptor 先用 map() 包成 ApiResponseDto，LoggingInterceptor 再印出 LOG 並記錄請求數與耗時。",
        logs: [{ level: "LOG", text: "GET /health 200 +2ms | traceId=3f2a9c1e-…" }],
        metrics: { requests: 1 },
      },
      {
        at: "client",
        phase: "done",
        focus: ["client"],
        title: "回應 200",
        note: "全程沒有例外，Exception Filter 沒有出場。回應的 traceId 和日誌中的完全相同。",
        headers: [JSON_TYPE],
        response: { status: "200 OK", body: ['"success": true,', '"code": 200,', '"message": "OK",', '"data": { "status": "ok" },', '"traceId": "3f2a9c1e-…"'] },
      },
    ],
  },
  {
    key: "throttle",
    label: "超過限流",
    request: "GET /todos",
    client: "前端 App",
    handler: ["TodosController", ".findAll()"],
    traceId: "8b71e0d4",
    errorFrom: "guard",
    skipped: ["interceptor", "controller"],
    steps: [
      { at: "client", phase: "req", focus: ["client"], title: "送出請求", note: "同一個 IP 在 60 秒內送出第 101 個請求（GET /todos 為示意的業務路由）。" },
      { at: "middleware", phase: "req", focus: ["helmet", "trace"], title: "Middleware：安全標頭與 traceId", note: "Middleware 不管限流，照常設安全標頭、產生 traceId。", headers: HELMET_HEADERS },
      {
        at: "guard",
        phase: "req",
        focus: ["throttler"],
        title: "Guard：超過上限",
        note: "ThrottlerGuard 發現這個 IP 已超過 100 次，進入封鎖：設定 Retry-After，接著丟出 ThrottlerException（429）。",
        headers: ["Retry-After: 60"],
      },
      {
        at: "filter",
        phase: "filter",
        focus: ["filter"],
        title: "Exception Filter 接手",
        note: "Guard 在 Interceptor 之前執行，所以 LoggingInterceptor 根本沒機會跑：這個請求不會出現在 http_requests_total，只由 Filter 印日誌並記一次錯誤。",
        logs: [{ level: "ERROR", text: "GET /todos 429 +0ms | traceId=8b71e0d4-…", detail: ["ThrottlerException: ThrottlerException: Too Many Requests"] }],
        metrics: { errors: 1 },
      },
      {
        at: "client",
        phase: "done",
        focus: ["client"],
        title: "回應 429",
        note: "錯誤回應的欄位和成功時一樣，只是 success 為 false、data 為 null。用戶端可依 Retry-After 決定多久後再試。",
        headers: [JSON_TYPE],
        response: { status: "429 Too Many Requests", body: ['"success": false,', '"code": 429,', '"message": "ThrottlerException: Too Many Requests",', '"data": null,', '"traceId": "8b71e0d4-…"'] },
      },
    ],
  },
  {
    key: "error",
    label: "未預期錯誤",
    request: "POST /todos",
    client: "前端 App",
    handler: ["TodosController", ".create()"],
    traceId: "c04d5a77",
    errorFrom: "interceptor",
    skipped: [],
    steps: [
      { at: "client", phase: "req", focus: ["client"], title: "送出請求", note: "前端送出 POST /todos，並帶上自己產生的 X-Trace-Id: c04d5a77-…（合法的 UUID v4）。" },
      { at: "middleware", phase: "req", focus: ["helmet", "trace"], title: "Middleware：沿用上游的 traceId", note: "X-Trace-Id 格式正確，TraceMiddleware 直接沿用，前端與後端的日誌可以用同一個 ID 串起來。", headers: HELMET_HEADERS },
      {
        at: "guard",
        phase: "req",
        focus: ["throttler"],
        title: "Guard：計數後放行",
        note: "這是 60 秒內第 3 個請求，ThrottlerGuard 放行，並在回應標頭寫上剩餘次數。",
        headers: ["X-RateLimit-Limit: 100", "X-RateLimit-Remaining: 97", "X-RateLimit-Reset: 58"],
      },
      { at: "interceptor", phase: "req", focus: ["logging", "response"], title: "Interceptor 前段", note: "LoggingInterceptor 記下開始時間，ResponseInterceptor 準備包裝。" },
      { at: "controller", phase: "req", focus: ["handler"], title: "Controller：丟出例外", note: "資料庫驅動丟出 Error: SQLITE_CONSTRAINT: UNIQUE constraint failed: todo.title。這不是 HttpException，訊息裡帶有資料表名稱。" },
      {
        at: "interceptor",
        phase: "err",
        focus: ["logging"],
        title: "Interceptor：記錄後重新丟出",
        note: "ResponseInterceptor 的 map() 不會執行。LoggingInterceptor 的 catchError 印出 ERROR 與 stack，記一次請求與一次錯誤，再把例外往外丟。",
        logs: [{ level: "ERROR", text: "POST /todos 500 +4ms | traceId=c04d5a77-…", detail: ["Error: SQLITE_CONSTRAINT: UNIQUE constraint failed: todo.title", "    at TodosService.create (todos.service.ts:31)"] }],
        metrics: { requests: 1, errors: 1 },
      },
      {
        at: "filter",
        phase: "filter",
        focus: ["filter"],
        title: "Exception Filter：遮蔽細節",
        note: "Filter 再印一次 ERROR、再記一次錯誤，所以一個請求讓 http_errors_total 加了 2（盤點時實測確認）。回應訊息固定為 Internal Server Error，資料表名稱不會外洩。",
        logs: [{ level: "ERROR", text: "POST /todos 500 +0ms | traceId=c04d5a77-…", detail: ["Error: SQLITE_CONSTRAINT: UNIQUE constraint failed: todo.title"] }],
        metrics: { errors: 1 },
      },
      {
        at: "client",
        phase: "done",
        focus: ["client"],
        title: "回應 500",
        note: "用戶端只看到通用訊息與 traceId；開發者拿 traceId 去日誌就能找到真正的錯誤原因。",
        headers: [JSON_TYPE],
        response: { status: "500 Internal Server Error", body: ['"success": false,', '"code": 500,', '"message": "Internal Server Error",', '"data": null,', '"traceId": "c04d5a77-…"'] },
      },
    ],
  },
  {
    key: "metrics",
    label: "跳過包裝",
    request: "GET /metrics",
    client: "Prometheus",
    handler: ["MetricsController", ".getMetrics()"],
    traceId: "5e0c2b9a",
    skipped: ["filter"],
    steps: [
      { at: "client", phase: "req", focus: ["client"], title: "送出請求", note: "Prometheus 每 15 秒來拉一次 GET /metrics。" },
      { at: "middleware", phase: "req", focus: ["helmet", "trace"], title: "Middleware：安全標頭與 traceId", note: "和其他請求一樣，設安全標頭、產生 traceId。", headers: HELMET_HEADERS },
      { at: "guard", phase: "req", focus: ["throttler"], title: "Guard：豁免限流", note: "MetricsController 標了 @SkipThrottle()，固定頻率的抓取不會被自己的限流擋掉。" },
      { at: "interceptor", phase: "req", focus: ["logging", "response"], title: "Interceptor：讀到 @SkipResponseWrapper", note: "ResponseInterceptor 在 class 上讀到 @SkipResponseWrapper()，決定直接放行，不包裝回傳值。LoggingInterceptor 照常記錄開始時間。" },
      { at: "controller", phase: "req", focus: ["handler"], title: "Controller：輸出指標文字", note: "從獨立的 prom-client Registry 產生 Prometheus exposition format 文字。" },
      {
        at: "interceptor",
        phase: "res",
        focus: ["logging"],
        title: "Interceptor 後段：只記錄、不包裝",
        note: "回傳的純文字原樣通過 ResponseInterceptor；LoggingInterceptor 照常印 LOG 並計數，所以下一次抓取會看到 /metrics 自己的請求數。",
        logs: [{ level: "LOG", text: "GET /metrics 200 +3ms | traceId=5e0c2b9a-…" }],
        metrics: { requests: 1 },
      },
      {
        at: "client",
        phase: "done",
        focus: ["client"],
        title: "回應 200（純文字）",
        note: "Content-Type 是 Prometheus 規定的 text/plain，body 不是 JSON，也沒有 traceId 欄位。",
        headers: ["Content-Type: text/plain; version=0.0.4; charset=utf-8"],
        response: { status: "200 OK", body: ["# TYPE http_requests_total counter", 'http_requests_total{method="GET",route="/health",status_code="200"} 42', "…"] },
      },
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

/* ---------- 管線示意圖 ---------- */

const MIN_W = 760;
const BOX_Y = 34;
const BOX_H = 104;
const REQ_Y = 162;
const RES_Y = 186;
const FILTER_Y = 214;
const FILTER_H = 52;
const H = 284;

type BoxState = "current" | "done" | "skipped" | "idle";

function Pipeline({ width, sc, cur }: { width: number; sc: Scenario; cur: number }) {
  const W = Math.max(width, MIN_W);
  const pad = 16;
  const gap = 14;
  const colW = (W - pad * 2 - gap * (LAYERS.length - 1)) / LAYERS.length;
  const colX = (i: number) => pad + i * (colW + gap);
  const colC = (i: number) => colX(i) + colW / 2;

  const steps = sc.steps.slice(0, cur + 1);
  const s = sc.steps[cur];
  const isDone = s.phase === "done";
  const errTone = s.phase === "err" || s.phase === "filter" || (isDone && !!sc.errorFrom);

  const visited = new Set<At>(steps.map((x) => x.at));
  const reqMax = Math.max(...steps.filter((x) => x.phase === "req" && x.at !== "filter").map((x) => colIndex(x.at as LayerKey)));
  const resSteps = steps.filter((x) => x.phase === "res");
  const errSteps = steps.filter((x) => x.phase === "err");
  const reachedFilter = steps.some((x) => x.phase === "filter");

  const boxState = (k: At): BoxState => {
    if (s.at === k) return "current";
    if (isDone && sc.skipped.includes(k)) return "skipped";
    if (visited.has(k)) return "done";
    return "idle";
  };

  const chips: Record<LayerKey, { id: string; label: string; sub?: string }[]> = {
    client: [{ id: "client", label: sc.client, sub: sc.request }],
    middleware: [
      { id: "helmet", label: "Helmet" },
      { id: "trace", label: "Trace" },
    ],
    guard: [{ id: "throttler", label: "Throttler" }],
    interceptor: [
      { id: "logging", label: "Logging", sub: "外層" },
      { id: "response", label: "Response", sub: "內層" },
    ],
    controller: [{ id: "handler", label: sc.handler[0], sub: sc.handler[1] }],
  };

  const boxStyle = (st: BoxState, orange: boolean) => {
    if (st === "current") return { fill: orange ? ORANGE_50 : BLUE_50, stroke: orange ? ORANGE : NAVY, sw: 2, dash: undefined as string | undefined, text: NAVY_DEEP };
    if (st === "done") return { fill: "#ffffff", stroke: BLUE_200, sw: 1.25, dash: undefined, text: NAVY_DEEP };
    if (st === "skipped") return { fill: "#ffffff", stroke: GRAY, sw: 1, dash: "4 3", text: MUTED };
    return { fill: "#ffffff", stroke: GRAY_2, sw: 1, dash: undefined, text: MUTED };
  };

  // 目前位置的標籤
  let tokenX = colC(0);
  let tokenY = REQ_Y;
  if (s.at === "filter") {
    tokenX = colC(colIndex(sc.errorFrom ?? "guard"));
    tokenY = FILTER_Y + 36;
  } else {
    tokenX = colC(colIndex(s.at));
    tokenY = s.phase === "req" ? REQ_Y : RES_Y;
  }
  const tokenColor = errTone ? ORANGE : NAVY;
  const filterL = colX(1);
  const filterR = colX(LAYERS.length - 1) + colW;
  const fState = boxStyle(boxState("filter"), true);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`NestJS 請求管線示意：情境「${sc.label}」${sc.request}，第 ${cur + 1} 步「${s.title}」。${s.note}`}
      style={{ display: "block" }}
    >
      <defs>
        <marker id="rp-ar-navy" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill={NAVY} />
        </marker>
        <marker id="rp-ar-orange" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill={ORANGE} />
        </marker>
      </defs>
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill="#ffffff" stroke={GRAY_2} />

      {/* 各層方塊 */}
      {LAYERS.map((l, i) => {
        const st = boxState(l.key);
        const bs = boxStyle(st, errTone);
        const x = colX(i);
        const list = chips[l.key];
        const chipH = list.length > 1 ? 30 : 46;
        return (
          <g key={l.key}>
            <text x={x + 2} y={BOX_Y - 10} fontSize={10} fontWeight={800} letterSpacing="0.06em" fill={st === "idle" || st === "skipped" ? MUTED : NAVY} fontFamily={FONT}>
              {l.tag}
            </text>
            {st === "skipped" && (
              <text x={x + colW - 2} y={BOX_Y - 10} textAnchor="end" fontSize={10} fontWeight={800} fill={ORANGE_700} fontFamily={FONT}>
                未執行
              </text>
            )}
            <rect x={x} y={BOX_Y} width={colW} height={BOX_H} rx={8} fill={bs.fill} stroke={bs.stroke} strokeWidth={bs.sw} strokeDasharray={bs.dash} style={{ transition: "fill 200ms, stroke 200ms" }} />
            {list.map((c, j) => {
              const cy = BOX_Y + 10 + j * (chipH + 8);
              const on = st === "current" && s.focus.includes(c.id);
              return (
                <g key={c.id}>
                  <rect x={x + 8} y={cy} width={colW - 16} height={chipH} rx={6} fill={on ? (errTone ? ORANGE : NAVY) : "#ffffff"} stroke={on ? "none" : st === "idle" || st === "skipped" ? GRAY_2 : BLUE_100} strokeWidth={1} />
                  <text x={x + 16} y={cy + 19} fontSize={l.key === "controller" ? 10.5 : 11.5} fontWeight={800} fill={on ? "#ffffff" : bs.text} fontFamily={l.key === "controller" ? MONO : FONT}>
                    {c.label}
                  </text>
                  {c.sub && (
                    <text
                      x={list.length > 1 ? x + colW - 16 : x + 16}
                      y={list.length > 1 ? cy + 19 : cy + 36}
                      textAnchor={list.length > 1 ? "end" : "start"}
                      fontSize={10}
                      fontWeight={list.length > 1 ? 700 : 400}
                      fill={on ? "#ffffff" : MUTED}
                      fontFamily={l.key === "client" || l.key === "controller" ? MONO : FONT}
                    >
                      {c.sub}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* 軌道標籤 */}
      <text x={pad} y={REQ_Y - 8} fontSize={9.5} fontWeight={700} fill={MUTED} fontFamily={FONT}>
        請求 →
      </text>
      <text x={pad} y={RES_Y + 16} fontSize={9.5} fontWeight={700} fill={MUTED} fontFamily={FONT}>
        ← 回應
      </text>
      <line x1={colC(0)} y1={REQ_Y} x2={colC(LAYERS.length - 1)} y2={REQ_Y} stroke={GRAY_2} strokeWidth={1} strokeDasharray="2 4" />
      <line x1={colC(0)} y1={RES_Y} x2={colC(LAYERS.length - 1)} y2={RES_Y} stroke={GRAY_2} strokeWidth={1} strokeDasharray="2 4" />

      {/* 請求路徑 */}
      {reqMax > 0 && (
        <motion.line
          x1={colC(0)}
          y1={REQ_Y}
          y2={REQ_Y}
          stroke={NAVY}
          strokeWidth={2}
          markerEnd="url(#rp-ar-navy)"
          initial={false}
          animate={{ x2: colC(reqMax) - 8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      )}

      {/* 正常回應路徑 */}
      {(resSteps.length > 0 || (isDone && !sc.errorFrom)) && (
        <motion.line
          x1={colC(reqMax)}
          y1={RES_Y}
          y2={RES_Y}
          stroke={NAVY}
          strokeWidth={2}
          strokeDasharray="6 3"
          markerEnd="url(#rp-ar-navy)"
          initial={false}
          animate={{ x2: isDone && !sc.errorFrom ? colC(0) + 8 : colC(colIndex(resSteps[resSteps.length - 1]?.at as LayerKey)) + 8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      )}

      {/* 例外往外傳 */}
      {errSteps.length > 0 && <line x1={colC(reqMax)} y1={RES_Y} x2={colC(colIndex(errSteps[0].at as LayerKey)) + 8} y2={RES_Y} stroke={ORANGE} strokeWidth={2} markerEnd="url(#rp-ar-orange)" />}
      {reachedFilter && sc.errorFrom && (
        <line
          x1={colC(colIndex(sc.errorFrom))}
          y1={sc.errorFrom === "guard" ? REQ_Y : RES_Y}
          x2={colC(colIndex(sc.errorFrom))}
          y2={FILTER_Y - 2}
          stroke={ORANGE}
          strokeWidth={2}
          markerEnd="url(#rp-ar-orange)"
        />
      )}
      {isDone && sc.errorFrom && (
        <path
          d={`M${filterL} ${FILTER_Y + FILTER_H / 2} H${colC(0)} V${RES_Y + 8}`}
          fill="none"
          stroke={ORANGE}
          strokeWidth={2}
          strokeDasharray="6 3"
          markerEnd="url(#rp-ar-orange)"
        />
      )}

      {/* Exception Filter 長條 */}
      <rect x={filterL} y={FILTER_Y} width={filterR - filterL} height={FILTER_H} rx={8} fill={fState.fill} stroke={fState.stroke} strokeWidth={fState.sw} strokeDasharray={fState.dash} style={{ transition: "fill 200ms, stroke 200ms" }} />
      <text x={filterL + 12} y={FILTER_Y + 18} fontSize={10} fontWeight={800} letterSpacing="0.06em" fill={boxState("filter") === "idle" || boxState("filter") === "skipped" ? MUTED : ORANGE_700} fontFamily={FONT}>
        EXCEPTION FILTER
      </text>
      <text x={filterL + 142} y={FILTER_Y + 18} fontSize={11.5} fontWeight={800} fill={boxState("filter") === "idle" || boxState("filter") === "skipped" ? MUTED : NAVY_DEEP} fontFamily={MONO}>
        AllExceptionsFilter
      </text>
      <text x={filterR - 12} y={FILTER_Y + 18} textAnchor="end" fontSize={10} fontWeight={700} fill={boxState("filter") === "skipped" ? ORANGE_700 : MUTED} fontFamily={FONT}>
        {boxState("filter") === "skipped" ? "沒有例外，未觸發" : "任何一層丟出例外都會落到這裡"}
      </text>

      {/* 目前位置：帶 traceId 的標籤 */}
      {cur > 0 && (
        <motion.g initial={false} animate={{ x: tokenX, y: tokenY }} transition={{ duration: 0.35, ease: "easeOut" }}>
          <rect x={-40} y={-10} width={80} height={20} rx={10} fill={tokenColor} />
          <text x={0} y={4} textAnchor="middle" fontSize={10} fontWeight={800} fill="#ffffff" fontFamily={MONO}>
            {sc.traceId}…
          </text>
        </motion.g>
      )}
    </svg>
  );
}

/* ---------- 下方面板 ---------- */

const panel: CSSProperties = {
  flex: "1 1 260px",
  minWidth: 0,
  background: "#ffffff",
  border: `1px solid ${GRAY_2}`,
  borderRadius: 8,
  padding: "10px 12px",
};
const panelTitle: CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: MUTED, marginBottom: 8 };

function levelColor(l: Level): string {
  if (l === "ERROR") return ORANGE_700;
  if (l === "WARN") return ORANGE;
  return GREEN;
}

function Panels({ sc, cur }: { sc: Scenario; cur: number }) {
  const steps = sc.steps.slice(0, cur + 1);
  const s = sc.steps[cur];
  const headers = steps.flatMap((x) => x.headers ?? []);
  const newHeaders = new Set(s.headers ?? []);
  const response = [...steps].reverse().find((x) => x.response)?.response;
  const logs = steps.flatMap((x, i) => (x.logs ?? []).map((l) => ({ ...l, fresh: i === cur })));
  const req = steps.reduce((a, x) => a + (x.metrics?.requests ?? 0), 0);
  const err = steps.reduce((a, x) => a + (x.metrics?.errors ?? 0), 0);
  const route = sc.request.split(" ")[1];
  const isErr = !!response && !response.status.startsWith("200");

  const metricRow = (name: string, value: number, delta: number) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 0", borderTop: `1px solid ${GRAY_2}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: NAVY_DEEP }}>{name}</div>
        <div style={{ fontFamily: MONO, fontSize: 10.5, color: MUTED, overflowWrap: "anywhere" }}>route="{route}"</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {delta > 0 && (
          <span style={{ fontSize: 11, fontWeight: 800, color: name.includes("errors") ? ORANGE_700 : NAVY, background: name.includes("errors") ? ORANGE_50 : BLUE_50, border: `1px solid ${name.includes("errors") ? ORANGE_100 : BLUE_100}`, borderRadius: 999, padding: "1px 8px" }}>
            +{delta}
          </span>
        )}
        <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 800, color: NAVY_DEEP, minWidth: 18, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      <div style={panel}>
        <div style={panelTitle}>RESPONSE</div>
        <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: response ? (isErr ? ORANGE_700 : GREEN) : MUTED, marginBottom: 6 }}>
          {response ? `HTTP/1.1 ${response.status}` : "（還沒有回應）"}
        </div>
        {headers.map((h) => {
          const [k, ...rest] = h.split(": ");
          return (
            <div key={h} style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.65, color: TEXT, overflowWrap: "anywhere", background: newHeaders.has(h) ? BLUE_50 : "transparent", borderRadius: 4, padding: "0 4px" }}>
              <span style={{ color: NAVY_DEEP, fontWeight: 700 }}>{k}:</span> {rest.join(": ")}
            </div>
          );
        })}
        {response && (
          <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 11, lineHeight: 1.6, color: TEXT, background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 6, padding: "6px 8px", overflowWrap: "anywhere" }}>
            {response.body[0].startsWith("#") ? null : <div>{"{"}</div>}
            {response.body.map((b) => (
              <div key={b} style={{ paddingLeft: response.body[0].startsWith("#") ? 0 : 12 }}>
                {b}
              </div>
            ))}
            {response.body[0].startsWith("#") ? null : <div>{"}"}</div>}
          </div>
        )}
      </div>

      <div style={panel}>
        <div style={panelTitle}>LOG</div>
        {logs.length === 0 ? (
          <div style={{ fontSize: 12.5, color: MUTED }}>目前還沒有輸出日誌。</div>
        ) : (
          logs.map((l, i) => (
            <div key={i} style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.6, color: TEXT, background: l.fresh ? (l.level === "ERROR" ? ORANGE_50 : BLUE_50) : "transparent", borderRadius: 4, padding: "3px 6px", marginBottom: 4, overflowWrap: "anywhere" }}>
              <span style={{ fontWeight: 800, color: levelColor(l.level) }}>{l.level}</span> <span style={{ color: MUTED }}>[HTTP]</span> {l.text}
              {l.detail?.map((d) => (
                <div key={d} style={{ color: MUTED, whiteSpace: "pre-wrap" }}>
                  {d}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div style={{ ...panel, flex: "1 1 220px" }}>
        <div style={panelTitle}>METRICS</div>
        {metricRow("http_requests_total", req, s.metrics?.requests ?? 0)}
        {metricRow("http_errors_total", err, s.metrics?.errors ?? 0)}
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
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 160ms, color 160ms, border-color 160ms",
};

export default function NestjsScaffoldRequestPipeline() {
  const reduce = useReducedMotion();
  const [sKey, setSKey] = useState("ok");
  const [cur, setCur] = useState(0);
  const [auto, setAuto] = useState(false);
  const [wrapRef, width] = useWidth<HTMLDivElement>();

  const sc = SCENARIOS.find((x) => x.key === sKey) ?? SCENARIOS[0];
  const steps = sc.steps;
  const s = steps[cur];
  const last = cur === steps.length - 1;
  const alert = s.phase === "err" || s.phase === "filter" || (s.phase === "done" && !!sc.errorFrom);

  useEffect(() => {
    if (!auto) return;
    if (last) {
      setAuto(false);
      return;
    }
    const id = window.setTimeout(() => setCur((c) => Math.min(c + 1, steps.length - 1)), reduce ? 1000 : 2000);
    return () => window.clearTimeout(id);
  }, [auto, cur, last, reduce, steps.length]);

  const pick = (k: string) => {
    setSKey(k);
    setCur(0);
    setAuto(false);
  };

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div role="group" aria-label="選擇情境" style={{ display: "inline-flex", flexWrap: "wrap", padding: 3, borderRadius: 10, background: BLUE_50, border: `1px solid ${BLUE_100}` }}>
          {SCENARIOS.map((x) => {
            const on = x.key === sKey;
            return (
              <button key={x.key} type="button" aria-pressed={on} onClick={() => pick(x.key)} style={{ ...btn, height: 30, border: "none", background: on ? NAVY : "transparent", color: on ? "#ffffff" : NAVY, fontSize: 13 }}>
                {x.label}
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
        <Pipeline width={width} sc={sc} cur={cur} />
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
          <div style={{ fontSize: 13.5, lineHeight: 1.7, color: TEXT, background: alert ? ORANGE_50 : BLUE_50, border: `1px solid ${alert ? ORANGE_100 : BLUE_100}`, borderRadius: 8, padding: "10px 14px" }}>
            <strong style={{ color: alert ? ORANGE_700 : NAVY_DEEP }}>
              {cur + 1}. {s.title}
            </strong>
            <span style={{ margin: "0 8px", color: GRAY }}>|</span>
            {s.note}
          </div>
          <Panels sc={sc} cur={cur} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
