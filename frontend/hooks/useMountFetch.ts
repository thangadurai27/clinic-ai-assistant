import { useEffect } from "react";

/**
 * Schedule a fetcher after mount so setState is not invoked synchronously inside useEffect.
 */
export function useMountFetch(
  fetcher: () => void | Promise<void>,
  deps: React.DependencyList
): void {
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void fetcher();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
