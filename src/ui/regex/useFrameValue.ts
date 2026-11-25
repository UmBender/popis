import { useEffect, useState } from "react";

/**
 * Defers a value update to the next animation frame (never by wall/timeout delay),
 * keeping live regex highlighting responsive and deterministic under fake clocks (ADR-T45-1).
 */
export function useFrameValue<T>(value: T): T {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setShown(value);
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [value]);
  return shown;
}
