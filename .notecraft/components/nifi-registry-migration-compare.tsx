import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Minus, Plus, RotateCcw } from "lucide-react";

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
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

const MAX_RELEASE = 6;

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

/* ---------- 計數模型 ---------- */

/** Template：每次移轉都要 存 Template、匯出、刪舊流程、匯入，再手動改 N 個設定 */
const templateTotal = (k: number, n: number) => k * (4 + n);
const templateInputs = (k: number, n: number) => k * n;
/** Registry：每次 commit + import / change version；參數只在第一次匯入時設定一次 */
const registryTotal = (k: number, n: number) => (k > 0 ? 2 * k + n : 0);
const registryInputs = (k: number, n: number) => (k > 0 ? n : 0);

/* ---------- 單次移轉的步驟泳道 ---------- */

type Kind = "step" | "manual" | "param" | "skip";
interface Block {
  label: string;
  kind: Kind;
}

function laneBlocks(mode: "template" | "registry", release: number, n: number): Block[] {
  if (mode === "template") {
    const base: Block[] = [
      { label: "存成 Template", kind: "step" },
      { label: "匯出 XML", kind: "step" },
      { label: "刪除舊流程", kind: "step" },
      { label: "匯入 Template", kind: "step" },
    ];
    return [...base, ...Array.from({ length: n }, (_, i) => ({ label: `設定 ${i + 1}`, kind: "manual" as Kind }))];
  }
  if (release === 1) {
    return [
      { label: "Commit v1", kind: "step" },
      { label: "Import v1", kind: "step" },
      ...Array.from({ length: n }, (_, i) => ({ label: `參數 ${i + 1}`, kind: "param" as Kind })),
    ];
  }
  return [
    { label: `Commit v${release}`, kind: "step" },
    { label: `Change version`, kind: "step" },
    { label: "參數沿用，免設定", kind: "skip" },
  ];
}

function Lanes({ release, n, reduce }: { release: number; n: number; reduce: boolean }) {
  const [ref, W] = useMeasuredWidth(640);
  const labelW = 150;
  const pad = 16;
  const laneH = 56;
  const H = 30 + laneH * 2 + 20;
  const avail = W - labelW - pad * 2;
  const stepW = Math.min(104, avail / 7.2);
  const cellW = Math.max(18, Math.min(40, (avail - stepW * 4 - 40) / Math.max(n, 1) - 4));

  const lanes: { key: "template" | "registry"; title: string; sub: string }[] = [
    { key: "template", title: "Template 手動移轉", sub: "每次都重來一遍" },
    { key: "registry", title: "Registry + 參數", sub: "流程與設定分離" },
  ];

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`第 ${release} 次移轉的步驟對比：Template 需要 ${4 + n} 個手動動作，其中 ${n} 個是手動輸入設定；Registry 需要 ${release === 1 ? 2 + n : 2} 個動作。`}
    >
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill="#ffffff" stroke="#e1e6ee" />
      <text x={pad} y={22} fontSize={10.5} fontWeight={800} fill={MUTED} fontFamily={FONT} letterSpacing="0.08em">
        {`第 ${release} 次移轉：DEV → 目標環境`}
      </text>
      {lanes.map((lane, li) => {
        const y = 32 + li * laneH;
        const blocks = laneBlocks(lane.key, release, n);
        let x = pad + labelW;
        return (
          <g key={lane.key}>
            <rect x={pad} y={y} width={W - pad * 2} height={laneH - 8} rx={8} fill="#ffffff" stroke={GRAY_2} />
            <text x={pad + 12} y={y + 20} fontSize={12.5} fontWeight={800} fill={NAVY_DEEP} fontFamily={FONT}>
              {lane.title}
            </text>
            <text x={pad + 12} y={y + 36} fontSize={10.5} fill={MUTED} fontFamily={FONT}>
              {lane.sub}
            </text>
            {blocks.map((b, i) => {
              const w = b.kind === "step" ? stepW : b.kind === "skip" ? stepW * 1.6 : cellW;
              const bx = x;
              x += w + 4;
              const fill = b.kind === "manual" ? ORANGE_50 : b.kind === "param" ? BLUE_50 : b.kind === "skip" ? "#ffffff" : BLUE_100;
              const stroke = b.kind === "manual" ? ORANGE : b.kind === "param" ? BLUE_200 : b.kind === "skip" ? GRAY : BLUE_200;
              const color = b.kind === "manual" ? ORANGE_700 : b.kind === "skip" ? MUTED : NAVY;
              const small = b.kind === "manual" || b.kind === "param";
              return (
                <motion.g
                  key={`${lane.key}-${release}-${n}-${i}`}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.05, ease: "easeOut" }}
                >
                  <rect
                    x={bx}
                    y={y + 9}
                    width={w}
                    height={laneH - 26}
                    rx={5}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1.25}
                    strokeDasharray={b.kind === "skip" ? "4 3" : undefined}
                  />
                  <text
                    x={bx + w / 2}
                    y={y + 28}
                    textAnchor="middle"
                    fontSize={small ? 9.5 : 10.5}
                    fontWeight={700}
                    fill={color}
                    fontFamily={small ? MONO : FONT}
                  >
                    {small ? i - (lane.key === "template" ? 3 : 1) : b.label}
                  </text>
                </motion.g>
              );
            })}
          </g>
        );
      })}
      <g fontFamily={FONT} fontSize={10.5}>
        <rect x={pad} y={H - 16} width={10} height={10} rx={2} fill={ORANGE_50} stroke={ORANGE} />
        <text x={pad + 16} y={H - 7} fill={TEXT}>手動輸入環境設定（易出錯）</text>
        <rect x={pad + 190} y={H - 16} width={10} height={10} rx={2} fill={BLUE_50} stroke={BLUE_200} />
        <text x={pad + 206} y={H - 7} fill={TEXT}>在 Parameter Context 設定一次</text>
      </g>
    </svg>
  );
}

/* ---------- 累積動作折線 ---------- */

function Cumulative({ release, n }: { release: number; n: number }) {
  const [ref, W] = useMeasuredWidth(560);
  const H = 210;
  const m = { l: 44, r: 120, t: 20, b: 34 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const yMax = Math.ceil(Math.max(templateTotal(MAX_RELEASE, n), 10) / 10) * 10;
  const x = (k: number) => m.l + ((k - 1) / (MAX_RELEASE - 1)) * iw;
  const y = (v: number) => m.t + ih - (v / yMax) * ih;
  const ks = Array.from({ length: MAX_RELEASE }, (_, i) => i + 1);
  const tPath = ks.map((k, i) => `${i ? "L" : "M"}${x(k)} ${y(templateTotal(k, n))}`).join(" ");
  const rPath = ks.map((k, i) => `${i ? "L" : "M"}${x(k)} ${y(registryTotal(k, n))}`).join(" ");
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((yMax / 4) * i));
  const tEnd = templateTotal(release, n);
  const rEnd = registryTotal(release, n);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`累積手動動作數：到第 ${release} 次移轉，Template 累積 ${tEnd} 個，Registry 累積 ${rEnd} 個。`}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} stroke={GRAY_2} />
          <text x={m.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={MONO}>
            {t}
          </text>
        </g>
      ))}
      {ks.map((k) => (
        <text key={k} x={x(k)} y={H - 14} textAnchor="middle" fontSize={10} fill={k === release ? NAVY : MUTED} fontWeight={k === release ? 800 : 500} fontFamily={FONT}>
          {`第 ${k} 次`}
        </text>
      ))}
      <text x={m.l} y={12} fontSize={10} fill={MUTED} fontFamily={FONT}>
        累積手動動作（次）
      </text>
      <line x1={x(release)} x2={x(release)} y1={m.t} y2={m.t + ih} stroke={NAVY} strokeDasharray="3 3" />
      <path d={tPath} fill="none" stroke={ORANGE} strokeWidth={2} />
      <path d={rPath} fill="none" stroke={NAVY} strokeWidth={2} />
      {ks.map((k) => (
        <g key={k}>
          <circle cx={x(k)} cy={y(templateTotal(k, n))} r={k === release ? 5 : 3} fill={k <= release ? ORANGE : "#ffffff"} stroke={ORANGE} strokeWidth={1.5} />
          <circle cx={x(k)} cy={y(registryTotal(k, n))} r={k === release ? 5 : 3} fill={k <= release ? NAVY : "#ffffff"} stroke={NAVY} strokeWidth={1.5} />
        </g>
      ))}
      <text x={m.l + iw + 10} y={y(templateTotal(MAX_RELEASE, n)) + 4} fontSize={11} fontWeight={800} fill={ORANGE_700} fontFamily={FONT}>
        Template
      </text>
      <text x={m.l + iw + 10} y={y(registryTotal(MAX_RELEASE, n)) + 4} fontSize={11} fontWeight={800} fill={NAVY} fontFamily={FONT}>
        Registry
      </text>
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
  border: `1.5px solid ${BLUE_200}`,
  background: "#ffffff",
  color: NAVY,
  fontFamily: "inherit",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
};

function Stat({ label, template, registry, unit, warn }: { label: string; template: number; registry: number; unit: string; warn?: boolean }) {
  return (
    <div style={{ background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: ORANGE_700, fontWeight: 700 }}>
          Template <strong style={{ fontSize: 22, fontFamily: MONO, color: warn ? ORANGE : ORANGE_700 }}>{template}</strong> {unit}
        </span>
        <span style={{ fontSize: 12, color: NAVY, fontWeight: 700 }}>
          Registry <strong style={{ fontSize: 22, fontFamily: MONO }}>{registry}</strong> {unit}
        </span>
      </div>
    </div>
  );
}

export default function NifiRegistryMigrationCompare() {
  const reduce = useReducedMotion() ?? false;
  const [n, setN] = useState(5);
  const [release, setRelease] = useState(1);

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT, color: TEXT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, fontWeight: 700, color: NAVY_DEEP, flex: "1 1 280px" }}>
          <span style={{ whiteSpace: "nowrap" }}>環境相依設定</span>
          <input
            type="range"
            min={1}
            max={10}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            aria-label="每次移轉需要依環境調整的設定數"
            style={{ flex: 1, accentColor: NAVY }}
          />
          <span style={{ fontFamily: MONO, minWidth: 44, color: ORANGE_700 }}>{n} 個</span>
        </label>
        <div role="group" aria-label="移轉次數" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button type="button" aria-label="上一次移轉" style={{ ...btn, padding: "0 8px", color: release === 1 ? GRAY : NAVY }} disabled={release === 1} onClick={() => setRelease((r) => Math.max(1, r - 1))}>
            <Minus size={15} />
          </button>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: NAVY_DEEP, minWidth: 92, textAlign: "center" }}>第 {release} 次移轉</span>
          <button
            type="button"
            style={{ ...btn, background: release === MAX_RELEASE ? "#ffffff" : NAVY, color: release === MAX_RELEASE ? GRAY : "#ffffff", borderColor: release === MAX_RELEASE ? GRAY_2 : NAVY }}
            disabled={release === MAX_RELEASE}
            onClick={() => setRelease((r) => Math.min(MAX_RELEASE, r + 1))}
          >
            <Plus size={15} />
            再發佈一版
          </button>
          <button type="button" aria-label="重置" style={{ ...btn, padding: "0 8px" }} onClick={() => setRelease(1)}>
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <Lanes release={release} n={n} reduce={reduce} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <Stat label={`到第 ${release} 次為止，累積手動動作`} template={templateTotal(release, n)} registry={registryTotal(release, n)} unit="次" />
        <Stat label="其中「手動輸入設定值」（最容易出錯）" template={templateInputs(release, n)} registry={registryInputs(release, n)} unit="次" warn />
      </div>

      <div style={{ background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "10px 12px 4px" }}>
        <Cumulative release={release} n={n} />
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.7, background: release === 1 ? BLUE_50 : ORANGE_50, border: `1px solid ${release === 1 ? BLUE_100 : ORANGE_100}`, borderRadius: 8, padding: "10px 14px" }}>
        {release === 1 ? (
          <>
            第一次移轉兩邊差不多：Registry 也要在目標環境的 Parameter Context 填好 {n} 個參數。按「再發佈一版」看看之後的差距。
          </>
        ) : (
          <>
            第 {release} 次移轉時，Template 又要重新輸入 {n} 個設定；Registry 只做 Commit 與 Change version，參數留在目標環境原地不動。
            差距隨發佈次數線性擴大，而且省下的正是最容易打錯的那一段。
          </>
        )}
      </div>
    </div>
  );
}
