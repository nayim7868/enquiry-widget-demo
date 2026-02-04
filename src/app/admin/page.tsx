"use client";

import { useEffect, useMemo, useState } from "react";

type Enquiry = {
  id: string;
  createdAt: string;
  mode: "GENERAL" | "FLEET" | "PARCEL" | "PART_EX" | "STOCK";
  type: "QUICK_QUESTION" | "QUOTE" | "FLEET_ENQUIRY" | "PART_EXCHANGE";
  status: "NEW" | "CONTACTED" | "CLOSED";
  priority: "HIGH" | "NORMAL" | "LOW";
  slaDueAt: string | null;
  firstRespondedAt: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  context?: { pageUrl: string } | null;
  partEx?: { reg: string; mileage: number } | null;
  companyName: string | null;
  fleetSizeBand: string | null;
  timeframe: string | null;
};

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function slaLabel(slaDueAt: string | null, status: Enquiry["status"]) {
  if (!slaDueAt) return null;
  if (status !== "NEW") return null; // Only show SLA for new items

  const due = new Date(slaDueAt).getTime();
  const diffMins = Math.floor((due - Date.now()) / 60000);

  if (diffMins >= 0) return { text: `Due in ${diffMins}m`, overdue: false };
  return { text: `Overdue by ${Math.abs(diffMins)}m`, overdue: true };
}


export default function AdminPage() {
  const [items, setItems] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  const fetchEnquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (mode !== "ALL") params.set("mode", mode);
      if (status !== "ALL") params.set("status", status);

      const res = await fetch(`/api/enquiries?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.ok) throw new Error(json?.error ?? "Failed to load");

      setItems(json.enquiries);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status]);

  const updateStatus = async (id: string, newStatus: Enquiry["status"]) => {
    const res = await fetch(`/api/enquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      alert(json?.error ?? "Failed to update");
      return;
    }
    // update local state
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: newStatus } : x))
    );
  };

  const counts = useMemo(() => {
    const c = { NEW: 0, CONTACTED: 0, CLOSED: 0 };
    for (const i of items) c[i.status]++;
    return c;
  }, [items]);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-semibold">Admin – Enquiries</h1>
        <p className="mt-1 text-gray-600">
          Simple triage board backed by SQL (SQLite).
        </p>

        <div className="mt-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-medium">Mode</label>
            <select
              className="mt-1 rounded-lg border px-3 py-2"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="GENERAL">GENERAL</option>
              <option value="FLEET">FLEET</option>
              <option value="PARCEL">PARCEL</option>
              <option value="PART_EX">PART_EX</option>
              <option value="STOCK">STOCK</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Status</label>
            <select
              className="mt-1 rounded-lg border px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="NEW">NEW</option>
              <option value="CONTACTED">CONTACTED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchEnquiries}
            className="rounded-lg bg-black px-4 py-2 text-white"
          >
            Refresh
          </button>

          <div className="ml-auto text-sm text-gray-700">
            <span className="mr-3">NEW: {counts.NEW}</span>
            <span className="mr-3">CONTACTED: {counts.CONTACTED}</span>
            <span>CLOSED: {counts.CLOSED}</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-800">
            {error}
          </div>
        )}

        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Created</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Type</th>
                <th className="p-3">Name</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Status</th>
                <th className="p-3">Context</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="p-4" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="p-4" colSpan={7}>
                    No enquiries yet.
                  </td>
                </tr>
              ) : (
                items.map((e) => {
                  const sla = slaLabel(e.slaDueAt, e.status);
                  return (
                  <tr key={e.id} className="border-t align-top">
                    <td className="p-3">
                      <div className="font-medium">{timeAgo(e.createdAt)}</div>
                      <div className="text-gray-500">
                        {new Date(e.createdAt).toLocaleString()}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border px-2 py-0.5">
                          Priority: {e.priority}
                        </span>
                        {sla && (
                          <span
                            className={`rounded-full border px-2 py-0.5 ${
                              sla.overdue ? "border-red-400 bg-red-50" : "border-gray-300 bg-gray-50"
                            }`}
                          >
                            {sla.text}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3">{e.mode}</td>
                    <td className="p-3">{e.type}</td>

                    <td className="p-3">
                      <div className="font-medium">{e.name}</div>
                      <div className="text-gray-600 mt-1 line-clamp-3">
                        {e.message}
                      </div>
                      {e.partEx && (
                        <div className="mt-2 text-xs text-gray-600">
                          Part-ex: {e.partEx.reg} · {e.partEx.mileage.toLocaleString()} miles
                        </div>
                      )}
                      {(e.companyName || e.fleetSizeBand || e.timeframe) && (
                        <div className="mt-2 text-xs text-gray-600">
                          {e.companyName ? `Company: ${e.companyName}` : ""}
                          {e.fleetSizeBand ? ` · Fleet: ${e.fleetSizeBand}` : ""}
                          {e.timeframe ? ` · Timeframe: ${e.timeframe}` : ""}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <div>{e.email ?? "-"}</div>
                      <div>{e.phone ?? "-"}</div>
                    </td>

                    <td className="p-3">
                      <select
                        className="rounded-lg border px-2 py-1"
                        value={e.status}
                        onChange={(ev) =>
                          updateStatus(e.id, ev.target.value as Enquiry["status"])
                        }
                      >
                        <option value="NEW">NEW</option>
                        <option value="CONTACTED">CONTACTED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </td>

                    <td className="p-3">
                      <div className="text-gray-600">
                        {e.context?.pageUrl ?? "-"}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
