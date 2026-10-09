import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Temporary: checks which public tender feeds Vercel can reach. Fixed URL list, no user input.
const TARGETS = {
  rw_rss: "https://reliefweb.int/jobs/rss.xml?advanced-search=%28C216%29",
  rw_api: "https://api.reliefweb.int/v2/jobs?appname=dansom-bid-radar&limit=2&filter[field]=country.iso3&filter[value]=som",
  sj_tenders: "https://somalijobs.com/tenders",
} as const;

export async function GET(req: Request) {
  const which = new URL(req.url).searchParams.get("t") as keyof typeof TARGETS | null;
  const url = which ? TARGETS[which] : undefined;
  if (!url) return NextResponse.json({ targets: Object.keys(TARGETS) });
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (DansomBidRadar)", accept: "*/*" }, cache: "no-store" });
    const text = await r.text();
    const scripts = [...text.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]).slice(0, 20);
    const apis = [...new Set([...text.matchAll(/["'](\/?api\/[^"']{2,80}|https?:\/\/[^"']*api[^"']{0,80})["']/g)].map((m) => m[1]))].slice(0, 30);
    return NextResponse.json({ status: r.status, type: r.headers.get("content-type"), length: text.length, scripts, apis, head: text.slice(0, 1500), tail: text.slice(-800) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
