import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CircleAlert, CircleCheck, RotateCcw, Trash2, TriangleAlert } from "lucide-react";

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
const DANGER = "#c9453b";
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";

interface Pkg {
  id: string;
  name: string;
  pic: string;
  hours: number;
}

interface Group {
  id: string;
  name: string;
  pkgs: Pkg[];
}

const INITIAL: Group[] = [
  {
    id: "1",
    name: "需求與規劃",
    pkgs: [
      { id: "1.1", name: "痛點訪談與需求確認", pic: "PM", hours: 8 },
      { id: "1.2", name: "PRD 定稿與待釐清項確認", pic: "PM", hours: 16 },
      { id: "1.3", name: "範圍與里程碑確認", pic: "PM", hours: 8 },
    ],
  },
  {
    id: "2",
    name: "設計",
    pkgs: [
      { id: "2.1", name: "業務流程與 Use Case", pic: "SA", hours: 16 },
      { id: "2.2", name: "資料庫 Schema 設計", pic: "BE", hours: 24 },
      { id: "2.3", name: "API 規格設計", pic: "BE", hours: 24 },
      { id: "2.4", name: "UI Mockup", pic: "UI", hours: 24 },
    ],
  },
  {
    id: "3",
    name: "開發",
    pkgs: [
      { id: "3.1", name: "基礎建設與權限", pic: "BE", hours: 40 },
      { id: "3.2", name: "活動設定與排除時段", pic: "FE", hours: 48 },
      { id: "3.3", name: "草稿班表與推薦演算法", pic: "BE", hours: 72 },
      { id: "3.4", name: "正式班表與檢視", pic: "FE", hours: 56 },
      { id: "3.5", name: "出勤統計與過往匯入", pic: "BE", hours: 40 },
    ],
  },
  {
    id: "4",
    name: "測試",
    pkgs: [
      { id: "4.1", name: "單元測試（Jest）", pic: "BE", hours: 16 },
      { id: "4.2", name: "系統整合測試（SIT）", pic: "QA", hours: 24 },
      { id: "4.3", name: "使用者驗收測試（UAT）", pic: "PM", hours: 16 },
    ],
  },
  {
    id: "5",
    name: "上線",
    pkgs: [
      { id: "5.1", name: "Docker 部署設定", pic: "BE", hours: 8 },
      { id: "5.2", name: "Cutover 與 Go-Live", pic: "BE", hours: 8 },
      { id: "5.3", name: "上線後監控", pic: "QA", hours: 4 },
    ],
  },
];

const HOURS_PER_DAY = 8;

type Grain = "small" | "ok" | "large";

function grain(h: number): Grain {
  if (h < 8) return "small";
  if (h > 80) return "large";
  return "ok";
}

const GRAIN_TEXT: Record<Grain, string> = {
  small: "低於 8 小時：拆得太細，管理成本可能超過產出價值，建議與相鄰工作包合併。",
  ok: "落在 8～80 小時：粒度合理，能由一位負責人扛起，驗收標準明確。",
  large: "高於 80 小時：顆粒太大，風險被掩蓋、難估時追蹤，建議再往下拆。",
};

function GrainIcon({ g }: { g: Grain }) {
  if (g === "ok") return <CircleCheck size={14} style={{ color: SUCCESS }} />;
  if (g === "small") return <CircleAlert size={14} style={{ color: ORANGE_DEEP }} />;
  return <TriangleAlert size={14} style={{ color: DANGER }} />;
}

/* 依序排程：同一個 PIC 不能同時做兩件事，工作包依 WBS 順序接續，每天 8 小時 */
interface Slot {
  start: number; // 工作日（0-indexed）
  days: number;
}

function schedule(groups: Group[]): Record<string, Slot> {
  const out: Record<string, Slot> = {};
  let phaseStart = 0;
  for (const g of groups) {
    let phaseEnd = phaseStart;
    const free: Record<string, number> = {};
    for (const p of g.pkgs) {
      const days = Math.max(1, Math.ceil(p.hours / HOURS_PER_DAY));
      const start = Math.max(phaseStart, free[p.pic] ?? phaseStart);
      out[p.id] = { start, days };
      free[p.pic] = start + days;
      phaseEnd = Math.max(phaseEnd, start + days);
    }
    phaseStart = phaseEnd; // 階段之間是 finish-to-start 依賴
  }
  return out;
}

/* 量測容器實際寬度，讓時間軸 viewBox 寬 = 像素寬，填滿剩餘空間 */
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

const cell: CSSProperties = { padding: "0 8px", height: "100%", display: "flex", alignItems: "center", fontSize: 12.5, color: TEXT, whiteSpace: "nowrap", overflow: "hidden" };

export default function PmWbsGantt() {
  const [groups, setGroups] = useState<Group[]>(() => INITIAL.map((g) => ({ ...g, pkgs: g.pkgs.map((p) => ({ ...p })) })));
  const [tip, setTip] = useState<string | null>("5.3");
  const [axisRef, axisW] = useWidth<HTMLDivElement>();

  const slots = schedule(groups);
  const totalDays = Math.max(1, ...Object.values(slots).map((s) => s.start + s.days));
  const totalHours = groups.reduce((a, g) => a + g.pkgs.reduce((b, p) => b + p.hours, 0), 0);
  const weeks = Math.ceil(totalDays / 5);
  const all = groups.flatMap((g) => g.pkgs);
  const tipPkg = all.find((p) => p.id === tip) ?? null;

  const setHours = (id: string, v: number) =>
    setGroups((gs) => gs.map((g) => ({ ...g, pkgs: g.pkgs.map((p) => (p.id === id ? { ...p, hours: Math.max(1, Math.min(200, v || 1)) } : p)) })));
  const remove = (id: string) => {
    setGroups((gs) => gs.map((g) => ({ ...g, pkgs: g.pkgs.filter((p) => p.id !== id) })));
    if (tip === id) setTip(null);
  };

  /* 甘特時間軸：以工作日為單位，SVG 寬度隨總天數延展 */
  /* 週數不足以填滿寬度時多畫幾週空白，時間軸永遠滿版；超出寬度才橫向捲動 */
  const DAY = 9;
  const PAD = 8;
  const fitWeeks = Math.floor((axisW - PAD * 2) / (5 * DAY));
  const shownWeeks = Math.max(weeks, fitWeeks, 1);
  const SW = Math.max(shownWeeks * 5 * DAY + PAD * 2, axisW, 300);
  const rows: ({ kind: "root" } | { kind: "group"; g: Group } | { kind: "pkg"; p: Pkg })[] = [{ kind: "root" }];
  for (const g of groups) {
    rows.push({ kind: "group", g });
    for (const p of g.pkgs) rows.push({ kind: "pkg", p });
  }
  const ROW = 30;
  const HEAD = 28;
  const GH = HEAD + rows.length * ROW;

  const groupSpan = (g: Group) => {
    if (!g.pkgs.length) return null;
    const s = Math.min(...g.pkgs.map((p) => slots[p.id].start));
    const e = Math.max(...g.pkgs.map((p) => slots[p.id].start + slots[p.id].days));
    return { s, e };
  };

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, fontSize: 12, color: MUTED }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <CircleAlert size={13} style={{ color: ORANGE_DEEP }} /> &lt; 8h 過短
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <CircleCheck size={13} style={{ color: SUCCESS }} /> 8–80h 合理
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <TriangleAlert size={13} style={{ color: DANGER }} /> &gt; 80h 過長
        </span>
        <button
          type="button"
          onClick={() => {
            setGroups(INITIAL.map((g) => ({ ...g, pkgs: g.pkgs.map((p) => ({ ...p })) })));
            setTip("5.3");
          }}
          style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px", borderRadius: 8, border: `1.5px solid ${BLUE_200}`, background: "#ffffff", color: NAVY, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          <RotateCcw size={14} /> 重置
        </button>
      </div>

      <div style={{ display: "flex", border: `1px solid ${GRAY_2}`, borderRadius: 10, overflow: "hidden", background: "#ffffff" }}>
        {/* 凍結欄：工作項目 / PIC / 工時 */}
        <div style={{ flex: "0 0 auto", width: "max-content", minWidth: 340, maxWidth: "60%", borderRight: `1.5px solid ${BLUE_200}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 44px 76px", height: HEAD, boxSizing: "border-box", background: PANEL, borderBottom: `1px solid ${GRAY_2}`, fontSize: 11.5, fontWeight: 800, color: NAVY_DEEP, alignItems: "center" }}>
            <span style={{ padding: "0 8px" }}>工作項目</span>
            <span style={{ textAlign: "center" }}>PIC</span>
            <span style={{ textAlign: "right", paddingRight: 10 }}>工時</span>
          </div>
          {rows.map((r) => {
            if (r.kind === "root")
              return (
                <div key="root" style={{ display: "grid", gridTemplateColumns: "1fr 44px 76px", height: ROW, boxSizing: "border-box", background: BLUE_50, borderBottom: `1px solid ${GRAY_2}` }}>
                  <span style={{ ...cell, fontWeight: 800, color: NAVY_DEEP }}>DutyMate 值日生排班系統</span>
                  <span style={cell} />
                  <span style={{ ...cell, justifyContent: "flex-end", fontWeight: 800, color: NAVY_DEEP, fontVariantNumeric: "tabular-nums" }}>Σ {totalHours} h</span>
                </div>
              );
            if (r.kind === "group") {
              const sum = r.g.pkgs.reduce((a, p) => a + p.hours, 0);
              return (
                <div key={r.g.id} style={{ display: "grid", gridTemplateColumns: "1fr 44px 76px", height: ROW, boxSizing: "border-box", background: PANEL, borderBottom: `1px solid ${GRAY_2}` }}>
                  <span style={{ ...cell, fontWeight: 700, paddingLeft: 14 }}>
                    {r.g.id}. {r.g.name}
                  </span>
                  <span style={cell} />
                  <span style={{ ...cell, justifyContent: "flex-end", fontWeight: 700, color: MUTED, fontVariantNumeric: "tabular-nums" }}>Σ {sum} h</span>
                </div>
              );
            }
            const p = r.p;
            const g = grain(p.hours);
            return (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 44px 76px", height: ROW, boxSizing: "border-box", borderBottom: `1px solid ${GRAY_2}`, background: tip === p.id ? ORANGE_50 : "#ffffff" }}>
                <span style={{ ...cell, paddingLeft: 22, gap: 6 }}>
                  <button type="button" onClick={() => setTip(tip === p.id ? null : p.id)} aria-label={`${p.name} 粒度建議`} style={{ border: "none", background: "none", padding: 0, display: "inline-flex", cursor: "pointer" }}>
                    <GrainIcon g={g} />
                  </button>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={p.name}>
                    {p.id} {p.name}
                  </span>
                  <button type="button" onClick={() => remove(p.id)} aria-label={`刪除 ${p.name}（移出範圍）`} title="刪除即移出範圍" style={{ marginLeft: "auto", border: "none", background: "none", padding: 2, display: "inline-flex", cursor: "pointer", color: GRAY }}>
                    <Trash2 size={13} />
                  </button>
                </span>
                <span style={{ ...cell, justifyContent: "center", fontSize: 11, fontWeight: 700, color: NAVY }}>{p.pic}</span>
                <span style={{ ...cell, justifyContent: "flex-end", gap: 3 }}>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={p.hours}
                    aria-label={`${p.name} 工時`}
                    onChange={(e) => setHours(p.id, Number(e.target.value))}
                    style={{ width: 46, height: 22, border: `1px solid ${g === "ok" ? GRAY : g === "small" ? ORANGE_DEEP : DANGER}`, borderRadius: 4, fontFamily: "inherit", fontSize: 12, textAlign: "right", padding: "0 4px", color: TEXT, fontVariantNumeric: "tabular-nums" }}
                  />
                  h
                </span>
              </div>
            );
          })}
        </div>

        {/* 右側時間軸 */}
        <div ref={axisRef} style={{ flex: 1, minWidth: 0, overflowX: "auto" }}>
          <svg viewBox={`0 0 ${SW} ${GH}`} width={SW} height={GH} role="img" aria-label={`甘特時間軸：共 ${all.length} 個工作包，總工時 ${totalHours} 小時，依 PIC 與階段依賴排程約 ${totalDays} 個工作日。`} style={{ display: "block" }}>
            <rect x={0} y={0} width={SW} height={HEAD} fill={PANEL} />
            {Array.from({ length: shownWeeks + 1 }, (_, w) => (
              <g key={w}>
                <line x1={8 + w * 5 * DAY} y1={HEAD} x2={8 + w * 5 * DAY} y2={GH} stroke={GRAY_2} strokeWidth={1} />
                {w < shownWeeks && (
                  <text x={8 + w * 5 * DAY + 4} y={18} fontSize={10} fontWeight={700} fill={w < weeks ? MUTED : GRAY} fontFamily={FONT}>
                    W{w + 1}
                  </text>
                )}
              </g>
            ))}
            {rows.map((r, i) => {
              const y = HEAD + i * ROW;
              if (r.kind === "root")
                return <rect key="root" x={8} y={y + 12} width={totalDays * DAY} height={6} rx={3} fill={NAVY_DEEP} />;
              if (r.kind === "group") {
                const sp = groupSpan(r.g);
                return sp ? <rect key={r.g.id} x={8 + sp.s * DAY} y={y + 11} width={(sp.e - sp.s) * DAY} height={8} rx={2} fill={BLUE_200} /> : null;
              }
              const s = slots[r.p.id];
              const g = grain(r.p.hours);
              return (
                <g key={r.p.id}>
                  <line x1={0} y1={y + ROW} x2={SW} y2={y + ROW} stroke={GRAY_2} strokeWidth={1} />
                  <rect x={8 + s.start * DAY} y={y + 8} width={Math.max(s.days * DAY - 1, 3)} height={14} rx={3} fill={g === "ok" ? NAVY : g === "small" ? ORANGE_DEEP : DANGER} style={{ transition: "x 200ms, width 200ms" }} />
                  {s.days * DAY > 26 && (
                    <text x={8 + s.start * DAY + 4} y={y + 19} fontSize={9} fontWeight={700} fill="#ffffff" fontFamily={FONT}>
                      {s.days}d
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div aria-live="polite" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, fontSize: 13, lineHeight: 1.65, color: TEXT }}>
        <div style={{ background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "10px 12px" }}>
          <strong style={{ color: NAVY_DEEP }}>
            100% Rule · 總計 {totalHours} h · 約 {totalDays} 個工作日
          </strong>
          <br />
          每個彙總節點都等於子工作包的加總；刪掉的工作包就不在這次範圍內。改工時或刪除，右側時程會自動重排。
        </div>
        <div style={{ background: tipPkg ? ORANGE_50 : PANEL, border: `1px solid ${tipPkg ? ORANGE_100 : GRAY_2}`, borderRadius: 8, padding: "10px 12px" }}>
          {tipPkg ? (
            <span>
              <strong style={{ color: ORANGE_700 }}>
                {tipPkg.id} {tipPkg.name} · {tipPkg.hours} h
              </strong>
              <br />
              {GRAIN_TEXT[grain(tipPkg.hours)]}
            </span>
          ) : (
            <span style={{ color: MUTED }}>點工作項目前的狀態圖示，看粒度建議。試著把某個工作包改成 100 小時。</span>
          )}
        </div>
      </div>
    </div>
  );
}
