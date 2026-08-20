import { useEffect, useState } from "react";
import { useUrlState } from "./useUrlState.ts";
import { LocationTable, type LocationRow } from "./LocationTable.tsx";

// T-14: the three controls (account, event type, judged week) are read from and written to
// the URL only — see useUrlState.ts. No React state duplicates them.
const ACCOUNT_IDS = Array.from({ length: 20 }, (_, i) => String(i + 1));

const EVENT_TYPES = ["call_received", "lead_created", "appointment_set"];

type NormalcyResponse = {
  accountId: number;
  timezone: string;
  eventType: string;
  weekStart: string;
  locations: LocationRow[];
  /** T-16b: additive Monday narrative summary. Absence is normal, never an error — the table
   * below renders every count, typical range and verdict from `locations` regardless of whether
   * this field is present. No number displayed anywhere else is sourced from this sentence. */
  summary?: string;
};

export function App() {
  const [{ account, eventType, weekStart }, setUrlState] = useUrlState();
  const [data, setData] = useState<NormalcyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    const endpoint = `/api/accounts/${encodeURIComponent(account)}/normalcy?eventType=${encodeURIComponent(eventType)}&weekStart=${encodeURIComponent(weekStart)}`;

    fetch(endpoint)
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
  }, [account, eventType, weekStart]);

  return (
    <main>
      <h1>DASH-247</h1>
      <form aria-label="controls" onSubmit={(e) => e.preventDefault()}>
        <label>
          Account
          <select
            value={account}
            onChange={(e) => setUrlState({ account: e.target.value })}
          >
            {ACCOUNT_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>

        <label>
          Event type
          <select
            value={eventType}
            onChange={(e) => setUrlState({ eventType: e.target.value })}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label>
          Week starting
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setUrlState({ weekStart: e.target.value })}
          />
        </label>
      </form>

      {error && <p role="alert">Failed to load: {error}</p>}
      {!error && !data && <p>Loading…</p>}
      {data?.summary && <p className="summary">{data.summary}</p>}
      {data && <LocationTable locations={data.locations} />}
    </main>
  );
}
