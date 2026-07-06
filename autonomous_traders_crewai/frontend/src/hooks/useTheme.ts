import { useCallback, useEffect, useState } from "react";

const KEY = "trading-floor-theme";
export type Theme = "dark" | "light";

// Theme lives as a data-theme attribute on <html>; the stylesheet reacts
// through its :root[data-theme="..."] blocks. Persisted in localStorage.
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(KEY) as Theme | null) ?? "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return [theme, toggle];
}
