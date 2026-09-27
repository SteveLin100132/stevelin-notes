import { useEffect, useRef, useState, type CSSProperties } from "react";
import { RotateCcw, Scale, TriangleAlert } from "lucide-react";

/* trendlink-design 色票（生成元件的 Tailwind class 不會被編譯，直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700
const NAVY_DEEP = "#112f5d"; // --blue-900
const BLUE = "#2c6ebb"; // --blue-500
const BLUE_50 = "#eef4fb";
const BLUE_100 = "#d6e4f5";
const BLUE_200 = "#adc8e8";
const SKY = "#4aa3d6";
const ORANGE = "#ed9b26"; // --orange-400
const ORANGE_DEEP = "#e37b24"; // --orange-500
const ORANGE_50 = "#fdf4e6";
const ORANGE_100 = "#fbe7c6";
const ORANGE_300 = "#f2b955";
const ORANGE_700 = "#a04f15";
const INK = "#2b3550";
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";

interface Metric {
  key: string;
  label: string;
  up: string; // 該指標拉高時的白話描述
  color: string;
}

const PROJECT_METRICS: Metric[] = [
  { key: "scope", label: "範疇", up: "客戶臨時加功能", color: NAVY },
  { key: "time", label: "時程", up: "交期被壓得更緊", color: ORANGE },
  { key: "cost", label: "成本", up: "預算被砍", color: BLUE },
];
const PRODUCT_METRICS: Metric[] = [
  { key: "user", label: "用戶價值", up: "全力打磨體驗", color: NAVY },
  { key: "biz", label: "商業價值", up: "強推付費牆或廣告", color: ORANGE },
  { key: "retention", label: "留存率", up: "狂發通知把人拉回來", color: BLUE },
  { key: "stickiness", label: "黏著度", up: "堆功能讓人離不開", color: SKY },
];

/** 守恆：調整第 i 項後，把差額按比例從其他項扣回（或補回），總和固定 */
function rebalance(values: number[], i: number, next: number): number[] {
  const n = values.length;
  const total = 50 * n;
  const target = Math.max(0, Math.min(100, next));
  const others = values.map((v, j) => (j === i ? 0 : v));
  const othersSum = others.reduce((a, b) => a + b, 0);
  const remain = total - target;
  const out = values.slice();
  out[i] = target;
  if (othersSum <= 0) {
    for (let j = 0; j < n; j++) if (j !== i) out[j] = remain / (n - 1);
  } else {
    for (let j = 0; j < n; j++) if (j !== i) out[j] = (values[j] / othersSum) * remain;
  }
  // 夾在 0..100，溢出的部分再均分給還有空間的項目
  let overflow = 0;
  for (let j = 0; j < n; j++) {
    if (j === i) continue;
    if (out[j] > 100) {
      overflow += out[j] - 100;
      out[j] = 100;
    }
  }
  if (overflow > 0) {
    const room = out.map((v, j) => (j === i ? 0 : 100 - v));
    const roomSum = room.reduce((a, b) => a + b, 0);
    if (roomSum > 0) for (let j = 0; j < n; j++) if (j !== i) out[j] += (room[j] / roomSum) * overflow;
  }
  return out.map((v) => Math.round(v));
}

/** 唯一的最小值索引；有並列最低時回傳 -1，避免任意點名其中一項 */
function uniqueMin(values: number[]): number {
  const min = Math.min(...values);
  return values.filter((v) => v === min).length === 1 ? values.indexOf(min) : -1;
}

function spread(values: number[]): number {
  return Math.max(...values) - Math.min(...values);
}

/* ---------- 圖：雷達圖（總量守恆下的形狀變化） ---------- */

/* SVG viewBox 寬 = 實際像素寬（不小於 MIN_W），文字維持 1:1，雷達圖置中 */
const MIN_W = 360;

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

function Radar({ metrics, values, tone }: { metrics: Metric[]; values: number[]; tone: "navy" | "orange" }) {
  const n = metrics.length;
  const [svgRef, W] = useMeasuredWidth(MIN_W);
  const cx = W / 2;
  const cy = 138;
  const R = 80;
  const ang = (i: number) => -Math.PI / 2 + (i * Math.PI * 2) / n;
  const pt = (i: number, v: number) => ({ x: cx + ((R * v) / 100) * Math.cos(ang(i)), y: cy + ((R * v) / 100) * Math.sin(ang(i)) });
  const poly = (vs: number[]) => vs.map((v, i) => pt(i, v)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const stroke = tone === "navy" ? NAVY : ORANGE_DEEP;
  const fill = tone === "navy" ? BLUE : ORANGE;
  const sp = spread(values);
  const hi = values.indexOf(Math.max(...values));
  const lo = uniqueMin(values);
  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} 280`} width="100%" role="img" aria-label={`雷達圖：${metrics.map((m, i) => `${m.label} ${values[i]}`).join("、")}。虛線為均衡基準（各 50），實線為目前配置${sp > 8 ? `，${metrics[hi].label}最高${lo >= 0 ? `、${metrics[lo].label}最低` : ""}` : "，目前接近均衡"}。`}>
      <rect width={W} height={280} rx={10} fill={PANEL} />
      {/* 格線 */}
      {[25, 50, 75, 100].map((v) => (
        <polygon key={v} points={poly(metrics.map(() => v))} fill="none" stroke={v === 100 ? GRAY : GRAY_2} strokeWidth={1} />
      ))}
      {metrics.map((m, i) => {
        const p = pt(i, 100);
        return <line key={m.key} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={GRAY_2} strokeWidth={1} />;
      })}
      {[25, 50, 75].map((v) => (
        <text key={v} x={cx + 4} y={cy - (R * v) / 100 + 3} fontSize={8.5} fill={MUTED} fontFamily={FONT}>
          {v}
        </text>
      ))}
      {/* 均衡基準 */}
      <polygon points={poly(metrics.map(() => 50))} fill="none" stroke={MUTED} strokeWidth={1.2} strokeDasharray="4 3" />
      {/* 目前配置 */}
      <polygon points={poly(values)} fill={fill} fillOpacity={0.18} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      {values.map((v, i) => {
        const p = pt(i, v);
        const mark = sp > 8 && (i === hi || i === lo);
        return <circle key={metrics[i].key} cx={p.x} cy={p.y} r={mark ? 4.5 : 3.5} fill={mark && i === lo ? "#ffffff" : stroke} stroke={stroke} strokeWidth={1.5} />;
      })}
      {/* 軸標籤 */}
      {metrics.map((m, i) => {
        const a = ang(i);
        const lx = cx + (R + 14) * Math.cos(a);
        const ly = cy + (R + 14) * Math.sin(a);
        const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
        const dy = Math.sin(a) < -0.5 ? -6 : Math.sin(a) > 0.5 ? 12 : 4;
        const tag = sp > 8 ? (i === hi ? "▲" : i === lo ? "▼" : "") : "";
        return (
          <text key={m.key} x={lx} y={ly + dy} textAnchor={anchor} fontSize={11} fontWeight={700} fill={TEXT} fontFamily={FONT}>
            {m.label}
            <tspan dx={4} fontWeight={800} fill={sp > 8 && i === hi ? ORANGE_700 : sp > 8 && i === lo ? NAVY : MUTED} style={{ fontVariantNumeric: "tabular-nums" }}>
              {values[i]}
            </tspan>
            {tag && (
              <tspan dx={2} fontSize={8} fill={i === hi ? ORANGE_700 : NAVY}>
                {tag}
              </tspan>
            )}
          </text>
        );
      })}
      {/* 圖例 */}
      <g fontSize={9.5} fill={MUTED} fontFamily={FONT}>
        <line x1={16} y1={264} x2={34} y2={264} stroke={MUTED} strokeWidth={1.2} strokeDasharray="4 3" />
        <text x={40} y={267}>均衡基準</text>
        <line x1={100} y1={264} x2={118} y2={264} stroke={stroke} strokeWidth={2} />
        <text x={124} y={267}>目前配置（總和固定）</text>
      </g>
    </svg>
  );
}

/* ---------- 面板 ---------- */

function Panel({ tag, title, sub, metrics, tone, note }: { tag: string; title: string; sub: string; metrics: Metric[]; tone: "navy" | "orange"; note: string }) {
  const [values, setValues] = useState<number[]>(metrics.map(() => 50));
  const sp = spread(values);
  const hiIndex = values.indexOf(Math.max(...values));
  const loIndex = uniqueMin(values);
  const accent = tone === "navy" ? NAVY : ORANGE_DEEP;
  const soft = tone === "navy" ? BLUE_50 : ORANGE_50;
  const message =
    sp <= 8
      ? "目前相對均衡：但每往一項傾斜，就得從其他項挪走資源。"
      : `${metrics[hiIndex].up}（${metrics[hiIndex].label} 拉到 ${values[hiIndex]}），代價是 ${metrics
          .map((m, i) => (i === hiIndex ? null : `${m.label} ${values[i]}`))
          .filter(Boolean)
          .join("、")}；${loIndex >= 0 ? `${metrics[loIndex].label} 被犧牲得最多。` : "其他各項被平均壓低。"}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: accent }}>{tag}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: tone === "navy" ? NAVY_DEEP : ORANGE_700 }}>{title}</span>
        <span style={{ fontSize: 12, color: MUTED }}>{sub}</span>
      </div>
      <Radar metrics={metrics} values={values} tone={tone} />
      <div role="group" aria-label={`${title} 指標`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {metrics.map((m, i) => (
          <label key={m.key} style={{ display: "grid", gridTemplateColumns: "64px 1fr 36px", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: INK }}>{m.label}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={values[i]}
              onChange={(e) => setValues((v) => rebalance(v, i, Number(e.target.value)))}
              aria-label={m.label}
              style={{ width: "100%", accentColor: m.color, cursor: "pointer" }}
            />
            <span style={{ textAlign: "right", fontWeight: 800, color: i === hiIndex && sp > 8 ? ORANGE_700 : MUTED, fontVariantNumeric: "tabular-nums" }}>{values[i]}</span>
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, lineHeight: 1.6, color: sp > 8 ? INK : MUTED, background: sp > 8 ? soft : "transparent", borderRadius: 8, padding: "8px 12px", minHeight: 58 }}>
        {sp > 8 ? <TriangleAlert size={16} style={{ color: accent, flexShrink: 0, marginTop: 3 }} /> : <Scale size={16} style={{ color: MUTED, flexShrink: 0, marginTop: 3 }} />}
        <span>{message}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11, color: MUTED }}>{note}</span>
        <button type="button" onClick={() => setValues(metrics.map(() => 50))} style={{ ...btn, height: 30, padding: "0 12px", fontSize: 12, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}>
          <RotateCcw size={13} /> 重置
        </button>
      </div>
    </div>
  );
}

const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 8,
  border: "1.5px solid transparent",
  fontFamily: "inherit",
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 160ms, color 160ms, transform 120ms",
};

export default function PmMetrics() {
  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.6 }}>拖動任一指標：資源有限，總量守恆，其他指標會被牽動。這是「取捨示意」，用來凸顯不可能同時都最佳化。</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <Panel tag="PROJECT" title="專案 · 管理鐵三角" sub="範疇 / 時程 / 成本" metrics={PROJECT_METRICS} tone="navy" note="業界公認、有明確約束的模型。" />
        <Panel tag="PRODUCT" title="產品 · 價值四要素" sub="用戶 / 商業 / 留存 / 黏著" metrics={PRODUCT_METRICS} tone="orange" note="非正式框架，只是挑出的代表指標；實務上常一起上升。" />
      </div>
      <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, borderTop: `1px solid ${GRAY_2}`, paddingTop: 10 }}>
        左側鐵三角是業界公認、有明確約束的模型；右側「價值四要素」只是挑出的幾個代表指標，並非既有框架，這裡的守恆僅為凸顯取捨精神的示意。
      </div>
    </div>
  );
}
