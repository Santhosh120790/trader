import { type RefObject, useEffect, useState } from "react";

interface Size {
  width: number;
  height: number;
}

// Tracks an element's content-box size so SVG charts can size themselves to
// fill a CSS-grid cell (which has no intrinsic size of its own).
export function useResizeObserver(ref: RefObject<HTMLElement>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
