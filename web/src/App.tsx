import { useEffect, useState } from "react";

// T-13 shell only: proves the Vite dev proxy reaches the Express API with no CORS config.
// Fixed query params here are a placeholder — T-14 replaces them with URL-owned control state.
const ENDPOINT =
  "/api/accounts/1/normalcy?eventType=call_received&weekStart=2026-05-25";

type NormalcyResponse = {
  accountId: number;
  timezone: string;
  eventType: string;
  weekStart: string;
  locations: unknown[];
};

export function App() {
  const [data, setData] = useState<NormalcyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(ENDPOINT)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((body: NormalcyResponse) => {
        if (!cancelled) {
          setData(body);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>DASH-247</h1>
      {error && <p role="alert">Failed to load: {error}</p>}
      {!error && !data && <p>Loading…</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </main>
  );
}
