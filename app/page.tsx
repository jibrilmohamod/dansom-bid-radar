import { getOpportunities, getRuns } from "@/lib/radar";
import { logout } from "./actions";
import { Board } from "./board";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [opportunities, runs] = await Promise.all([getOpportunities(), getRuns()]);
  const lastRun = runs[0];

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 32 32"><path d="M16 3l3.4 9.4H29l-7.7 5.6 2.9 9.4L16 21.8l-8.2 5.6 2.9-9.4L3 12.4h9.6z" fill="#fff" /></svg>
            </span>
            <span>Bid Radar <small>Dansom</small></span>
          </a>
          <form action={logout}>
            <button className="linkbtn" type="submit">Sign out</button>
          </form>
        </div>
      </header>

      <main className="wrap">
        <section className="head">
          <div className="eyebrow">Business development · Horn of Africa</div>
          <h1>Opportunities Dansom can bid for</h1>
          <p className="sub">
            Tenders, RFPs and consultancies ranked by fit with Dansom&apos;s services. Somalia comes first, with Kenya and
            Ethiopia included. The list is refreshed every morning and the best matches are emailed to the team.
            {lastRun ? ` Last sweep: ${formatDay(lastRun.run_date)}.` : ""}
          </p>
        </section>

        <Board opportunities={opportunities} />

        <section className="runs" aria-labelledby="runs-h">
          <h2 id="runs-h">Recent sweeps</h2>
          {runs.length ? (
            <ul>
              {runs.slice(0, 7).map((r) => (
                <li key={r.run_date}>
                  <span className="d">{r.run_date}</span>
                  <span>
                    {r.new_count} new{r.summary ? ` · ${r.summary}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No sweeps recorded yet.</p>
          )}
          <p>
            Scores come from the Dansom search profile. Third-party monitoring, evaluation, political economy, security
            and research score highest, and tech projects are tagged so you can filter them. Check the notice itself
            before bidding, because some portals keep documents behind a login.
          </p>
        </section>
      </main>
    </>
  );
}

function formatDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
