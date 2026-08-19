import { useCallback, useSyncExternalStore } from "react";

/**
 * T-14: URL-owned control state for the three dashboard controls (account, event type,
 * judged week). The URL is the single source of truth — this hook holds no React state of
 * its own; every read comes straight from `location.search` and every write goes through
 * `URLSearchParams` + `history.replaceState`. That is deliberate: a duplicate `useState`
 * mirroring the URL is exactly how "reload restores the view" quietly breaks while the app
 * still looks correct in the tab that changed the control.
 */

export type ControlState = {
  account: string;
  eventType: string;
  weekStart: string;
};

/**
 * Defaults are applied at read time only (never written into React state or auto-persisted
 * to the URL), so they never become a second copy of the truth — an empty query string and a
 * query string carrying the same values as text both resolve to the identical `ControlState`.
 */
const DEFAULTS: ControlState = {
  account: "1",
  eventType: "call_received",
  weekStart: "2026-05-25",
};

// history.replaceState does not fire `popstate`, so external subscribers (useSyncExternalStore)
// would never see a write-through change. We dispatch a real PopStateEvent ourselves right after
// each replaceState call so this hook (and any other consumer) re-reads location.search.
function subscribe(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getSearchSnapshot(): string {
  return window.location.search;
}

function readState(search: string): ControlState {
  const params = new URLSearchParams(search);
  return {
    account: params.get("account") ?? DEFAULTS.account,
    eventType: params.get("eventType") ?? DEFAULTS.eventType,
    weekStart: params.get("weekStart") ?? DEFAULTS.weekStart,
  };
}

export function useUrlState(): [ControlState, (patch: Partial<ControlState>) => void] {
  const search = useSyncExternalStore(subscribe, getSearchSnapshot, getSearchSnapshot);
  const state = readState(search);

  const setState = useCallback((patch: Partial<ControlState>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      next.set(key, value);
    }
    const url = `${window.location.pathname}?${next.toString()}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return [state, setState];
}
