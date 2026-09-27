import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowRight, CircleX, Minus, PauseCircle, Plus, RotateCcw, Undo2 } from "lucide-react";

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
const SUCCESS_50 = "#e8f5ee";
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";

interface Column {
  key: string;
  zh: string;
  wip: boolean; // 是否設 WIP 上限
}

const COLUMNS: Column[] = [
  { key: "Open", zh: "待辦", wip: false },
  { key: "On Going", zh: "進行中", wip: true },
  { key: "Done", zh: "待驗收", wip: false },
  { key: "Verified", zh: "待結案", wip: true },
  { key: "Closed", zh: "已結案", wip: false },
];

type Off = "pending" | "cancelled" | null;

interface Card {
  id: number;
  title: string;
  owner: string;
  col: number;
  off: Off;
}

const INITIAL: Card[] = [
  { id: 1, title: "首頁改版", owner: "FE", col: 0, off: null },
  { id: 2, title: "會員登入流程", owner: "BE", col: 0, off: null },
  { id: 3, title: "購物車 UX", owner: "UI", col: 0, off: null },
  { id: 4, title: "商品列表 API", owner: "BE", col: 1, off: null },
  { id: 5, title: "搜尋功能", owner: "FE", col: 1, off: null },
  { id: 6, title: "訂單通知信", owner: "BE", col: 2, off: null },
  { id: 7, title: "金流串接", owner: "BE", col: 3, off: null },
  { id: 8, title: "活動報名頁", owner: "FE", col: 1, off: "pending" },
  { id: 9, title: "舊版報表匯出", owner: "BE", col: 2, off: "cancelled" },
];

const iconBtn: CSSProperties = {
  border: "none",
  background: "none",
  padding: 2,
  display: "inline-flex",
  cursor: "pointer",
  color: MUTED,
};

/* ---------- 插圖：工作站流動示意 ---------- */

const FLOW_MIN_W = 660;
const BASE = 112; // 工作站層板的 y
const FLOW_H = BASE + 70;

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

function FlowSchematic({ cards, limits, bottleneck, reduce }: { cards: Card[]; limits: Record<number, number>; bottleneck: number; reduce: boolean }) {
  const [ref, w] = useMeasuredWidth(FLOW_MIN_W);
  const pad = 8;
  const gap = 30;
  const sw = (w - pad * 2 - gap * (COLUMNS.length - 1)) / COLUMNS.length;
  const sx = (i: number) => pad + i * (sw + gap);
  const stacks = COLUMNS.map((_, i) => cards.filter((c) => c.off === null && c.col === i));
  const tallest = Math.max(4, ...stacks.map((s) => s.length), ...COLUMNS.map((c, i) => (c.wip ? limits[i] : 0)));
  const step = Math.min(14, 72 / tallest);
  const tileH = step - 3;
  const tileW = Math.min(64, sw * 0.55);
  const off = cards.filter((c) => c.off !== null);
  const pending = off.filter((c) => c.off === "pending").length;
  const drops = [...new Set(off.map((c) => c.col))];
  const ease: CSSProperties = reduce ? {} : { transition: "y 250ms ease-out, fill 200ms, stroke 200ms" };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${w} ${FLOW_H}`}
      width="100%"
      role="img"
      aria-label={`流動示意：${COLUMNS.map((c, i) => `${c.key} ${stacks[i].length} 張${c.wip ? `（WIP 上限 ${limits[i]}）` : ""}`).join("、")}${bottleneck >= 0 ? `；卡片堆積在 ${COLUMNS[bottleneck].key}，就是目前的瓶頸` : ""}；離開流動 ${off.length} 張。`}
    >
      <defs>
        <marker id="kf-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill={BLUE_200} />
        </marker>
      </defs>

      {COLUMNS.map((col, i) => {
        const x = sx(i);
        const cx = x + sw / 2;
        const list = stacks[i];
        const isFull = col.wip && list.length >= limits[i];
        const last = i === COLUMNS.length - 1;
        const capY = BASE - limits[i] * step - 1.5;
        return (
          <g key={col.key}>
            {/* 工作站 */}
            <rect x={x} y={14} width={sw} height={BASE - 14} rx={6} fill={isFull ? ORANGE_50 : PANEL} stroke={isFull ? ORANGE_100 : GRAY_2} strokeWidth={1} style={ease} />
            <rect x={x} y={BASE} width={sw} height={4} rx={2} fill={isFull ? ORANGE_DEEP : last ? SUCCESS : GRAY} style={ease} />
            {i < COLUMNS.length - 1 && <line x1={x + sw + 4} y1={BASE + 2} x2={x + sw + gap - 6} y2={BASE + 2} stroke={BLUE_200} strokeWidth={1.5} markerEnd="url(#kf-arr)" />}

            {/* WIP 天花板 */}
            {col.wip && (
              <g>
                <line x1={x + 6} y1={capY} x2={x + sw - 6} y2={capY} stroke={isFull ? ORANGE_DEEP : NAVY} strokeWidth={1.25} strokeDasharray="4 3" style={reduce ? {} : { transition: "y1 250ms, y2 250ms" }} />
                <text x={x + sw - 6} y={capY - 4} textAnchor="end" fontSize={10} fontWeight={700} fill={isFull ? ORANGE_700 : NAVY} fontFamily={FONT}>
                  WIP {limits[i]}
                </text>
              </g>
            )}

            {/* 卡片堆疊 */}
            {list.map((c, k) => {
              const y = BASE - (k + 1) * step;
              const fill = last ? SUCCESS_50 : "#ffffff";
              const stroke = last ? SUCCESS : isFull ? ORANGE_DEEP : NAVY;
              return (
                <g key={c.id}>
                  <rect x={cx - tileW / 2} y={y} width={tileW} height={tileH} rx={2} fill={fill} stroke={stroke} strokeWidth={1} style={ease} />
                  {tileH >= 7 && <line x1={cx - tileW / 2 + 5} y1={y + tileH / 2} x2={cx + tileW * 0.1} y2={y + tileH / 2} stroke={stroke} strokeWidth={1} opacity={0.5} style={reduce ? {} : { transition: "y1 250ms, y2 250ms" }} />}
                </g>
              );
            })}

            {/* 瓶頸標記 */}
            {i === bottleneck && (
              <g>
                <text x={cx} y={BASE - list.length * step - 12} textAnchor="middle" fontSize={11} fontWeight={800} fill={ORANGE_700} fontFamily={FONT}>
                  瓶頸
                </text>
                <path d={`M${cx - 4} ${BASE - list.length * step - 8} L${cx + 4} ${BASE - list.length * step - 8} L${cx} ${BASE - list.length * step - 3} Z`} fill={ORANGE_DEEP} />
              </g>
            )}

            <text x={cx} y={BASE + 20} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={isFull ? ORANGE_700 : last ? SUCCESS : NAVY_DEEP} fontFamily={FONT}>
              {col.key}
            </text>
            <text x={cx} y={BASE + 34} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={FONT}>
              {col.zh} · {list.length} 張
            </text>
          </g>
        );
      })}

      {/* 離開流動：從原工作站往下分流 */}
      {drops.map((i) => (
        <line key={i} x1={sx(i) + sw - 8} y1={BASE + 6} x2={sx(i) + sw - 8} y2={BASE + 46} stroke={GRAY} strokeWidth={1.25} strokeDasharray="3 3" />
      ))}
      <rect x={pad} y={BASE + 46} width={w - pad * 2} height={20} rx={10} fill="#ffffff" stroke={GRAY} strokeWidth={1} strokeDasharray="4 3" />
      <text x={w / 2} y={BASE + 60} textAnchor="middle" fontSize={10.5} fill={MUTED} fontFamily={FONT}>
        離開流動（不佔 WIP）：Pending {pending} · Cancelled {off.length - pending}
      </text>
    </svg>
  );
}

export default function PmKanbanFlow() {
  const reduce = useReducedMotion() ?? false;
  const [cards, setCards] = useState<Card[]>(() => INITIAL.map((c) => ({ ...c })));
  const [limits, setLimits] = useState<Record<number, number>>({ 1: 2, 3: 2 });
  const [msg, setMsg] = useState<{ tone: "warn" | "ok"; text: string } | null>(null);

  const inCol = (i: number) => cards.filter((c) => c.off === null && c.col === i);
  const full = (i: number) => COLUMNS[i].wip && inCol(i).length >= limits[i];

  const move = (id: number, to: number, restore = false) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    if (full(to)) {
      setMsg({ tone: "warn", text: `${COLUMNS[to].key} 已達 WIP 上限 ${limits[to]}：先把這一欄的卡片推出去，再開始新的。` });
      return;
    }
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, col: to, off: null } : c)));
    setMsg(restore ? { tone: "ok", text: `「${card.title}」回到 ${COLUMNS[to].key}，重新進入流動。` } : to === COLUMNS.length - 1 ? { tone: "ok", text: `「${card.title}」結案。` } : null);
  };

  const leave = (id: number, off: Exclude<Off, null>) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, off } : c)));
    setMsg(null);
  };

  const setLimit = (i: number, d: number) => {
    setLimits((l) => ({ ...l, [i]: Math.max(1, Math.min(5, l[i] + d)) }));
    setMsg(null);
  };

  const offCards = cards.filter((c) => c.off !== null);
  const counts = COLUMNS.map((_, i) => inCol(i).length);
  const maxCount = Math.max(3, ...counts);
  const bottleneck = counts.slice(0, 4).indexOf(Math.max(...counts.slice(0, 4)));

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 12.5, color: MUTED }}>
        <span>點卡片推進到下一欄；</span>
        <PauseCircle size={14} /> <span>暫離（Pending）</span>
        <CircleX size={14} /> <span>退出（Cancelled）</span>
        <button
          type="button"
          onClick={() => {
            setCards(INITIAL.map((c) => ({ ...c })));
            setLimits({ 1: 2, 3: 2 });
            setMsg(null);
          }}
          style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px", borderRadius: 8, border: `1.5px solid ${BLUE_200}`, background: "#ffffff", color: NAVY, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          <RotateCcw size={14} /> 重置
        </button>
      </div>

      <FlowSchematic cards={cards} limits={limits} bottleneck={counts[bottleneck] >= 2 ? bottleneck : -1} reduce={reduce} />

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(124px, 1fr))`, gap: 8, minWidth: 660 }}>
          {COLUMNS.map((col, i) => {
            const list = inCol(i);
            const isFull = full(i);
            const last = i === COLUMNS.length - 1;
            return (
              <div key={col.key} style={{ display: "flex", flexDirection: "column", gap: 6, background: isFull ? ORANGE_50 : PANEL, border: `1px solid ${isFull ? ORANGE_100 : GRAY_2}`, borderRadius: 8, padding: 8, minHeight: 240, transition: "background-color 200ms" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <strong style={{ fontSize: 13, color: isFull ? ORANGE_700 : NAVY_DEEP }}>{col.key}</strong>
                  <span style={{ fontSize: 11, color: MUTED }}>{col.zh}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: isFull ? ORANGE_700 : MUTED, fontVariantNumeric: "tabular-nums" }}>
                    {col.wip ? `${list.length}/${limits[i]}` : list.length}
                  </span>
                </div>
                {/* 欄位容量條：有 WIP 上限時顯示佔用比例 */}
                <svg viewBox="0 0 100 6" width="100%" height={6} preserveAspectRatio="none" aria-hidden="true">
                  <rect x={0} y={0} width={100} height={6} rx={3} fill={GRAY_2} />
                  <rect x={0} y={0} width={Math.min(100, (100 * list.length) / (col.wip ? limits[i] : maxCount))} height={6} rx={3} fill={isFull ? ORANGE_DEEP : last ? SUCCESS : NAVY} />
                </svg>
                {col.wip && (
                  <div role="group" aria-label={`${col.key} WIP 上限`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: MUTED }}>
                    WIP 上限
                    <button type="button" onClick={() => setLimit(i, -1)} aria-label="減少 WIP" style={{ ...iconBtn, border: `1px solid ${GRAY}`, borderRadius: 4 }}>
                      <Minus size={11} />
                    </button>
                    <span style={{ fontWeight: 700, color: TEXT }}>{limits[i]}</span>
                    <button type="button" onClick={() => setLimit(i, 1)} aria-label="增加 WIP" style={{ ...iconBtn, border: `1px solid ${GRAY}`, borderRadius: 4 }}>
                      <Plus size={11} />
                    </button>
                  </div>
                )}
                {list.map((c) => (
                  <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 4, background: last ? SUCCESS_50 : "#ffffff", border: `1px solid ${last ? SUCCESS_50 : BLUE_100}`, borderRadius: 6, padding: "6px 8px" }}>
                    <button
                      type="button"
                      disabled={last}
                      onClick={() => move(c.id, i + 1)}
                      aria-label={last ? `${c.title}（已結案）` : `把 ${c.title} 推進到 ${COLUMNS[i + 1].key}`}
                      style={{ border: "none", background: "none", padding: 0, textAlign: "left", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: last ? MUTED : TEXT, cursor: last ? "default" : "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {c.title}
                      {!last && <ArrowRight size={12} style={{ marginLeft: "auto", color: BLUE_200, flexShrink: 0 }} />}
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: NAVY, background: BLUE_50, borderRadius: 999, padding: "0 6px" }}>{c.owner}</span>
                      {!last && (
                        <span style={{ marginLeft: "auto", display: "inline-flex" }}>
                          <button type="button" onClick={() => leave(c.id, "pending")} aria-label={`${c.title} 標記為 Pending`} title="Pending：暫離流動" style={iconBtn}>
                            <PauseCircle size={13} />
                          </button>
                          <button type="button" onClick={() => leave(c.id, "cancelled")} aria-label={`${c.title} 標記為 Cancelled`} title="Cancelled：退出流動" style={iconBtn}>
                            <CircleX size={13} />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* 離開流動的泳道 */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, background: "#ffffff", border: `1px dashed ${GRAY}`, borderRadius: 8, padding: "8px 10px" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: MUTED, marginRight: 4 }}>離開流動（不佔 WIP）</span>
        {offCards.length === 0 && <span style={{ fontSize: 12, color: MUTED }}>目前沒有</span>}
        {offCards.map((c) => (
          <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: TEXT, background: c.off === "pending" ? ORANGE_50 : PANEL, border: `1px solid ${c.off === "pending" ? ORANGE_100 : GRAY_2}`, borderRadius: 6, padding: "3px 8px" }}>
            {c.off === "pending" ? <PauseCircle size={13} style={{ color: ORANGE_DEEP }} /> : <CircleX size={13} style={{ color: MUTED }} />}
            <span style={{ textDecoration: c.off === "cancelled" ? "line-through" : "none" }}>{c.title}</span>
            <span style={{ fontSize: 10.5, color: MUTED }}>原欄位 {COLUMNS[c.col].key}</span>
            {c.off === "pending" && (
              <button type="button" onClick={() => move(c.id, c.col, true)} aria-label={`恢復 ${c.title}`} title="恢復到原欄位" style={{ ...iconBtn, color: NAVY }}>
                <Undo2 size={13} />
              </button>
            )}
          </span>
        ))}
      </div>

      <div aria-live="polite" style={{ fontSize: 13, lineHeight: 1.65, color: TEXT, background: msg?.tone === "warn" ? ORANGE_50 : BLUE_50, border: `1px solid ${msg?.tone === "warn" ? ORANGE_100 : BLUE_100}`, borderRadius: 8, padding: "10px 12px" }}>
        {msg ? (
          <span style={{ color: msg.tone === "warn" ? ORANGE_700 : TEXT, fontWeight: msg.tone === "warn" ? 700 : 400 }}>{msg.text}</span>
        ) : (
          <span>
            目前卡片最多的是 <strong style={{ color: NAVY_DEEP }}>{COLUMNS[bottleneck].key}</strong>（{counts[bottleneck]} 張）：堆積的欄位就是瓶頸。已結案 {counts[COLUMNS.length - 1]} 張。
          </span>
        )}
      </div>
    </div>
  );
}
