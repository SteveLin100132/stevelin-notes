import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/* ---------- 色票（trendlink-design token；Tailwind class 不會被編譯，改用常數） ---------- */

interface Palette {
  text: string;
  muted: string;
  panel: string;
  border: string;
  grid: string;
  axis: string;
  ref: string;
  a: string; // A 日：品牌藍
  aText: string;
  aSoft: string;
  b: string; // B 日：品牌橘
  bText: string;
  bSoft: string;
}

const LIGHT: Palette = {
  text: "#3a4456", // --neutral-700
  muted: "#6c798e", // --neutral-500
  panel: "#ffffff",
  border: "#e1e6ee", // --neutral-200
  grid: "#eef1f6", // --neutral-100
  axis: "#cbd3df", // --neutral-300
  ref: "#4f5b6e", // --neutral-600
  a: "#1b4f9c", // --blue-700
  aText: "#1b4f9c",
  aSoft: "#eef4fb", // --blue-50
  b: "#ed9b26", // --orange-400
  bText: "#a04f15", // --orange-700
  bSoft: "#fdf4e6", // --orange-50
};

const DARK: Palette = {
  text: "#e1e6ee",
  muted: "#9aa6b8",
  panel: "#161c28", // --neutral-900
  border: "#3a4456",
  grid: "#262e3d",
  axis: "#4f5b6e",
  ref: "#cbd3df",
  a: "#4d84cb", // --blue-400
  aText: "#7ba6da", // --blue-300
  aSoft: "#0b1f3e",
  b: "#ed9b26",
  bText: "#f2b955", // --orange-300
  bSoft: "#2a2116",
};

const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

/* ---------- 資料：筆記「有效組數」表（主要 1 組、次要 0.5 組，只計正式組） ---------- */

interface Row {
  muscle: string;
  a: number;
  b: number;
}

const DATA: Row[] = [
  { muscle: "三頭", a: 13.5, b: 10.5 },
  { muscle: "前三角", a: 9, b: 9 },
  { muscle: "中下胸", a: 7.5, b: 7.5 },
  { muscle: "側三角", a: 6.5, b: 6.5 },
  { muscle: "上胸", a: 4.5, b: 7.5 },
  { muscle: "斜方肌", a: 3, b: 3 },
];

const REF = 6;
const X_MAX = 14;

/* ---------- 環境偵測 ---------- */

function parseRgb(s: string): [number, number, number, number] | null {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
}

/** 頁面實際背景是否為深色（body 透明則看 html；都透明視為瀏覽器預設白底） */
function pageBgIsDark(): boolean {
  for (const el of [document.body, document.documentElement]) {
    if (!el) continue;
    const c = parseRgb(getComputedStyle(el).backgroundColor);
    if (!c || c[3] === 0) continue;
    return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 < 0.45;
  }
  return false;
}

function detectDark(mq: MediaQueryList): boolean {
  const html = document.documentElement;
  const theme = html.getAttribute("data-theme");
  if (html.classList.contains("dark") || theme === "dark") return true;
  if (html.classList.contains("light") || theme === "light") return false;
  return mq.matches && pageBgIsDark();
}

function useDarkMode(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDark(detectDark(mq));
    update();
    const mo = new MutationObserver(update);
    const opts: MutationObserverInit = { attributes: true, attributeFilter: ["class", "data-theme", "style"] };
    mo.observe(document.documentElement, opts);
    if (document.body) mo.observe(document.body, opts);
    mq.addEventListener("change", update);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);
  return dark;
}

/* viewBox 寬 = SVG 實際像素寬（低於最小設計寬度才等比縮小） */
const MIN_W = 320;

function useMeasuredWidth(min: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [w, setW] = useState(640);
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

/* ---------- 主元件 ---------- */

export default function PushVolumeAb() {
  const reduce = useReducedMotion() ?? false;
  const dark = useDarkMode();
  const pal = dark ? DARK : LIGHT;
  const [ref, W] = useMeasuredWidth(MIN_W);
  const [hover, setHover] = useState<string | null>(null);

  const compact = W < 480;
  const LABEL_W = compact ? 48 : 64;
  const ANNO_W = compact ? 58 : 92;
  const X0 = 12 + LABEL_W + 8;
  const X1 = W - ANNO_W - 40; // 留 40px 給長條末端的數值
  const sx = (v: number) => X0 + ((X1 - X0) * v) / X_MAX;

  const TOP = 30;
  const BAR_H = 15;
  const BAR_GAP = 3;
  const GROUP_H = 52;
  const plotBottom = TOP + DATA.length * GROUP_H;
  const H = plotBottom + 34;
  const ticks = Array.from({ length: X_MAX / 2 + 1 }, (_, i) => i * 2);
  const tr = { duration: reduce ? 0 : 0.25, ease: "easeOut" as const };

  const biggest = DATA.reduce<{ a: Row; b: Row }>(
    (acc, r) => ({
      a: r.a - r.b > acc.a.a - acc.a.b ? r : acc.a,
      b: r.b - r.a > acc.b.b - acc.b.a ? r : acc.b,
    }),
    { a: DATA[0], b: DATA[0] },
  );

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, fontFamily: FONT, color: pal.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px 18px", flexWrap: "wrap", fontSize: 12.5 }}>
        <div role="group" aria-label="圖例" style={{ display: "inline-flex", gap: 14, color: pal.muted }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 10, borderRadius: 2, background: pal.a, display: "inline-block" }} />
            推日 A（臥推優先）
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 10, borderRadius: 2, background: pal.b, display: "inline-block" }} />
            推日 B（上斜優先）
          </span>
        </div>
        <span style={{ color: pal.muted }}>
          A 日偏<strong style={{ color: pal.aText }}>{biggest.a.muscle}</strong>（{biggest.a.a} vs {biggest.a.b}），B 日偏
          <strong style={{ color: pal.bText }}>{biggest.b.muscle}</strong>（{biggest.b.b} vs {biggest.b.a}）；其餘肌群兩天相同
        </span>
      </div>

      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`推日 A 與 B 各肌群有效組數橫向長條圖，虛線為 6 組參考線。${DATA.map((r) => `${r.muscle} A ${r.a}、B ${r.b}`).join("；")}。A 日三頭多 3 組，B 日上胸多 3 組。`}
        style={{ display: "block" }}
        onPointerLeave={() => setHover(null)}
      >
        <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={8} fill={pal.panel} stroke={pal.border} strokeWidth={1} />

        {/* 格線與刻度 */}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={sx(v)} y1={TOP - 8} x2={sx(v)} y2={plotBottom} stroke={v === 0 ? pal.axis : pal.grid} strokeWidth={1} />
            <text x={sx(v)} y={plotBottom + 16} textAnchor="middle" fontSize={10} fill={pal.muted} fontFamily={MONO}>
              {v}
            </text>
          </g>
        ))}
        <text x={X1 + 8} y={plotBottom + 16} fontSize={10} fill={pal.muted} fontFamily={FONT}>
          組
        </text>

        {/* 群組 */}
        {DATA.map((r, i) => {
          const y = TOP + i * GROUP_H + (GROUP_H - (BAR_H * 2 + BAR_GAP)) / 2;
          const diff = r.a - r.b;
          const dim = hover !== null && hover !== r.muscle;
          const lean = diff > 0 ? "a" : diff < 0 ? "b" : null;
          const annoX = X1 + 40;
          return (
            <motion.g
              key={r.muscle}
              initial={false}
              animate={{ opacity: dim ? 0.35 : 1 }}
              transition={tr}
              onPointerEnter={() => setHover(r.muscle)}
              onClick={() => setHover(hover === r.muscle ? null : r.muscle)}
              style={{ cursor: "default" }}
            >
              {/* 透明命中區 */}
              <rect x={1} y={TOP + i * GROUP_H} width={W - 2} height={GROUP_H} fill="transparent" />
              <text
                x={12 + LABEL_W}
                y={y + BAR_H + BAR_GAP / 2 + 4}
                textAnchor="end"
                fontSize={compact ? 12 : 13}
                fontWeight={lean ? 800 : 600}
                fill={lean === "a" ? pal.aText : lean === "b" ? pal.bText : pal.text}
                fontFamily={FONT}
              >
                {r.muscle}
              </text>

              {(["a", "b"] as const).map((k, j) => {
                const v = r[k];
                const by = y + j * (BAR_H + BAR_GAP);
                return (
                  <g key={k}>
                    <rect x={X0} y={by} width={Math.max(sx(v) - X0, 1)} height={BAR_H} rx={3} fill={k === "a" ? pal.a : pal.b} />
                    <text x={sx(v) + 5} y={by + BAR_H - 3.5} fontSize={11} fontWeight={700} fill={k === "a" ? pal.aText : pal.bText} fontFamily={MONO}>
                      {v}
                    </text>
                  </g>
                );
              })}

              {/* 差異標註 */}
              {lean ? (
                <g>
                  <rect
                    x={annoX}
                    y={y + 4}
                    width={ANNO_W - 12}
                    height={BAR_H * 2 + BAR_GAP - 8}
                    rx={(BAR_H * 2 + BAR_GAP - 8) / 2}
                    fill={lean === "a" ? pal.aSoft : pal.bSoft}
                    stroke={lean === "a" ? pal.a : pal.b}
                    strokeWidth={1}
                  />
                  <text
                    x={annoX + (ANNO_W - 12) / 2}
                    y={y + BAR_H + BAR_GAP / 2 + 4}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={800}
                    fill={lean === "a" ? pal.aText : pal.bText}
                    fontFamily={FONT}
                  >
                    {compact ? `${lean.toUpperCase()} +${Math.abs(diff)}` : `${lean === "a" ? "A 日" : "B 日"} +${Math.abs(diff)} 組`}
                  </text>
                </g>
              ) : (
                <text x={annoX + (ANNO_W - 12) / 2} y={y + BAR_H + BAR_GAP / 2 + 4} textAnchor="middle" fontSize={11} fill={pal.muted} fontFamily={FONT}>
                  相同
                </text>
              )}
            </motion.g>
          );
        })}

        {/* 6 組參考線（畫在長條之上） */}
        <line x1={sx(REF)} y1={TOP - 10} x2={sx(REF)} y2={plotBottom} stroke={pal.ref} strokeWidth={1.5} strokeDasharray="5 4" pointerEvents="none" />
        <text x={sx(REF)} y={TOP - 14} textAnchor="middle" fontSize={11} fontWeight={700} fill={pal.ref} fontFamily={FONT}>
          6 組參考線
        </text>
        <text x={X1 + 40 + (ANNO_W - 12) / 2} y={TOP - 14} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={pal.muted} fontFamily={FONT}>
          A − B
        </text>
      </svg>
    </div>
  );
}
