"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import type { Country, Opportunity, Status } from "@/lib/radar";
import { updateStatus } from "./actions";

const DAY = 86_400_000;
const COUNTRIES: ("All" | Country)[] = ["All", "Somalia", "Kenya", "Ethiopia", "Regional"];
const FITS = [
  ["all", "All"],
  ["strong", "Strong"],
  ["good", "Good"],
  ["tech", "Tech"],
  ["low", "Low"],
] as const;
const VIEWS = [
  ["open", "To review"],
  ["pursuing", "Pursuing"],
  ["submitted", "Submitted"],
  ["skip", "Skipped"],
  ["all", "All"],
] as const;

type Filters = { country: (typeof COUNTRIES)[number]; fit: (typeof FITS)[number][0]; view: (typeof VIEWS)[number][0]; past: boolean; q: string };
const DEFAULTS: Filters = { country: "All", fit: "all", view: "open", past: false, q: "" };

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function daysLeft(o: Opportunity): number | null {
  if (!o.deadline) return null;
  return Math.floor((new Date(o.deadline + "T23:59:00").getTime() - todayStart()) / DAY);
}

export function Board({ opportunities }: { opportunities: Opportunity[] }) {
  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const [items, applyStatus] = useOptimistic(opportunities, (list: Opportunity[], u: { id: string; status: Status }) =>
    list.map((o) => (o.id === u.id ? { ...o, status: u.status } : o)),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("radar-filters") ?? "{}");
      setFilters((f) => ({ ...f, ...saved, q: "" }));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const { q: _q, ...rest } = filters;
      localStorage.setItem("radar-filters", JSON.stringify(rest));
    } catch {}
  }, [filters]);

  const open = items.filter((o) => (daysLeft(o) ?? 0) >= 0);
  const stats = {
    open: open.filter((o) => o.status !== "skip").length,
    soon: open.filter((o) => o.status !== "skip" && (daysLeft(o) ?? 99) <= 7).length,
    strong: open.filter((o) => o.fit === "strong" && o.status !== "skip").length,
    pursuing: items.filter((o) => o.status === "pursuing" || o.status === "submitted").length,
  };

  const shown = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return items
      .filter((o) => {
        const dl = daysLeft(o);
        if (!filters.past && dl !== null && dl < 0) return false;
        if (filters.country !== "All" && o.country !== filters.country) return false;
        if (filters.fit === "tech" && !o.tags.includes("Tech")) return false;
        if (filters.fit !== "all" && filters.fit !== "tech" && o.fit !== filters.fit) return false;
        if (filters.view === "open" && o.status !== "new") return false;
        if (filters.view !== "open" && filters.view !== "all" && o.status !== filters.view) return false;
        if (q && ![o.title, o.org, o.donor, o.place, o.why, o.ref].some((s) => s?.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score || (daysLeft(a) ?? 999) - (daysLeft(b) ?? 999));
  }, [items, filters]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <>
      <section className="stats" aria-label="Summary">
        <div className="stat"><b>{stats.open}</b><span>Open opportunities</span></div>
        <div className="stat hot"><b>{stats.soon}</b><span>Close within 7 days</span></div>
        <div className="stat"><b>{stats.strong}</b><span>Strong matches</span></div>
        <div className="stat"><b>{stats.pursuing}</b><span>Pursuing or submitted</span></div>
      </section>

      <section className="filters" aria-label="Filters">
        <Seg label="Country" value={filters.country} options={COUNTRIES.map((c) => [c, c] as const)} onChange={(v) => set("country", v)} />
        <Seg label="Fit" value={filters.fit} options={FITS} onChange={(v) => set("fit", v)} />
        <Seg label="Show" value={filters.view} options={VIEWS} onChange={(v) => set("view", v)} />
        <label className="search" htmlFor="q">
          <span>Search</span>
          <input id="q" type="search" placeholder="Donor, keyword, region…" value={filters.q} onChange={(e) => set("q", e.target.value)} />
        </label>
        <label className="toggle" htmlFor="past">
          <input id="past" type="checkbox" checked={filters.past} onChange={(e) => set("past", e.target.checked)} /> Show closed
        </label>
      </section>

      {error ? <p className="error" role="alert">{error}</p> : null}

      <section className="list" aria-live="polite">
        {!items.length ? (
          <div className="empty">
            <strong>No opportunities yet</strong>
            <span>The morning sweep adds tenders here. Each one shows its fit with Dansom&apos;s services, its deadline and a link to the notice.</span>
          </div>
        ) : !shown.length ? (
          <div className="empty">
            <strong>Nothing matches these filters</strong>
            <span>Try All countries, switch Show to All, or tick Show closed.</span>
          </div>
        ) : (
          shown.map((o) => <Card key={o.id} o={o} onStatus={applyStatus} onError={setError} />)
        )}
      </section>
    </>
  );
}

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div className="fgroup" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="seg">
        {options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

const FIT_LABEL = { strong: "Strong match", good: "Good match", low: "Low match" } as const;
const STATUS_LABEL: Record<Status, string> = { new: "", pursuing: "Pursuing", submitted: "Submitted", skip: "Skipped" };

function Card({ o, onStatus, onError }: { o: Opportunity; onStatus: (u: { id: string; status: Status }) => void; onError: (e: string | null) => void }) {
  const [pending, start] = useTransition();
  const dl = daysLeft(o);

  const choose = (s: Status) => {
    const next = o.status === s ? "new" : s;
    onError(null);
    start(async () => {
      onStatus({ id: o.id, status: next });
      try {
        await updateStatus(o.id, next);
      } catch {
        onError("That change was not saved. Check your connection and try again.");
      }
    });
  };

  let deadline = "Deadline not stated";
  let cls = "deadline";
  if (o.deadline && dl !== null) {
    const date = new Date(o.deadline + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    deadline = `Closes ${date}` + (dl < 0 ? " (closed)" : dl === 0 ? " · today" : dl === 1 ? " · tomorrow" : ` · in ${dl} days`);
    if (dl < 0) cls += " past";
    else if (dl <= 7) cls += " soon";
  }

  return (
    <article className="card" data-fit={o.fit} data-status={o.status}>
      <div className="row1">
        <h3 className="title">
          {o.url ? <a href={o.url} target="_blank" rel="noopener noreferrer">{o.title}</a> : o.title}
        </h3>
        <div className="score" title="Fit score out of 100"><b>{o.score}</b> /100</div>
      </div>
      <div className="meta">
        <span className="chip country">{o.place ? `${o.country} · ${o.place}` : o.country}</span>
        <span className={`chip ${o.fit}`}>{FIT_LABEL[o.fit]}</span>
        {o.tags.map((t) => (
          <span key={t} className={`chip${t === "Tech" ? " tech" : ""}`}>{t}</span>
        ))}
        {o.status !== "new" && o.status !== "skip" ? <span className="chip status">{STATUS_LABEL[o.status]}</span> : null}
        <span>{[o.org, o.donor ? `funded by ${o.donor}` : ""].filter(Boolean).join(" · ")}</span>
      </div>
      {o.why ? <p className="why">{o.why}</p> : null}
      <div className="row3">
        <div className="meta">
          <span className={cls}>{deadline}</span>
          {o.ref ? <span className="ref">{o.ref}</span> : null}
          {o.source ? <span>via {o.source}</span> : null}
        </div>
        <div className="actions">
          <button type="button" aria-pressed={o.status === "pursuing"} disabled={pending} onClick={() => choose("pursuing")}>Pursue</button>
          <button type="button" aria-pressed={o.status === "submitted"} disabled={pending} onClick={() => choose("submitted")}>Submitted</button>
          <button type="button" className="skip" aria-pressed={o.status === "skip"} disabled={pending} onClick={() => choose("skip")}>Skip</button>
        </div>
      </div>
    </article>
  );
}
