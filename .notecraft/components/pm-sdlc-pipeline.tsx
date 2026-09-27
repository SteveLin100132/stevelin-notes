import { useEffect, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, FileText, Pause, Play, RotateCcw, UsersRound } from "lucide-react";

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
const SUCCESS = "#2e9e6b";
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";

interface Stage {
  abbr: string;
  en: string;
  zh: string;
  desc: string;
  meeting: number;
  doc: number | null;
  optional?: boolean;
}

interface Meeting {
  name: string;
  zh: string;
  from: number;
  to: number;
  purpose: string;
}

interface Doc {
  name: string;
  full: string;
  purpose: string;
}

const MEETINGS: Meeting[] = [
  { name: "Kickoff", zh: "啟動會議", from: 0, to: 0, purpose: "對齊目標、範疇、角色責任與初步計畫；唯一不審查交付物、而是建立共識的會議。" },
  { name: "Milestone Review", zh: "里程碑審查", from: 1, to: 4, purpose: "在每道閘門評估進度與成果，決定是否放行下一階段，是 Waterfall 的節拍器。" },
  { name: "UAT Meeting", zh: "使用者驗收會議", from: 5, to: 5, purpose: "讓用戶與利益相關者實際參與驗收、簽署驗收文件，是業務側對系統的正式背書。" },
  { name: "Go-Live Meeting", zh: "上線會議", from: 6, to: 7, purpose: "確認部署計畫、步驟、分工、回退機制與支援資源，讓上線當天沒有意外。" },
  { name: "Handover", zh: "交接會議", from: 8, to: 8, purpose: "把成果與文件交接給維運團隊：專案總結、知識轉移、未結項目與已知風險。" },
];

const DOCS: Doc[] = [
  { name: "PRD", full: "Product Requirement Document", purpose: "定義為什麼要做，以及成功長什麼樣。" },
  { name: "SRS", full: "System Requirement Spec", purpose: "把 PRD 轉成可驗證的系統需求。" },
  { name: "SDD", full: "System Design Document", purpose: "承接 SRS，給出架構與細部設計。" },
  { name: "Test Plan", full: "Test Plan / Test Case", purpose: "測試計畫與案例，對應 SRS 與 SDD 中的可驗證項。" },
  { name: "UAT List", full: "UAT Checklist", purpose: "驗收清單，是業務方簽收的依據。" },
  { name: "Cutover", full: "Cutover Plan", purpose: "切換計畫，含資料移轉、停機計畫、進退版策略。" },
  { name: "Manual", full: "Maintenance Manual", purpose: "維運手冊，是交接會議的核心交付，封裝專案知識。" },
];

const STAGES: Stage[] = [
  { abbr: "BP", en: "Blueprint", zh: "藍圖", meeting: 0, doc: 0, desc: "確認專案目標、範疇與預期成果，把模糊的想法收斂成可被估算的輪廓。這是整段瀑布最便宜的修改點。" },
  { abbr: "SA", en: "System Analysis", zh: "系統分析", meeting: 1, doc: 1, desc: "把藍圖翻譯成「系統做什麼」：訪談需求、釐清業務流程、定義使用者情境。" },
  { abbr: "SD", en: "System Design", zh: "系統設計", meeting: 1, doc: 2, desc: "把「做什麼」轉成「怎麼做」：架構、資料模型、介面、API 規格、權限與整合點。" },
  { abbr: "DEV", en: "Coding", zh: "開發", meeting: 1, doc: null, desc: "依設計文件實作。理論上開發者不必再重新想需求，只需把 SDD 變成程式；產出就是程式碼本身。" },
  { abbr: "SIT", en: "System Integration Testing", zh: "系統整合測試", meeting: 1, doc: 3, desc: "由 QA 進行模組與系統間的整合測試，重點在「整體會不會壞」，而非「功能對不對」。" },
  { abbr: "UAT", en: "User Acceptance Testing", zh: "使用者驗收測試", meeting: 2, doc: 4, desc: "由用戶端依驗收標準實際操作；通過代表業務方認可系統可以上線。" },
  { abbr: "CUT", en: "Cutover", zh: "切換", meeting: 3, doc: 5, optional: true, desc: "正式上線前的切換：資料移轉、停機計畫、舊系統下線、進退版機制。全新系統或無歷史資料時可略過。" },
  { abbr: "GO", en: "Go-Live", zh: "上線", meeting: 3, doc: null, desc: "系統正式對外運作。從這一刻起，任何修改都是 Production 修改，成本最高。" },
  { abbr: "MNT", en: "Maintenance", zh: "維運", meeting: 4, doc: 6, desc: "上線後的維護、修補與優化；也是知識回流到下一個專案藍圖的階段。" },
];

/* ---------- 圖：階梯瀑布 + 會議列 + 交付物接力鏈 ---------- */

const W = 760;
const X0 = 96;
const COL = (W - X0 - 12) / STAGES.length;
const colX = (i: number) => X0 + COL * i;
const STEP_Y0 = 30;
const STEP_DY = 12;
const BOX_H = 34;
const MEET_Y = 184;
const DOC_Y = 236;
const H = 290;

function Diagram({ cur, onPick }: { cur: number; onPick: (i: number) => void }) {
  const docAt = (d: number) => STAGES.findIndex((s) => s.doc === d);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`Waterfall 九階段走查。目前第 ${cur + 1} 階段 ${STAGES[cur].en}，對應 ${MEETINGS[STAGES[cur].meeting].name}${STAGES[cur].doc !== null ? `，產出 ${DOCS[STAGES[cur].doc as number].full}` : ""}。`}
    >
      <rect width={W} height={H} rx={10} fill={PANEL} />
      <text x={16} y={STEP_Y0 + 20} fontSize={11} fontWeight={800} fill={NAVY} fontFamily={FONT}>
        階段
      </text>
      <text x={16} y={STEP_Y0 + 34} fontSize={10} fill={MUTED} fontFamily={FONT}>
        單向往下流
      </text>
      <text x={16} y={MEET_Y + 4} fontSize={11} fontWeight={800} fill={NAVY} fontFamily={FONT}>
        會議
      </text>
      <text x={16} y={DOC_Y + 4} fontSize={11} fontWeight={800} fill={NAVY} fontFamily={FONT}>
        交付物
      </text>

      {/* 階梯：每一階往下一格，像水往下流 */}
      {STAGES.map((s, i) => {
        const x = colX(i) + 3;
        const y = STEP_Y0 + i * STEP_DY;
        const w = COL - 6;
        const passed = i < cur;
        const isCur = i === cur;
        return (
          <g
            key={s.abbr}
            role="button"
            tabIndex={0}
            aria-label={`跳到第 ${i + 1} 階段 ${s.en}`}
            onClick={() => onPick(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick(i);
              }
            }}
            style={{ cursor: "pointer", outline: "none" }}
          >
            {/* 往下一階的水流線 */}
            {i < STAGES.length - 1 && (
              <path d={`M${x + w} ${y + BOX_H / 2} h 5 v ${STEP_DY} h 1`} fill="none" stroke={passed ? NAVY : GRAY} strokeWidth={1.25} />
            )}
            <rect
              x={x}
              y={y}
              width={w}
              height={BOX_H}
              rx={5}
              fill={passed ? NAVY : isCur ? ORANGE_50 : "#ffffff"}
              stroke={passed ? NAVY : isCur ? ORANGE_DEEP : s.optional ? GRAY : BLUE_200}
              strokeWidth={isCur ? 2 : 1.25}
              strokeDasharray={s.optional && !passed && !isCur ? "4 3" : undefined}
            />
            <text x={x + w / 2} y={y + 15} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={passed ? "#ffffff" : isCur ? ORANGE_700 : NAVY_DEEP} fontFamily={FONT}>
              {i + 1} {s.abbr}
            </text>
            <text x={x + w / 2} y={y + 28} textAnchor="middle" fontSize={9} fill={passed ? BLUE_100 : MUTED} fontFamily={FONT}>
              {s.optional ? `${s.zh}（選）` : s.zh}
            </text>
            {/* 閘門：通過後變成完成色 */}
            {i < STAGES.length - 1 && (
              <rect x={x + w + 3} y={y + BOX_H / 2 + 2} width={4} height={8} rx={1} fill={passed ? SUCCESS : GRAY} />
            )}
          </g>
        );
      })}

      {/* 會議列 */}
      {MEETINGS.map((m, k) => {
        const x = colX(m.from) + 3;
        const w = COL * (m.to - m.from + 1) - 6;
        const done = cur > m.to;
        const active = cur >= m.from && cur <= m.to;
        return (
          <g key={m.name}>
            <rect x={x} y={MEET_Y - 13} width={w} height={22} rx={11} fill={active ? ORANGE_100 : done ? BLUE_100 : "#ffffff"} stroke={active ? ORANGE_DEEP : done ? BLUE_200 : GRAY_2} strokeWidth={1.25} />
            <text x={x + w / 2} y={MEET_Y + 2} textAnchor="middle" fontSize={w < 80 ? 9 : 10.5} fontWeight={700} fill={active ? ORANGE_700 : done ? NAVY : MUTED} fontFamily={FONT}>
              {w < 80 ? m.name.split(" ")[0] : m.name}
            </text>
            {m.from < m.to &&
              Array.from({ length: m.to - m.from }, (_, j) => (
                <line key={j} x1={colX(m.from + j + 1)} y1={MEET_Y - 9} x2={colX(m.from + j + 1)} y2={MEET_Y + 5} stroke={active || done ? BLUE_200 : GRAY_2} strokeWidth={1} />
              ))}
            <title>{`${k + 1}. ${m.name}（${m.zh}）`}</title>
          </g>
        );
      })}

      {/* 交付物接力鏈 */}
      {DOCS.map((d, k) => {
        const si = docAt(k);
        const cx = colX(si) + COL / 2;
        const produced = si <= cur;
        const isNew = si === cur;
        const next = k < DOCS.length - 1 ? colX(docAt(k + 1)) + COL / 2 : null;
        return (
          <g key={d.name}>
            {next !== null && (
              <g>
                <line x1={cx + 26} y1={DOC_Y} x2={next - 32} y2={DOC_Y} stroke={docAt(k + 1) <= cur ? NAVY : GRAY} strokeWidth={1.25} strokeDasharray={docAt(k + 1) <= cur ? undefined : "3 3"} />
                <path d={`M${next - 26} ${DOC_Y} l -6 -4 v 8 Z`} fill={docAt(k + 1) <= cur ? NAVY : GRAY} />
              </g>
            )}
            <path
              d={`M${cx - 24} ${DOC_Y - 14} h 40 l 8 8 v 20 h -48 Z`}
              fill={isNew ? ORANGE_50 : produced ? BLUE_50 : "#ffffff"}
              stroke={isNew ? ORANGE_DEEP : produced ? NAVY : GRAY}
              strokeWidth={isNew ? 2 : 1.25}
              strokeDasharray={produced ? undefined : "3 3"}
            />
            <text x={cx} y={DOC_Y + 4} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={isNew ? ORANGE_700 : produced ? NAVY_DEEP : MUTED} fontFamily={FONT}>
              {d.name}
            </text>
          </g>
        );
      })}
      <text x={W - 16} y={H - 12} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT}>
        前一份文件是後一份的輸入
      </text>
    </svg>
  );
}

/* ---------- 各階段的場景示意（切換階段時重播動畫） ---------- */

const SCENE_CSS = `
  @keyframes scDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  @keyframes scFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes scBlink { 50% { opacity: 0; } }
  @keyframes scPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  @keyframes scFlow { to { stroke-dashoffset: -16; } }
  @keyframes scMove { 0% { transform: translateX(0); opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translateX(84px); opacity: 0; } }
  .sc-draw { stroke-dasharray: 1; animation: scDraw 700ms ease-out both; }
  .sc-fade { animation: scFade 400ms ease-out both; }
  .sc-grow { transform-box: fill-box; transform-origin: left center; animation: scGrow 450ms ease-out both; }
  .sc-blink { animation: scBlink 1s steps(1) infinite; }
  .sc-pulse { animation: scPulse 1.6s ease-in-out infinite; }
  .sc-flow { stroke-dasharray: 4 4; animation: scFlow 900ms linear infinite; }
  .sc-move { animation: scMove 2.4s linear infinite; }
  @media (prefers-reduced-motion: reduce) {
    .sc-draw, .sc-fade, .sc-grow, .sc-blink, .sc-pulse, .sc-flow, .sc-move { animation: none; }
    .sc-move { opacity: 0; }
  }
`;

const wait = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

function Label({ x, y, children, anchor = "middle", color = MUTED, size = 9, weight = 500 }: { x: number; y: number; children: string; anchor?: "start" | "middle" | "end"; color?: string; size?: number; weight?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={color} fontFamily={FONT}>
      {children}
    </text>
  );
}

function Arrow({ x1, y1, x2, y2, delay = 0, color = NAVY }: { x1: number; y1: number; x2: number; y2: number; delay?: number; color?: string }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = x2 - 5 * Math.cos(a);
  const hy = y2 - 5 * Math.sin(a);
  return (
    <g>
      <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} strokeWidth={1.25} pathLength={1} className="sc-draw" style={wait(delay)} />
      <path d={`M${x2} ${y2} L${hx - 3 * Math.sin(a)} ${hy + 3 * Math.cos(a)} L${hx + 3 * Math.sin(a)} ${hy - 3 * Math.cos(a)} Z`} fill={color} className="sc-fade" style={wait(delay + 500)} />
    </g>
  );
}

/* 0 Blueprint：藍圖紙上的目標與範疇邊界 */
function SceneBlueprint() {
  return (
    <g>
      <rect x={16} y={14} width={208} height={122} rx={4} fill={BLUE_50} stroke={BLUE_200} strokeWidth={1} />
      {Array.from({ length: 12 }, (_, k) => (
        <line key={`v${k}`} x1={32 + k * 16} y1={14} x2={32 + k * 16} y2={136} stroke={BLUE_100} strokeWidth={0.75} />
      ))}
      {Array.from({ length: 7 }, (_, k) => (
        <line key={`h${k}`} x1={16} y1={30 + k * 16} x2={224} y2={30 + k * 16} stroke={BLUE_100} strokeWidth={0.75} />
      ))}
      <g className="sc-fade">
        <circle cx={54} cy={64} r={20} fill="#ffffff" stroke={NAVY} strokeWidth={1.25} />
        <circle cx={54} cy={64} r={11} fill="none" stroke={NAVY} strokeWidth={1.25} />
        <circle cx={54} cy={64} r={3.5} fill={ORANGE_DEEP} />
        <Label x={54} y={100} color={NAVY_DEEP} weight={700}>
          目標
        </Label>
      </g>
      <rect x={94} y={30} width={118} height={70} rx={4} fill="none" stroke={NAVY} strokeWidth={1.25} strokeDasharray="5 3" className="sc-fade" style={wait(200)} />
      <Label x={100} y={43} anchor="start" color={NAVY} weight={700}>
        範疇
      </Label>
      {[0, 1, 2].map((k) => (
        <rect key={k} x={104 + k * 35} y={54} width={28} height={30} rx={3} fill="#ffffff" stroke={NAVY} strokeWidth={1} className="sc-fade" style={wait(400 + k * 150)} />
      ))}
      <g className="sc-fade" style={wait(900)}>
        <rect x={164} y={108} width={28} height={18} rx={3} fill="#ffffff" stroke={GRAY} strokeWidth={1} />
        <path d="M170 112 l16 10 M186 112 l-16 10" stroke={MUTED} strokeWidth={1} />
        <Label x={158} y={121} anchor="end">
          範疇外
        </Label>
      </g>
    </g>
  );
}

/* 1 System Analysis：使用者情境、業務流程與需求清單 */
function SceneAnalysis() {
  return (
    <g>
      <g className="sc-fade">
        <circle cx={26} cy={40} r={6} fill="none" stroke={MUTED} strokeWidth={1.25} />
        <path d="M15 60 q11 -14 22 0" fill="none" stroke={MUTED} strokeWidth={1.25} />
        <Label x={26} y={74}>
          使用者
        </Label>
      </g>
      <Arrow x1={40} y1={48} x2={56} y2={48} delay={150} />
      <rect x={58} y={38} width={48} height={20} rx={3} fill="#ffffff" stroke={NAVY} strokeWidth={1.25} className="sc-fade" style={wait(300)} />
      <Label x={82} y={51} color={NAVY_DEEP} weight={700}>
        提出申請
      </Label>
      <Arrow x1={106} y1={48} x2={122} y2={48} delay={450} />
      <rect x={124} y={38} width={48} height={20} rx={3} fill="#ffffff" stroke={NAVY} strokeWidth={1.25} className="sc-fade" style={wait(600)} />
      <Label x={148} y={51} color={NAVY_DEEP} weight={700}>
        主管審核
      </Label>
      <Arrow x1={172} y1={48} x2={186} y2={48} delay={750} />
      <path d="M202 36 L214 48 L202 60 L190 48 Z" fill={ORANGE_50} stroke={ORANGE_DEEP} strokeWidth={1.25} className="sc-fade" style={wait(900)} />
      <Label x={202} y={51} color={ORANGE_700} weight={700}>
        ?
      </Label>
      <Label x={202} y={72} color={ORANGE_700}>
        通過／退回
      </Label>
      <g>
        <rect x={58} y={86} width={156} height={50} rx={4} fill="#ffffff" stroke={BLUE_200} strokeWidth={1} className="sc-fade" style={wait(1000)} />
        <Label x={66} y={99} anchor="start" color={NAVY} weight={800}>
          SRS
        </Label>
        {[0, 1, 2].map((k) => (
          <g key={k}>
            <Label x={66} y={111 + k * 10} anchor="start" color={NAVY} size={7.5} weight={700}>
              {`REQ-0${k + 1}`}
            </Label>
            <rect x={98} y={106 + k * 10} width={[92, 70, 104][k]} height={5} rx={2.5} fill={BLUE_100} className="sc-grow" style={wait(1150 + k * 150)} />
          </g>
        ))}
      </g>
    </g>
  );
}

/* 2 System Design：分層架構與整合點 */
function SceneDesign() {
  return (
    <g>
      <g className="sc-fade">
        <rect x={60} y={16} width={100} height={24} rx={4} fill="#ffffff" stroke={NAVY} strokeWidth={1.25} />
        <Label x={110} y={31} color={NAVY_DEEP} weight={700} size={9.5}>
          前端 Web
        </Label>
      </g>
      <Arrow x1={110} y1={40} x2={110} y2={58} delay={250} />
      <g className="sc-fade" style={wait(400)}>
        <rect x={60} y={60} width={100} height={24} rx={4} fill={BLUE_50} stroke={NAVY} strokeWidth={1.25} />
        <Label x={110} y={75} color={NAVY_DEEP} weight={700} size={9.5}>
          API 服務
        </Label>
      </g>
      <Arrow x1={110} y1={84} x2={110} y2={100} delay={650} />
      <g className="sc-fade" style={wait(800)}>
        <path d="M86 106 v24 a24 6 0 0 0 48 0 v-24" fill="#ffffff" stroke={NAVY} strokeWidth={1.25} />
        <ellipse cx={110} cy={106} rx={24} ry={6} fill={BLUE_100} stroke={NAVY} strokeWidth={1.25} />
        <Label x={110} y={126} color={NAVY_DEEP} weight={700}>
          資料庫
        </Label>
      </g>
      <g className="sc-fade" style={wait(1050)}>
        <line x1={160} y1={72} x2={182} y2={72} stroke={ORANGE_DEEP} strokeWidth={1.25} strokeDasharray="3 3" />
        <rect x={182} y={60} width={46} height={24} rx={4} fill={ORANGE_50} stroke={ORANGE_DEEP} strokeWidth={1.25} strokeDasharray="4 3" />
        <Label x={205} y={75} color={ORANGE_700} weight={700}>
          外部系統
        </Label>
        <Label x={205} y={96} color={ORANGE_700}>
          整合點
        </Label>
      </g>
      <g className="sc-fade" style={wait(1200)}>
        <Label x={14} y={31} anchor="start">
          介面
        </Label>
        <Label x={14} y={75} anchor="start">
          API 規格
        </Label>
        <Label x={14} y={122} anchor="start">
          資料模型
        </Label>
      </g>
    </g>
  );
}

/* 3 Coding：編輯器裡逐行長出的程式碼 */
function SceneCoding() {
  const lines: [number, number, string][] = [
    [0, 54, NAVY],
    [12, 92, BLUE_200],
    [12, 66, ORANGE_DEEP],
    [24, 80, BLUE_200],
    [24, 44, BLUE_200],
    [12, 30, NAVY],
    [0, 20, NAVY],
  ];
  return (
    <g>
      <rect x={16} y={14} width={208} height={122} rx={5} fill="#ffffff" stroke={GRAY} strokeWidth={1} />
      <path d="M16 30 h208" stroke={GRAY_2} strokeWidth={1} />
      <rect x={16.5} y={14.5} width={207} height={15} rx={4.5} fill={PANEL} />
      {[0, 1, 2].map((k) => (
        <circle key={k} cx={27 + k * 9} cy={22} r={2.5} fill={GRAY} />
      ))}
      <Label x={120} y={25} size={8.5}>
        schedule-draft.ts
      </Label>
      <rect x={16.5} y={30.5} width={20} height={105} fill={PANEL} />
      {lines.map(([indent, w, c], k) => (
        <g key={k}>
          <Label x={30} y={45 + k * 13} anchor="end" size={7.5}>
            {String(k + 1)}
          </Label>
          <rect x={46 + indent} y={40 + k * 13} width={w} height={6} rx={3} fill={c} className="sc-grow" style={wait(k * 180)} />
        </g>
      ))}
      <rect x={46 + 20 + 3} y={118} width={2} height={10} fill={TEXT} className="sc-blink" />
      <Label x={216} y={130} anchor="end" size={8}>
        依 SDD 實作
      </Label>
    </g>
  );
}

/* 4 SIT：模組之間的整合連線逐一通過 */
function SceneSit() {
  const mods = [
    { x: 16, y: 22, t: "排班模組" },
    { x: 164, y: 22, t: "帳號模組" },
    { x: 90, y: 100, t: "通知模組" },
  ];
  const links = [
    { x1: 76, y1: 36, x2: 164, y2: 36, cx: 120, cy: 36 },
    { x1: 50, y1: 50, x2: 104, y2: 100, cx: 77, cy: 75 },
    { x1: 190, y1: 50, x2: 136, y2: 100, cx: 163, cy: 75 },
  ];
  return (
    <g>
      {links.map((l, k) => (
        <g key={k}>
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={BLUE_200} strokeWidth={1.5} className="sc-flow" />
          <g className="sc-fade" style={wait(500 + k * 400)}>
            <circle cx={l.cx} cy={l.cy} r={7} fill={SUCCESS} />
            <path d={`M${l.cx - 3} ${l.cy} l2 2.5 l4 -4.5`} fill="none" stroke="#ffffff" strokeWidth={1.5} />
          </g>
        </g>
      ))}
      {mods.map((m) => (
        <g key={m.t}>
          <rect x={m.x} y={m.y} width={60} height={28} rx={4} fill="#ffffff" stroke={NAVY} strokeWidth={1.25} />
          <Label x={m.x + 30} y={m.y + 17} color={NAVY_DEEP} weight={700}>
            {m.t}
          </Label>
        </g>
      ))}
      <Label x={120} y={144} size={8.5}>
        重點：整體接起來會不會壞
      </Label>
    </g>
  );
}

/* 5 UAT：驗收清單逐項打勾，最後業務方簽名 */
function SceneUat() {
  return (
    <g>
      <rect x={56} y={10} width={128} height={130} rx={4} fill="#ffffff" stroke={GRAY} strokeWidth={1} />
      <Label x={120} y={26} color={NAVY_DEEP} weight={800} size={9.5}>
        UAT 驗收清單
      </Label>
      {[0, 1, 2, 3].map((k) => (
        <g key={k}>
          <rect x={68} y={36 + k * 18} width={10} height={10} rx={2} fill="#ffffff" stroke={NAVY} strokeWidth={1} />
          <path d={`M70 ${41 + k * 18} l2.5 2.5 l4 -5`} fill="none" stroke={SUCCESS} strokeWidth={1.6} className="sc-fade" style={wait(250 + k * 280)} />
          <rect x={84} y={39 + k * 18} width={[80, 64, 72, 56][k]} height={5} rx={2.5} fill={BLUE_100} />
        </g>
      ))}
      <line x1={68} y1={126} x2={172} y2={126} stroke={GRAY} strokeWidth={1} />
      <path d="M74 122 c6 -12 10 8 16 -4 s8 -6 12 2 s10 -8 16 0 s6 2 12 -3" fill="none" stroke={NAVY} strokeWidth={1.25} pathLength={1} className="sc-draw" style={wait(1400)} />
      <Label x={172} y={136} anchor="end" size={8}>
        業務方簽核
      </Label>
    </g>
  );
}

function Server({ x, y, color, fill }: { x: number; y: number; color: string; fill: string }) {
  return (
    <g>
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <rect x={x} y={y + k * 22} width={50} height={18} rx={3} fill={fill} stroke={color} strokeWidth={1.25} />
          <line x1={x + 8} y1={y + k * 22 + 9} x2={x + 28} y2={y + k * 22 + 9} stroke={color} strokeWidth={1.25} />
        </g>
      ))}
    </g>
  );
}

/* 6 Cutover：資料從舊系統搬到新系統，並備好回退路線 */
function SceneCutover() {
  return (
    <g>
      <Server x={16} y={34} color={MUTED} fill={PANEL} />
      <Label x={41} y={112}>
        舊系統
      </Label>
      <Server x={174} y={34} color={NAVY} fill={BLUE_50} />
      <Label x={199} y={112} color={NAVY_DEEP} weight={700}>
        新系統
      </Label>
      <Label x={120} y={28} color={NAVY} weight={700}>
        資料移轉
      </Label>
      <line x1={72} y1={56} x2={170} y2={56} stroke={BLUE_200} strokeWidth={1.25} />
      <path d="M170 56 l-5 -3 v6 Z" fill={BLUE_200} />
      {[0, 1, 2].map((k) => (
        <rect key={k} x={76} y={51} width={10} height={10} rx={2} fill={NAVY} className="sc-move" style={wait(k * 800)} />
      ))}
      <path d="M190 104 C 190 136, 50 136, 50 104" fill="none" stroke={ORANGE_DEEP} strokeWidth={1.25} strokeDasharray="4 3" className="sc-fade" style={wait(400)} />
      <path d="M50 104 l-3 6 h6 Z" fill={ORANGE_DEEP} className="sc-fade" style={wait(400)} />
      <Label x={120} y={144} color={ORANGE_700} weight={700}>
        回退機制
      </Label>
      <Label x={120} y={86}>
        停機窗口內完成
      </Label>
    </g>
  );
}

/* 7 Go-Live：請求開始流進正式環境 */
function SceneGoLive() {
  return (
    <g>
      {[0, 1, 2].map((k) => (
        <line key={k} x1={20} y1={44 + k * 26} x2={92} y2={52 + k * 20} stroke={BLUE_200} strokeWidth={1.5} className="sc-flow" style={wait(k * 200)} />
      ))}
      <Label x={20} y={132} anchor="start">
        使用者請求
      </Label>
      <rect x={94} y={26} width={62} height={98} rx={5} fill="#ffffff" stroke={NAVY} strokeWidth={1.25} />
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <rect x={102} y={36 + k * 28} width={46} height={20} rx={3} fill={BLUE_50} stroke={BLUE_200} strokeWidth={1} />
          <line x1={108} y1={46 + k * 28} x2={126} y2={46 + k * 28} stroke={NAVY} strokeWidth={1.25} />
          <circle cx={140} cy={46 + k * 28} r={3} fill={SUCCESS} className="sc-pulse" style={wait(k * 300)} />
        </g>
      ))}
      <g className="sc-fade" style={wait(300)}>
        <rect x={164} y={30} width={60} height={20} rx={10} fill={SUCCESS} />
        <Label x={194} y={43.5} color="#ffffff" weight={800}>
          上線中
        </Label>
        <Label x={194} y={70} color={ORANGE_700} weight={700}>
          Production
        </Label>
        <Label x={194} y={82} color={ORANGE_700}>
          修改成本最高
        </Label>
      </g>
    </g>
  );
}

/* 8 Maintenance：監控異常、修補，並把知識寫回手冊 */
function SceneMaintenance() {
  return (
    <g>
      <rect x={12} y={14} width={150} height={122} rx={5} fill="#ffffff" stroke={GRAY} strokeWidth={1} />
      <Label x={20} y={28} anchor="start" color={NAVY_DEEP} weight={700}>
        監控
      </Label>
      {[0, 1, 2].map((k) => (
        <line key={k} x1={22} y1={50 + k * 24} x2={152} y2={50 + k * 24} stroke={GRAY_2} strokeWidth={0.75} />
      ))}
      <path d="M22 104 L40 100 L56 102 L70 96 L80 54 L90 100 L108 98 L124 94 L140 96 L152 92" fill="none" stroke={NAVY} strokeWidth={1.5} pathLength={1} className="sc-draw" />
      <g className="sc-fade" style={wait(700)}>
        <circle cx={80} cy={54} r={5} fill="none" stroke={ORANGE_DEEP} strokeWidth={1.5} />
        <Label x={88} y={48} anchor="start" color={ORANGE_700} weight={700}>
          異常 → 修補
        </Label>
      </g>
      <g className="sc-fade" style={wait(1000)}>
        <path d="M176 18 h36 l8 8 v38 h-44 Z" fill={BLUE_50} stroke={NAVY} strokeWidth={1.25} />
        <Label x={198} y={40} color={NAVY_DEEP} weight={700} size={8.5}>
          維運
        </Label>
        <Label x={198} y={52} color={NAVY_DEEP} weight={700} size={8.5}>
          手冊
        </Label>
        <Arrow x1={198} y1={66} x2={198} y2={96} delay={1200} color={ORANGE_DEEP} />
        <rect x={176} y={98} width={44} height={30} rx={3} fill={BLUE_50} stroke={BLUE_200} strokeWidth={1} />
        <Label x={198} y={116} color={NAVY} size={8.5} weight={700}>
          下個藍圖
        </Label>
        <Label x={198} y={142} color={ORANGE_700} size={8}>
          知識回流
        </Label>
      </g>
    </g>
  );
}

const SCENES = [SceneBlueprint, SceneAnalysis, SceneDesign, SceneCoding, SceneSit, SceneUat, SceneCutover, SceneGoLive, SceneMaintenance];
const SCENE_ALT = [
  "藍圖紙上標出目標與範疇邊界，範疇外的項目被劃掉",
  "使用者情境展開成業務流程，並整理成 SRS 需求清單",
  "前端、API、資料庫的分層架構，以及對外部系統的整合點",
  "程式編輯器裡依設計文件逐行實作",
  "三個模組之間的整合連線逐一測試通過",
  "驗收清單逐項打勾，最後由業務方簽核",
  "資料從舊系統移轉到新系統，並備好回退路線",
  "使用者請求流進正式環境，系統上線運作",
  "監控發現異常並修補，知識寫進維運手冊、回流到下一個藍圖",
];

function StageScene({ i }: { i: number }) {
  const Scene = SCENES[i];
  return (
    <svg viewBox="0 0 240 150" width="100%" role="img" aria-label={`${STAGES[i].en} 場景示意：${SCENE_ALT[i]}`} style={{ display: "block", background: "#ffffff", borderRadius: 6, border: `1px solid ${ORANGE_100}` }}>
      <style>{SCENE_CSS}</style>
      <Scene />
    </svg>
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

export default function PmSdlcPipeline() {
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = STAGES.length - 1;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setCur((c) => {
        if (c >= last) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, 1600);
    return () => clearInterval(t);
  }, [playing, last]);

  const s = STAGES[cur];
  const m = MEETINGS[s.meeting];
  const d = s.doc !== null ? DOCS[s.doc] : null;

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <div role="group" aria-label="階段推進" style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0} style={{ ...btn, background: "#ffffff", color: cur === 0 ? MUTED : NAVY, borderColor: BLUE_200, cursor: cur === 0 ? "default" : "pointer" }}>
            <ChevronLeft size={16} /> 上一階段
          </button>
          <button type="button" onClick={() => setCur((c) => Math.min(last, c + 1))} disabled={cur === last} style={{ ...btn, background: cur === last ? GRAY_2 : NAVY, color: cur === last ? MUTED : "#ffffff", borderColor: cur === last ? GRAY_2 : NAVY, cursor: cur === last ? "default" : "pointer" }}>
            通過閘門 <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!playing && cur === last) setCur(0);
              setPlaying((p) => !p);
            }}
            style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? "暫停" : "自動播放"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setCur(0);
            }}
            style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}
          >
            <RotateCcw size={16} /> 重置
          </button>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: TEXT, background: GRAY_2, padding: "4px 12px", borderRadius: 6 }}>
          第 {cur + 1} / {STAGES.length} 階段
        </span>
      </div>

      <Diagram
        cur={cur}
        onPick={(i) => {
          setPlaying(false);
          setCur(i);
        }}
      />

      <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, lineHeight: 1.65, color: TEXT }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", background: ORANGE_50, border: `1px solid ${ORANGE_100}`, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ flex: "0 1 300px", minWidth: 220 }}>
            {/* key 讓切換階段時場景重新掛載、動畫重播 */}
            <StageScene key={cur} i={cur} />
          </div>
          <div style={{ flex: "1 1 260px" }}>
            <strong style={{ color: ORANGE_700 }}>
              {cur + 1}. {s.en}｜{s.zh}
              {s.optional ? "（視情況）" : ""}
            </strong>
            <br />
            {s.desc}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "10px 12px" }}>
            <UsersRound size={16} style={{ color: NAVY, flexShrink: 0, marginTop: 3 }} />
            <span>
              <strong style={{ color: NAVY_DEEP }}>
                會議：{m.name}｜{m.zh}
              </strong>
              <br />
              {m.purpose}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "10px 12px" }}>
            <FileText size={16} style={{ color: NAVY, flexShrink: 0, marginTop: 3 }} />
            <span>
              <strong style={{ color: NAVY_DEEP }}>交付物：{d ? d.full : "無獨立文件"}</strong>
              <br />
              {d ? d.purpose : s.abbr === "DEV" ? "產出就是程式碼本身，依 SDD 實作。" : "產出就是上線本身，接著進入維運並準備交接。"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
