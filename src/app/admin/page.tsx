"use client";

import { useEffect, useMemo, useState } from "react";

type Enquiry = {
  id: string;
  createdAt: string;
  mode: "GENERAL" | "FLEET" | "PARCEL" | "PART_EX" | "STOCK";
  type: "QUICK_QUESTION" | "QUOTE" | "FLEET_ENQUIRY" | "PART_EXCHANGE";
  status: "NEW" | "CONTACTED" | "CLOSED";
  priority: "HIGH" | "NORMAL" | "LOW";
  queue: "GENERAL" | "FLEET" | "VALUATIONS";
  assignedTo: string | null;
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
  const [queue, setQueue] = useState<string>("ALL");

  const fetchEnquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (mode !== "ALL") params.set("mode", mode);
      if (status !== "ALL") params.set("status", status);
      if (queue !== "ALL") params.set("queue", queue);


      const res = await fetch(`/api/enquiries?${params.toString()}`);
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`);
      }
      
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
  }, [mode, status, queue]);

  const patchEnquiry = async (id: string, patch: any) => {
    const res = await fetch(`/api/enquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      alert(json?.error ?? "Failed to update");
      return false;
    }
    return true;
  };

  const updateStatus = async (id: string, newStatus: Enquiry["status"]) => {
    const ok = await patchEnquiry(id, { status: newStatus });
    if (!ok) return;
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: newStatus } : x)));
  };

  const counts = useMemo(() => {
    const c = { NEW: 0, CONTACTED: 0, CLOSED: 0 };
    for (const i of items) c[i.status]++;
    return c;
  }, [items]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 w-full">
      <div className="w-full">
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Admin – Enquiries</h1>
          <p className="mt-2 text-gray-600">
            Simple triage board backed by SQL (SQLite).
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 items-end bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mode</label>
            <select
              className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
            <select
              className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="NEW">NEW</option>
              <option value="CONTACTED">CONTACTED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Queue</label>
            <select
              className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={queue}
              onChange={(e) => setQueue(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="GENERAL">GENERAL</option>
              <option value="FLEET">FLEET</option>
              <option value="VALUATIONS">VALUATIONS</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchEnquiries}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Refresh
          </button>

          <div className="ml-auto flex gap-4 text-sm font-semibold">
            <span className="px-3 py-1.5 rounded-md bg-blue-100 text-blue-800">NEW: {counts.NEW}</span>
            <span className="px-3 py-1.5 rounded-md bg-yellow-100 text-yellow-800">CONTACTED: {counts.CONTACTED}</span>
            <span className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-800">CLOSED: {counts.CLOSED}</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border-2 border-red-400 bg-red-50 p-4 text-red-900 font-medium shadow-sm">
            {error}
          </div>
        )}

        <div className="mt-6 w-full rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-white">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-gradient-to-r from-gray-700 to-gray-800 text-left">
              <tr>
                <th className="p-4 w-[12%] text-white font-semibold text-xs uppercase tracking-wider">Created</th>
                <th className="p-4 w-[8%] text-white font-semibold text-xs uppercase tracking-wider">Mode</th>
                <th className="p-4 w-[10%] text-white font-semibold text-xs uppercase tracking-wider">Type</th>
                <th className="p-4 w-[25%] text-white font-semibold text-xs uppercase tracking-wider">Name</th>
                <th className="p-4 w-[12%] text-white font-semibold text-xs uppercase tracking-wider">Contact</th>
                <th className="p-4 w-[8%] text-white font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="p-4 w-[10%] text-white font-semibold text-xs uppercase tracking-wider">Queue</th>
                <th className="p-4 w-[8%] text-white font-semibold text-xs uppercase tracking-wider">Assigned</th>
                <th className="p-4 w-[7%] text-white font-semibold text-xs uppercase tracking-wider">Context</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="p-8 text-center text-gray-500" colSpan={9}>
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="p-8 text-center text-gray-500" colSpan={9}>
                    No enquiries yet.
                  </td>
                </tr>
              ) : (
                items.map((e, idx) => {
                  const sla = slaLabel(e.slaDueAt, e.status);
                  return (
                  <tr key={e.id} className={`align-top hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-4 break-words">
                      <div className="font-semibold text-gray-900">{timeAgo(e.createdAt)}</div>
                      <div className="text-gray-600 text-xs break-words mt-1">
                        {new Date(e.createdAt).toLocaleString()}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          e.priority === 'HIGH' ? 'bg-red-100 text-red-800 border border-red-300' :
                          e.priority === 'NORMAL' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          'bg-gray-100 text-gray-800 border border-gray-300'
                        }`}>
                          {e.priority}
                        </span>
                        {sla && (
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
                              sla.overdue 
                                ? "bg-red-600 text-white border-2 border-red-700 animate-pulse" 
                                : "bg-amber-500 text-white border-2 border-amber-600"
                            }`}
                          >
                            ⏰ {sla.text}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 break-words">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 border border-indigo-200">
                        {e.mode}
                      </span>
                    </td>
                    <td className="p-4 break-words">
                      <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200">
                        {e.type}
                      </span>
                    </td>

                    <td className="p-4 break-words">
                      <div className="font-semibold text-gray-900 break-words">{e.name}</div>
                      <div className="text-gray-700 mt-2 line-clamp-3 break-words text-sm leading-relaxed">
                        {e.message}
                      </div>
                      {e.partEx && (
                        <div className="mt-2 text-xs text-gray-700 break-words bg-blue-50 px-2 py-1 rounded border border-blue-200">
                          <span className="font-semibold">Part-ex:</span> {e.partEx.reg} · {e.partEx.mileage.toLocaleString()} miles
                        </div>
                      )}
                      {(e.companyName || e.fleetSizeBand || e.timeframe) && (
                        <div className="mt-2 text-xs text-gray-700 break-words bg-green-50 px-2 py-1 rounded border border-green-200">
                          {e.companyName && <><span className="font-semibold">Company:</span> {e.companyName}</>}
                          {e.fleetSizeBand && <> · <span className="font-semibold">Fleet:</span> {e.fleetSizeBand}</>}
                          {e.timeframe && <> · <span className="font-semibold">Timeframe:</span> {e.timeframe}</>}
                        </div>
                      )}
                    </td>

                    <td className="p-4 break-words">
                      <div className="text-gray-900 break-words font-medium">{e.email ?? <span className="text-gray-400">-</span>}</div>
                      <div className="text-gray-700 break-words mt-1">{e.phone ?? <span className="text-gray-400">-</span>}</div>
                    </td>

                    <td className="p-4">
                      <select
                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full"
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

                    <td className="p-4">
                      <select
                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full"
                        value={e.queue}
                        onChange={async (ev) => {
                          const newQueue = ev.target.value as Enquiry["queue"];
                          const ok = await patchEnquiry(e.id, { queue: newQueue });
                          if (!ok) return;
                          setItems((prev) => prev.map((x) => (x.id === e.id ? { ...x, queue: newQueue } : x)));
                        }}
                      >
                        <option value="GENERAL">GENERAL</option>
                        <option value="FLEET">FLEET</option>
                        <option value="VALUATIONS">VALUATIONS</option>
                      </select>
                    </td>

                    <td className="p-4">
                      <input
                        className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                        defaultValue={e.assignedTo ?? ""}
                        placeholder="Unassigned"
                        onBlur={async (ev) => {
                          const value = ev.target.value.trim();
                          const newAssigned = value === "" ? null : value;

                          const ok = await patchEnquiry(e.id, { assignedTo: newAssigned });
                          if (!ok) return;

                          setItems((prev) =>
                            prev.map((x) => (x.id === e.id ? { ...x, assignedTo: newAssigned } : x))
                          );
                        }}
                      />
                    </td>

                    <td className="p-4 break-words">
                      <div className="text-gray-700 break-words text-xs font-mono truncate" title={e.context?.pageUrl ?? "-"}>
                        {e.context?.pageUrl ? (
                          <a href={e.context.pageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
                            {e.context.pageUrl}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
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
