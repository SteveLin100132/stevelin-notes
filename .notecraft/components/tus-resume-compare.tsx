import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { CircleCheck, Pause, Play, RotateCcw, TriangleAlert } from "lucide-react";

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

/* 模型參數（示意）：頻寬 20 MB/s，每次斷線後重新連線需要 30 秒 */
const SPEED_MB = 20;
const RATE = (SPEED_MB * 60) / 1024; // GB / 分鐘
const GAP = 0.5; // 分鐘

interface Seg {
  t0: number;
  t1: number;
  from: number; // GB
  to: number; // GB
  failed: boolean;
}

interface Sim {
  segs: Seg[];
  gaps: number[]; // 斷線發生的時間點
  finish: number | null; // 完成時間（分鐘），null 代表時間窗內沒完成
  wasted: number; // 白傳的 GB
}

/* TUS：斷線後從 offset 接續 */
function simTus(size: number, stable: number): Sim {
  const segs: Seg[] = [];
  const gaps: number[] = [];
  let t = 0;
  let done = 0;
  while (done < size - 1e-9) {
    const run = Math.min(stable, (size - done) / RATE);
    segs.push({ t0: t, t1: t + run, from: done, to: done + run * RATE, failed: false });
    done += run * RATE;
    t += run;
    if (done < size - 1e-9) {
      gaps.push(t);
      t += GAP;
    }
  }
  return { segs, gaps, finish: t, wasted: 0 };
}

/* 傳統單次上傳：斷線就從 0 重來 */
function simPlain(size: number, stable: number, win: number): Sim {
  const need = size / RATE;
  if (need <= stable) return { segs: [{ t0: 0, t1: need, from: 0, to: size, failed: false }], gaps: [], finish: need, wasted: 0 };
  const segs: Seg[] = [];
  const gaps: number[] = [];
  let t = 0;
  let wasted = 0;
  while (t < win - 1e-9) {
    const run = Math.min(stable, win - t);
    segs.push({ t0: t, t1: t + run, from: 0, to: run * RATE, failed: run >= stable - 1e-9 });
    if (run >= stable - 1e-9) {
      wasted += run * RATE;
      gaps.push(t + run);
    }
    t += run + GAP;
  }
  return { segs, gaps, finish: null, wasted };
}

function tickStep(win: number): number {
  if (win <= 12) return 1;
  if (win <= 30) return 2;
  if (win <= 60) return 5;
  return 10;
}

const fmtMin = (m: number) => `${m.toFixed(1)} 分鐘`;
const fmtGB = (g: number) => `${g < 10 ? g.toFixed(1) : Math.round(g)} GB`;

/* 量測容器實際寬度，讓 viewBox 寬 = 像素寬，文字維持 1:1 */
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

/* ---------- 圖 ---------- */

const MIN_W = 640;
const X0 = 124;
const LANE_H = 26;
const TUS_Y = 36;
const PLAIN_Y = 92;
const CH_TOP = 170;
const CH_BOT = 310;
const H = 350;

function Break({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x} y1={y - 5} x2={x} y2={y + LANE_H + 5} stroke={ORANGE_DEEP} strokeWidth={1.5} />
      <path d={`M${x - 4} ${y - 11} l8 8 M${x + 4} ${y - 11} l-8 8`} stroke={ORANGE_DEEP} strokeWidth={1.5} />
    </g>
  );
}

function Chart({ width, size, tus, plain, win, cursor }: { width: number; size: number; tus: Sim; plain: Sim; win: number; cursor: number }) {
  const uid = useId().replace(/:/g, "");
  const W = Math.max(width, MIN_W);
  const X1 = W - 24;
  const sx = (t: number) => X0 + ((X1 - X0) * t) / win;
  const sy = (g: number) => CH_BOT - ((CH_BOT - CH_TOP) * g) / size;
  const step = tickStep(win);
  const ticks: number[] = [];
  for (let t = 0; t <= win + 1e-9; t += step) ticks.push(t);
  const gTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * size);

  const tusPath = tus.segs.map((s, i) => `${i === 0 ? "M" : "L"}${sx(s.t0).toFixed(1)} ${sy(s.from).toFixed(1)} L${sx(s.t1).toFixed(1)} ${sy(s.to).toFixed(1)}`).join(" ") + (tus.finish !== null ? ` L${sx(win).toFixed(1)} ${sy(size).toFixed(1)}` : "");
  const plainPath =
    plain.segs
      .map((s, i) => {
        const back = s.failed ? ` L${sx(s.t1).toFixed(1)} ${sy(0).toFixed(1)}` : "";
        return `${i === 0 ? "M" : "L"}${sx(s.t0).toFixed(1)} ${sy(0).toFixed(1)} L${sx(s.t1).toFixed(1)} ${sy(s.to).toFixed(1)}${back}`;
      })
      .join(" ") + (plain.finish !== null ? ` L${sx(win).toFixed(1)} ${sy(size).toFixed(1)}` : "");

  const cx = sx(Math.min(cursor, win));
  const playing = cursor < win - 1e-6;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`上傳 ${size} GB 檔案的時間軸比較。TUS 續傳在 ${fmtMin(tus.finish ?? 0)} 完成，中途斷線 ${tus.gaps.length} 次，重傳 0 GB；傳統單次上傳${plain.finish !== null ? `在 ${fmtMin(plain.finish)} 完成` : `在 ${fmtMin(win)} 內仍未完成，已白傳 ${fmtGB(plain.wasted)}`}。`}
      style={{ display: "block" }}
    >
      <defs>
        <pattern id={`${uid}-h`} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={6} height={6} fill={ORANGE_100} />
          <line x1={0} y1={0} x2={0} y2={6} stroke={ORANGE_DEEP} strokeWidth={1.5} opacity={0.55} />
        </pattern>
        <clipPath id={`${uid}-c`}>
          <rect x={0} y={0} width={cx} height={H} />
        </clipPath>
      </defs>
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill="#ffffff" stroke="#e1e6ee" />

      {/* 泳道標籤與底軌 */}
      <text x={16} y={TUS_Y + 11} fontSize={11} fontWeight={800} fill={NAVY} fontFamily={FONT} letterSpacing="0.04em">
        TUS 續傳
      </text>
      <text x={16} y={TUS_Y + 26} fontSize={10.5} fill={MUTED} fontFamily={FONT}>
        從 offset 接著傳
      </text>
      <text x={16} y={PLAIN_Y + 11} fontSize={11} fontWeight={800} fill={ORANGE_700} fontFamily={FONT} letterSpacing="0.04em">
        傳統上傳
      </text>
      <text x={16} y={PLAIN_Y + 26} fontSize={10.5} fill={MUTED} fontFamily={FONT}>
        斷線就從 0 開始
      </text>
      <rect x={X0} y={TUS_Y} width={X1 - X0} height={LANE_H} rx={3} fill={GRAY_2} opacity={0.6} />
      <rect x={X0} y={PLAIN_Y} width={X1 - X0} height={LANE_H} rx={3} fill={GRAY_2} opacity={0.6} />

      {/* 圖表格線 */}
      <text x={16} y={CH_TOP - 16} fontSize={11} fontWeight={800} fill={TEXT} fontFamily={FONT}>
        伺服器已收到的資料量
      </text>
      {gTicks.map((g) => (
        <g key={g}>
          <line x1={X0} y1={sy(g)} x2={X1} y2={sy(g)} stroke={GRAY_2} strokeWidth={1} />
          <text x={X0 - 8} y={sy(g) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT} style={{ fontVariantNumeric: "tabular-nums" }}>
            {g % 1 === 0 ? g : g.toFixed(1)} GB
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(t)} y1={CH_BOT} x2={sx(t)} y2={CH_BOT + 4} stroke={GRAY} strokeWidth={1} />
          <text x={sx(t)} y={CH_BOT + 17} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={FONT} style={{ fontVariantNumeric: "tabular-nums" }}>
            {t}
          </text>
        </g>
      ))}
      <text x={X1} y={CH_BOT + 34} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT}>
        經過時間（分鐘）
      </text>
      <line x1={X0} y1={CH_BOT} x2={X1} y2={CH_BOT} stroke={GRAY} strokeWidth={1} />

      {/* 隨時間揭露的內容 */}
      <g clipPath={`url(#${uid}-c)`}>
        {tus.segs.map((s, i) => (
          <rect key={`t${i}`} x={sx(s.t0)} y={TUS_Y} width={Math.max(1, sx(s.t1) - sx(s.t0) - 1)} height={LANE_H} rx={3} fill={NAVY} />
        ))}
        {tus.gaps.map((g) => (
          <Break key={`tg${g}`} x={sx(g)} y={TUS_Y} />
        ))}
        {plain.segs.map((s, i) => (
          <g key={`p${i}`}>
            <rect
              x={sx(s.t0)}
              y={PLAIN_Y}
              width={Math.max(1, sx(s.t1) - sx(s.t0) - 1)}
              height={LANE_H}
              rx={3}
              fill={s.failed ? `url(#${uid}-h)` : plain.finish !== null ? NAVY : BLUE_200}
              stroke={s.failed ? ORANGE_DEEP : "none"}
              strokeWidth={1}
            />
            {s.failed && sx(s.t1) - sx(s.t0) > 56 && (
              <text x={(sx(s.t0) + sx(s.t1)) / 2} y={PLAIN_Y + 17} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={ORANGE_700} fontFamily={FONT}>
                白傳 {fmtGB(s.to)}
              </text>
            )}
          </g>
        ))}
        {plain.gaps.map((g) => (
          <Break key={`pg${g}`} x={sx(g)} y={PLAIN_Y} />
        ))}
        <path d={plainPath} fill="none" stroke={ORANGE_DEEP} strokeWidth={2} strokeLinejoin="round" />
        <path d={tusPath} fill="none" stroke={NAVY} strokeWidth={2} strokeLinejoin="round" />
      </g>

      {/* 完成標記 */}
      {tus.finish !== null && cursor >= tus.finish && (
        <g>
          <line x1={sx(tus.finish)} y1={CH_TOP - 6} x2={sx(tus.finish)} y2={CH_BOT} stroke={NAVY} strokeWidth={1} strokeDasharray="3 3" />
          <text x={Math.min(sx(tus.finish), X1 - 60)} y={CH_TOP - 12} textAnchor="middle"fontSize={11} fontWeight={800} fill={NAVY} fontFamily={FONT}>
            TUS 完成 {fmtMin(tus.finish)}
          </text>
        </g>
      )}

      {/* 時間游標 */}
      {playing && (
        <g>
          <line x1={cx} y1={TUS_Y - 10} x2={cx} y2={CH_BOT} stroke={TEXT} strokeWidth={1.25} />
          <rect x={Math.max(cx - 26, X0 - 26)} y={8} width={52} height={16} rx={3} fill={TEXT} />
          <text x={Math.max(cx, X0)} y={19.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#ffffff" fontFamily={FONT} style={{ fontVariantNumeric: "tabular-nums" }}>
            {cursor.toFixed(1)} 分
          </text>
        </g>
      )}
    </svg>
  );
}

/* ---------- 主元件 ---------- */

const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 34,
  padding: "0 14px",
  borderRadius: 8,
  border: "1.5px solid transparent",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 160ms, color 160ms, border-color 160ms",
};

const sliderLabel: CSSProperties = { whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 10, flex: "1 1 240px", fontSize: 13, fontWeight: 700, color: TEXT };

const DEFAULT_SIZE = 10;
const DEFAULT_STABLE = 3;
const PLAY_MS = 5000;

export default function TusResumeCompare() {
  const reduce = useReducedMotion();
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [stable, setStable] = useState(DEFAULT_STABLE);
  const [wrapRef, width] = useWidth<HTMLDivElement>();

  const tus = simTus(size, stable);
  const need = size / RATE;
  const win = Math.max(tus.finish ?? need, need) * 1.15;
  const plain = simPlain(size, stable, win);

  const [cursor, setCursor] = useState(Infinity);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const shown = Math.min(cursor, win);

  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - (shown >= win - 1e-6 ? 0 : (shown / win) * PLAY_MS);
    const tick = (now: number) => {
      const f = Math.min(1, (now - start) / PLAY_MS);
      setCursor(f * win);
      if (f < 1) raf.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // 只在播放狀態切換時重新啟動動畫
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const onPlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (reduce) {
      setCursor(Infinity);
      return;
    }
    if (shown >= win - 1e-6) setCursor(0);
    setPlaying(true);
  };

  const onReset = () => {
    setPlaying(false);
    setSize(DEFAULT_SIZE);
    setStable(DEFAULT_STABLE);
    setCursor(Infinity);
  };

  const changeParam = (fn: () => void) => {
    setPlaying(false);
    setCursor(Infinity);
    fn();
  };

  const same = need <= stable;

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 20px" }}>
        <label style={sliderLabel}>
          <span style={{ whiteSpace: "nowrap" }}>檔案大小</span>
          <input type="range" min={1} max={20} step={1} value={size} onChange={(e) => changeParam(() => setSize(Number(e.target.value)))} aria-label="檔案大小（GB）" style={{ flex: 1, accentColor: NAVY }} />
          <span style={{ width: 52, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{size} GB</span>
        </label>
        <label style={sliderLabel}>
          <span style={{ whiteSpace: "nowrap" }}>網路每撐</span>
          <input type="range" min={1} max={10} step={0.5} value={stable} onChange={(e) => changeParam(() => setStable(Number(e.target.value)))} aria-label="網路每次可維持連線的分鐘數" style={{ flex: 1, accentColor: ORANGE_DEEP }} />
          <span style={{ width: 88, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{stable} 分鐘斷線</span>
        </label>
        <div role="group" aria-label="播放控制" style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onPlay} style={{ ...btn, background: NAVY, color: "#ffffff", borderColor: NAVY }}>
            {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? "暫停" : "播放時間軸"}
          </button>
          <button type="button" onClick={onReset} style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}>
            <RotateCcw size={16} /> 重置
          </button>
        </div>
      </div>

      <div ref={wrapRef} style={{ width: "100%" }}>
        <Chart width={width} size={size} tus={tus} plain={plain} win={win} cursor={shown} />
      </div>

      <div style={{ fontSize: 12, color: MUTED }}>
        假設頻寬 {SPEED_MB} MB/s，完整傳完需要 {fmtMin(need)}；每次斷線後重新連線約 {GAP * 60} 秒（示意數值）。
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.6, color: TEXT, background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "10px 12px" }}>
          <CircleCheck size={16} style={{ color: NAVY, flexShrink: 0, marginTop: 3 }} />
          <span>
            <strong style={{ color: NAVY_DEEP }}>TUS · {fmtMin(tus.finish ?? 0)} 完成</strong>
            <br />
            {tus.gaps.length === 0
              ? "過程中沒有斷線，一次傳完。"
              : `斷線 ${tus.gaps.length} 次，每次都先問伺服器 offset、從斷點接著傳；重傳量 0 GB，只多花了重新連線的 ${fmtMin(tus.gaps.length * GAP)}。`}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            fontSize: 13,
            lineHeight: 1.6,
            color: TEXT,
            background: same ? BLUE_50 : ORANGE_50,
            border: `1px solid ${same ? BLUE_100 : ORANGE_100}`,
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          {same ? <CircleCheck size={16} style={{ color: NAVY, flexShrink: 0, marginTop: 3 }} /> : <TriangleAlert size={16} style={{ color: ORANGE_DEEP, flexShrink: 0, marginTop: 3 }} />}
          <span>
            <strong style={{ color: same ? NAVY_DEEP : ORANGE_700 }}>{same ? `傳統上傳 · ${fmtMin(need)} 完成` : "傳統上傳 · 永遠傳不完"}</strong>
            <br />
            {same
              ? "網路撐得比上傳時間久，兩種做法沒有差別；但檔案越大，這個前提越難成立。"
              : `每次最多只能傳 ${fmtGB(stable * RATE)}，永遠追不上 ${size} GB；畫面中的 ${fmtMin(win)} 內已白傳 ${fmtGB(plain.wasted)}，而且還在重來。`}
          </span>
        </div>
      </div>
    </div>
  );
}
