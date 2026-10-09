// SomaliJobs tenders. The listing page loads results with a form POST to /tenders/fetch/,
// sending the per-visit CSRF token embedded in the page and the session cookie.

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

export type SjDebug = { landingStatus?: number; cookieNames?: string[]; tokenLength?: number; tokenCount?: number; fetchStatus?: number };

export async function fetchSomaliJobsHtml(page = 1, debug: SjDebug = {}): Promise<string> {
  const landing = await fetch(`${BASE}/tenders`, { headers: { "user-agent": UA }, cache: "no-store" });
  const html = await landing.text();
  debug.landingStatus = landing.status;
  debug.cookieNames = (landing.headers.getSetCookie?.() ?? []).map((c) => c.split("=")[0]);
  debug.tokenCount = [...html.matchAll(/api_token\s*=/g)].length;
  const token = html.match(/api_token\s*=\s*["']([^"']+)["']/)?.[1];
  if (!token) throw new Error(`SomaliJobs: no page token (status ${landing.status})`);

  const body = new URLSearchParams({
    page: String(page),
    filter_locations: "[]",
    filter_dateposted: "[]",
    filter_search: "",
    sortby: "newest",
  });
  const res = await fetch(`${BASE}/tenders/fetch/`, {
    method: "POST",
    headers: {
      "user-agent": UA,
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      "csrf-token": token,
      cookie: cookieHeader(landing),
      referer: `${BASE}/tenders`,
    },
    body,
    cache: "no-store",
  });
  debug.tokenLength = token.length;
  debug.fetchStatus = res.status;
  if (!res.ok) throw new Error(`SomaliJobs: listing request failed (${res.status})`);
  return res.text();
}
