// ReliefWeb jobs API (v2). It only answers apps with an approved appname, set in RELIEFWEB_APPNAME.
// Consultancies and evaluation ToRs are posted here as jobs, so we pull jobs for our three
// countries and let the daily sweep keep the ones that suit Dansom.

import type { Lead } from "./types";

const API = "https://api.reliefweb.int/v2/jobs";
const COUNTRIES = ["Somalia", "Kenya", "Ethiopia"];

type RwJob = {
  id: number;
  fields: {
    title: string;
    url_alias?: string;
    url?: string;
    date?: { created?: string; closing?: string };
    source?: { shortname?: string; name?: string }[];
    country?: { name: string }[];
    city?: { name: string }[];
    type?: { name: string }[];
    career_categories?: { name: string }[];
  };
};

export async function fetchReliefWeb(appname: string, days = 3): Promise<Lead[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const body = {
    limit: 200,
    sort: ["date.created:desc"],
    fields: { include: ["title", "url_alias", "url", "date", "source", "country", "city", "type", "career_categories"] },
    filter: {
      operator: "AND",
      conditions: [
        { field: "country.name", value: COUNTRIES, operator: "OR" },
        { field: "date.created", value: { from: since } },
      ],
    },
  };
  const res = await fetch(`${API}?appname=${encodeURIComponent(appname)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ReliefWeb: API returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { data: RwJob[] };

  return json.data.map(({ id, fields: f }) => ({
    source: "ReliefWeb",
    ext_id: String(id),
    title: f.title,
    org: f.source?.map((s) => s.shortname || s.name).filter(Boolean).join(", ") || null,
    location: [...(f.city ?? []), ...(f.country ?? [])].map((c) => c.name).join(", ") || null,
    posted: f.date?.created?.slice(0, 10) ?? null,
    deadline: f.date?.closing?.slice(0, 10) ?? null,
    url: f.url_alias || f.url || `https://reliefweb.int/job/${id}`,
    extra: {
      type: f.type?.map((t) => t.name) ?? [],
      categories: f.career_categories?.map((c) => c.name) ?? [],
    },
  }));
}
