// A raw listing pulled from a tender board, before the daily sweep scores it.
export type Lead = {
  source: string;
  ext_id: string;
  title: string;
  org: string | null;
  location: string | null;
  posted: string | null;
  deadline: string | null; // YYYY-MM-DD
  url: string;
  extra: Record<string, unknown>;
};
