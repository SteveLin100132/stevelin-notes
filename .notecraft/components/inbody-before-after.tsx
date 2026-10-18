import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/* trendlink-design 色票（生成元件的 Tailwind class 不會被編譯，直接對應 token 值） */
const NAVY = "#1b4f9c"; // --blue-700（2026）
const BLUE_200 = "#adc8e8";
const OLD = "#9aa6b8"; // --neutral-400（2025）
const TEXT = "#3a4456"; // --neutral-700
const STRONG = "#161c28"; // --neutral-900
const MUTED = "#6c798e"; // --neutral-500
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

/* 資料：皆取自筆記中的 InBody 對比表（2025/10/09 → 2026/10/02） */
const BEFORE_LABEL = "2025/10";
const AFTER_LABEL = "2026/10";

const BARS = [
  { key: "weight", label: "體重", unit: "kg", before: 83.0, after: 71.3 },
  { key: "fat", label: "體脂肪量", unit: "kg", before: 22.8, after: 8.6 },
  { key: "muscle", label: "肌肉量", unit: "kg", before: 57.1, after: 59.5 },
] as const;

const CARDS = [
  { label: "體脂率", unit: "%", before: 27.5, after: 12.1, digits: 1 },
  { label: "內臟脂肪指數", unit: "", before: 13, after: 6, digits: 0 },
  { label: "SMI", unit: "", before: 9.0, after: 10.1, digits: 1 },
] as const;

function signed(v: number, digits: number): string {
  const s = Math.abs(v).toFixed(digits);
  return v > 0 ? `+${s}` : v < 0 ? `-${s}` : s;
}

/* ---------- 量測：讓 viewBox 寬 = 像素寬 ---------- */

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

/* ---------- 主圖：分組長條 ---------- */

function GroupedBars({ active, setActive, reduce }: { active: string | null; setActive: (k: string | null) => void; reduce: boolean }) {
  const [ref, W] = useMeasuredWidth(480);
  const H = 300;
  const padL = 48;
  const padR = 16;
  const padT = 48;
  const padB = 44;
  const plotW = W - padL - padR;
  const base = H - padB;

  const maxV = Math.max(...BARS.map((b) => Math.max(b.before, b.after)));
  const yMax = Math.ceil((maxV * 1.1) / 20) * 20;
  const ticks = Array.from({ length: yMax / 20 + 1 }, (_, i) => i * 20);
  const sy = (v: number) => base - ((base - padT) * v) / yMax;

  const groupW = plotW / BARS.length;
  const barW = Math.min(64, groupW * 0.26);
  const gap = 8;
  const tr = (delay: number) => ({ duration: reduce ? 0 : 0.4, ease: "easeOut" as const, delay: reduce ? 0 : delay });

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`InBody 前後對比長條圖：${BARS.map((b) => `${b.label} ${b.before.toFixed(1)} 到 ${b.after.toFixed(1)} ${b.unit}（${signed(b.after - b.before, 1)}）`).join("；")}。`}
      style={{ display: "block" }}
    >
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={8} fill="#ffffff" stroke={GRAY_2} strokeWidth={1} />

      {/* 格線與刻度 */}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} stroke={v === 0 ? GRAY : GRAY_2} strokeWidth={1} />
          <text x={padL - 8} y={sy(v) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={MONO}>
            {v}
          </text>
        </g>
      ))}
      <text x={padL - 8} y={padT - 14} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT}>
        kg
      </text>

      {BARS.map((b, gi) => {
        const cx = padL + groupW * (gi + 0.5);
        const x1 = cx - gap / 2 - barW;
        const x2 = cx + gap / 2;
        const y1 = sy(b.before);
        const y2 = sy(b.after);
        const delta = b.after - b.before;
        const dim = active !== null && active !== b.key;
        const on = active === b.key;
        const pillText = `${signed(delta, 1)} ${b.unit}`;
        const pillW = pillText.length * 7 + 18;
        const pillY = Math.min(y1, y2) - 42;
        return (
          <motion.g
            key={b.key}
            tabIndex={0}
            role="button"
            aria-label={`${b.label}：${BEFORE_LABEL} ${b.before.toFixed(1)}、${AFTER_LABEL} ${b.after.toFixed(1)} ${b.unit}，變化 ${pillText}`}
            onMouseEnter={() => setActive(b.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(b.key)}
            onBlur={() => setActive(null)}
            initial={false}
            animate={{ opacity: dim ? 0.35 : 1 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            style={{ cursor: "default", outline: "none" }}
          >
            {/* 感應區 */}
            <rect x={cx - groupW / 2 + 4} y={padT - 40} width={groupW - 8} height={base - padT + 40 + padB - 6} fill="transparent" />

            <motion.rect
              x={x1}
              width={barW}
              fill={OLD}
              rx={2}
              initial={reduce ? false : { y: base, height: 0 }}
              animate={{ y: y1, height: base - y1 }}
              transition={tr(gi * 0.08)}
            />
            <motion.rect
              x={x2}
              width={barW}
              fill={NAVY}
              rx={2}
              initial={reduce ? false : { y: base, height: 0 }}
              animate={{ y: y2, height: base - y2 }}
              transition={tr(gi * 0.08 + 0.12)}
            />

            {/* 數值標籤 */}
            <text x={x1 + barW / 2} y={y1 - 6} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={MUTED} fontFamily={MONO}>
              {b.before.toFixed(1)}
            </text>
            <text x={x2 + barW / 2} y={y2 - 6} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={NAVY} fontFamily={MONO}>
              {b.after.toFixed(1)}
            </text>

            {/* 連接線：2025 頂端 → 2026 頂端 */}
            <path
              d={`M ${x1 + barW / 2} ${y1 - 20} L ${x1 + barW / 2} ${pillY + 10} L ${x2 + barW / 2} ${pillY + 10} L ${x2 + barW / 2} ${y2 - 20}`}
              fill="none"
              stroke={on ? NAVY : GRAY}
              strokeWidth={1}
              strokeDasharray={on ? undefined : "3 3"}
            />

            {/* 變化量 */}
            <rect x={cx - pillW / 2} y={pillY} width={pillW} height={20} rx={10} fill="#ffffff" stroke={on ? NAVY : BLUE_200} strokeWidth={1} />
            <text x={cx} y={pillY + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill={NAVY} fontFamily={MONO}>
              {pillText}
            </text>

            {/* 類別 */}
            <text x={cx} y={base + 20} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={STRONG} fontFamily={FONT}>
              {b.label}
            </text>
            <text x={cx} y={base + 35} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={MONO}>
              {`${((delta / b.before) * 100).toFixed(1)}%`}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}

/* ---------- 指標卡：迷你刻度 + 前後值 ---------- */

function MiniTrack({ before, after, label }: { before: number; after: number; label: string }) {
  const W = 220;
  const H = 26;
  const x0 = 6;
  const x1 = W - 6;
  const max = Math.max(before, after) * 1.15;
  const sx = (v: number) => x0 + ((x1 - x0) * v) / max;
  const a = sx(before);
  const b = sx(after);
  const dir = b > a ? 1 : -1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${label} 由 ${before} 變為 ${after}`} style={{ display: "block" }}>
      <line x1={x0} y1={13} x2={x1} y2={13} stroke={GRAY_2} strokeWidth={2} strokeLinecap="round" />
      <line x1={a} y1={13} x2={b - dir * 6} y2={13} stroke={NAVY} strokeWidth={1.5} />
      <path d={`M ${b - dir * 7} 9 L ${b - dir * 2} 13 L ${b - dir * 7} 17`} fill="none" stroke={NAVY} strokeWidth={1.5} />
      <circle cx={a} cy={13} r={4.5} fill={OLD} />
      <circle cx={b} cy={13} r={4.5} fill={NAVY} />
    </svg>
  );
}

function MetricCard({ c }: { c: (typeof CARDS)[number] }) {
  const delta = c.after - c.before;
  const Icon = delta < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid ${GRAY_2}`,
        borderRadius: 8,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{c.label}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: NAVY }}>
          <Icon size={14} strokeWidth={2} aria-hidden="true" />
          {signed(delta, c.digits)}
          {c.unit}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontFamily: MONO }}>
        <span style={{ fontSize: 13, color: MUTED }}>
          {c.before.toFixed(c.digits)}
          {c.unit}
        </span>
        <span style={{ fontSize: 12, color: GRAY }}>→</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: NAVY }}>
          {c.after.toFixed(c.digits)}
          {c.unit}
        </span>
      </div>
      <MiniTrack before={c.before} after={c.after} label={c.label} />
    </div>
  );
}

/* ---------- 根元件 ---------- */

export default function InbodyBeforeAfter() {
  const reduce = useReducedMotion() ?? false;
  const [active, setActive] = useState<string | null>(null);
  const cur = BARS.find((b) => b.key === active) ?? null;

  const swatch = (color: string) => <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />;

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT, color: TEXT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 12.5 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {swatch(OLD)}
          {BEFORE_LABEL}（2025/10/09）
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: NAVY }}>
          {swatch(NAVY)}
          {AFTER_LABEL}（2026/10/02）
        </span>
        <span style={{ fontSize: 12, color: MUTED, marginLeft: "auto" }}>
          {cur
            ? `${cur.label}：${cur.before.toFixed(1)} → ${cur.after.toFixed(1)} ${cur.unit}，變化 ${signed(cur.after - cur.before, 1)} ${cur.unit}`
            : "滑過或聚焦長條群組可單獨檢視一項；類別名稱下方為相對 2025 的變化百分比"}
        </span>
      </div>

      <GroupedBars active={active} setActive={setActive} reduce={reduce} />

      <div role="group" aria-label="其他指標變化" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {CARDS.map((c) => (
          <MetricCard key={c.label} c={c} />
        ))}
      </div>
    </div>
  );
}
