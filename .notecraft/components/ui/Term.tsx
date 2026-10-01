import { useId, useRef, type ReactNode } from "react";
import { GLOSSARY } from "./glossary";

// 專有名詞 tooltip。輸出 NoteCraft 原生的 .nc-tip 結構，沿用 viewer 的氣泡樣式：
// - 筆記正文（MDX，不加 client directive）：SSR 的靜態 HTML，由頁面腳本負責定位。
// - 互動元件內（會重新 render）：頁面腳本抓不到新節點，所以這裡自己定位，演算法與 viewer 相同。
// 用法：<Term k="勞保" />、<Term k="應發">應發金額</Term>

export default function Term({ k, children }: { k: string; children?: ReactNode }) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const def = GLOSSARY[k];
  if (!def) return <>{children ?? k}</>;

  const position = () => {
    const tip = ref.current;
    const bubble = tip?.querySelector<HTMLElement>(".nc-tip__bubble");
    if (!tip || !bubble) return;
    bubble.style.left = "0px";
    bubble.style.top = "0px";
    const tr = tip.getBoundingClientRect();
    const scroll = document.getElementById("nc-scroll");
    const sr = scroll ? scroll.getBoundingClientRect() : { left: 8, right: window.innerWidth - 8, top: 8 };
    const minX = Math.max(8, sr.left + 8);
    const maxX = Math.min(window.innerWidth - 8, sr.right - 8);
    const bw = bubble.offsetWidth;
    const left = Math.max(minX, Math.min(tr.left + tr.width / 2 - bw / 2, maxX - bw));
    let top = tr.top - bubble.offsetHeight - 9;
    const below = top < sr.top + 8;
    if (below) top = tr.bottom + 9;
    bubble.style.left = `${Math.round(left)}px`;
    bubble.style.top = `${Math.round(top)}px`;
    bubble.style.setProperty("--nc-tip-arrow", `${Math.round(tr.left + tr.width / 2 - left)}px`);
    bubble.classList.toggle("nc-tip__bubble--below", below);
  };

  return (
    <span
      ref={ref}
      className="nc-tip"
      tabIndex={0}
      aria-describedby={id}
      onMouseEnter={position}
      onFocus={position}
    >
      {children ?? k}
      <span className="nc-tip__bubble" role="tooltip" id={id}>
        {def}
      </span>
    </span>
  );
}
