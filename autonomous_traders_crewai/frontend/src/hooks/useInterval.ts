import { useEffect, useRef } from "react";

// Ticks a callback on a fixed interval without resetting the timer whenever
// the callback identity changes (the classic Dan Abramov useInterval pattern).
export function useInterval(callback: () => void, delayMs: number): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}
