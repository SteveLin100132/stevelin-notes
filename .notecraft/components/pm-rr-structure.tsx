import { useState, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { Pause, Play, UserRound } from "lucide-react";

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
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";

type RoleId = "pm" | "arch" | "dev" | "qa" | "po" | "sm" | "team";

/* 圖中的示意物件：跟著問題一起強調或淡出 */
type PropId = "spec" | "risk" | "tasks" | "backlog" | "sprint" | "obstacle" | "dod";

interface Role {
  short: string;
  full: string;
  side: "Waterfall" | "Scrum";
  duty: string;
}

const ROLES: Record<RoleId, Role> = {
  pm: { short: "PM", full: "Project Manager 專案經理", side: "Waterfall", duty: "負責專案整體規劃、執行與監控，確保專案如期、如質完成；管理團隊與資源，與利益相關者溝通協調，並處理風險與問題。站在指揮鏈頂端，由上而下指派工作。" },
  arch: { short: "架構師", full: "System Architect 系統架構師", side: "Waterfall", duty: "設計系統整體架構與技術方案，確保系統的可擴展性、可靠性與效能，並指導開發團隊進行技術實現。" },
  dev: { short: "開發團隊", full: "Development Team 開發團隊", side: "Waterfall", duty: "實際開發產品的成員，通常包含軟體工程師、設計師等，依需求規格進行開發。" },
  qa: { short: "測試團隊", full: "QA Team 測試團隊", side: "Waterfall", duty: "負責品質保證，包括測試計畫設計、測試案例撰寫、測試執行與缺陷管理等，確保產品品質符合標準。" },
  po: { short: "PO", full: "Product Owner 產品負責人", side: "Scrum", duty: "定義產品願景、制定 Roadmap、規劃 MVP、管理 Product Backlog，並與團隊及利益相關者溝通，確保開發方向符合用戶需求與商業目標。" },
  sm: { short: "SM", full: "Scrum Master", side: "Scrum", duty: "促進 Scrum 團隊的運作，協助團隊遵循 Scrum 流程、排除障礙、促進協作，確保 Sprint 目標能順利達成。" },
  team: { short: "開發團隊", full: "Developers 開發團隊（自組織、跨功能）", side: "Scrum", duty: "自組織、跨功能的開發成員，共同對 Sprint 目標負責。沒有人由上而下指派工作，團隊一起決定如何達成目標。" },
};

interface Question {
  label: string;
  wf: RoleId[];
  wfText: string;
  sc: RoleId[];
  scText: string;
  props: PropId[];
}

const QUESTIONS: Question[] = [
  { label: "誰決定做什麼", wf: ["pm"], wfText: "PM 依合約與需求規格拍板範疇。", sc: ["po"], scText: "PO 決定 Product Backlog 的內容與優先順序。", props: ["spec", "backlog"] },
  { label: "誰決定怎麼做", wf: ["arch"], wfText: "架構師定技術方案，開發照規格實作。", sc: ["team"], scText: "開發團隊自己決定怎麼實作。", props: [] },
  { label: "誰分派工作", wf: ["pm"], wfText: "PM 把工作逐層指派到個人。", sc: ["team"], scText: "成員從 Sprint Backlog 自己領工作。", props: ["tasks", "sprint"] },
  { label: "誰排除障礙", wf: ["pm"], wfText: "PM 處理風險與問題，必要時往上呈報。", sc: ["sm"], scText: "SM 移除障礙，保護團隊專注。", props: ["risk", "obstacle"] },
  { label: "誰把關品質", wf: ["qa"], wfText: "獨立的測試團隊在測試階段把關。", sc: ["team"], scText: "團隊共同對完成的定義（DoD）負責，測試在 Sprint 內完成。", props: ["dod"] },
];

/* ---------- 共用：節點樣式 ---------- */

interface NodeState {
  hit: boolean; // 目前問題的答案
  dim: boolean; // 有問題被選取、但不是答案
  picked: boolean; // 被點選查看職責
}

interface PropState {
  focus: boolean;
  dim: boolean;
}

function nodeColors(s: NodeState, base: string) {
  return {
    fill: s.hit ? ORANGE_50 : s.picked ? BLUE_50 : "#ffffff",
    stroke: s.hit ? ORANGE_DEEP : s.picked ? NAVY : base,
    width: s.hit || s.picked ? 2 : 1.25,
    opacity: s.dim ? 0.4 : 1,
  };
}

/* 示意物件的線色／底色：被問題點到時轉橘 */
function propColors(p: PropState, line = NAVY) {
  return {
    line: p.focus ? ORANGE_DEEP : line,
    fill: p.focus ? ORANGE_50 : "#ffffff",
    text: p.focus ? ORANGE_700 : MUTED,
    opacity: p.dim ? 0.35 : 1,
  };
}

function Clickable({ id, label, onPick, children }: { id: RoleId; label: string; onPick: (id: RoleId) => void; children: ReactNode }) {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`查看 ${label} 的職責`}
      onClick={() => onPick(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick(id);
        }
      }}
      style={{ cursor: "pointer", outline: "none" }}
    >
      {children}
    </g>
  );
}

/* SVG 內的位移用 CSS keyframes（motion 的 SVG transform 在此環境不可靠）；
   px 在 SVG 元素上等於 viewBox 使用者座標 */
const FLOW_CSS = `
  @keyframes pmRrFlow { to { stroke-dashoffset: -20; } }
  @keyframes pmRrCardA { 0% { transform: translate(170px, 98px); opacity: 0; } 15%, 80% { opacity: 1; } 100% { transform: translate(170px, 128px); opacity: 0; } }
  @keyframes pmRrCardB { 0% { transform: translate(152px, 177px); opacity: 0; } 15%, 80% { opacity: 1; } 100% { transform: translate(106px, 206px); opacity: 0; } }
  @keyframes pmRrCardC { 0% { transform: translate(188px, 177px); opacity: 0; } 15%, 80% { opacity: 1; } 100% { transform: translate(234px, 206px); opacity: 0; } }
  @keyframes pmRrFeed { 0% { transform: translate(96px, 106px); opacity: 0; } 15%, 80% { opacity: 1; } 100% { transform: translate(124px, 138px); opacity: 0; } }
  @keyframes pmRrClear { 0%, 30% { transform: translate(244px, 176px); opacity: 1; } 100% { transform: translate(282px, 190px); opacity: 0; } }
  .pm-rr-flow { stroke-dasharray: 6 4; animation: pmRrFlow 900ms linear infinite; }
  .pm-rr-card-a { animation: pmRrCardA 2400ms ease-in-out infinite; }
  .pm-rr-card-b { animation: pmRrCardB 2400ms ease-in-out 800ms infinite both; }
  .pm-rr-card-c { animation: pmRrCardC 2400ms ease-in-out 1600ms infinite both; }
  .pm-rr-feed { animation: pmRrFeed 2000ms ease-in-out infinite; }
  .pm-rr-feed-2 { animation: pmRrFeed 2000ms ease-in-out 1000ms infinite both; }
  .pm-rr-clear { animation: pmRrClear 3200ms ease-in infinite; }
  .pm-rr-paused, .pm-rr-paused * { animation-play-state: paused !important; }
  @media (prefers-reduced-motion: reduce) {
    .pm-rr-flow, .pm-rr-card-a, .pm-rr-card-b, .pm-rr-card-c, .pm-rr-feed, .pm-rr-feed-2, .pm-rr-clear { animation: none; }
  }
`;

const PW = 340;
const PH = 270;

function Arrow({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = x2 - 7 * Math.cos(a);
  const hy = y2 - 7 * Math.sin(a);
  return (
    <g>
      <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} strokeWidth={1.5} className="pm-rr-flow" />
      <path d={`M${x2} ${y2} L${hx - 4 * Math.sin(a)} ${hy + 4 * Math.cos(a)} L${hx + 4 * Math.sin(a)} ${hy - 4 * Math.cos(a)} Z`} fill={color} />
    </g>
  );
}

/* ---------- 小型示意圖元：角色圖示、文件、工作卡、人形剪影 ---------- */

type GlyphKind = "gantt" | "blueprint" | "code" | "checklist";

/* 18 x 18 的線稿圖示，(x, y) 為左上角 */
function Glyph({ kind, x, y, color }: { kind: GlyphKind; x: number; y: number; color: string }) {
  const line = { fill: "none", stroke: color, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      {kind === "gantt" && (
        <>
          <path d="M1 1 V17 H17" {...line} />
          <rect x={3} y={3} width={7} height={3} rx={1} fill={color} />
          <rect x={7} y={8} width={7} height={3} rx={1} fill={color} opacity={0.7} />
          <rect x={10} y={13} width={6} height={2.5} rx={1} fill={color} opacity={0.45} />
        </>
      )}
      {kind === "blueprint" && (
        <>
          <rect x={1} y={1} width={16} height={16} rx={1.5} {...line} />
          <path d="M1 7 H17 M7 7 V17 M12 7 V17" {...line} strokeWidth={1} />
          <path d="M4 4 H14" {...line} strokeWidth={1} />
        </>
      )}
      {kind === "code" && <path d="M6 4 L1 9 L6 14 M12 4 L17 9 L12 14 M10.5 2.5 L7.5 15.5" {...line} />}
      {kind === "checklist" && (
        <>
          <rect x={1} y={1} width={16} height={16} rx={1.5} {...line} />
          <path d="M4 6 L5.8 7.8 L8.6 4.4 M4 12.5 L5.8 14.3 L8.6 10.9" {...line} />
          <path d="M11 6 H14.5 M11 12.5 H14.5" {...line} strokeWidth={1} />
        </>
      )}
    </g>
  );
}

/* 折角文件：需求規格、風險清單 */
function DocIcon({ x, y, color, fill, mark }: { x: number; y: number; color: string; fill: string; mark: "lines" | "alert" }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <path d="M0 0 H17 L24 7 V30 H0 Z" fill={fill} stroke={color} strokeWidth={1.25} strokeLinejoin="round" />
      <path d="M17 0 V7 H24" fill="none" stroke={color} strokeWidth={1.25} strokeLinejoin="round" />
      {mark === "lines" ? (
        <path d="M5 12 H19 M5 17 H19 M5 22 H14" stroke={color} strokeWidth={1} strokeLinecap="round" />
      ) : (
        <>
          <path d="M5 13 H10 M5 19 H10 M5 25 H10" stroke={color} strokeWidth={1} strokeLinecap="round" />
          <path d="M16 11 L20 18 H12 Z" fill="none" stroke={color} strokeWidth={1.1} strokeLinejoin="round" />
          <path d="M16 13.5 V15.5" stroke={color} strokeWidth={1.1} strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

/* 工作卡，以原點為中心；transform 是無動畫（減少動態）時的靜止位置 */
function TaskCard({ className, at, color, fill }: { className: string; at: [number, number]; color: string; fill: string }) {
  return (
    <g className={className} transform={`translate(${at[0]} ${at[1]})`} aria-hidden="true">
      <rect x={-7} y={-5} width={14} height={10} rx={1.5} fill={fill} stroke={color} strokeWidth={1.1} />
      <path d="M-4 -1.5 H4 M-4 1.5 H1.5" stroke={color} strokeWidth={0.9} strokeLinecap="round" />
    </g>
  );
}

/* 中性人形剪影（無五官），用來表示團隊成員 */
function Member({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y - 5} r={3.4} fill={color} />
      <path d={`M${x - 6} ${y + 6} Q${x - 6} ${y} ${x} ${y} Q${x + 6} ${y} ${x + 6} ${y + 6} Z`} fill={color} />
    </g>
  );
}

/* ---------- Waterfall：指揮鏈 ---------- */

function BoxNode({ id, x, y, w, sub, glyph, st, onPick }: { id: RoleId; x: number; y: number; w: number; sub: string; glyph: GlyphKind; st: NodeState; onPick: (id: RoleId) => void }) {
  const c = nodeColors(st, BLUE_200);
  const left = x - w / 2;
  return (
    <Clickable id={id} label={ROLES[id].full} onPick={onPick}>
      <g opacity={c.opacity} style={{ transition: "opacity 200ms" }}>
        <rect x={left} y={y - 22} width={w} height={44} rx={6} fill={c.fill} stroke={c.stroke} strokeWidth={c.width} />
        <line x1={left + 34} y1={y - 14} x2={left + 34} y2={y + 14} stroke={st.hit ? ORANGE_100 : BLUE_100} strokeWidth={1} />
        <Glyph kind={glyph} x={left + 9} y={y - 9} color={st.hit ? ORANGE_DEEP : NAVY} />
        <text x={left + 44} y={y - 2} fontSize={13} fontWeight={800} fill={st.hit ? ORANGE_700 : NAVY_DEEP} fontFamily={FONT}>
          {ROLES[id].short}
        </text>
        <text x={left + 44} y={y + 13} fontSize={9.5} fill={MUTED} fontFamily={FONT}>
          {sub}
        </text>
      </g>
    </Clickable>
  );
}

function WaterfallPanel({ st, ps, onPick, flowing }: { st: (id: RoleId) => NodeState; ps: (id: PropId) => PropState; onPick: (id: RoleId) => void; flowing: boolean }) {
  const spec = propColors(ps("spec"));
  const risk = propColors(ps("risk"));
  const tasks = propColors(ps("tasks"));
  return (
    <svg
      viewBox={`0 0 ${PW} ${PH}`}
      width="100%"
      role="img"
      className={flowing ? undefined : "pm-rr-paused"}
      aria-label="Waterfall 指揮鏈：PM 在頂端，左邊握有需求規格、右邊管理風險清單；工作卡經架構師逐層往下指派給開發團隊與測試團隊。"
    >
      <style>{FLOW_CSS}</style>
      <rect width={PW} height={PH} rx={10} fill={PANEL} />
      <text x={16} y={24} fontSize={11} fontWeight={800} fill={NAVY} fontFamily={FONT} letterSpacing="0.04em">
        WATERFALL
      </text>
      <text x={16} y={40} fontSize={11} fill={MUTED} fontFamily={FONT}>
        指揮鏈 · 由上而下指派
      </text>

      {/* 需求規格 → PM：範疇依文件拍板 */}
      <g opacity={spec.opacity} style={{ transition: "opacity 200ms" }}>
        <DocIcon x={20} y={56} color={spec.line} fill={spec.fill} mark="lines" />
        <line x1={48} y1={72} x2={98} y2={72} stroke={spec.line} strokeWidth={1.25} strokeDasharray="3 3" />
        <path d="M100 72 L94 69 L94 75 Z" fill={spec.line} />
        <text x={32} y={100} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={spec.text} fontFamily={FONT}>
          需求規格
        </text>
      </g>

      {/* PM → 風險清單：障礙由 PM 列管、上呈 */}
      <g opacity={risk.opacity} style={{ transition: "opacity 200ms" }}>
        <line x1={242} y1={72} x2={290} y2={72} stroke={risk.line} strokeWidth={1.25} strokeDasharray="3 3" />
        <path d="M292 72 L286 69 L286 75 Z" fill={risk.line} />
        <DocIcon x={296} y={56} color={risk.line} fill={risk.fill} mark="alert" />
        <text x={308} y={100} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={risk.text} fontFamily={FONT}>
          風險清單
        </text>
      </g>

      <Arrow x1={170} y1={94} x2={170} y2={130} color={NAVY} />
      <Arrow x1={150} y1={174} x2={100} y2={208} color={NAVY} />
      <Arrow x1={190} y1={174} x2={240} y2={208} color={NAVY} />
      <text x={182} y={116} fontSize={9.5} fontWeight={ps("tasks").focus ? 700 : 400} fill={tasks.text} fontFamily={FONT}>
        逐層指派
      </text>

      {/* 工作卡沿指揮鏈往下傳 */}
      <g opacity={tasks.opacity} style={{ transition: "opacity 200ms" }}>
        <TaskCard className="pm-rr-card-a" at={[170, 113]} color={tasks.line} fill={tasks.fill} />
        <TaskCard className="pm-rr-card-b" at={[129, 191]} color={tasks.line} fill={tasks.fill} />
        <TaskCard className="pm-rr-card-c" at={[211, 191]} color={tasks.line} fill={tasks.fill} />
      </g>

      <BoxNode id="pm" x={170} y={72} w={140} sub="Project Manager" glyph="gantt" st={st("pm")} onPick={onPick} />
      <BoxNode id="arch" x={170} y={152} w={140} sub="System Architect" glyph="blueprint" st={st("arch")} onPick={onPick} />
      <BoxNode id="dev" x={90} y={230} w={132} sub="Development" glyph="code" st={st("dev")} onPick={onPick} />
      <BoxNode id="qa" x={250} y={230} w={132} sub="QA Team" glyph="checklist" st={st("qa")} onPick={onPick} />
    </svg>
  );
}

/* ---------- Scrum：自組織圈 ---------- */

const TX = 170; // 開發團隊圓心
const TY = 190;
const TR = 64;

function CircleNode({ id, x, y, r, sub, st, onPick }: { id: RoleId; x: number; y: number; r: number; sub: string; st: NodeState; onPick: (id: RoleId) => void }) {
  const c = nodeColors(st, ORANGE_100);
  return (
    <Clickable id={id} label={ROLES[id].full} onPick={onPick}>
      <g opacity={c.opacity} style={{ transition: "opacity 200ms" }}>
        <circle cx={x} cy={y} r={r} fill={c.fill} stroke={c.stroke === ORANGE_100 ? ORANGE_DEEP : c.stroke} strokeWidth={c.width} />
        <text x={x} y={y + 1} textAnchor="middle" fontSize={13} fontWeight={800} fill={st.hit ? ORANGE_700 : NAVY_DEEP} fontFamily={FONT}>
          {ROLES[id].short}
        </text>
        <text x={x} y={y + 15} textAnchor="middle" fontSize={9} fill={MUTED} fontFamily={FONT}>
          {sub}
        </text>
      </g>
    </Clickable>
  );
}

function ScrumPanel({ st, ps, onPick, flowing }: { st: (id: RoleId) => NodeState; ps: (id: PropId) => PropState; onPick: (id: RoleId) => void; flowing: boolean }) {
  const team = nodeColors(st("team"), BLUE_200);
  const teamHit = st("team").hit;
  const backlog = propColors(ps("backlog"), ORANGE_DEEP);
  const sprint = propColors(ps("sprint"));
  const obstacle = propColors(ps("obstacle"), MUTED);
  const dod = propColors(ps("dod"));
  const memberColor = teamHit ? ORANGE_100 : BLUE_200;
  return (
    <svg
      viewBox={`0 0 ${PW} ${PH}`}
      width="100%"
      role="img"
      className={flowing ? undefined : "pm-rr-paused"}
      aria-label="Scrum 自組織圈：開發團隊在中央，成員從 Sprint Backlog 自己領工作並對 DoD 負責；PO 從外圍把 Product Backlog 的卡片餵進團隊，SM 從外圍把障礙推出團隊之外。"
    >
      <style>{FLOW_CSS}</style>
      <rect width={PW} height={PH} rx={10} fill={PANEL} />
      <text x={16} y={24} fontSize={11} fontWeight={800} fill={ORANGE_DEEP} fontFamily={FONT} letterSpacing="0.04em">
        SCRUM
      </text>
      <text x={16} y={40} fontSize={11} fill={MUTED} fontFamily={FONT}>
        自組織圈 · 由外圍服務
      </text>

      <Arrow x1={96} y1={104} x2={126} y2={140} color={ORANGE_DEEP} />
      <Arrow x1={244} y1={104} x2={214} y2={140} color={ORANGE_DEEP} />
      <text x={38} y={136} fontSize={9.5} fontWeight={700} fill={ORANGE_700} fontFamily={FONT}>
        餵養 Backlog
      </text>
      <text x={238} y={136} fontSize={9.5} fontWeight={700} fill={ORANGE_700} fontFamily={FONT}>
        排除障礙
      </text>

      {/* Product Backlog 卡片堆，沿箭頭一張張餵進團隊 */}
      <g opacity={backlog.opacity} style={{ transition: "opacity 200ms" }}>
        {[2, 1, 0].map((k) => (
          <rect key={k} x={14 + k * 2} y={62 + k * 4} width={20} height={14} rx={1.5} fill={backlog.fill} stroke={backlog.line} strokeWidth={1.1} />
        ))}
        <path d="M18 72 H30 M18 75.5 H26" stroke={backlog.line} strokeWidth={0.9} strokeLinecap="round" />
        <text x={26} y={56} textAnchor="middle" fontSize={9} fontWeight={700} fill={backlog.text} fontFamily={FONT}>
          Backlog
        </text>
        <TaskCard className="pm-rr-feed" at={[110, 122]} color={backlog.line} fill={backlog.fill} />
        <TaskCard className="pm-rr-feed-2" at={[110, 122]} color={backlog.line} fill={backlog.fill} />
      </g>

      {/* 障礙：卡在團隊邊界，被 SM 推出去 */}
      <g opacity={obstacle.opacity} style={{ transition: "opacity 200ms" }}>
        <g className="pm-rr-clear" transform="translate(262 183)" aria-hidden="true">
          <rect x={-18} y={-9} width={36} height={18} rx={3} fill={obstacle.fill} stroke={obstacle.line} strokeWidth={1.1} strokeDasharray="3 2" />
          <text x={0} y={3.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={obstacle.text} fontFamily={FONT}>
            障礙
          </text>
        </g>
      </g>

      {/* 開發團隊：成員剪影、Sprint Backlog、DoD */}
      <Clickable id="team" label={ROLES.team.full} onPick={onPick}>
        <g opacity={team.opacity} style={{ transition: "opacity 200ms" }}>
          <circle cx={TX} cy={TY} r={TR} fill={team.fill} stroke={team.stroke} strokeWidth={team.width} />
          {[-32, -16, 0, 16, 32].map((dx) => (
            <Member key={dx} x={TX + dx} y={TY - 30} color={memberColor} />
          ))}
          <text x={TX} y={TY + 3} textAnchor="middle" fontSize={13} fontWeight={800} fill={teamHit ? ORANGE_700 : NAVY_DEEP} fontFamily={FONT}>
            開發團隊
          </text>
          <text x={TX} y={TY + 17} textAnchor="middle" fontSize={9} fill={MUTED} fontFamily={FONT}>
            自組織 · 跨功能
          </text>
          <g opacity={sprint.opacity} style={{ transition: "opacity 200ms" }}>
            {[0, 1, 2].map((k) => (
              <g key={k}>
                <rect x={TX - 40 + k * 15} y={TY + 26} width={12} height={10} rx={1.5} fill={sprint.fill} stroke={sprint.line} strokeWidth={1} />
                <path d={`M${TX - 37 + k * 15} ${TY + 31} H${TX - 31 + k * 15}`} stroke={sprint.line} strokeWidth={0.9} strokeLinecap="round" />
              </g>
            ))}
          </g>
          <g opacity={dod.opacity} style={{ transition: "opacity 200ms" }}>
            <rect x={TX + 8} y={TY + 25} width={34} height={12} rx={6} fill={dod.fill} stroke={dod.line} strokeWidth={1} />
            <path d={`M${TX + 13} ${TY + 31} l2 2 l3.5 -4`} fill="none" stroke={dod.line} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
            <text x={TX + 31} y={TY + 34} textAnchor="middle" fontSize={8.5} fontWeight={800} fill={dod.line} fontFamily={FONT}>
              DoD
            </text>
          </g>
        </g>
      </Clickable>

      <CircleNode id="po" x={74} y={80} r={30} sub="Product Owner" st={st("po")} onPick={onPick} />
      <CircleNode id="sm" x={266} y={80} r={30} sub="Scrum Master" st={st("sm")} onPick={onPick} />
    </svg>
  );
}

/* ---------- 主元件 ---------- */

const chip = (on: boolean): CSSProperties => ({
  height: 32,
  padding: "0 12px",
  borderRadius: 999,
  border: `1.5px solid ${on ? NAVY : BLUE_200}`,
  background: on ? NAVY : "#ffffff",
  color: on ? "#ffffff" : NAVY,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 160ms, color 160ms",
});

export default function PmRrStructure() {
  const reduce = useReducedMotion() ?? false;
  const [q, setQ] = useState<number | null>(0);
  const [picked, setPicked] = useState<RoleId | null>(null);
  const [flowing, setFlowing] = useState(true);
  const question = q === null ? null : QUESTIONS[q];

  const st = (id: RoleId): NodeState => {
    const hit = !!question && (question.wf.includes(id) || question.sc.includes(id));
    return { hit, dim: !!question && !hit && picked !== id, picked: picked === id };
  };
  const ps = (id: PropId): PropState => {
    const focus = !!question && question.props.includes(id);
    return { focus, dim: !!question && !focus };
  };
  const role = picked ? ROLES[picked] : null;

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <div role="group" aria-label="權責問題" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {QUESTIONS.map((x, i) => (
            <button key={x.label} type="button" aria-pressed={q === i} onClick={() => setQ(q === i ? null : i)} style={chip(q === i)}>
              {x.label}
            </button>
          ))}
        </div>
        {!reduce && (
          <button
            type="button"
            onClick={() => setFlowing((f) => !f)}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 8, border: `1.5px solid ${GRAY}`, background: "#ffffff", color: TEXT, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {flowing ? <Pause size={14} /> : <Play size={14} />} {flowing ? "暫停權責流向" : "播放權責流向"}
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <WaterfallPanel st={st} ps={ps} onPick={setPicked} flowing={flowing} />
          {question && (
            <div style={{ fontSize: 13, lineHeight: 1.6, color: TEXT, background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "8px 12px" }}>
              <strong style={{ color: NAVY }}>Waterfall：</strong>
              {question.wfText}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ScrumPanel st={st} ps={ps} onPick={setPicked} flowing={flowing} />
          {question && (
            <div style={{ fontSize: 13, lineHeight: 1.6, color: TEXT, background: ORANGE_50, border: `1px solid ${ORANGE_100}`, borderRadius: 8, padding: "8px 12px" }}>
              <strong style={{ color: ORANGE_700 }}>Scrum：</strong>
              {question.scText}
            </div>
          )}
        </div>
      </div>

      <div aria-live="polite" style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.7, color: TEXT, background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "10px 12px" }}>
        <UserRound size={16} style={{ color: role ? (role.side === "Waterfall" ? NAVY : ORANGE_DEEP) : MUTED, flexShrink: 0, marginTop: 4 }} />
        {role ? (
          <span>
            <strong style={{ color: role.side === "Waterfall" ? NAVY_DEEP : ORANGE_700 }}>
              {role.full}
            </strong>
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: MUTED, background: PANEL, padding: "1px 8px", borderRadius: 999 }}>{role.side}</span>
            <br />
            {role.duty}
          </span>
        ) : (
          <span style={{ color: MUTED }}>點選圖中任一角色，查看完整職責。注意左邊的工作卡一路往下傳（指派），右邊的 Backlog 往內餵、障礙往外推（服務）。</span>
        )}
      </div>
    </div>
  );
}
