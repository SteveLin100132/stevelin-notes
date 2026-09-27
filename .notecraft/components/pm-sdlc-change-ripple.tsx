import { useId, useState } from "react";

/* trendlink-design 色票（生成元件的 Tailwind class 不會被編譯，直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700
const NAVY_DEEP = "#112f5d"; // --blue-900
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

interface Stage {
  abbr: string;
  zh: string;
  cost: number; // 相對於 Blueprint 的變更成本（示意）
  note: string;
}

const STAGES: Stage[] = [
  { abbr: "BP", zh: "藍圖", cost: 1, note: "只要改藍圖與 PRD，是整段瀑布最便宜的修改點。" },
  { abbr: "SA", zh: "系統分析", cost: 1.5, note: "PRD 之外，SRS 也要跟著改；還停留在紙上，代價仍低。" },
  { abbr: "SD", zh: "系統設計", cost: 2.5, note: "架構、資料模型、API 規格可能要重畫，SDD 與 SRS 都得改版。" },
  { abbr: "DEV", zh: "開發", cost: 5, note: "已寫好的程式要拆掉重寫，連帶回頭修文件，成本開始翻倍。" },
  { abbr: "SIT", zh: "整合測試", cost: 10, note: "測試計畫與案例要重寫，已通過的整合測試要重跑。" },
  { abbr: "UAT", zh: "驗收測試", cost: 20, note: "業務方已經在驗收，變更代表驗收清單與簽核都要重來。" },
  { abbr: "CUT", zh: "切換", cost: 35, note: "切換計畫、資料移轉腳本都依舊需求準備，改動牽連上線時程。" },
  { abbr: "GO", zh: "上線", cost: 60, note: "已經是 Production 修改，要走變更流程、排停機、準備回退。" },
  { abbr: "MNT", zh: "維運", cost: 80, note: "改的是線上系統，維運手冊與所有上游文件都要同步，否則知識斷層。" },
];

interface Artifact {
  name: string;
  stage: number; // 在哪個階段產出
}

const ARTIFACTS: Artifact[] = [
  { name: "PRD", stage: 0 },
  { name: "SRS", stage: 1 },
  { name: "SDD", stage: 2 },
  { name: "程式碼", stage: 3 },
  { name: "Test Plan", stage: 4 },
  { name: "UAT List", stage: 5 },
  { name: "Cutover", stage: 6 },
  { name: "Manual", stage: 8 },
];

const W = 760;
const X0 = 56;
const COL = (W - X0 - 16) / STAGES.length;
const cx = (i: number) => X0 + COL * (i + 0.5);
const BAR_TOP = 40;
const BAR_BOT = 170;
const MAX = 80;
const by = (v: number) => BAR_BOT - ((BAR_BOT - BAR_TOP) * v) / MAX;
const DOC_Y = 288;
const H = 346;

const ANIM_CSS = `
  @keyframes rpDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  @keyframes rpFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rpDrop { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
  .rp-draw { stroke-dasharray: 1; animation: rpDraw 500ms ease-out both; }
  .rp-fade { animation: rpFade 300ms ease-out both; }
  .rp-drop { animation: rpDrop 360ms ease-out both; }
  @media (prefers-reduced-motion: reduce) { .rp-draw, .rp-fade, .rp-drop { animation: none; } }
`;

/* ---------- 產出縮圖：每一種產出畫成可辨識的小物件 ---------- */

/** 以 (0,0) 為中心、約 60 x 54 的縮圖內容 */
function ThumbArt({ kind, c, soft }: { kind: number; c: string; soft: string }) {
  switch (kind) {
    case 0: // PRD：目標與敘述
      return (
        <g>
          <circle cx={-12} cy={-6} r={9} fill="none" stroke={c} strokeWidth={1.25} />
          <circle cx={-12} cy={-6} r={4} fill="none" stroke={c} strokeWidth={1.25} />
          <circle cx={-12} cy={-6} r={1.5} fill={c} />
          <rect x={2} y={-12} width={18} height={3} rx={1.5} fill={soft} />
          <rect x={2} y={-5} width={14} height={3} rx={1.5} fill={soft} />
          <rect x={-20} y={9} width={40} height={3} rx={1.5} fill={soft} />
        </g>
      );
    case 1: // SRS：編號需求清單
      return (
        <g>
          {[0, 1, 2].map((k) => (
            <g key={k}>
              <rect x={-20} y={-13 + k * 9} width={8} height={5} rx={1} fill={c} />
              <rect x={-9} y={-12 + k * 9} width={[28, 22, 25][k]} height={3} rx={1.5} fill={soft} />
            </g>
          ))}
        </g>
      );
    case 2: // SDD：架構方塊
      return (
        <g fill="none" stroke={c} strokeWidth={1.1}>
          <rect x={-8} y={-16} width={16} height={8} rx={1.5} />
          <rect x={-8} y={-3} width={16} height={8} rx={1.5} />
          <path d="M0 -8 v5 M0 5 v4" />
          <ellipse cx={0} cy={11} rx={8} ry={2.5} />
          <rect x={14} y={-3} width={9} height={8} rx={1.5} strokeDasharray="2 1.5" />
          <path d="M8 1 h6" />
        </g>
      );
    case 3: // 程式碼：編輯器
      return (
        <g>
          <rect x={-22} y={-17} width={44} height={32} rx={2} fill="none" stroke={c} strokeWidth={1.1} />
          <line x1={-22} y1={-11} x2={22} y2={-11} stroke={c} strokeWidth={1} />
          {[0, 1, 2, 3].map((k) => (
            <rect key={k} x={-17 + (k === 1 || k === 2 ? 5 : 0)} y={-7 + k * 5.5} width={[20, 26, 16, 12][k]} height={2.5} rx={1.25} fill={k === 2 ? c : soft} />
          ))}
        </g>
      );
    case 4: // Test Plan：測試表格
      return (
        <g fill="none" stroke={c} strokeWidth={1}>
          <rect x={-20} y={-15} width={40} height={28} rx={1.5} />
          <path d="M-20 -6 h40 M-20 3 h40 M6 -15 v28" />
          {[0, 1, 2].map((k) => (
            <path key={k} d={`M10 ${-11 + k * 9} l2 2 l4 -4`} strokeWidth={1.3} />
          ))}
        </g>
      );
    case 5: // UAT List：勾選清單與簽名
      return (
        <g>
          {[0, 1].map((k) => (
            <g key={k}>
              <rect x={-18} y={-15 + k * 8} width={5} height={5} rx={1} fill="none" stroke={c} strokeWidth={1} />
              <path d={`M-17 ${-12.5 + k * 8} l1.5 1.5 l2.5 -3`} fill="none" stroke={c} strokeWidth={1.1} />
              <rect x={-10} y={-14 + k * 8} width={26} height={3} rx={1.5} fill={soft} />
            </g>
          ))}
          <path d="M-16 10 c3 -6 5 4 8 -2 s4 -3 6 1 s5 -4 8 0" fill="none" stroke={c} strokeWidth={1.1} />
          <line x1={-18} y1={13} x2={18} y2={13} stroke={soft} strokeWidth={1} />
        </g>
      );
    case 6: // Cutover：新舊系統切換
      return (
        <g fill="none" stroke={c} strokeWidth={1}>
          {[0, 1, 2].map((k) => (
            <rect key={`a${k}`} x={-22} y={-14 + k * 9} width={13} height={7} rx={1} />
          ))}
          {[0, 1, 2].map((k) => (
            <rect key={`b${k}`} x={9} y={-14 + k * 9} width={13} height={7} rx={1} />
          ))}
          <path d="M-6 -1 h12 M3 -4 l3 3 l-3 3" />
        </g>
      );
    default: // Manual：維運手冊
      return (
        <g fill="none" stroke={c} strokeWidth={1.1}>
          <path d="M0 -14 c-6 -3 -14 -3 -20 0 v26 c6 -3 14 -3 20 0 c6 -3 14 -3 20 0 v-26 c-6 -3 -14 -3 -20 0 v26" />
          <path d="M-15 -6 h10 M-15 -1 h10 M5 -6 h10 M5 -1 h10" stroke={soft} strokeWidth={2} />
        </g>
      );
  }
}

function Thumb({ kind, x, affected, sel, name }: { kind: number; x: number; affected: boolean; sel: number; name: string }) {
  const soft = affected ? ORANGE_100 : GRAY_2;
  return (
    <g transform={`translate(${x} ${DOC_Y})`}>
      <rect x={-31} y={-28} width={62} height={56} rx={5} fill={affected ? ORANGE_50 : "#ffffff"} stroke={affected ? ORANGE_DEEP : GRAY} strokeWidth={affected ? 1.5 : 1} strokeDasharray={affected ? undefined : "3 3"} style={{ transition: "fill 200ms, stroke 200ms" }} />
      <ThumbArt kind={kind} c={affected ? ORANGE_DEEP : MUTED} soft={soft} />
      {affected && (
        /* key 綁定選取的階段：換階段時修訂記號重畫一次 */
        <g key={sel}>
          <line x1={-24} y1={20} x2={24} y2={-20} stroke={ORANGE_DEEP} strokeWidth={1.5} strokeLinecap="round" pathLength={1} opacity={0.75} className="rp-draw" />
          <g className="rp-fade" style={{ animationDelay: "300ms" }}>
            <rect x={10} y={-35} width={26} height={13} rx={6.5} fill={ORANGE_DEEP} />
            <text x={23} y={-25.5} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="#ffffff" fontFamily={FONT}>
              改版
            </text>
          </g>
        </g>
      )}
      <text x={0} y={42} textAnchor="middle" fontSize={10} fontWeight={700} fill={affected ? ORANGE_700 : MUTED} fontFamily={FONT}>
        {name}
      </text>
    </g>
  );
}

/* ---------- 改版文件堆：受影響的產出一張張疊上來 ---------- */

function ReworkPile({ sel }: { sel: number }) {
  const hit = ARTIFACTS.filter((a) => a.stage <= sel);
  const prod = sel >= 7;
  return (
    <svg viewBox="0 0 170 156" width="100%" role="img" aria-label={`改版文件堆：${hit.length} 份產出需要改版${prod ? "，而且改的是線上系統" : ""}。`} style={{ display: "block" }}>
      <style>{ANIM_CSS}</style>
      <text x={10} y={150} fontSize={10.5} fontWeight={800} fill={ORANGE_700} fontFamily={FONT}>
        改版文件堆 · {hit.length} 份
      </text>
      <line x1={10} y1={131} x2={160} y2={131} stroke={GRAY} strokeWidth={1} />
      {/* 由下往上疊：上一張蓋住下一張的上半，每張露出下緣 13px，名稱寫在露出的那一條上 */}
      {hit.map((a, k) => {
        const x = 14 + k * 4;
        const y = 109 - k * 13;
        const top = k === hit.length - 1;
        return (
          <g key={a.name} className={top ? "rp-drop" : undefined}>
            <path d={`M${x} ${y} h 74 l 8 8 v 14 h -82 Z`} fill={top ? ORANGE_50 : "#ffffff"} stroke={top ? ORANGE_DEEP : ORANGE_100} strokeWidth={top ? 1.5 : 1.25} />
            <text x={x + 8} y={y + 20} fontSize={8.5} fontWeight={700} fill={top ? ORANGE_700 : MUTED} fontFamily={FONT}>
              {a.name}
            </text>
          </g>
        );
      })}
      {prod && (
        <g className="rp-fade">
          <text x={144} y={88} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={ORANGE_700} fontFamily={FONT}>
            線上系統
          </text>
          <rect x={124} y={94} width={40} height={32} rx={3} fill="#ffffff" stroke={NAVY} strokeWidth={1.25} />
          <line x1={130} y1={104} x2={150} y2={104} stroke={NAVY} strokeWidth={1.25} />
          <line x1={130} y1={116} x2={150} y2={116} stroke={NAVY} strokeWidth={1.25} />
          <circle cx={157} cy={104} r={2} fill={ORANGE_DEEP} />
          <circle cx={157} cy={116} r={2} fill={ORANGE_DEEP} />
        </g>
      )}
    </svg>
  );
}

function Diagram({ sel, onPick }: { sel: number; onPick: (i: number) => void }) {
  const arrowId = useId().replace(/:/g, "");
  const hit = ARTIFACTS.filter((a) => a.stage <= sel);
  const firstX = cx(0);
  const selX = cx(sel);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`需求變更發生在 ${STAGES[sel].zh}，相對成本約 ${STAGES[sel].cost} 倍，需要改版 ${hit.length} 份產出：${hit.map((a) => a.name).join("、")}。`}
    >
      <style>{ANIM_CSS}</style>
      <defs>
        <marker id={arrowId} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill={ORANGE_DEEP} />
        </marker>
      </defs>
      <rect width={W} height={H} rx={10} fill={PANEL} />
      <text x={16} y={22} fontSize={11} fontWeight={800} fill={TEXT} fontFamily={FONT}>
        變更成本（相對於 Blueprint，示意）
      </text>
      {[0, 20, 40, 60, 80].map((v) => (
        <g key={v}>
          <line x1={X0} y1={by(v)} x2={W - 16} y2={by(v)} stroke={GRAY_2} strokeWidth={1} />
          <text x={X0 - 8} y={by(v) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT}>
            {v === 0 ? "0" : `${v}x`}
          </text>
        </g>
      ))}
      {STAGES.map((s, i) => {
        const isSel = i === sel;
        const before = i < sel;
        const bw = COL * 0.56;
        const h = Math.max(BAR_BOT - by(s.cost), 2);
        return (
          <g
            key={s.abbr}
            role="button"
            tabIndex={0}
            aria-label={`變更發生在 ${s.zh}`}
            onClick={() => onPick(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick(i);
              }
            }}
            style={{ cursor: "pointer", outline: "none" }}
          >
            <rect x={cx(i) - COL / 2 + 2} y={BAR_TOP - 8} width={COL - 4} height={BAR_BOT - BAR_TOP + 40} fill="transparent" />
            <rect x={cx(i) - bw / 2} y={BAR_BOT - h} width={bw} height={h} rx={2} fill={isSel ? ORANGE_DEEP : before ? BLUE_200 : BLUE_100} style={{ transition: "fill 200ms" }} />
            <text x={cx(i)} y={BAR_BOT - h - 6} textAnchor="middle" fontSize={10.5} fontWeight={isSel ? 800 : 600} fill={isSel ? ORANGE_700 : MUTED} fontFamily={FONT}>
              {s.cost}x
            </text>
            <text x={cx(i)} y={BAR_BOT + 16} textAnchor="middle" fontSize={11} fontWeight={800} fill={isSel ? ORANGE_700 : NAVY_DEEP} fontFamily={FONT}>
              {s.abbr}
            </text>
            <text x={cx(i)} y={BAR_BOT + 29} textAnchor="middle" fontSize={9} fill={MUTED} fontFamily={FONT}>
              {s.zh}
            </text>
          </g>
        );
      })}

      <line x1={X0} y1={DOC_Y - 78} x2={W - 16} y2={DOC_Y - 78} stroke={GRAY} strokeWidth={1} />
      <text x={16} y={DOC_Y + 4} fontSize={11} fontWeight={800} fill={TEXT} fontFamily={FONT}>
        產出
      </text>

      {/* 回頭重做的回流箭頭：從變更點繞回 PRD */}
      {sel > 0 && (
        <g>
          <path d={`M${selX} ${DOC_Y - 40} C ${selX} ${DOC_Y - 62}, ${firstX} ${DOC_Y - 62}, ${firstX} ${DOC_Y - 40}`} fill="none" stroke={ORANGE_DEEP} strokeWidth={1.5} strokeDasharray="5 4" markerEnd={`url(#${arrowId})`} />
          <text x={(selX + firstX) / 2} y={DOC_Y - 62} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={ORANGE_700} fontFamily={FONT}>
            回頭重做 {hit.length} 份產出
          </text>
        </g>
      )}

      {/* 產出縮圖鏈 */}
      {ARTIFACTS.map((a, k) => (
        <Thumb key={a.name} kind={k} x={cx(a.stage)} affected={a.stage <= sel} sel={sel} name={a.name} />
      ))}
    </svg>
  );
}

export default function PmSdlcChangeRipple() {
  const [sel, setSel] = useState(3);
  const s = STAGES[sel];
  const hit = ARTIFACTS.filter((a) => a.stage <= sel);

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div role="group" aria-label="變更發生的階段" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginRight: 4 }}>需求變更發生在：</span>
        {STAGES.map((x, i) => {
          const on = i === sel;
          return (
            <button
              key={x.abbr}
              type="button"
              aria-pressed={on}
              onClick={() => setSel(i)}
              style={{ height: 30, minWidth: 44, padding: "0 10px", borderRadius: 999, border: `1.5px solid ${on ? ORANGE_DEEP : BLUE_200}`, background: on ? ORANGE_DEEP : "#ffffff", color: on ? "#ffffff" : NAVY, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
            >
              {x.abbr}
            </button>
          );
        })}
      </div>

      <Diagram sel={sel} onPick={setSel} />

      <div aria-live="polite" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", fontSize: 13, lineHeight: 1.65, color: TEXT, background: ORANGE_50, border: `1px solid ${ORANGE_100}`, borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ flex: "0 1 200px", minWidth: 170, background: "#ffffff", border: `1px solid ${ORANGE_100}`, borderRadius: 6, padding: 4 }}>
          <ReworkPile sel={sel} />
        </div>
        <div style={{ flex: "1 1 260px" }}>
          <strong style={{ color: ORANGE_700 }}>
            {s.zh}階段變更 · 約 {s.cost} 倍 · 影響 {hit.length} 份產出
          </strong>
          <br />
          {s.note}
          <span style={{ color: MUTED }}> 需改版：{hit.map((a) => a.name).join("、")}。</span>
        </div>
      </div>
    </div>
  );
}
