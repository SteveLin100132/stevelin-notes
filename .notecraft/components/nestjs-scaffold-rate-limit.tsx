import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Pause, Play, RotateCcw, Zap } from "lucide-react";

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
const GREEN = "#2e9e6b";
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

const DURATION = 30; // 模擬 30 秒
const BURST = 8;

interface RateChange {
  t: number;
  rate: number;
}

interface Req {
  t: number;
  ok: boolean;
  headers: string[];
}

interface Hit {
  start: number;
  exp: number;
  cleared: number; // 封鎖結束重置時被清掉的時間（Infinity = 沒被清）
}

interface Sim {
  reqs: Req[];
  blocks: [number, number][];
  hits: Hit[];
}

/* 依 @nestjs/throttler v6 ThrottlerStorageService.increment() 的邏輯模擬（blockDuration 預設 = ttl） */
function simulate(times: number[], limit: number, ttl: number): Sim {
  const reqs: Req[] = [];
  const blocks: [number, number][] = [];
  const allHits: Hit[] = [];
  let live: Hit[] = [];
  let expiresAt = -Infinity;
  let blocked = false;
  let blockExpiresAt = 0;

  for (const now of times) {
    live = live.filter((h) => h.exp > now);
    let timeToExpire = Math.ceil(expiresAt - now);
    if (timeToExpire <= 0) {
      expiresAt = now + ttl;
      timeToExpire = Math.ceil(expiresAt - now);
    }
    const fire = () => {
      const h: Hit = { start: now, exp: now + ttl, cleared: Infinity };
      live.push(h);
      allHits.push(h);
    };
    if (!blocked) fire();
    if (live.length > limit && !blocked) {
      blocked = true;
      blockExpiresAt = now + ttl;
      blocks.push([now, blockExpiresAt]);
    }
    let timeToBlockExpire = Math.ceil(blockExpiresAt - now);
    if (timeToBlockExpire <= 0 && blocked) {
      blocked = false;
      live.forEach((h) => (h.cleared = now));
      live = [];
      fire();
    }
    timeToBlockExpire = Math.ceil(blockExpiresAt - now);
    if (blocked) {
      reqs.push({ t: now, ok: false, headers: [`Retry-After: ${timeToBlockExpire}`] });
    } else {
      reqs.push({
        t: now,
        ok: true,
        headers: [`X-RateLimit-Limit: ${limit}`, `X-RateLimit-Remaining: ${Math.max(0, limit - live.length)}`, `X-RateLimit-Reset: ${timeToExpire}`],
      });
    }
  }
  return { reqs, blocks, hits: allHits };
}

function arrivals(changes: RateChange[], bursts: number[]): number[] {
  const out: number[] = [];
  const rateAt = (t: number) => {
    let r = changes[0].rate;
    for (const c of changes) if (c.t <= t) r = c.rate;
    return r;
  };
  let t = 0.5;
  while (t < DURATION) {
    out.push(Math.round(t * 1000) / 1000);
    t += 1 / rateAt(t);
  }
  for (const b of bursts) for (let i = 0; i < BURST; i++) out.push(Math.round((b + 0.05 * i) * 1000) / 1000);
  return out.filter((x) => x < DURATION).sort((a, b) => a - b);
}

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

/* ---------- 圖：請求時間軸 + 視窗內請求數 ---------- */

const MIN_W = 560;
const PASS_Y = 52;
const DENY_Y = 84;
const ROW_H = 22;
const CH_TOP = 142;
const CH_BOT = 236;
const H = 268;

function Chart({ width, sim, t, limit, ttl }: { width: number; sim: Sim; t: number; limit: number; ttl: number }) {
  const W = Math.max(width, MIN_W);
  const x0 = 56;
  const x1 = W - 20;
  const sx = (s: number) => x0 + ((x1 - x0) * s) / DURATION;
  const yMax = limit + 2;
  const sy = (v: number) => CH_BOT - ((CH_BOT - CH_TOP) * v) / yMax;

  const shown = sim.reqs.filter((r) => r.t <= t);
  const blocks = sim.blocks.filter(([a]) => a <= t);

  // 視窗內仍有效的請求數（step function，0.05 秒取樣到目前時間）
  const pts: string[] = [];
  for (let s = 0; s <= t + 1e-9; s += 0.05) {
    const v = sim.hits.filter((h) => h.start <= s && s < Math.min(h.exp, h.cleared)).length;
    pts.push(`${sx(s).toFixed(1)},${sy(v).toFixed(1)}`);
  }
  const passed = shown.filter((r) => r.ok).length;
  const denied = shown.length - passed;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`速率限制模擬：limit ${limit}、ttl ${ttl} 秒，目前第 ${t.toFixed(1)} 秒，通過 ${passed} 個請求、被擋 ${denied} 個，封鎖區間 ${blocks.length} 段。`}
      style={{ display: "block" }}
    >
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill="#ffffff" stroke={GRAY_2} />

      {/* 格線與刻度 */}
      {[0, 5, 10, 15, 20, 25, 30].map((s) => (
        <g key={s}>
          <line x1={sx(s)} y1={PASS_Y - 8} x2={sx(s)} y2={CH_BOT} stroke={GRAY_2} strokeWidth={1} />
          <text x={sx(s)} y={CH_BOT + 18} textAnchor="middle" fontSize={10} fill={MUTED} fontFamily={FONT}>
            {s}s
          </text>
        </g>
      ))}

      {/* 封鎖區間 */}
      {blocks.map(([a, b], i) => {
        const end = Math.min(b, t, DURATION);
        return (
          <g key={i}>
            <rect x={sx(a)} y={PASS_Y - 8} width={Math.max(0, sx(end) - sx(a))} height={DENY_Y + ROW_H - PASS_Y + 16} fill={ORANGE_50} stroke={ORANGE_100} strokeWidth={1} />
            <rect x={sx(a)} y={CH_TOP} width={Math.max(0, sx(end) - sx(a))} height={CH_BOT - CH_TOP} fill={ORANGE_50} opacity={0.7} />
            <text x={sx(a) + 6} y={PASS_Y - 14} fontSize={10.5} fontWeight={800} fill={ORANGE_700} fontFamily={FONT}>
              封鎖 {ttl}s{b > DURATION ? "（延續到 30s 之後）" : ""}
            </text>
          </g>
        );
      })}

      {/* 列標 */}
      <text x={16} y={PASS_Y + 15} fontSize={11} fontWeight={800} fill={NAVY} fontFamily={FONT}>
        通過
      </text>
      <text x={16} y={DENY_Y + 15} fontSize={11} fontWeight={800} fill={ORANGE_700} fontFamily={FONT}>
        429
      </text>
      <line x1={x0} y1={PASS_Y + ROW_H} x2={x1} y2={PASS_Y + ROW_H} stroke={GRAY_2} />
      <line x1={x0} y1={DENY_Y + ROW_H} x2={x1} y2={DENY_Y + ROW_H} stroke={GRAY_2} />

      {/* 每個請求 */}
      {shown.map((r, i) => (
        <rect key={i} x={sx(r.t) - 1.5} y={r.ok ? PASS_Y : DENY_Y} width={3} height={ROW_H} rx={1} fill={r.ok ? NAVY : ORANGE} />
      ))}

      {/* 下方：視窗內請求數 */}
      <text x={16} y={CH_TOP - 10} fontSize={11} fontWeight={800} fill={NAVY_DEEP} fontFamily={FONT}>
        仍在 ttl 內、被計入的請求數
      </text>
      {Array.from({ length: yMax + 1 }, (_, v) => v)
        .filter((v) => v % (limit >= 10 ? 4 : 2) === 0)
        .map((v) => (
          <text key={v} x={x0 - 8} y={sy(v) + 3.5} textAnchor="end" fontSize={10} fill={MUTED} fontFamily={FONT}>
            {v}
          </text>
        ))}
      <line x1={x0} y1={CH_BOT} x2={x1} y2={CH_BOT} stroke={GRAY} />
      <line x1={x0} y1={sy(limit)} x2={x1} y2={sy(limit)} stroke={ORANGE} strokeWidth={1.25} strokeDasharray="5 4" />
      <text x={x1 - 4} y={sy(limit) - 5} textAnchor="end" fontSize={10.5} fontWeight={800} fill={ORANGE_700} fontFamily={FONT}>
        limit {limit}
      </text>
      {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke={NAVY} strokeWidth={1.75} strokeLinejoin="round" />}

      {/* 時間游標 */}
      <line x1={sx(t)} y1={PASS_Y - 8} x2={sx(t)} y2={CH_BOT} stroke={NAVY_DEEP} strokeWidth={1.5} />
      <rect x={sx(t) - 20} y={CH_BOT + 4} width={40} height={18} rx={9} fill={NAVY_DEEP} />
      <text x={sx(t)} y={CH_BOT + 17} textAnchor="middle" fontSize={10} fontWeight={800} fill="#ffffff" fontFamily={MONO}>
        {t.toFixed(1)}s
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
  border: "1.5px solid transparent",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background-color 160ms, color 160ms, border-color 160ms",
};

function Segmented<T extends number>({ label, value, options, unit, onChange }: { label: string; value: T; options: T[]; unit: string; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</span>
      <div role="group" aria-label={label} style={{ display: "inline-flex", padding: 3, borderRadius: 10, background: BLUE_50, border: `1px solid ${BLUE_100}` }}>
        {options.map((o) => {
          const on = o === value;
          return (
            <button key={o} type="button" aria-pressed={on} onClick={() => onChange(o)} style={{ ...btn, height: 28, padding: "0 10px", border: "none", background: on ? NAVY : "transparent", color: on ? "#ffffff" : NAVY, fontSize: 13 }}>
              {o}
              {unit}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function NestjsScaffoldRateLimit() {
  const reduce = useReducedMotion();
  const [limit, setLimit] = useState<5 | 10>(5);
  const [ttl, setTtl] = useState<5 | 10>(10);
  const [rate, setRate] = useState(1);
  const [changes, setChanges] = useState<RateChange[]>([{ t: 0, rate: 1 }]);
  const [bursts, setBursts] = useState<number[]>([]);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const tRef = useRef(0);
  tRef.current = t;

  const sim = useMemo(() => simulate(arrivals(changes, bursts), limit, ttl), [changes, bursts, limit, ttl]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      const next = Math.min(DURATION, tRef.current + dt);
      setT(next);
      if (next >= DURATION) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const reset = (opts?: { limit?: 5 | 10; ttl?: 5 | 10 }) => {
    if (opts?.limit) setLimit(opts.limit);
    if (opts?.ttl) setTtl(opts.ttl);
    setChanges([{ t: 0, rate }]);
    setBursts([]);
    setT(0);
    setPlaying(false);
  };

  const changeRate = (r: number) => {
    setRate(r);
    setChanges((cs) => (t === 0 ? [{ t: 0, rate: r }] : [...cs.filter((c) => c.t < t), { t, rate: r }]));
  };

  const burst = () => {
    setBursts((b) => [...b, t]);
    if (t >= DURATION) return;
    if (!playing) setPlaying(true);
  };

  const shown = sim.reqs.filter((r) => r.t <= t);
  const lastReq = shown[shown.length - 1];
  const passed = shown.filter((r) => r.ok).length;
  const denied = shown.length - passed;
  const activeBlock = sim.blocks.find(([a, b]) => a <= t && t < b);

  const stat = (label: string, value: string, tone: "navy" | "orange" | "green") => {
    const c = tone === "orange" ? ORANGE_700 : tone === "green" ? GREEN : NAVY_DEEP;
    return (
      <div style={{ flex: "1 1 0", minWidth: 0, background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 8, padding: "8px 12px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", color: MUTED }}>{label}</div>
        <motion.div key={value} initial={reduce ? false : { opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} style={{ fontSize: 20, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </motion.div>
      </div>
    );
  };

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 20px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: TEXT }}>
          請求速率
          <input type="range" min={0.5} max={6} step={0.5} value={rate} onChange={(e) => changeRate(Number(e.target.value))} aria-label="請求速率（次/秒）" style={{ width: 140, accentColor: NAVY }} />
          <span style={{ fontFamily: MONO, minWidth: 64, color: NAVY_DEEP }}>{rate.toFixed(1)} 次/秒</span>
        </label>
        <Segmented label="limit" value={limit} options={[5, 10] as (5 | 10)[]} unit=" 次" onChange={(v) => reset({ limit: v })} />
        <Segmented label="ttl" value={ttl} options={[5, 10] as (5 | 10)[]} unit=" 秒" onChange={(v) => reset({ ttl: v })} />
      </div>
      <div role="group" aria-label="模擬控制" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          onClick={() => {
            if (t >= DURATION) setT(0);
            setPlaying((p) => !p);
          }}
          style={{ ...btn, background: NAVY, color: "#ffffff", borderColor: NAVY }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? "暫停" : t >= DURATION ? "重新播放" : "播放"}
        </button>
        <button type="button" onClick={burst} disabled={t >= DURATION} style={{ ...btn, background: "#ffffff", color: ORANGE_700, borderColor: ORANGE, opacity: t >= DURATION ? 0.45 : 1 }}>
          <Zap size={16} /> 突發 {BURST} 個請求
        </button>
        <button type="button" onClick={() => reset()} aria-label="重置" style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}>
          <RotateCcw size={16} /> 重置
        </button>
      </div>

      <div ref={wrapRef} style={{ width: "100%" }}>
        <Chart width={width} sim={sim} t={t} limit={limit} ttl={ttl} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: "1 1 260px", display: "flex", gap: 10 }}>
          {stat("通過", String(passed), "navy")}
          {stat("回 429", String(denied), "orange")}
          {stat("狀態", activeBlock ? "封鎖中" : "正常", activeBlock ? "orange" : "green")}
        </div>
        <div style={{ flex: "1 1 280px", minWidth: 0, background: lastReq && !lastReq.ok ? ORANGE_50 : BLUE_50, border: `1px solid ${lastReq && !lastReq.ok ? ORANGE_100 : BLUE_100}`, borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", color: MUTED, marginBottom: 4 }}>最近一個請求的回應標頭</div>
          {lastReq ? (
            <>
              <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: lastReq.ok ? GREEN : ORANGE_700 }}>
                HTTP/1.1 {lastReq.ok ? "200 OK" : "429 Too Many Requests"}
                <span style={{ fontWeight: 400, color: MUTED }}> · {lastReq.t.toFixed(2)}s</span>
              </div>
              {lastReq.headers.map((h) => {
                const [k, v] = h.split(": ");
                return (
                  <div key={h} style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.6, color: TEXT }}>
                    <span style={{ color: NAVY_DEEP, fontWeight: 700 }}>{k}:</span> {v}
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: MUTED }}>按「播放」開始送出請求。</div>
          )}
        </div>
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.7, color: TEXT }}>
        觀察重點：第 {limit + 1} 個請求觸發封鎖後，即使前面的請求陸續過了 ttl、折線已經降下來，仍要等滿 {ttl} 秒的封鎖才會恢復；封鎖期間的請求一律回 429，而且不會被計入。腳手架預設為 100 次 / 60 秒，這裡等比例縮小方便觀察。
      </div>
    </div>
  );
}
