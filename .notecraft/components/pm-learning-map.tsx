import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BookOpenCheck, ChevronLeft, ChevronRight, Lightbulb, ListChecks } from "lucide-react";

/* trendlink-design 色票（生成元件的 Tailwind class 不會被編譯，直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700
const NAVY_DEEP = "#112f5d"; // --blue-900
const BLUE_50 = "#eef4fb";
const BLUE_100 = "#d6e4f5";
const BLUE_200 = "#adc8e8";
const ORANGE = "#ed9b26"; // --orange-400
const ORANGE_DEEP = "#e37b24"; // --orange-500
const ORANGE_50 = "#fdf4e6";
const ORANGE_100 = "#fbe7c6";
const ORANGE_700 = "#a04f15";
const INK = "#2b3550";
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const SUCCESS = "#2e9e6b";
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";

interface Chapter {
  no: number;
  short: string;
  title: string;
  question: string;
  ready: boolean;
  insight: string;
  points: string[];
  outcome: string;
}

const CHAPTERS: Chapter[] = [
  {
    no: 1,
    short: "專案 vs 產品",
    title: "專案 vs 產品",
    question: "在管什麼？",
    ready: true,
    insight: "判斷手上是專案還是產品，是後面所有選擇的地基。",
    points: ["專案重成果（鐵三角：範疇 / 時程 / 成本），傾向凍結需求", "產品重價值，持續迭代、擁抱變化", "同一句「需求變了」在兩邊意義完全相反"],
    outcome: "對一件新工作，先判斷它是一次性交付還是持續經營。",
  },
  {
    no: 2,
    short: "方法論",
    title: "專案管理方法論",
    question: "怎麼做？",
    ready: true,
    insight: "方法論不是信仰，而是依「在管什麼」挑出來的工具箱。",
    points: ["Waterfall 適合需求穩定、交付物明確的情境", "Agile 適合需求會變、需要快速回饋的情境", "精神比流程重要：追求可預測，還是追求可適應"],
    outcome: "替一個項目選出合適的方法論，並說得出理由。",
  },
  {
    no: 3,
    short: "R&R 權責",
    title: "R&R 角色與職責",
    question: "誰來做？",
    ready: true,
    insight: "同一群人在不同方法論底下，權責流向完全不同。",
    points: ["界定每件事誰拍板、誰執行、誰被諮詢、誰只是被通知", "RACI 之類的表格是常見的界定工具", "權責不清，是專案爭議最常見的根源"],
    outcome: "替團隊畫出一張說得清楚的權責表。",
  },
  {
    no: 4,
    short: "Waterfall SDLC",
    title: "Waterfall SDLC",
    question: "經典怎麼跑？",
    ready: true,
    insight: "階段、會議、交付物環環相扣：前一階段的產出就是下一階段的輸入。",
    points: ["九個階段從 Blueprint 到 Maintenance 單向推進", "五場會議守住閘門，七份交付物接力傳遞", "越晚變更，成本越高"],
    outcome: "說出每個階段該產出什麼、由誰驗收。",
  },
  {
    no: 5,
    short: "工具落地",
    title: "專案管理工具",
    question: "用什麼做？",
    ready: true,
    insight: "工具是觀念落地的載體，不是觀念本身。",
    points: ["WBS 拆範圍（100% Rule、8/80 粒度），加上時間欄位就是 Gantt", "Kanban 追流動，卡片堆積的欄位就是瓶頸", "Task 的時間欄位攤開，才能反推每一段的耗時"],
    outcome: "用 WBS 規劃範圍與時程，用 Kanban 與 Task 追蹤執行並找出瓶頸。",
  },
];

/* SVG viewBox 寬 = 實際像素寬（不小於 MIN_W），文字維持 1:1，節點間距隨寬度延展 */
const MIN_W = 720;
const NODE_H = 78;
const NODE_Y = 64;

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

/* ---------- 插圖：節點小圖示（以 (0,0) 為中心，約 28 x 22） ---------- */

function Pictogram({ no, c, soft }: { no: number; c: string; soft: string }) {
  const s = { fill: "none", stroke: c, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (no) {
    case 1: // 有終點的線 vs 沒有終點的循環
      return (
        <g>
          <path d="M-14 6 H-3" {...s} />
          <path d="M-3 6 V-8 L3 -5.5 L-3 -3" {...s} fill={soft} />
          <circle cx={9} cy={1} r={5.5} {...s} strokeDasharray="26 8" />
          <path d="M12.5 -5 l1.5 2.5 l-3 0.5" {...s} />
        </g>
      );
    case 2: // 分岔：依情境選方法
      return (
        <g>
          <path d="M0 10 V2" {...s} />
          <path d="M0 2 L-10 -7 M0 2 L10 -7" {...s} />
          <path d="M-10 -7 l1 4 M-10 -7 l4 -1 M10 -7 l-1 4 M10 -7 l-4 -1" {...s} />
        </g>
      );
    case 3: // 權責結構
      return (
        <g>
          <rect x={-5} y={-11} width={10} height={7} rx={1.5} {...s} fill={soft} />
          <path d="M0 -4 V0 M-9 0 H9 M-9 0 V3 M9 0 V3" {...s} />
          <rect x={-14} y={3} width={10} height={7} rx={1.5} {...s} />
          <rect x={4} y={3} width={10} height={7} rx={1.5} {...s} />
        </g>
      );
    case 4: // 階梯瀑布
      return (
        <g>
          <path d="M-14 -9 H-6 V-3 H2 V3 H10 V9 H14" {...s} />
          <path d="M-6 -9 V-5 M2 -3 V1 M10 3 V7" stroke={c} strokeWidth={3} strokeLinecap="butt" />
        </g>
      );
    default: // 甘特長條
      return (
        <g>
          <rect x={-14} y={-9} width={14} height={4.5} rx={2} fill={c} />
          <rect x={-6} y={-2} width={14} height={4.5} rx={2} fill={soft} stroke={c} strokeWidth={1} />
          <rect x={2} y={5} width={12} height={4.5} rx={2} fill={c} />
        </g>
      );
  }
}

/* ---------- 插圖：各章核心概念的場景（切換章節時重播） ---------- */

const SCENE_CSS = `
  @keyframes lmDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  @keyframes lmFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes lmGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes lmSpin { to { transform: rotate(360deg); } }
  .lm-draw { stroke-dasharray: 1; animation: lmDraw 700ms ease-out both; }
  .lm-fade { animation: lmFade 400ms ease-out both; }
  .lm-grow { transform-box: fill-box; transform-origin: left center; animation: lmGrow 450ms ease-out both; }
  .lm-spin { transform-box: fill-box; transform-origin: center; animation: lmSpin 3.2s linear infinite; }
  @media (prefers-reduced-motion: reduce) { .lm-draw, .lm-fade, .lm-grow, .lm-spin { animation: none; } }
`;

const wait = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

function T({ x, y, children, color = MUTED, size = 9, weight = 500, anchor = "middle" }: { x: number; y: number; children: string; color?: string; size?: number; weight?: number; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={color} fontFamily={FONT}>
      {children}
    </text>
  );
}

/** 帶箭頭的迴圈；外層透明圓讓旋轉以圓心為中心 */
function Loop({ x, y, r, color, spin, delay = 0 }: { x: number; y: number; r: number; color: string; spin: boolean; delay?: number }) {
  const a0 = (-80 * Math.PI) / 180;
  const a1 = (220 * Math.PI) / 180;
  const p = (a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  const hx = r * Math.cos(a1);
  const hy = r * Math.sin(a1);
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={spin ? "lm-spin" : undefined} style={wait(delay)}>
        <circle r={r + 5} fill="transparent" />
        <path d={`M${p(a0)} A${r} ${r} 0 1 1 ${p(a1)}`} fill="none" stroke={color} strokeWidth={1.75} />
        <path d="M0 0 L-5 -3.5 L-5 3.5 Z" transform={`translate(${hx.toFixed(2)} ${hy.toFixed(2)}) rotate(-50)`} fill={color} />
      </g>
    </g>
  );
}

/* 第 1 章：專案走到終點，產品繞著圈持續累積價值 */
function SceneProjectProduct() {
  return (
    <g>
      <T x={60} y={20} color={NAVY_DEEP} weight={800} size={10}>
        專案
      </T>
      <T x={180} y={20} color={ORANGE_700} weight={800} size={10}>
        產品
      </T>
      <line x1={120} y1={12} x2={120} y2={138} stroke={GRAY_2} strokeWidth={1} strokeDasharray="3 3" />
      <line x1={14} y1={84} x2={96} y2={84} stroke={GRAY} strokeWidth={1} />
      {[0, 1, 2, 3].map((k) => (
        <rect key={k} x={14 + k * 20} y={70} width={18} height={10} rx={2} fill={k === 3 ? BLUE_200 : NAVY} className="lm-grow" style={wait(k * 220)} />
      ))}
      <g className="lm-fade" style={wait(950)}>
        <path d="M100 84 V52 L112 57 L100 62" fill={ORANGE_50} stroke={ORANGE_DEEP} strokeWidth={1.5} strokeLinejoin="round" />
        <T x={100} y={100} color={NAVY_DEEP} weight={700}>
          結案
        </T>
      </g>
      <T x={55} y={140}>
        有明確的終點
      </T>
      <Loop x={180} y={62} r={24} color={ORANGE_DEEP} spin />
      <T x={180} y={65} color={ORANGE_700} weight={700} size={8.5}>
        迭代
      </T>
      <path d="M148 128 H160 V120 H172 V112 H184 V104 H196 V96 H212" fill="none" stroke={NAVY} strokeWidth={1.5} pathLength={1} className="lm-draw" style={wait(300)} />
      <T x={180} y={140} size={8.5}>
        價值持續累積
      </T>
    </g>
  );
}

/* 第 2 章：瀑布階梯（剛性）vs Sprint 迴圈（柔性） */
function SceneMethods() {
  return (
    <g>
      <T x={60} y={20} color={NAVY_DEEP} weight={800} size={10}>
        Waterfall
      </T>
      <T x={180} y={20} color={ORANGE_700} weight={800} size={10}>
        Agile
      </T>
      <line x1={120} y1={12} x2={120} y2={138} stroke={GRAY_2} strokeWidth={1} strokeDasharray="3 3" />
      {[0, 1, 2, 3].map((k) => (
        <g key={k} className="lm-fade" style={wait(k * 200)}>
          <rect x={14 + k * 22} y={32 + k * 18} width={30} height={14} rx={3} fill={k < 3 ? NAVY : BLUE_50} stroke={NAVY} strokeWidth={1.25} />
          {k < 3 && <path d={`M${44 + k * 22} ${39 + k * 18} h3 v18 h-3`} fill="none" stroke={BLUE_200} strokeWidth={1.25} />}
        </g>
      ))}
      <T x={60} y={128}>
        剛性：凍結需求、一次交付
      </T>
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <Loop x={146 + k * 34} y={72} r={12} color={k === 2 ? ORANGE_DEEP : NAVY} spin={k === 2} />
          {k < 2 && <path d={`M${160 + k * 34} 72 h6`} stroke={GRAY} strokeWidth={1.25} />}
          <T x={146 + k * 34} y={98} size={8.5} color={k === 2 ? ORANGE_700 : NAVY} weight={700}>
            {`S${k + 1}`}
          </T>
        </g>
      ))}
      <g className="lm-fade" style={wait(700)}>
        <rect x={196} y={36} width={26} height={12} rx={6} fill={ORANGE_100} stroke={ORANGE_DEEP} strokeWidth={1} />
        <T x={209} y={45} size={7.5} color={ORANGE_700} weight={700}>
          變更
        </T>
        <path d="M209 48 V56" stroke={ORANGE_DEEP} strokeWidth={1} strokeDasharray="2 2" />
      </g>
      <T x={180} y={128}>
        柔性：小步迭代、擁抱變化
      </T>
    </g>
  );
}

/* 第 3 章：指揮鏈由上而下 vs 自組織團隊由外圍服務 */
function SceneRoles() {
  const box = (x: number, y: number, label: string, fill: string, delay: number) => (
    <g className="lm-fade" style={wait(delay)}>
      <rect x={x - 20} y={y - 9} width={40} height={18} rx={3} fill={fill} stroke={NAVY} strokeWidth={1.25} />
      <T x={x} y={y + 3.5} size={8.5} weight={700} color={fill === NAVY ? "#ffffff" : NAVY_DEEP}>
        {label}
      </T>
    </g>
  );
  return (
    <g>
      <T x={60} y={20} color={NAVY_DEEP} weight={800} size={10}>
        Waterfall
      </T>
      <T x={180} y={20} color={ORANGE_700} weight={800} size={10}>
        Scrum
      </T>
      <line x1={120} y1={12} x2={120} y2={138} stroke={GRAY_2} strokeWidth={1} strokeDasharray="3 3" />
      {box(60, 40, "PM", NAVY, 0)}
      <path d="M60 49 V60" stroke={NAVY} strokeWidth={1.25} pathLength={1} className="lm-draw" style={wait(200)} />
      {box(60, 69, "架構師", BLUE_50, 300)}
      <path d="M60 78 V84 M34 84 H86 M34 84 V90 M86 84 V90" fill="none" stroke={NAVY} strokeWidth={1.25} pathLength={1} className="lm-draw" style={wait(500)} />
      {box(34, 99, "開發", "#ffffff", 700)}
      {box(86, 99, "測試", "#ffffff", 800)}
      <T x={60} y={128}>
        由上而下指派
      </T>
      <circle cx={180} cy={84} r={26} fill={BLUE_50} stroke={NAVY} strokeWidth={1.25} className="lm-fade" />
      {[0, 1, 2, 3].map((k) => {
        const a = (k * 90 + 45) * (Math.PI / 180);
        return <circle key={k} cx={180 + 12 * Math.cos(a)} cy={84 + 12 * Math.sin(a)} r={4} fill={BLUE_200} className="lm-fade" style={wait(200 + k * 100)} />;
      })}
      <g className="lm-fade" style={wait(600)}>
        <circle cx={148} cy={40} r={11} fill={ORANGE_50} stroke={ORANGE_DEEP} strokeWidth={1.25} />
        <T x={148} y={43} size={8} weight={800} color={ORANGE_700}>
          PO
        </T>
        <circle cx={212} cy={40} r={11} fill={ORANGE_50} stroke={ORANGE_DEEP} strokeWidth={1.25} />
        <T x={212} y={43} size={8} weight={800} color={ORANGE_700}>
          SM
        </T>
      </g>
      <path d="M155 49 L164 62" stroke={ORANGE_DEEP} strokeWidth={1.25} pathLength={1} className="lm-draw" style={wait(800)} />
      <path d="M205 49 L196 62" stroke={ORANGE_DEEP} strokeWidth={1.25} pathLength={1} className="lm-draw" style={wait(800)} />
      <T x={180} y={128}>
        由外圍服務團隊
      </T>
    </g>
  );
}

/* 第 4 章：階段逐級往下，每過一道閘門交出一份文件 */
function SceneSdlc() {
  const docs = ["PRD", "SRS", "SDD", "Test", "UAT"];
  return (
    <g>
      {docs.map((d, k) => {
        const x = 14 + k * 43;
        const y = 22 + k * 14;
        return (
          <g key={d}>
            <g className="lm-fade" style={wait(k * 220)}>
              <rect x={x} y={y} width={32} height={12} rx={2.5} fill={NAVY} />
              {k < docs.length - 1 && (
                <g>
                  <path d={`M${x + 32} ${y + 6} h7 v14 h4`} fill="none" stroke={BLUE_200} strokeWidth={1.25} />
                  <rect x={x + 37} y={y + 10} width={4} height={7} rx={1} fill={SUCCESS} />
                </g>
              )}
            </g>
            <g className="lm-fade" style={wait(k * 220 + 150)}>
              <path d={`M${x + 4} 110 h18 l6 6 v16 h-24 Z`} fill={BLUE_50} stroke={NAVY} strokeWidth={1.1} />
              <T x={x + 16} y={125} size={7.5} weight={700} color={NAVY_DEEP}>
                {d}
              </T>
              {k < docs.length - 1 && <path d={`M${x + 30} 121 h10`} stroke={GRAY} strokeWidth={1} />}
            </g>
          </g>
        );
      })}
      <path d="M222 80 C 236 44, 206 24, 156 34" fill="none" stroke={ORANGE_DEEP} strokeWidth={1.25} strokeDasharray="4 3" className="lm-fade" style={wait(1200)} />
      <path d="M156 34 l6 -4 l-1 6 Z" fill={ORANGE_DEEP} className="lm-fade" style={wait(1200)} />
      <T x={228} y={16} anchor="end" color={ORANGE_700} size={8.5} weight={700}>
        越晚回頭越貴
      </T>
      <T x={120} y={146} size={8.5}>
        每過一道閘門，交出一份文件
      </T>
    </g>
  );
}

/* 第 5 章：WBS 拆範圍 → Gantt 排時程 → Kanban 追流動 */
function SceneTools() {
  return (
    <g>
      {/* WBS */}
      <g className="lm-fade">
        <rect x={24} y={34} width={30} height={12} rx={2} fill={NAVY} />
        <path d="M39 46 V54 M16 54 H62 M16 54 V60 M39 54 V60 M62 54 V60" fill="none" stroke={NAVY} strokeWidth={1.1} />
        {[0, 1, 2].map((k) => (
          <rect key={k} x={8 + k * 23} y={60} width={16} height={10} rx={2} fill={BLUE_50} stroke={NAVY} strokeWidth={1} />
        ))}
      </g>
      <T x={39} y={96} color={NAVY_DEEP} weight={800} size={9.5}>
        WBS
      </T>
      <T x={39} y={108} size={8}>
        拆範圍
      </T>
      <path d="M74 56 h8" stroke={GRAY} strokeWidth={1.25} />
      <path d="M82 56 l-3 -2.5 v5 Z" fill={GRAY} />
      {/* Gantt */}
      {[0, 1, 2, 3].map((k) => (
        <rect key={k} x={90 + [0, 10, 20, 34][k]} y={36 + k * 10} width={[18, 22, 16, 12][k]} height={6} rx={3} fill={k === 3 ? ORANGE_DEEP : NAVY} className="lm-grow" style={wait(300 + k * 150)} />
      ))}
      <line x1={88} y1={80} x2={140} y2={80} stroke={GRAY} strokeWidth={1} />
      <T x={114} y={96} color={NAVY_DEEP} weight={800} size={9.5}>
        Gantt
      </T>
      <T x={114} y={108} size={8}>
        排時程
      </T>
      <path d="M148 56 h8" stroke={GRAY} strokeWidth={1.25} />
      <path d="M156 56 l-3 -2.5 v5 Z" fill={GRAY} />
      {/* Kanban */}
      {[0, 1, 2].map((col) => (
        <g key={col}>
          <rect x={162 + col * 23} y={30} width={20} height={52} rx={2} fill={PANEL} stroke={GRAY_2} strokeWidth={1} />
          {Array.from({ length: [3, 2, 1][col] }, (_, k) => (
            <rect key={k} x={165 + col * 23} y={35 + k * 12} width={14} height={9} rx={1.5} fill={col === 1 ? ORANGE_100 : col === 2 ? "#e8f5ee" : "#ffffff"} stroke={col === 1 ? ORANGE_DEEP : col === 2 ? SUCCESS : BLUE_200} strokeWidth={1} className="lm-fade" style={wait(900 + col * 200 + k * 80)} />
          ))}
        </g>
      ))}
      <T x={196} y={96} color={NAVY_DEEP} weight={800} size={9.5}>
        Kanban
      </T>
      <T x={196} y={108} size={8}>
        追流動
      </T>
      <T x={120} y={134} size={8.5}>
        規劃期 → 執行期
      </T>
    </g>
  );
}

const SCENES = [SceneProjectProduct, SceneMethods, SceneRoles, SceneSdlc, SceneTools];
const SCENE_ALT = [
  "專案是一條有終點、會結案的路徑；產品是持續迭代的循環，價值一階一階累積",
  "Waterfall 是逐級往下的階梯，Agile 是一個接一個的 Sprint 迴圈，變更可以排進下一輪",
  "Waterfall 的 PM 在頂端逐層指派；Scrum 的團隊在中央自組織，PO 與 SM 從外圍服務",
  "五個階段逐級往下，每過一道閘門交出一份文件，越晚回頭越貴",
  "WBS 拆出工作包，Gantt 把它們排上時間軸，Kanban 追蹤每張卡片的流動",
];

function ChapterScene({ i }: { i: number }) {
  const Scene = SCENES[i];
  return (
    <svg viewBox="0 0 240 150" width="100%" role="img" aria-label={`第 ${i + 1} 章插圖：${SCENE_ALT[i]}`} style={{ display: "block" }}>
      <style>{SCENE_CSS}</style>
      <Scene />
    </svg>
  );
}

/* ---------- 圖：章節路線圖 ---------- */

function Roadmap({ selected, onSelect, reduce }: { selected: number; onSelect: (i: number) => void; reduce: boolean }) {
  const [svgRef, W] = useMeasuredWidth(MIN_W);
  // 左右各留 PAD，首尾節點完整落在圖內；節點間至少留 30px 給箭頭
  const PAD = 24;
  const n = CHAPTERS.length;
  const NODE_W = Math.min(160, (W - PAD * 2 - 30 * (n - 1)) / n);
  const step = (W - PAD * 2 - NODE_W) / (n - 1);
  const xOf = (i: number) => PAD + NODE_W / 2 + i * step;
  const sel = CHAPTERS[selected];
  const spanX0 = xOf(0) - NODE_W / 2;
  const spanX1 = xOf(selected) + NODE_W / 2;
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} 220`}
      width="100%"
      role="img"
      aria-label={`專案管理系列路線圖：五章依序排列，每章建立在前一章之上。目前選取第 ${sel.no} 章「${sel.title}」，回答「${sel.question}」，前置章節為${selected === 0 ? "無" : `第 1 到第 ${selected} 章`}。`}
    >
      <rect width={W} height={220} rx={12} fill={PANEL} />
      {/* 每章回答的問題 */}
      {CHAPTERS.map((c, i) => (
        <text key={c.no} x={xOf(i)} y={40} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={i <= selected ? ORANGE_DEEP : MUTED} fontFamily={FONT}>
          {c.question}
        </text>
      ))}
      {/* 相依箭頭 */}
      {CHAPTERS.slice(1).map((c, k) => {
        const i = k + 1;
        const on = i <= selected;
        const x0 = xOf(i - 1) + NODE_W / 2;
        const x1 = xOf(i) - NODE_W / 2;
        const y = NODE_Y + NODE_H / 2;
        return (
          <g key={c.no}>
            <line x1={x0 + 2} y1={y} x2={x1 - 6} y2={y} stroke={on ? ORANGE : GRAY} strokeWidth={on ? 2 : 1.5} strokeDasharray={on ? undefined : "4 3"} />
            <path d={`M${x1 - 9} ${y - 4} L${x1 - 2} ${y} L${x1 - 9} ${y + 4}`} fill="none" stroke={on ? ORANGE : GRAY} strokeWidth={on ? 2 : 1.5} />
          </g>
        );
      })}
      {/* 章節節點 */}
      {CHAPTERS.map((c, i) => {
        const isSel = i === selected;
        const isPre = i < selected;
        const x = xOf(i) - NODE_W / 2;
        return (
          <g key={c.no} onClick={() => onSelect(i)} style={{ cursor: "pointer" }}>
            <rect
              x={x}
              y={NODE_Y}
              width={NODE_W}
              height={NODE_H}
              rx={8}
              fill={isSel ? NAVY : isPre ? BLUE_50 : "#ffffff"}
              stroke={isSel ? NAVY : isPre ? BLUE_200 : GRAY}
              strokeWidth={1.5}
              style={{ transition: reduce ? "none" : "fill 200ms, stroke 200ms" }}
            />
            {/* 章節小圖示：隨選取狀態變色 */}
            <g transform={`translate(${xOf(i)} ${NODE_Y + 20})`}>
              <Pictogram no={c.no} c={isSel ? "#ffffff" : isPre ? NAVY : MUTED} soft={isSel ? BLUE_200 : isPre ? BLUE_100 : GRAY_2} />
            </g>
            <text x={xOf(i)} y={NODE_Y + 47} textAnchor="middle" fontSize={10} fontWeight={700} fill={isSel ? BLUE_200 : MUTED} fontFamily={FONT} letterSpacing="0.06em">
              CH {c.no}
            </text>
            <text x={xOf(i)} y={NODE_Y + 65} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={isSel ? "#ffffff" : isPre ? NAVY : INK} fontFamily={FONT}>
              {c.short}
            </text>
            {/* 撰寫狀態 */}
            <circle cx={xOf(i) - 22} cy={NODE_Y + NODE_H + 18} r={3.5} fill={c.ready ? SUCCESS : GRAY} />
            <text x={xOf(i) - 14} y={NODE_Y + NODE_H + 22} fontSize={10.5} fill={c.ready ? SUCCESS : MUTED} fontFamily={FONT}>
              {c.ready ? "已完成" : "整理中"}
            </text>
          </g>
        );
      })}
      {/* 前置知識範圍 */}
      <g>
        <path
          d={`M${spanX0} 182 V190 H${spanX1} V182`}
          fill="none"
          stroke={selected === 0 ? GRAY : ORANGE}
          strokeWidth={1.5}
        />
        <text x={(spanX0 + spanX1) / 2} y={208} textAnchor="middle" fontSize={11} fill={selected === 0 ? MUTED : ORANGE_DEEP} fontWeight={700} fontFamily={FONT}>
          {selected === 0 ? "起點：不需前置知識" : `讀第 ${sel.no} 章前，建議先讀完第 1${selected > 1 ? `–${selected}` : ""} 章`}
        </text>
      </g>
    </svg>
  );
}

/* ---------- 主元件 ---------- */

const navButton = (disabled: boolean): CSSProperties => ({
  flex: "none",
  display: "inline-flex",
  width: 34,
  height: 34,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: `1.5px solid ${disabled ? GRAY_2 : BLUE_200}`,
  color: disabled ? GRAY : NAVY,
  backgroundColor: "#ffffff",
  cursor: disabled ? "default" : "pointer",
});

export default function PmLearningMap() {
  const reduce = useReducedMotion() ?? false;
  const [selected, setSelected] = useState(0);
  const ch = CHAPTERS[selected];

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <Roadmap selected={selected} onSelect={setSelected} reduce={reduce} />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={() => setSelected((i) => Math.max(0, i - 1))} disabled={selected === 0} aria-label="上一章" style={navButton(selected === 0)}>
          <ChevronLeft size={18} />
        </button>
        <div role="group" aria-label="章節" style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {CHAPTERS.map((c, i) => {
            const on = i === selected;
            return (
              <button
                key={c.no}
                type="button"
                onClick={() => setSelected(i)}
                aria-pressed={on}
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: `1.5px solid ${on ? NAVY : GRAY_2}`,
                  background: on ? NAVY : "#ffffff",
                  color: on ? "#ffffff" : TEXT,
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background-color 160ms, color 160ms, border-color 160ms",
                }}
              >
                第 {c.no} 章
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setSelected((i) => Math.min(CHAPTERS.length - 1, i + 1))} disabled={selected === CHAPTERS.length - 1} aria-label="下一章" style={navButton(selected === CHAPTERS.length - 1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={ch.no}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: "0 1 280px", minWidth: 220, background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 10, padding: 8 }}>
            {/* key 讓切換章節時插圖重新掛載、動畫重播 */}
            <ChapterScene key={ch.no} i={selected} />
          </div>
          <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", justifyContent: "center", background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
              <Lightbulb size={15} /> 第 {ch.no} 章 · {ch.title}
              {!ch.ready && <span style={{ marginLeft: "auto", fontSize: 11, color: ORANGE_DEEP, background: ORANGE_50, border: `1px solid ${ORANGE_100}`, padding: "1px 8px", borderRadius: 999 }}>整理中</span>}
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: NAVY_DEEP, lineHeight: 1.6 }}>{ch.insight}</p>
          </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <div style={{ background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
              <ListChecks size={15} /> 學習重點
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {ch.points.map((p) => (
                <div key={p} style={{ display: "flex", gap: 8, fontSize: 13.5, color: TEXT, lineHeight: 1.6 }}>
                  <span style={{ width: 5, height: 5, marginTop: 9, borderRadius: 999, background: ORANGE, flexShrink: 0 }} />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: ORANGE_DEEP, marginBottom: 6 }}>
              <BookOpenCheck size={15} /> 讀完你會
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: INK, lineHeight: 1.6 }}>{ch.outcome}</p>
          </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
