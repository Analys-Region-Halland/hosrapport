import { useRef, useState, useEffect } from "react";

// useResizeWidth — gemensam ResizeObserver-hook för responsiv grafbredd.
// Ersätter tre identiska kopior (KpiCard, ChartModal, FacetedChart).
// Returnerar [ref, width]: sätt ref på containern, läs width i ritningen.
export function useResizeWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => {
      const w = Math.floor(e[0].contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
}
