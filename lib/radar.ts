import "server-only";
import { createClient } from "@supabase/supabase-js";

export type Fit = "strong" | "good" | "low";
export type Status = "new" | "pursuing" | "skip" | "submitted";
export type Country = "Somalia" | "Kenya" | "Ethiopia" | "Regional";

export type Opportunity = {
  id: string;
  title: string;
  org: string | null;
  donor: string | null;
  country: Country;
  place: string | null;
  deadline: string | null;
  fit: Fit;
  score: number;
  tags: string[];
  why: string | null;
  ref: string | null;
  source: string | null;
  url: string | null;
  kind: "firm" | "individual";
  found_on: string;
  status: Status;
  status_note: string | null;
  status_at: string | null;
};

export type SweepRun = {
  run_date: string;
  new_count: number;
  summary: string | null;
};

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

// The anon key only reaches the key-checked database functions; tables have RLS with no policies.
function db() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
  });
}

export async function getOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await db().rpc("radar_opportunities", { p_key: env("BID_RADAR_APP_KEY") });
  if (error) throw new Error(`Could not load opportunities: ${error.message}`);
  return (data ?? []) as Opportunity[];
}

export async function getRuns(): Promise<SweepRun[]> {
  const { data, error } = await db().rpc("radar_runs", { p_key: env("BID_RADAR_APP_KEY") });
  if (error) throw new Error(`Could not load sweep history: ${error.message}`);
  return (data ?? []) as SweepRun[];
}

export async function setStatus(id: string, status: Status): Promise<void> {
  const { error } = await db().rpc("radar_set_status", {
    p_key: env("BID_RADAR_APP_KEY"),
    p_id: id,
    p_status: status,
  });
  if (error) throw new Error(`Could not update status: ${error.message}`);
}
