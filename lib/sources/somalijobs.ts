// SomaliJobs tenders. The listing page loads results with a form POST to /tenders/fetch/,
// sending the per-visit CSRF token embedded in the page and the session cookie.

const BASE = "https://somalijobs.com";
const UA = "Mozilla/5.0 (compatible; DansomBidRadar/1.0; +https://dansom-bid-radar.vercel.app)";

function cookieHeader(res: Response): string {
  const all = res.headers.getSetCookie?.() ?? [];
  return all.map((c) => c.split(";")[0]).join("; ");
}

export async function fetchSomaliJobsHtml(page = 1): Promise<string> {
  const landing = await fetch(`${BASE}/tenders`, { headers: { "user-agent": UA }, cache: "no-store" });
  const html = await landing.text();
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
  if (!res.ok) throw new Error(`SomaliJobs: listing request failed (${res.status})`);
  return res.text();
}
