import { useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Minus, Layers } from "lucide-react";

/* trendlink-design 色票（生成元件的 Tailwind class 不會被編譯，直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700
const NAVY_DEEP = "#112f5d"; // --blue-900
const BLUE_50 = "#eef4fb";
const BLUE_100 = "#d6e4f5";
const BLUE_200 = "#adc8e8";
const ORANGE_DEEP = "#e37b24"; // --orange-500
const ORANGE_50 = "#fdf4e6";
const ORANGE_700 = "#a04f15";
const GREEN = "#2e9e6b";
const GREEN_50 = "#e9f6ef";
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

const AXES = ["上手容易", "隔離程度", "跨應用溝通", "SSR 支援", "獨立部署", "瀏覽器相容"] as const;
type AxisKey = (typeof AXES)[number];

interface Approach {
  key: string;
  label: string;
  code: string;
  how: string;
  scores: Record<AxisKey, number>;
  pros: string[];
  cons: string[];
  fit: string;
}

const APPROACHES: Approach[] = [
  {
    key: "iframe",
    label: "iframe",
    code: "A",
    how: "每個子應用都是一個獨立網頁，容器頁面用 <iframe> 把它嵌進來。",
    scores: { 上手容易: 5, 隔離程度: 5, 跨應用溝通: 2, "SSR 支援": 3, 獨立部署: 5, 瀏覽器相容: 5 },
    pros: ["最簡單、最容易上手", "JS、CSS、DOM 天然完全隔離，互不干擾", "子應用可用任何技術、獨立部署"],
    cons: ["重新整理後 iframe 內的路由狀態會消失", "跨 iframe 只能靠 postMessage，訊息共享難做好", "彈窗、捲動、樣式一致性都有邊界問題"],
    fit: "後台系統嵌入舊系統、對整合體驗要求不高的情境。",
  },
  {
    key: "script",
    label: "JS 腳本載入",
    code: "B",
    how: "用戶端在執行期用 <script> 載入子應用打包好的 JS，再呼叫它暴露的 mount() 掛到容器的 DOM 上（single-spa 一類框架的做法）。",
    scores: { 上手容易: 4, 隔離程度: 2, 跨應用溝通: 4, "SSR 支援": 1, 獨立部署: 4, 瀏覽器相容: 5 },
    pros: ["引入腳本即可使用，整合方式直觀", "同一個 window，跨應用溝通容易", "容器可以掌控路由與掛載時機"],
    cons: ["不支援 Server-side render", "要留意 JS、CSS 的載入順序", "沒有天然隔離，全域變數與樣式容易互相汙染"],
    fit: "想快速把幾個既有 SPA 拼在同一個殼裡，且團隊能約定好命名與樣式規範。",
  },
  {
    key: "webcomponent",
    label: "Web Component",
    code: "C",
    how: "把子應用封裝成瀏覽器原生的 Custom Element，用 Shadow DOM 隔離樣式，容器像使用一般 HTML 標籤一樣使用它。",
    scores: { 上手容易: 3, 隔離程度: 4, 跨應用溝通: 3, "SSR 支援": 2, 獨立部署: 4, 瀏覽器相容: 3 },
    pros: ["元件之間各自獨立，所有資源由自身控制如何載入", "Shadow DOM 提供樣式隔離", "瀏覽器標準，不綁定任何框架"],
    cons: ["舊瀏覽器需要 polyfills 補足支援度", "屬性只能傳字串，複雜資料要另外設計", "SSR 需要 Declarative Shadow DOM，生態仍在成熟中"],
    fit: "跨框架共用的 UI 元件（例如設計系統），或希望長期不綁框架的情境。",
  },
  {
    key: "federation",
    label: "Module Federation",
    code: "D",
    how: "Webpack 5 的 Module Federation Plugin：Host 在執行期從遠端的 remoteEntry.js 載入模組，並與 Remote 協商共用相同的依賴（例如只載一份 React）。",
    scores: { 上手容易: 2, 隔離程度: 3, 跨應用溝通: 4, "SSR 支援": 3, 獨立部署: 5, 瀏覽器相容: 4 },
    pros: ["模組可以獨立部署、獨立擴展", "依賴可以共享，避免載入多份框架", "對開發者來說就像一般的 import，體驗最自然"],
    cons: ["實作較複雜，設定與除錯門檻高", "要了解各前端框架的 bootstrap 啟動方法", "JS 共用同一個執行環境，CSS 隔離仍要靠約定"],
    fit: "多個團隊各自維護一部分頁面、需要頻繁獨立上線，且願意投資建置基礎設施的中大型產品。",
  },
];

/* ---------- 雷達圖 ---------- */

const VW = 360;
const VH = 330;
const CX = VW / 2;
const CY = 168;
const R = 108;
const MAX = 5;

function pt(i: number, score: number): [number, number] {
  const ang = -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length;
  const r = (score / MAX) * R;
  return [CX + r * Math.cos(ang), CY + r * Math.sin(ang)];
}

function polygon(scores: Record<AxisKey, number>): string {
  return AXES.map((a, i) => {
    const [x, y] = pt(i, scores[a]);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ") + " Z";
}

function Radar({ current, overlay, reduce }: { current: Approach; overlay: boolean; reduce: boolean }) {
  const rings = [1, 2, 3, 4, 5];
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" role="img" aria-label={`雷達圖：${current.label} 在六個面向的示意評分，${AXES.map((a) => `${a} ${current.scores[a]} 分`).join("、")}，滿分 5 分。`} style={{ display: "block", maxWidth: 420, margin: "0 auto" }}>
      <rect width={VW} height={VH} rx={10} fill={PANEL} />
      {/* 同心環與刻度 */}
      {rings.map((r) => {
        const d = AXES.map((_, i) => {
          const [x, y] = pt(i, r);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(" ");
        return <path key={r} d={`${d} Z`} fill={r === MAX ? "#ffffff" : "none"} stroke={GRAY_2} strokeWidth={1} />;
      })}
      {rings.map((r) => (
        <text key={`t-${r}`} x={CX + 4} y={CY - (r / MAX) * R + 3} fontSize={8.5} fill={MUTED} fontFamily={FONT}>
          {r}
        </text>
      ))}
      {/* 軸線與標籤 */}
      {AXES.map((a, i) => {
        const [x, y] = pt(i, MAX);
        const [lx, ly] = pt(i, MAX + 1.05);
        const anchor = Math.abs(lx - CX) < 6 ? "middle" : lx > CX ? "start" : "end";
        return (
          <g key={a}>
            <line x1={CX} y1={CY} x2={x} y2={y} stroke={GRAY} strokeWidth={1} />
            <text x={lx} y={ly + 4} textAnchor={anchor} fontSize={11} fontWeight={700} fill={NAVY_DEEP} fontFamily={FONT}>
              {a}
            </text>
          </g>
        );
      })}
      {/* 其他方式的疊圖 */}
      {overlay &&
        APPROACHES.filter((ap) => ap.key !== current.key).map((ap) => (
          <g key={ap.key}>
            <path d={polygon(ap.scores)} fill="none" stroke={MUTED} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
            {AXES.map((a, i) => {
              const [x, y] = pt(i, ap.scores[a]);
              return i === 0 ? (
                <text key={a} x={x + 6} y={y - 4} fontSize={9} fontWeight={700} fill={MUTED} fontFamily={FONT}>
                  {ap.code}
                </text>
              ) : null;
            })}
          </g>
        ))}
      {/* 目前方式 */}
      <motion.path
        d={polygon(current.scores)}
        fill={NAVY}
        fillOpacity={0.18}
        stroke={NAVY}
        strokeWidth={2}
        strokeLinejoin="round"
        initial={false}
        animate={{ d: polygon(current.scores) }}
        transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}
      />
      {AXES.map((a, i) => {
        const [x, y] = pt(i, current.scores[a]);
        return (
          <g key={a}>
            <motion.circle r={4} fill="#ffffff" stroke={NAVY} strokeWidth={2} initial={false} animate={{ cx: x, cy: y }} transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }} />
            <motion.text fontSize={10} fontWeight={800} fill={NAVY} fontFamily={FONT} textAnchor="middle" initial={false} animate={{ x: x + (x > CX ? 12 : x < CX ? -12 : 0), y: y + (y > CY ? 14 : -8) }} transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}>
              {current.scores[a]}
            </motion.text>
          </g>
        );
      })}
      <text x={CX} y={VH - 12} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={FONT}>
        示意評分，1 分最低、5 分最高；越外圈代表該面向越有優勢
      </text>
    </svg>
  );
}

/* ---------- 右側面板 ---------- */

function ScoreBar({ label, value }: { label: AxisKey; value: number }) {
  const pct = (value / MAX) * 100;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "76px 1fr 18px", alignItems: "center", gap: 8, fontSize: 11.5 }}>
      <span style={{ color: TEXT, fontWeight: 700 }}>{label}</span>
      <span style={{ height: 6, background: GRAY_2, borderRadius: 999, overflow: "hidden" }}>
        <motion.span style={{ display: "block", height: "100%", background: value >= 4 ? GREEN : value <= 2 ? ORANGE_DEEP : NAVY, borderRadius: 999 }} initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.35, ease: "easeOut" }} />
      </span>
      <span style={{ color: MUTED, fontWeight: 800, fontFamily: MONO, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone: "green" | "orange" }) {
  const fg = tone === "green" ? GREEN : ORANGE_700;
  const bg = tone === "green" ? GREEN_50 : ORANGE_50;
  return (
    <div style={{ flex: "1 1 200px", minWidth: 0, background: bg, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", color: fg, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((t) => (
          <div key={t} style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.6, color: TEXT }}>
            <span style={{ color: fg, flex: "0 0 auto", marginTop: 3 }}>{tone === "green" ? <Check size={13} /> : <Minus size={13} />}</span>
            <span>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 主元件 ---------- */

const tabBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  borderRadius: 8,
  border: "none",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 160ms, color 160ms",
};

export default function MicroFrontendApproachCompare() {
  const reduce = useReducedMotion() ?? false;
  const [key, setKey] = useState("federation");
  const [overlay, setOverlay] = useState(false);
  const current = APPROACHES.find((a) => a.key === key) ?? APPROACHES[0];

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div role="group" aria-label="選擇實作方式" style={{ display: "inline-flex", flexWrap: "wrap", padding: 3, borderRadius: 10, background: BLUE_50, border: `1px solid ${BLUE_100}` }}>
          {APPROACHES.map((a) => {
            const on = a.key === key;
            return (
              <button key={a.key} type="button" aria-pressed={on} onClick={() => setKey(a.key)} style={{ ...tabBtn, background: on ? NAVY : "transparent", color: on ? "#ffffff" : NAVY }}>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, opacity: 0.8 }}>{a.code}</span>
                {a.label}
              </button>
            );
          })}
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: NAVY, cursor: "pointer" }}>
          <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} style={{ accentColor: NAVY, width: 15, height: 15 }} />
          <Layers size={15} /> 疊上其他三種方式
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "stretch" }}>
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <Radar current={current} overlay={overlay} reduce={reduce} />
        </div>
        <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: "#ffffff", background: NAVY, borderRadius: 6, padding: "1px 7px" }}>{current.code}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: NAVY_DEEP }}>{current.label}</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: TEXT }}>{current.how}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2 }}>
              {AXES.map((a) => (
                <ScoreBar key={a} label={a} value={current.scores[a]} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <ListBlock title="優點" items={current.pros} tone="green" />
            <ListBlock title="缺點" items={current.cons} tone="orange" />
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.7, color: TEXT, background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "8px 12px" }}>
            <strong style={{ color: NAVY_DEEP }}>適合：</strong>
            {current.fit}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, borderTop: `1px solid ${BLUE_200}`, paddingTop: 8 }}>
        評分為便於比較的示意值，實際取捨會隨團隊規模、既有技術棧與瀏覽器支援需求而不同。
      </div>
    </div>
  );
}
