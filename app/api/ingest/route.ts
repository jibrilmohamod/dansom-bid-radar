import { NextResponse } from "next/server";
import { upsertLeads } from "@/lib/radar";
import { fetchReliefWeb } from "@/lib/sources/reliefweb";
import { fetchSomaliJobs } from "@/lib/sources/somalijobs";
import type { Lead } from "@/lib/sources/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pulls raw listings from tender boards the Claude sweep can't read directly
// (SomaliJobs, ReliefWeb) into the leads table. Vercel Cron calls it each morning
// with "Authorization: Bearer $CRON_SECRET"; the sweep then scores the new leads.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const report: Record<string, { fetched: number; added: number } | { error: string } | { skipped: string }> = {};

  async function run(name: string, load: () => Promise<Lead[]>) {
    try {
      const leads = await load();
      report[name] = { fetched: leads.length, added: await upsertLeads(leads) };
    } catch (e) {
      report[name] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  await run("SomaliJobs", () => fetchSomaliJobs(3));
  const appname = process.env.RELIEFWEB_APPNAME;
  if (appname) await run("ReliefWeb", () => fetchReliefWeb(appname));
  else report.ReliefWeb = { skipped: "RELIEFWEB_APPNAME is not set" };

  return NextResponse.json({ ok: true, at: new Date().toISOString(), report });
}
