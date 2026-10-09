import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Temporary: checks which public tender feeds Vercel can reach. Fixed URL list, no user input.
const TARGETS = {
  rw_rss: "https://reliefweb.int/jobs/rss.xml?advanced-search=%28C216%29",
  rw_api: "https://api.reliefweb.int/v2/jobs?appname=dansom-bid-radar&limit=2&filter[field]=country.iso3&filter[value]=som",
  sj_tenders: "https://somalijobs.com/tenders",
  sj_js: "https://somalijobs.com/v3/src/editing-js/tenders/listing.js",
  sj_ajax: "https://somalijobs.com/v3/src/editing-js/tenders/listing.js",
  sj_main: "https://somalijobs.com/v3/src/editing-js/main.js",
} as const;

export async function GET(_req: Request, ctx: { params: Promise<{ t: string }> }) {
  const which = (await ctx.params).t as keyof typeof TARGETS;
  const url = which ? TARGETS[which] : undefined;
  if (!url) return NextResponse.json({ targets: Object.keys(TARGETS) });
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (DansomBidRadar)", accept: "*/*" }, cache: "no-store" });
    const text = await r.text();
    const at = text.indexOf("CSRF-Token");
    const focus = at >= 0 ? text.slice(Math.max(0, at - 400), at + 3500) : "";
    const scripts = [...text.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]).slice(0, 20);
    const apis = [...new Set([...text.matchAll(/["'](\/?api\/[^"']{2,80}|https?:\/\/[^"']*api[^"']{0,80})["']/g)].map((m) => m[1]))].slice(0, 30);
    return NextResponse.json({ focus, status: r.status, type: r.headers.get("content-type"), length: text.length, scripts, apis, head: text.slice(0, 60000), tail: text.slice(-800) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
