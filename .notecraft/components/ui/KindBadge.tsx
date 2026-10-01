import { clsx } from "clsx";

// 資料性質 badge，配色與 end-to-end-flow 流程圖的圖例一致。
// 用法：<KindBadge kind="planned" />

export type Kind = "base" | "planned" | "actual" | "confirmed";

export const KIND_META: Record<Kind, { label: string; badge: string; dot: string }> = {
  base: { label: "基礎資料", badge: "border-neutral-300 bg-neutral-50 text-neutral-700", dot: "bg-neutral-400 border-neutral-400" },
  planned: { label: "預定事實", badge: "border-dashed border-blue-400 bg-blue-50 text-blue-700", dot: "bg-blue-300 border-blue-300" },
  actual: { label: "實際事實", badge: "border-orange-300 bg-orange-50 text-orange-700", dot: "bg-orange-400 border-orange-400" },
  confirmed: { label: "確認後結果", badge: "border-blue-700 bg-blue-700 text-white", dot: "bg-blue-700 border-blue-700" },
};

export default function KindBadge({ kind }: { kind: Kind }) {
  return (
    <span className={clsx("inline-flex items-center whitespace-nowrap rounded-pill border px-2 py-0.5 align-middle text-xs font-semibold leading-snug", KIND_META[kind].badge)}>
      {KIND_META[kind].label}
    </span>
  );
}
