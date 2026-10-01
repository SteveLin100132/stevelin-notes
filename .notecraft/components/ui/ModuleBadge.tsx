import { clsx } from "clsx";
import { MODULES, PHASE_DATE, PHASE_LABEL } from "./modules";

// PL3 第三層模組 badge：只給代號，名稱與交付階段從 modules.ts 查。
// 用法：<ModuleBadge code="3.5.3" />、<ModuleBadge code="3.5.3" hidePhase />

const PHASE_TONE = {
  1: "bg-blue-50 text-blue-700",
  2: "bg-orange-50 text-orange-700",
  3: "bg-neutral-100 text-neutral-700",
} as const;

export default function ModuleBadge({ code, hidePhase = false }: { code: string; hidePhase?: boolean }) {
  const m = MODULES[code];
  if (!m) {
    return (
      <span className="inline-flex items-center rounded-pill border border-dashed border-orange-400 px-2 py-0.5 text-xs text-orange-700">
        {code}（查無此模組）
      </span>
    );
  }
  return (
    <span
      className="inline-flex max-w-full items-center overflow-hidden rounded-pill border border-blue-200 bg-white align-middle text-xs leading-snug"
      title={`PL3 第三層模組 ${code} ${m.name}，${PHASE_LABEL[m.phase]}（${PHASE_DATE[m.phase]}）交付`}
    >
      <span className="bg-blue-700 px-2 py-0.5 font-mono font-bold text-white">{code}</span>
      <span className="min-w-0 truncate px-2 py-0.5 text-blue-900">{m.name}</span>
      {!hidePhase && (
        <span className={clsx("shrink-0 px-2 py-0.5 font-semibold", PHASE_TONE[m.phase])}>{PHASE_LABEL[m.phase]}</span>
      )}
    </span>
  );
}
