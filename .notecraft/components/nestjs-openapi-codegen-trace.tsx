import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

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
const GRAY_2 = "#e1e6ee"; // --neutral-200
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

type Strategy = "method" | "default";

/* operationId 策略決定所有產出名稱；兩組名稱都是實際跑 Orval 8 得到的結果 */
const NAMES: Record<Strategy, { opId: string; fn: string; hook: string; key: string; url: string; type: string }> = {
  method: {
    opId: "getPing",
    fn: "getPing",
    hook: "useGetPing",
    key: "getGetPingQueryKey",
    url: "getGetPingUrl",
    type: "GetPing200",
  },
  default: {
    opId: "PingController_getPing",
    fn: "pingControllerGetPing",
    hook: "usePingControllerGetPing",
    key: "getPingControllerGetPingQueryKey",
    url: "getPingControllerGetPingUrl",
    type: "PingControllerGetPing200",
  },
};

interface Line {
  text: string;
  /** 這一行屬於哪些對應步驟（STEPS 的 id） */
  tags?: string[];
  comment?: boolean;
}

function sourceLines(): Line[] {
  return [
    { text: "// src/ping/dto/ping.dto.ts", comment: true },
    { text: "@RegisterDto()", tags: ["schema"] },
    { text: "export class PingDto {", tags: ["schema"] },
    { text: '  @ApiProperty({ description: "固定為 true" })', tags: ["schema"] },
    { text: "  pong!: boolean;", tags: ["schema"] },
    { text: "}" },
    { text: "" },
    { text: "// src/ping/ping.controller.ts", comment: true },
    { text: '@ApiTags("ping")', tags: ["tag"] },
    { text: "@Controller()" },
    { text: "export class PingController {" },
    { text: '  @Get("ping")', tags: ["route"] },
    { text: '  @ApiOperation({ summary: "連通性測試" })', tags: ["summary"] },
    { text: "  @ApiResponse({", tags: ["response"] },
    { text: "    status: 200,", tags: ["response"] },
    { text: "    schema: ApiResponseDto.of(PingDto),", tags: ["response"] },
    { text: "  })", tags: ["response"] },
    { text: "  getPing(): PingDto { /* ... */ }", tags: ["opid"] },
    { text: "}" },
  ];
}

function specLines(s: Strategy): Line[] {
  return [
    { text: '"paths": {' },
    { text: '  "/ping": {', tags: ["route"] },
    { text: '    "get": {', tags: ["route"] },
    { text: `      "operationId": "${NAMES[s].opId}",`, tags: ["opid"] },
    { text: '      "summary": "連通性測試",', tags: ["summary"] },
    { text: '      "tags": ["ping"],', tags: ["tag"] },
    { text: '      "responses": { "200": { "schema": {', tags: ["response"] },
    { text: '        "allOf": [', tags: ["response"] },
    { text: '          { "$ref": "#/…/ApiResponseDto" },', tags: ["response"] },
    { text: '          { "properties": { "data": {', tags: ["response"] },
    { text: '            "nullable": true,', tags: ["response"] },
    { text: '            "allOf": [{ "$ref": "#/…/PingDto" }]', tags: ["response"] },
    { text: "          } } }", tags: ["response"] },
    { text: "        ] } } }", tags: ["response"] },
    { text: "    } } }," },
    { text: '"components": { "schemas": {' },
    { text: '  "PingDto": {', tags: ["schema"] },
    { text: '    "properties": {', tags: ["schema"] },
    { text: '      "pong": { "type": "boolean" } },', tags: ["schema"] },
    { text: '    "required": ["pong"] } } }', tags: ["schema"] },
  ];
}

function outputLines(s: Strategy): Line[] {
  const n = NAMES[s];
  return [
    { text: "// endpoints/ping/ping.ts", comment: true, tags: ["tag"] },
    { text: `export const ${n.url} = () => \`/ping\``, tags: ["route"] },
    { text: "/** @summary 連通性測試 */", tags: ["summary"] },
    { text: `export const ${n.fn} = (options?) =>`, tags: ["opid"] },
    { text: `  customFetch<${n.type}>(${n.url}(), …)`, tags: ["opid", "response"] },
    { text: `export const ${n.key} = () =>`, tags: ["opid"] },
    { text: "  [`/ping`] as const", tags: ["route"] },
    { text: `export function ${n.hook}(options?) { … }`, tags: ["opid"] },
    { text: "" },
    { text: `// model/${n.type.charAt(0).toLowerCase()}${n.type.slice(1)}.ts`, comment: true, tags: ["response"] },
    { text: `export type ${n.type} = ApiResponseDto & {`, tags: ["response"] },
    { text: "  data?: PingDto | null;", tags: ["response"] },
    { text: "};", tags: ["response"] },
    { text: "" },
    { text: "// model/pingDto.ts", comment: true, tags: ["schema"] },
    { text: "export interface PingDto {", tags: ["schema"] },
    { text: "  /** 固定為 true */", tags: ["schema"] },
    { text: "  pong: boolean;", tags: ["schema"] },
    { text: "}", tags: ["schema"] },
    { text: "// endpoints/ping/ping.faker.ts", comment: true, tags: ["schema"] },
    { text: "{ pong: faker.datatype.boolean() }", tags: ["schema"] },
  ];
}

interface Step {
  id: string;
  title: string;
  /** 流程圖三個節點裡要顯示的代表字串 */
  chain: (s: Strategy) => [string, string, string];
  note: (s: Strategy) => string;
}

const STEPS: Step[] = [
  {
    id: "tag",
    title: "Tag 決定檔案怎麼拆",
    chain: () => ['@ApiTags("ping")', '"tags": ["ping"]', "endpoints/ping/ping.ts"],
    note: () =>
      "orval.config.ts 用 mode: tags-split，每個 Swagger tag 產生一個資料夾。tag 也就是前端 import 時看到的模組邊界，命名要像在替前端分模組。",
  },
  {
    id: "route",
    title: "路由變成 URL 與 query key",
    chain: () => ['@Get("ping")', '"/ping": { "get" }', "[`/ping`] as const"],
    note: () =>
      "HTTP 方法與路徑直接搬過去。query key 預設就是 URL（有參數時會附上參數物件），TanStack Query 的快取與 invalidate 都靠它。",
  },
  {
    id: "opid",
    title: "method 名稱變成函式與 hook 名稱",
    chain: (s) => ["getPing()", `"operationId": "${NAMES[s].opId}"`, `${NAMES[s].hook}()`],
    note: (s) =>
      s === "method"
        ? "腳手架設定 operationIdFactory 只取 method 名稱，產出 useGetPing。代價是 method 名稱在全專案必須唯一，改名也會讓前端 import 失效。"
        : "@nestjs/swagger 預設的 operationId 是「Controller 名_method 名」，名稱不會撞，但每個 hook 都會帶著 Controller 前綴，讀起來很冗長。",
  },
  {
    id: "summary",
    title: "說明文字變成 JSDoc",
    chain: () => ['summary: "連通性測試"', '"summary": "連通性測試"', "/** @summary 連通性測試 */"],
    note: () => "summary 與 description 會帶進產出的 JSDoc，前端在編輯器滑過函式就看得到，等於 API 文件跟著程式碼走。",
  },
  {
    id: "response",
    title: "回應 schema 變成回傳型別",
    chain: (s) => ["ApiResponseDto.of(PingDto)", '"allOf": [ApiResponseDto, { data }]', NAMES[s].type],
    note: () =>
      "of() 產生「統一包裝 + data 是 PingDto」的 allOf，Orval 轉成交集型別。沒寫 schema 的端點，回傳型別只會是 unknown。",
  },
  {
    id: "schema",
    title: "DTO 變成 interface 與假資料",
    chain: () => ["@ApiProperty pong!: boolean", '"PingDto": { "pong": boolean }', "interface PingDto + faker"],
    note: () =>
      "@RegisterDto() 讓 DTO 出現在 components.schemas，Orval 產生同名 interface，並依欄位型別產生 faker 假資料給 MSW 使用。",
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

/* ---------- 上方流程圖：三個節點顯示同一件事在三個階段的樣子 ---------- */

const MIN_W = 600;
const H = 132;

function Chain({ width, step, strategy }: { width: number; step: Step; strategy: Strategy }) {
  const reduce = useReducedMotion();
  const W = Math.max(width, MIN_W);
  const gap = 56;
  const pad = 16;
  const boxW = (W - pad * 2 - gap * 2) / 3;
  const boxY = 36;
  const boxH = 64;
  const [a, b, c] = step.chain(strategy);
  const nodes = [
    { label: "NestJS 原始碼", value: a, contract: false },
    { label: "OpenAPI spec", value: b, contract: true },
    { label: "Orval 產出", value: c, contract: false },
  ];
  const arrows = ["SwaggerModule", "orval"];
  /* 等寬字寬約 0.6em：先縮字級（最小 9.5px），仍放不下才截斷 */
  const fit = (text: string) => {
    const size = Math.max(9.5, Math.min(11.5, (boxW - 24) / (text.length * 0.6)));
    const max = Math.floor((boxW - 24) / (size * 0.6));
    return { size, text: text.length > max ? `${text.slice(0, max - 1)}…` : text };
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`步驟「${step.title}」：NestJS 原始碼的 ${a}，在 OpenAPI spec 中是 ${b}，Orval 產出 ${c}。`}
      style={{ display: "block" }}
    >
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill="#ffffff" stroke={GRAY_2} />
      <defs>
        <marker id="trace-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill={NAVY} />
        </marker>
      </defs>
      {nodes.map((n, i) => {
        const x = pad + i * (boxW + gap);
        const label = fit(n.value);
        return (
          <g key={n.label}>
            <text x={x} y={boxY - 10} fontSize={10.5} fontWeight={800} letterSpacing="0.06em" fill={n.contract ? ORANGE_700 : MUTED} fontFamily={FONT}>
              {n.label}
            </text>
            <rect x={x} y={boxY} width={boxW} height={boxH} rx={8} fill={n.contract ? ORANGE_50 : BLUE_50} stroke={n.contract ? ORANGE : NAVY} strokeWidth={1.25} />
            <motion.text
              key={`${step.id}-${strategy}-${i}`}
              x={x + 12}
              y={boxY + boxH / 2 + 4}
              fontSize={label.size}
              fontWeight={700}
              fill={n.contract ? ORANGE_700 : NAVY_DEEP}
              fontFamily={MONO}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.12 }}
            >
              {label.text}
            </motion.text>
          </g>
        );
      })}
      {arrows.map((label, i) => {
        const x1 = pad + (i + 1) * boxW + i * gap + 4;
        const x2 = x1 + gap - 8;
        const y = boxY + boxH / 2;
        return (
          <g key={label}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke={NAVY} strokeWidth={1.5} markerEnd="url(#trace-ar)" />
            <text x={(x1 + x2) / 2} y={boxY + boxH + 20} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={MONO}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- 三欄程式碼：屬於目前步驟的行高亮，其餘淡化 ---------- */

function CodePanel({ title, file, lines, active, contract }: { title: string; file: string; lines: Line[]; active: string; contract?: boolean }) {
  const hiBg = contract ? ORANGE_50 : BLUE_50;
  const hiBar = contract ? ORANGE : NAVY;
  return (
    <div style={{ flex: "1 1 280px", minWidth: 0, border: `1px solid ${GRAY_2}`, borderRadius: 8, background: "#ffffff", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 12px", borderBottom: `1px solid ${GRAY_2}` }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: contract ? ORANGE_700 : NAVY_DEEP }}>{title}</span>
        <span style={{ fontSize: 11, color: MUTED, fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file}</span>
      </div>
      <div style={{ padding: "6px 0", overflowX: "auto" }}>
        {lines.map((l, i) => {
          const on = l.tags?.includes(active) ?? false;
          return (
            <div
              key={i}
              style={{
                fontFamily: MONO,
                fontSize: 11.5,
                lineHeight: "19px",
                minHeight: 19,
                whiteSpace: "pre",
                padding: "0 12px 0 10px",
                borderLeft: `2px solid ${on ? hiBar : "transparent"}`,
                background: on ? hiBg : "transparent",
                color: l.comment ? MUTED : on ? NAVY_DEEP : TEXT,
                opacity: on || l.comment ? 1 : 0.45,
                fontWeight: on ? 700 : 400,
                transition: "background 200ms ease-out, opacity 200ms ease-out",
              }}
            >
              {l.text || " "}
            </div>
          );
        })}
      </div>
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

export default function NestjsOpenapiCodegenTrace() {
  const [idx, setIdx] = useState(0);
  const [strategy, setStrategy] = useState<Strategy>("method");
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const step = STEPS[idx];

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div role="group" aria-label="對應項目" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {STEPS.map((s, i) => {
          const on = i === idx;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => setIdx(i)}
              style={{ ...btn, height: 30, padding: "0 12px", fontSize: 12.5, background: on ? NAVY : "#ffffff", color: on ? "#ffffff" : NAVY, borderColor: on ? NAVY : BLUE_200 }}
            >
              {i + 1}. {s.title}
            </button>
          );
        })}
      </div>

      <div ref={wrapRef} style={{ width: "100%" }}>
        <Chain width={width} step={step} strategy={strategy} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 16px" }}>
        <div role="group" aria-label="步驟控制" style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200, opacity: idx === 0 ? 0.45 : 1 }}>
            <ChevronLeft size={16} /> 上一步
          </button>
          <button
            type="button"
            onClick={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
            disabled={idx === STEPS.length - 1}
            style={{ ...btn, background: NAVY, color: "#ffffff", borderColor: NAVY, opacity: idx === STEPS.length - 1 ? 0.45 : 1 }}
          >
            下一步 <ChevronRight size={16} />
          </button>
          <button type="button" onClick={() => setIdx(0)} aria-label="重置" style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}>
            <RotateCcw size={16} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: TEXT }}>
          operationId
          <div role="group" aria-label="operationId 策略" style={{ display: "inline-flex", padding: 2, border: `1px solid ${BLUE_200}`, borderRadius: 6 }}>
            {(
              [
                ["method", "取 method 名稱（腳手架）"],
                ["default", "Nest 預設"],
              ] as [Strategy, string][]
            ).map(([v, label]) => {
              const on = strategy === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setStrategy(v)}
                  style={{ ...btn, height: 28, padding: "0 10px", border: "none", fontSize: 12.5, background: on ? NAVY : "transparent", color: on ? "#ffffff" : NAVY }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ background: step.id === "opid" ? ORANGE_50 : BLUE_50, border: `1px solid ${step.id === "opid" ? "#fbe7c6" : BLUE_100}`, borderRadius: 8, padding: "10px 14px", fontSize: 13.5, lineHeight: 1.7, color: TEXT }}>
        <span style={{ fontWeight: 800, color: NAVY_DEEP }}>
          {idx + 1} / {STEPS.length}　{step.title}：
        </span>
        {step.note(strategy)}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <CodePanel title="NestJS 原始碼" file="src/ping/" lines={sourceLines()} active={step.id} />
        <CodePanel title="openapi.json（節錄）" file="openapi:export" lines={specLines(strategy)} active={step.id} contract />
        <CodePanel title="Orval 產出（節錄）" file="src/generated/" lines={outputLines(strategy)} active={step.id} />
      </div>
    </div>
  );
}
