import { useState, type CSSProperties } from "react";
import { CircleAlert, CircleCheck, RotateCcw, TriangleAlert } from "lucide-react";

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
const GRAY_2 = "#e1e6ee"; // --neutral-200
const PANEL = "#f6f8fb";
const MUTED = "#6c798e"; // --neutral-500
const SUCCESS = "#2e9e6b";
const SUCCESS_50 = "#e8f5ee";
const DANGER = "#c9453b";
const DANGER_50 = "#fbecea";
const FONT = "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif";

type Cell = "" | "R" | "A" | "AR" | "C" | "I";
type Letter = "R" | "A" | "C" | "I";

const CYCLE: Cell[] = ["", "R", "A", "AR", "C", "I"];
const ROLES = ["PM", "PO", "Tech Lead", "QA"];
const TASKS = ["PRD 撰寫", "架構設計", "UAT 驗收", "上線核准"];

const LETTERS: { key: Letter; name: string; desc: string }[] = [
  { key: "R", name: "Responsible", desc: "執行者：實際動手做的人" },
  { key: "A", name: "Accountable", desc: "最終負責人：拍板、出事扛責，每項任務只能一位" },
  { key: "C", name: "Consulted", desc: "被諮詢者：事前要問、雙向溝通" },
  { key: "I", name: "Informed", desc: "被通知者：事後告知、單向溝通" },
];

const EXAMPLE: Cell[][] = [
  ["R", "A", "C", "I"],
  ["I", "I", "AR", "C"],
  ["C", "A", "I", "R"],
  ["C", "A", "R", "I"],
];

/* 常見錯誤：兩個 A、沒有 A、沒有 R */
const BROKEN: Cell[][] = [
  ["A", "A", "C", "I"],
  ["I", "I", "R", "C"],
  ["C", "A", "I", "C"],
  ["C", "A", "R", "I"],
];

interface Check {
  ok: boolean;
  text: string;
}

function checkRow(row: Cell[]): Check {
  const a = row.filter((c) => c.includes("A")).length;
  const r = row.filter((c) => c.includes("R")).length;
  if (a > 1) return { ok: false, text: `${a} 位 A：責任稀釋` };
  if (a === 0) return { ok: false, text: "沒有 A：無人拍板" };
  if (r === 0) return { ok: false, text: "沒有 R：無人執行" };
  return { ok: true, text: "恰好 1 位 A" };
}

function LetterBadge({ cell, focus }: { cell: Cell; focus: Letter | null }) {
  if (!cell) return <span style={{ color: GRAY_2, fontWeight: 700 }}>·</span>;
  const letters = cell.split("") as Letter[];
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {letters.map((l) => {
        const dim = focus !== null && l !== focus;
        const style: CSSProperties =
          l === "A"
            ? { background: ORANGE_DEEP, color: "#ffffff" }
            : l === "R"
              ? { background: NAVY, color: "#ffffff" }
              : l === "C"
                ? { background: BLUE_100, color: NAVY_DEEP }
                : { background: GRAY_2, color: TEXT };
        return (
          <span key={l} style={{ ...style, width: 24, height: 24, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 800, opacity: dim ? 0.25 : 1, transition: "opacity 200ms" }}>
            {l}
          </span>
        );
      })}
    </span>
  );
}

/* 每個角色身上扛了幾個 R / A：用細長條呈現負荷 */
function LoadBar({ r, a }: { r: number; a: number }) {
  const max = TASKS.length;
  return (
    <svg viewBox="0 0 80 22" width="100%" style={{ maxWidth: 96 }} role="img" aria-label={`執行 ${r} 項、最終負責 ${a} 項`}>
      <rect x={0} y={2} width={80} height={6} rx={3} fill={GRAY_2} />
      <rect x={0} y={2} width={(80 * r) / max} height={6} rx={3} fill={NAVY} />
      <rect x={0} y={13} width={80} height={6} rx={3} fill={GRAY_2} />
      <rect x={0} y={13} width={(80 * a) / max} height={6} rx={3} fill={ORANGE_DEEP} />
    </svg>
  );
}

const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  borderRadius: 8,
  border: `1.5px solid ${BLUE_200}`,
  background: "#ffffff",
  color: NAVY,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const th: CSSProperties = { padding: "8px 6px", fontSize: 12, fontWeight: 800, color: NAVY_DEEP, textAlign: "center", borderBottom: `1.5px solid ${BLUE_200}`, whiteSpace: "nowrap" };
const td: CSSProperties = { padding: "6px", textAlign: "center", borderBottom: `1px solid ${GRAY_2}` };

export default function PmRaci() {
  const [grid, setGrid] = useState<Cell[][]>(() => EXAMPLE.map((r) => [...r]));
  const [focus, setFocus] = useState<Letter | null>(null);
  const [row, setRow] = useState<number | null>(null);

  const cycle = (ti: number, ri: number) => {
    setGrid((g) =>
      g.map((r, i) =>
        i !== ti
          ? r
          : r.map((c, j) => (j !== ri ? c : CYCLE[(CYCLE.indexOf(c) + 1) % CYCLE.length])),
      ),
    );
    setRow(ti);
  };

  const checks = grid.map(checkRow);
  const problems = checks.filter((c) => !c.ok).length;
  const loads = ROLES.map((_, j) => ({
    r: grid.filter((r) => r[j].includes("R")).length,
    a: grid.filter((r) => r[j].includes("A")).length,
  }));

  return (
    <div className="not-prose" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <div role="group" aria-label="聚焦字母" style={{ display: "flex", gap: 6 }}>
          {LETTERS.map((l) => {
            const on = focus === l.key;
            return (
              <button
                key={l.key}
                type="button"
                aria-pressed={on}
                title={`${l.name}：${l.desc}`}
                onClick={() => setFocus(on ? null : l.key)}
                style={{ ...btn, borderColor: on ? NAVY : BLUE_200, background: on ? NAVY : "#ffffff", color: on ? "#ffffff" : NAVY }}
              >
                {l.key} <span style={{ fontWeight: 500, fontSize: 12 }}>{l.name}</span>
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="範例" style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <button type="button" onClick={() => { setGrid(BROKEN.map((r) => [...r])); setRow(null); }} style={{ ...btn, borderColor: ORANGE_DEEP, color: ORANGE_700 }}>
            <TriangleAlert size={14} /> 常見錯誤
          </button>
          <button type="button" onClick={() => { setGrid(EXAMPLE.map((r) => [...r])); setRow(null); }} style={btn}>
            <RotateCcw size={14} /> 還原範例
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto", background: PANEL, borderRadius: 10, padding: "4px 10px 8px" }}>
        <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", fontSize: 13, color: TEXT }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>任務 \ 角色</th>
              {ROLES.map((r) => (
                <th key={r} style={th}>{r}</th>
              ))}
              <th style={{ ...th, textAlign: "left" }}>檢查</th>
            </tr>
          </thead>
          <tbody>
            {grid.map((cells, ti) => {
              const c = checks[ti];
              const on = row === ti;
              return (
                <tr key={TASKS[ti]} style={{ background: on ? "#ffffff" : "transparent" }}>
                  <td style={{ ...td, textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" }}>
                    <button type="button" onClick={() => setRow(on ? null : ti)} style={{ border: "none", background: "none", padding: 0, fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: on ? NAVY : TEXT, cursor: "pointer", textDecoration: "underline", textDecorationColor: BLUE_200, textUnderlineOffset: 3 }}>
                      {TASKS[ti]}
                    </button>
                  </td>
                  {cells.map((cell, ri) => (
                    <td key={ri} style={td}>
                      <button
                        type="button"
                        onClick={() => cycle(ti, ri)}
                        aria-label={`${TASKS[ti]} · ${ROLES[ri]}：${cell || "無"}，點擊切換`}
                        style={{ minWidth: 56, height: 32, border: `1px dashed ${on ? BLUE_200 : "transparent"}`, borderRadius: 6, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <LetterBadge cell={cell} focus={focus} />
                      </button>
                    </td>
                  ))}
                  <td style={{ ...td, textAlign: "left", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: c.ok ? SUCCESS : DANGER, background: c.ok ? SUCCESS_50 : DANGER_50 }}>
                      {c.ok ? <CircleCheck size={13} /> : <CircleAlert size={13} />} {c.text}
                    </span>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td style={{ ...td, textAlign: "left", fontSize: 11.5, color: MUTED, borderBottom: "none" }}>
                負荷
                <br />
                <span style={{ color: NAVY, fontWeight: 700 }}>R</span> / <span style={{ color: ORANGE_DEEP, fontWeight: 700 }}>A</span> 數
              </td>
              {loads.map((l, j) => (
                <td key={ROLES[j]} style={{ ...td, borderBottom: "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <LoadBar r={l.r} a={l.a} />
                    <span style={{ fontSize: 11, color: MUTED, fontVariantNumeric: "tabular-nums" }}>
                      {l.r} / {l.a}
                    </span>
                  </div>
                </td>
              ))}
              <td style={{ ...td, borderBottom: "none" }} />
            </tr>
          </tbody>
        </table>
      </div>

      <div aria-live="polite" style={{ fontSize: 13, lineHeight: 1.7, color: TEXT, background: problems ? ORANGE_50 : BLUE_50, border: `1px solid ${problems ? ORANGE_100 : BLUE_100}`, borderRadius: 8, padding: "10px 12px" }}>
        {row !== null ? (
          <span>
            <strong style={{ color: NAVY_DEEP }}>{TASKS[row]}</strong>
            {"："}
            {(["A", "R", "C", "I"] as Letter[])
              .map((l) => {
                const who = ROLES.filter((_, j) => grid[row][j].includes(l));
                const name = LETTERS.find((x) => x.key === l)?.desc.split("：")[0] ?? l;
                return who.length ? `${name}是 ${who.join("、")}` : `沒有${name}`;
              })
              .join("；")}
            。
          </span>
        ) : problems ? (
          <span>
            <strong style={{ color: ORANGE_700 }}>{problems} 項任務的權責有問題。</strong>
            點格子切換 R / A / C / I，把每一列修到「恰好 1 位 A、至少 1 位 R」。
          </span>
        ) : (
          <span>
            每一列都恰好 1 位 A、至少 1 位 R。點任一格切換字母，試著把兩個人都設成 A，看看會發生什麼事。
          </span>
        )}
      </div>
    </div>
  );
}
