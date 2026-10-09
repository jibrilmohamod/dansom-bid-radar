import { GET as ingest } from "../../route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Temporary manual trigger for the first test run. Removed after testing.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const expected = process.env.INGEST_TEST_TOKEN;
  if (!expected || (await ctx.params).token !== expected) return new Response("not found", { status: 404 });
  return ingest(new Request("http://local/api/ingest", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
}
