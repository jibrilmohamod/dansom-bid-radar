// SomaliJobs tenders. The listing page loads results with a form POST to /tenders/fetch/,
// sending the per-visit CSRF token embedded in the page and the session cookie.

import type { Lead } from "./types";

const BASE = "https://somalijobs.com";
const UA = "Mozilla/5.0 (compatible; DansomBidRadar/1.0; +https://dansom-bid-radar.vercel.app)";

function cookieHeader(res: Response): string {
  // The site sets _csrf more than once; the last value wins, as in a browser.
  const jar = new Map<string, string>();
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const pair = c.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function session() {
  const landing = await fetch(`${BASE}/tenders`, { headers: { "user-agent": UA }, cache: "no-store" });
  const html = await landing.text();
  const token = html.match(/api_token\s*=\s*["']([^"']+)["']/)?.[1];
  if (!token) throw new Error(`SomaliJobs: no page token (status ${landing.status})`);
  return { token, cookie: cookieHeader(landing) };
}

async function listingPage(s: { token: string; cookie: string }, page: number): Promise<string> {
  const res = await fetch(`${BASE}/tenders/fetch/`, {
    method: "POST",
    headers: {
      "user-agent": UA,
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      "csrf-token": s.token,
      cookie: s.cookie,
      referer: `${BASE}/tenders`,
    },
    body: new URLSearchParams({
      page: String(page),
      filter_locations: "[]",
      filter_dateposted: "[]",
      filter_search: "",
      sortby: "newest",
    }),
    cache: "no-store",
  });
  if (res.status === 203) return ""; // the site's "no more pages" signal
  if (!res.ok) throw new Error(`SomaliJobs: listing request failed (${res.status})`);
  const html = await res.text();
  if (html.includes("500 | Server Error")) throw new Error("SomaliJobs: listing returned an error page");
  return html;
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function parseSomaliJobs(html: string): Lead[] {
  const leads: Lead[] = [];
  const items = html.split(/<a\b(?=[^>]*class="[^"]*jobs-listing-container)/).slice(1);
  for (const item of items) {
    const href = item.match(/href="([^"]+)"/)?.[1];
    const title = item.match(/<h2[^>]*jobs-listing-title[^>]*>([\s\S]*?)<\/h2>/)?.[1];
    if (!href || !title) continue;
    const id = href.match(/\/tenders\/[^/]+\/(\d+)/)?.[1] ?? href;
    const cards = [...item.matchAll(/<div[^>]*jobs-listing-card[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1]);
    const spanText = (c?: string) => {
      if (!c) return undefined;
      const spans = [...c.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].map((m) => decode(m[1])).filter(Boolean);
      return spans[spans.length - 1];
    };
    leads.push({
      source: "SomaliJobs",
      ext_id: id,
      title: decode(title),
      org: spanText(cards[0]) ?? null,
      posted: spanText(cards[1]) ?? null,
      location: spanText(cards[2]) ?? null,
      deadline: null,
      url: href.startsWith("http") ? href : `${BASE}${href}`,
      extra: {},
    });
  }
  return leads;
}

export async function fetchSomaliJobs(pages = 3): Promise<Lead[]> {
  const s = await session();
  const out: Lead[] = [];
  for (let p = 1; p <= pages; p++) {
    const html = await listingPage(s, p);
    if (!html) break;
    const leads = parseSomaliJobs(html);
    if (!leads.length) break;
    out.push(...leads);
  }
  return out;
}
