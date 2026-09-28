import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Share2, TriangleAlert } from "lucide-react";

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
const GREEN = "#2e9e6b";
const TEXT = "#3a4456";
const GRAY = "#cbd3df"; // --neutral-300
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

type Origin = 8000 | 8001 | 8002;

interface Req {
  file: string;
  origin: Origin;
  kb: number;
  /** 只在「不共享依賴」時才會出現 */
  onlyWhenNotShared?: boolean;
  /** 重複載入的依賴 */
  duplicate?: boolean;
}

interface CodeLine {
  text: string;
  hl?: boolean;
}

interface Step {
  title: string;
  note: string;
  /** 本步驟新增的請求 */
  reqs: Req[];
  /** 插槽狀態 */
  header: boolean;
  content: boolean;
  /** 本步驟牽涉的設定 */
  codeTitle: string;
  code: CodeLine[];
  /** 共享依賴的狀態說明 */
  sharedNote?: string;
}

const HOST_REMOTES: CodeLine[] = [
  { text: "// host/webpack.config.js" },
  { text: "new ModuleFederationPlugin({" },
  { text: "  name: 'host'," },
  { text: "  remotes: {" },
  { text: "    header: 'header@http://localhost:8001/remoteEntry.js',", hl: true },
  { text: "    content: 'content@http://localhost:8002/remoteEntry.js'," },
  { text: "  }," },
  { text: "  shared: { react: { singleton: true, requiredVersion: '^18.2.0' } }," },
  { text: "})" },
];

const STEPS: Step[] = [
  {
    title: "開啟容器應用",
    note: "使用者打開 app.example.com。瀏覽器下載 Host 自己的 main.js（內含 Module Federation runtime）與 Host 用到的 React。此時頁面只有殼，插槽都是空的。",
    reqs: [
      { file: "main.js", origin: 8000, kb: 42 },
      { file: "vendors-react.js", origin: 8000, kb: 130 },
    ],
    header: false,
    content: false,
    codeTitle: "host/src/index.ts",
    code: [
      { text: "// 先動態 import 再啟動，讓 Module Federation" },
      { text: "// 有機會在應用程式碼執行前完成共享依賴的協商", hl: true },
      { text: "import('./bootstrap');", hl: true },
    ],
  },
  {
    title: "路由命中，去拿 remoteEntry.js",
    note: "程式碼執行到 import('header/Header')。Host 依 remotes 設定，向 header 這個 Remote 的網址下載 remoteEntry.js：一份很小的入口清單，描述這個 Remote 暴露了哪些模組、需要哪些共享依賴。",
    reqs: [{ file: "remoteEntry.js", origin: 8001, kb: 8 }],
    header: false,
    content: false,
    codeTitle: "host/webpack.config.js",
    code: HOST_REMOTES,
  },
  {
    title: "協商共享依賴（shared）",
    note: "remoteEntry.js 回傳一個 container。Host 與 Remote 都宣告 react 為 shared 且 singleton：版本相容時只保留 Host 已經載入的那一份，Remote 不再下載自己的 React。",
    reqs: [{ file: "vendors-react.js", origin: 8001, kb: 130, onlyWhenNotShared: true, duplicate: true }],
    header: false,
    content: false,
    codeTitle: "header/webpack.config.js",
    code: [
      { text: "// header/webpack.config.js" },
      { text: "new ModuleFederationPlugin({" },
      { text: "  name: 'header'," },
      { text: "  filename: 'remoteEntry.js'," },
      { text: "  exposes: { './Header': './src/Header' }," },
      { text: "  shared: {" },
      { text: "    ...deps,", hl: true },
      { text: "    react: { singleton: true, requiredVersion: deps.react },", hl: true },
      { text: "  }," },
      { text: "})" },
    ],
    sharedNote: "singleton: true 保證整個頁面只存在一份 React，避免兩份 React 各自維護 hooks 狀態而互相衝突。",
  },
  {
    title: "下載被暴露的模組",
    note: "Host 呼叫 container.get('./Header')，Remote 只回傳 Header 元件自己的那個 chunk。因為 React 已經共享，這個 chunk 很小。",
    reqs: [{ file: "src_Header_tsx.js", origin: 8001, kb: 12 }],
    header: false,
    content: false,
    codeTitle: "header/webpack.config.js",
    code: [
      { text: "new ModuleFederationPlugin({" },
      { text: "  name: 'header'," },
      { text: "  filename: 'remoteEntry.js'," },
      { text: "  exposes: {" },
      { text: "    './Header': './src/Header',   // 對外名稱: 檔案路徑", hl: true },
      { text: "  }," },
      { text: "})" },
    ],
  },
  {
    title: "執行並掛載到插槽",
    note: "模組載入完成，React.lazy 解析出 Header 元件，渲染到 Host 頁面的頁首插槽。對 Host 的程式碼來說，它就像一個普通的 import，只是內容來自另一個獨立部署的應用。",
    reqs: [],
    header: true,
    content: false,
    codeTitle: "host/src/App.tsx",
    code: [
      { text: "import React, { Suspense } from 'react';" },
      { text: "const Header = React.lazy(() => import('header/Header'));", hl: true },
      { text: "" },
      { text: "export default function App() {" },
      { text: "  return (" },
      { text: "    <Suspense fallback={<div>載入頁首中</div>}>" },
      { text: "      <Header />", hl: true },
      { text: "    </Suspense>" },
      { text: "  );" },
      { text: "}" },
    ],
  },
  {
    title: "切換路由，惰性載入另一個 Remote",
    note: "使用者進入 /content。這個 Remote 是 Vue 寫的：Host 沒有 Vue 可以共享，所以 Vue runtime 會跟著下載；掛載也不是 React.lazy，而是呼叫 Remote 暴露的 mount(el) 啟動函式，把 Vue 應用掛到內容插槽。",
    reqs: [
      { file: "remoteEntry.js", origin: 8002, kb: 8 },
      { file: "vendors-vue.js", origin: 8002, kb: 64 },
      { file: "src_mount_ts.js", origin: 8002, kb: 15 },
    ],
    header: true,
    content: true,
    codeTitle: "host/src/pages/Content.tsx",
    code: [
      { text: "// content Remote 暴露的是一個啟動函式，而不是 React 元件" },
      { text: "const ref = useRef<HTMLDivElement>(null);" },
      { text: "useEffect(() => {" },
      { text: "  import('content/mount').then(({ mount }) => mount(ref.current!));", hl: true },
      { text: "}, []);" },
      { text: "return <div ref={ref} />;" },
    ],
    sharedNote: "跨框架時 shared 幫不上忙：不同框架各自需要自己的 runtime。能共享的是雙方都用到的套件，例如同一版的 React、或共用的工具函式庫。",
  },
];

const ORIGIN_LABEL: Record<Origin, string> = { 8000: "host :8000", 8001: "header :8001", 8002: "content :8002" };
const ORIGIN_COLOR: Record<Origin, string> = { 8000: NAVY_DEEP, 8001: NAVY, 8002: NAVY };
const MAX_KB = 130;

/* ---------- 瀏覽器視窗示意 ---------- */

function Browser({ step, shared }: { step: Step; shared: boolean }) {
  const W = 420;
  const H = 320;
  const slot = (x: number, y: number, w: number, h: number, filled: boolean, label: string, sub: string, key: string) => (
    <g key={key}>
      <motion.rect x={x} y={y} width={w} height={h} rx={5} initial={false} animate={{ fill: filled ? NAVY : BLUE_50, stroke: filled ? NAVY : BLUE_200 }} transition={{ duration: 0.35 }} strokeWidth={1} strokeDasharray={filled ? undefined : "4 3"} />
      <text x={x + w / 2} y={y + h / 2 - (filled ? 3 : -4)} textAnchor="middle" fontSize={11} fontWeight={800} fill={filled ? "#ffffff" : NAVY} fontFamily={FONT}>
        {label}
      </text>
      {filled && (
        <text x={x + w / 2} y={y + h / 2 + 11} textAnchor="middle" fontSize={9.5} fill={BLUE_100} fontFamily={MONO}>
          {sub}
        </text>
      )}
    </g>
  );
  const dupReact = !shared && STEPS.indexOf(step) >= 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`容器應用的瀏覽器視窗示意：頁首插槽${step.header ? "已掛載來自 header Remote 的 React 元件" : "尚未載入"}，內容插槽${step.content ? "已掛載來自 content Remote 的 Vue 應用" : "尚未載入"}。${dupReact ? "頁面上存在兩份 React。" : ""}`} style={{ display: "block" }}>
      <rect width={W} height={H} rx={10} fill={PANEL} />
      <rect x={12} y={12} width={W - 24} height={H - 24} rx={8} fill="#ffffff" stroke={BLUE_200} strokeWidth={1.25} />
      <rect x={12} y={12} width={W - 24} height={26} rx={8} fill={BLUE_50} />
      <rect x={12} y={26} width={W - 24} height={12} fill={BLUE_50} />
      <circle cx={26} cy={25} r={3.5} fill={GRAY} />
      <circle cx={37} cy={25} r={3.5} fill={GRAY} />
      <circle cx={48} cy={25} r={3.5} fill={GRAY} />
      <rect x={62} y={18} width={230} height={14} rx={7} fill="#ffffff" stroke={BLUE_100} strokeWidth={1} />
      <text x={72} y={28.5} fontSize={9.5} fill={TEXT} fontFamily={MONO}>
        https://app.example.com{step.content ? "/content" : "/"}
      </text>
      <text x={24} y={56} fontSize={9.5} fontWeight={800} fill={MUTED} letterSpacing="0.06em" fontFamily={FONT}>
        HOST SHELL（React）
      </text>
      {slot(24, 64, W - 48, 44, step.header, step.header ? "Header" : "頁首插槽", "header/Header · React · :8001", "header")}
      {slot(24, 116, 96, 112, false, "側欄", "", "sidebar")}
      {slot(128, 116, W - 152, 112, step.content, step.content ? "Content" : "內容插槽", "content/mount · Vue · :8002", "content")}
      {slot(24, 236, W - 48, 22, false, "頁尾插槽", "", "footer")}
      {/* runtime 狀態列 */}
      <g>
        <text x={24} y={287} fontSize={9.5} fontWeight={800} fill={MUTED} fontFamily={FONT}>
          頁面上的 React：
        </text>
        <rect x={110} y={276} width={92} height={16} rx={8} fill={BLUE_50} stroke={BLUE_200} strokeWidth={1} />
        <text x={156} y={287.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={NAVY} fontFamily={MONO}>
          react@18.2 host
        </text>
        <AnimatePresence>
          {dupReact && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <rect x={210} y={276} width={104} height={16} rx={8} fill={ORANGE_50} stroke={ORANGE_DEEP} strokeWidth={1} />
              <text x={262} y={287.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={ORANGE_700} fontFamily={MONO}>
                react@18.2 header
              </text>
              <text x={322} y={287.5} fontSize={9.5} fontWeight={700} fill={ORANGE_700} fontFamily={FONT}>
                重複的一份
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </g>
    </svg>
  );
}

/* ---------- 網路請求瀑布 ---------- */

function Network({ cur, shared, reduce }: { cur: number; shared: boolean; reduce: boolean }) {
  const rows: Array<Req & { step: number }> = [];
  STEPS.forEach((s, i) => {
    if (i > cur) return;
    s.reqs.forEach((r) => {
      if (r.onlyWhenNotShared && shared) return;
      rows.push({ ...r, step: i });
    });
  });
  const total = rows.reduce((a, r) => a + r.kb, 0);
  const dup = rows.filter((r) => r.duplicate).reduce((a, r) => a + r.kb, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, background: PANEL, borderRadius: 10, padding: "12px 14px", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", color: MUTED }}>NETWORK 下載的 JS</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: NAVY_DEEP, fontFamily: MONO }}>
          累計 {total} KB
          {dup > 0 && <span style={{ color: ORANGE_700, marginLeft: 6 }}>（+{dup} KB 重複）</span>}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minHeight: 200 }}>
        <AnimatePresence initial={false}>
          {rows.map((r) => {
            const active = r.step === cur;
            const color = r.duplicate ? ORANGE_DEEP : ORIGIN_COLOR[r.origin];
            return (
              <motion.div
                key={`${r.origin}-${r.file}`}
                initial={reduce ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ display: "grid", gridTemplateColumns: "104px 1fr 52px", alignItems: "center", gap: 8, opacity: active ? 1 : 0.75 }}
              >
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: active ? 800 : 600, color: r.duplicate ? ORANGE_700 : TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.file}</span>
                  <span style={{ fontSize: 9.5, color: r.duplicate ? ORANGE_700 : MUTED }}>{ORIGIN_LABEL[r.origin]}</span>
                </span>
                <span style={{ height: 10, background: "#ffffff", border: `1px solid ${GRAY_2}`, borderRadius: 3, overflow: "hidden" }}>
                  <motion.span style={{ display: "block", height: "100%", background: color }} initial={reduce ? false : { width: 0 }} animate={{ width: `${(r.kb / MAX_KB) * 100}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: r.duplicate ? ORANGE_700 : TEXT, textAlign: "right" }}>{r.kb} KB</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div style={{ fontSize: 10.5, color: MUTED, borderTop: `1px solid ${GRAY_2}`, paddingTop: 6 }}>檔案大小為示意值，用來比較相對量級。</div>
    </div>
  );
}

/* ---------- 程式碼面板 ---------- */

function Code({ title, lines }: { title: string; lines: CodeLine[] }) {
  return (
    <div style={{ background: NAVY_DEEP, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "6px 12px", fontSize: 10.5, fontWeight: 700, color: BLUE_100, fontFamily: MONO, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>{title}</div>
      {/* 筆記頁的 code-block 樣式會覆蓋 pre 的背景、邊框與文字色，這裡全部以 inline style 明確指定 */}
      <pre style={{ margin: 0, padding: "8px 0", background: NAVY_DEEP, border: "none", borderRadius: 0, boxShadow: "none", fontFamily: MONO, fontSize: 12, lineHeight: 1.65, color: BLUE_100, overflowX: "auto" }}>
        {lines.map((l, i) => (
          <div key={i} style={{ padding: "0 12px", background: l.hl ? "rgba(227,123,36,0.28)" : "transparent", borderLeft: `3px solid ${l.hl ? ORANGE_DEEP : "transparent"}`, color: l.hl ? "#ffffff" : BLUE_100, fontWeight: l.hl ? 700 : 400, whiteSpace: "pre" }}>
            {l.text || " "}
          </div>
        ))}
      </pre>
    </div>
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

export default function MicroFrontendFederationRuntime() {
  const reduce = useReducedMotion() ?? false;
  const [cur, setCur] = useState(0);
  const [auto, setAuto] = useState(false);
  const [shared, setShared] = useState(true);
  const step = STEPS[cur];
  const last = cur === STEPS.length - 1;

  useEffect(() => {
    if (!auto) return;
    if (last) {
      setAuto(false);
      return;
    }
    const id = window.setTimeout(() => setCur((c) => Math.min(c + 1, STEPS.length - 1)), reduce ? 1000 : 2200);
    return () => window.clearTimeout(id);
  }, [auto, cur, last, reduce]);

  const reset = () => {
    setCur(0);
    setAuto(false);
  };

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div role="group" aria-label="步驟控制" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0} aria-label="上一步" style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200, opacity: cur === 0 ? 0.45 : 1, cursor: cur === 0 ? "default" : "pointer" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, minWidth: 48, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
            {cur + 1} / {STEPS.length}
          </span>
          <button type="button" onClick={() => setCur((c) => Math.min(STEPS.length - 1, c + 1))} disabled={last} aria-label="下一步" style={{ ...btn, background: NAVY, color: "#ffffff", borderColor: NAVY, opacity: last ? 0.45 : 1, cursor: last ? "default" : "pointer" }}>
            下一步 <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (auto) setAuto(false);
              else {
                if (last) setCur(0);
                setAuto(true);
              }
            }}
            style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}
          >
            {auto ? <Pause size={16} /> : <Play size={16} />} {auto ? "暫停" : "自動播放"}
          </button>
          <button type="button" onClick={reset} aria-label="重置" style={{ ...btn, background: "#ffffff", color: NAVY, borderColor: BLUE_200 }}>
            <RotateCcw size={16} />
          </button>
        </div>
        <div role="group" aria-label="是否共享 React" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: 3, borderRadius: 10, background: BLUE_50, border: `1px solid ${BLUE_100}` }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: NAVY, paddingLeft: 8 }}>
            <Share2 size={14} /> shared react
          </span>
          {[
            { v: true, label: "singleton" },
            { v: false, label: "不共享" },
          ].map((o) => {
            const on = shared === o.v;
            return (
              <button key={o.label} type="button" aria-pressed={on} onClick={() => setShared(o.v)} style={{ ...btn, height: 28, border: "none", background: on ? NAVY : "transparent", color: on ? "#ffffff" : NAVY, fontSize: 12.5, fontFamily: MONO }}>
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, alignItems: "stretch" }}>
        <Browser step={step} shared={shared} />
        <Network cur={cur} shared={shared} reduce={reduce} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={cur} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.7, color: TEXT, background: BLUE_50, border: `1px solid ${BLUE_100}`, borderRadius: 8, padding: "10px 14px" }}>
            <strong style={{ color: NAVY_DEEP }}>
              {cur + 1}. {step.title}
            </strong>
            <span style={{ margin: "0 8px", color: GRAY }}>|</span>
            {step.note}
          </div>
          {step.sharedNote && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.7, color: shared ? TEXT : ORANGE_700, background: shared ? "#ffffff" : ORANGE_50, border: `1px solid ${shared ? GRAY_2 : ORANGE_100}`, borderRadius: 8, padding: "8px 12px" }}>
              <span style={{ color: shared ? GREEN : ORANGE_DEEP, flex: "0 0 auto", marginTop: 2 }}>{shared ? <Share2 size={15} /> : <TriangleAlert size={15} />}</span>
              <span>{shared || cur !== 2 ? step.sharedNote : "現在沒有把 react 設成 shared：Remote 會下載並執行自己的一份 React。除了多 130 KB，兩份 React 對 hooks、context 的認知也不同，跨應用傳遞 React 元件時會出錯。"}</span>
            </div>
          )}
          <Code title={step.codeTitle} lines={step.code} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
