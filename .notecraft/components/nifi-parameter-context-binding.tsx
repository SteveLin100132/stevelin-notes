import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Lock, TriangleAlert } from "lucide-react";

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
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const DANGER = "#c8412f";
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

/* ---------- 資料 ---------- */

type View = "DEV" | "QAS" | "PRD" | "REGISTRY";

interface Param {
  name: string;
  sensitive: boolean;
  values: Record<"DEV" | "QAS" | "PRD", string>;
}

const PARAMS: Param[] = [
  { name: "db.url", sensitive: false, values: { DEV: "jdbc:postgresql://dev-db:5432/erp", QAS: "jdbc:postgresql://qas-db:5432/erp", PRD: "jdbc:postgresql://prd-db:5432/erp" } },
  { name: "db.user", sensitive: false, values: { DEV: "etl_dev", QAS: "etl_qas", PRD: "etl_prd" } },
  { name: "db.password", sensitive: true, values: { DEV: "********", QAS: "********", PRD: "********" } },
];

interface Prop {
  name: string;
  ref: string | null; // 參照的參數名；null 表示寫死
  literal?: string;
}

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

/* ---------- 圖：Processor 屬性 → Parameter Context → 實際值 ---------- */

function Binding({ view, hardcode, reduce }: { view: View; hardcode: boolean; reduce: boolean }) {
  const [ref, W] = useMeasuredWidth(680);
  const props: Prop[] = [
    { name: "Database Connection URL", ref: hardcode ? null : "db.url", literal: "jdbc:postgresql://dev-db:5432/erp" },
    { name: "Database User", ref: "db.user" },
    { name: "Password", ref: "db.password" },
    { name: "Table Name", ref: null, literal: "orders" },
  ];
  const pad = 16;
  const rowH = 40;
  const top = 58;
  const H = top + props.length * rowH + 20;
  const colGap = 36;
  const col = (W - pad * 2 - colGap * 2) / 3;
  const x1 = pad;
  const x2 = pad + col + colGap;
  const x3 = pad + (col + colGap) * 2;
  const rowY = (i: number) => top + i * rowH;
  const isReg = view === "REGISTRY";
  const env = isReg ? "DEV" : view;
  const dur = reduce ? 0 : 0.3;
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  const maxChars = Math.floor((col - 24) / 6.6);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={
        isReg
          ? "Registry 快照中保存的內容：Processor 屬性只記錄參數參照，敏感參數的值不會被送到 Registry。"
          : `${view} 環境：Processor 屬性透過 Parameter Context 解析出 ${view} 的連線資訊${hardcode ? "；但 Database Connection URL 被寫死為 DEV 的位址" : ""}。`
      }
    >
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill="#ffffff" stroke="#e1e6ee" />
      <g fontFamily={FONT} fontSize={10.5} fontWeight={800} fill={MUTED} letterSpacing="0.08em">
        <text x={x1} y={24}>PROCESSOR 屬性</text>
        <text x={x2} y={24}>{isReg ? "REGISTRY 保存的參數" : `PARAMETER CONTEXT · ${env}`}</text>
        <text x={x3} y={24}>{isReg ? "匯入時" : "執行時的實際值"}</text>
      </g>
      <text x={x1} y={42} fontSize={10.5} fill={MUTED} fontFamily={MONO}>
        PutDatabaseRecord
      </text>
      <text x={x2} y={42} fontSize={10.5} fill={MUTED} fontFamily={MONO}>
        order-sync-params
      </text>

      {props.map((p, i) => {
        const y = rowY(i);
        const param = p.ref ? PARAMS.find((q) => q.name === p.ref) ?? null : null;
        const wrong = !isReg && p.ref === null && p.name.startsWith("Database") && env !== "DEV";
        let resolved: string;
        if (isReg) {
          resolved = param?.sensitive ? "不含值，需在目標環境設定" : param ? "沿用目標環境同名 Context" : "原樣帶到每個環境";
        } else {
          resolved = param ? param.values[env] : p.literal ?? "";
        }
        const paramText = param ? (isReg ? (param.sensitive ? `${param.name} = （不送出）` : `${param.name} = ${param.values.DEV}`) : `${param.name} = ${param.values[env]}`) : "";
        return (
          <g key={p.name}>
            {/* 屬性 */}
            <rect x={x1} y={y} width={col} height={rowH - 8} rx={6} fill="#ffffff" stroke={p.ref ? BLUE_200 : wrong ? DANGER : GRAY} strokeWidth={1.25} />
            <text x={x1 + 10} y={y + 13} fontSize={10} fill={MUTED} fontFamily={FONT}>
              {p.name}
            </text>
            <text x={x1 + 10} y={y + 26} fontSize={11} fontWeight={700} fill={p.ref ? NAVY : wrong ? DANGER : TEXT} fontFamily={MONO}>
              {clip(p.ref ? `#{${p.ref}}` : p.literal ?? "", maxChars)}
            </text>

            {/* 連線 */}
            {param ? (
              <path d={`M${x1 + col} ${y + 16} H${x2 - 4}`} stroke={NAVY} strokeWidth={1.25} fill="none" />
            ) : (
              <path d={`M${x1 + col} ${y + 16} H${x3 - 4}`} stroke={wrong ? DANGER : GRAY} strokeWidth={1.25} strokeDasharray="4 3" fill="none" />
            )}

            {/* 參數 */}
            {param && (
              <motion.g key={`${view}-${param.name}`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur }}>
                <rect
                  x={x2}
                  y={y}
                  width={col}
                  height={rowH - 8}
                  rx={6}
                  fill={isReg && param.sensitive ? ORANGE_50 : BLUE_50}
                  stroke={isReg && param.sensitive ? ORANGE : BLUE_200}
                  strokeWidth={1.25}
                  strokeDasharray={isReg && param.sensitive ? "4 3" : undefined}
                />
                <text x={x2 + 10} y={y + 20} fontSize={10.5} fontWeight={700} fill={isReg && param.sensitive ? ORANGE_700 : NAVY_DEEP} fontFamily={MONO}>
                  {clip(paramText, maxChars)}
                </text>
                <path d={`M${x2 + col} ${y + 16} H${x3 - 4}`} stroke={NAVY} strokeWidth={1.25} fill="none" />
              </motion.g>
            )}

            {/* 實際值 */}
            <motion.g key={`${view}-${hardcode}-${p.name}-r`} initial={reduce ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: dur, delay: reduce ? 0 : 0.08 }}>
              <rect x={x3} y={y} width={col} height={rowH - 8} rx={6} fill={wrong ? "#fbeae7" : "#ffffff"} stroke={wrong ? DANGER : GRAY_2} strokeWidth={wrong ? 1.5 : 1.25} />
              <text x={x3 + 10} y={y + 20} fontSize={isReg ? 10.5 : 11} fontWeight={700} fill={wrong ? DANGER : isReg ? TEXT : NAVY_DEEP} fontFamily={isReg ? FONT : MONO}>
                {clip(resolved, maxChars)}
              </text>
            </motion.g>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- 主元件 ---------- */

const tabBtn: CSSProperties = {
  height: 34,
  padding: "0 14px",
  borderRadius: 8,
  border: "1.5px solid transparent",
  fontFamily: "inherit",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 160ms, color 160ms, border-color 160ms",
};

const VIEWS: { key: View; label: string }[] = [
  { key: "DEV", label: "NiFi DEV" },
  { key: "QAS", label: "NiFi QAS" },
  { key: "PRD", label: "NiFi PRD" },
  { key: "REGISTRY", label: "Registry 快照" },
];

export default function NifiParameterContextBinding() {
  const reduce = useReducedMotion() ?? false;
  const [view, setView] = useState<View>("QAS");
  const [hardcode, setHardcode] = useState(false);
  const isReg = view === "REGISTRY";
  const wrong = hardcode && (view === "QAS" || view === "PRD");

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT, color: TEXT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <div role="group" aria-label="檢視環境" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {VIEWS.map((v) => {
            const on = v.key === view;
            const reg = v.key === "REGISTRY";
            return (
              <button
                key={v.key}
                type="button"
                aria-pressed={on}
                onClick={() => setView(v.key)}
                style={{
                  ...tabBtn,
                  background: on ? (reg ? ORANGE : NAVY) : "#ffffff",
                  color: on ? "#ffffff" : reg ? ORANGE_700 : NAVY,
                  borderColor: on ? (reg ? ORANGE : NAVY) : reg ? ORANGE_100 : BLUE_200,
                }}
              >
                {v.label}
              </button>
            );
          })}
        </div>
        <label style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: hardcode ? DANGER : TEXT, cursor: "pointer" }}>
          <input type="checkbox" checked={hardcode} onChange={(e) => setHardcode(e.target.checked)} style={{ accentColor: DANGER, width: 16, height: 16 }} />
          把連線 URL 直接寫死在 Processor
        </label>
      </div>

      <Binding view={view} hardcode={hardcode} reduce={reduce} />

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          fontSize: 13.5,
          lineHeight: 1.7,
          background: wrong ? "#fbeae7" : isReg ? ORANGE_50 : BLUE_50,
          border: `1px solid ${wrong ? DANGER : isReg ? ORANGE_100 : BLUE_100}`,
          borderRadius: 8,
          padding: "10px 14px",
        }}
      >
        {wrong ? <TriangleAlert size={18} style={{ color: DANGER, flexShrink: 0, marginTop: 3 }} /> : isReg ? <Lock size={17} style={{ color: ORANGE_700, flexShrink: 0, marginTop: 3 }} /> : null}
        <span>
          {wrong ? (
            <>
              寫死的值不經過 Parameter Context，會跟著流程原封不動地搬到 {view}：這個 {view} 的 Processor 正連向 <strong>dev-db</strong>。
              凡是會隨環境改變的值，都應該改成 <code style={{ fontFamily: MONO }}>{"#{參數}"}</code> 參照。
            </>
          ) : isReg ? (
            <>
              Registry 只存「流程 + 參數參照」與非敏感參數的值；<strong>敏感參數的值不會送出</strong>。
              匯入時若目標環境已有同名的 Parameter Context，就直接沿用它的值，所以各環境只需在第一次部署時設定一次。
            </>
          ) : (
            <>
              三個環境跑的是同一份流程，Processor 屬性都寫成 <code style={{ fontFamily: MONO }}>{"#{db.url}"}</code> 這類參照；
              切換上方分頁，只有 Parameter Context 的值在變。Table Name 在每個環境都一樣，寫死沒有問題。
            </>
          )}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <span>
          <span style={{ display: "inline-block", width: 18, borderTop: `1.5px solid ${NAVY}`, verticalAlign: "middle", marginRight: 6 }} />
          經過參數解析
        </span>
        <span>
          <span style={{ display: "inline-block", width: 18, borderTop: `1.5px dashed ${GRAY}`, verticalAlign: "middle", marginRight: 6 }} />
          寫死，原樣帶走
        </span>
      </div>
    </div>
  );
}
