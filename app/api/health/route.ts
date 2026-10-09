import { NextResponse } from "next/server";
import { getRuns } from "@/lib/radar";

export const dynamic = "force-dynamic";

// Public health check: confirms the app can reach the database. Returns no tender data.
export async function GET() {
  try {
    const runs = await getRuns();
    return NextResponse.json({ ok: true, lastSweep: runs[0]?.run_date ?? null });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
