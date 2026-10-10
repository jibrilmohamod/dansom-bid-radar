# Daily sweep runbook

A scheduled Claude routine follows these steps every morning at 06:47 Nairobi time. The search profile is in [`search-profile.md`](search-profile.md).

- Website: https://dansom-bid-radar.vercel.app (Vercel, deploys on every push to main)
- Database: Supabase project `dansom-bid-radar` (ref `leifxdgyacenhnmpzpmb`). The routine writes to it with the Supabase connector's `execute_sql`.
- Digest goes to: jibrilmohamod@gmail.com, sent from Gmail

## Network note
The Claude cloud environment blocks direct curl to tender sites, so the routine uses WebFetch and WebSearch. WebFetch URLs must be short (long UNGM search URLs are refused).

## Automatic listings (SomaliJobs and ReliefWeb)
Between 05:05 and 06:00 Nairobi a Vercel cron calls (Vercel Hobby runs crons at any point in the scheduled hour) `/api/ingest`, which saves the newest SomaliJobs tenders (and ReliefWeb jobs for Somalia, Kenya and Ethiopia once `RELIEFWEB_APPNAME` is set in Vercel) into the `leads` table. The sweep starts from these:

- `select source, ext_id, title, org, location, posted, deadline, url from leads where reviewed = false order by first_seen desc;`
- SomaliJobs listings carry no deadline. Open the detail page with a short slug to read it, e.g. `https://somalijobs.com/tenders/<loc>/<id>/x` (the full slug can be too long for WebFetch).
- Score each lead with the rules below and insert the ones that fit into `opportunities` (use `source = 'SomaliJobs'` or `'ReliefWeb'`).
- Then mark them all done: `update leads set reviewed = true where reviewed = false;`

## Other sources
1. SomaliaRFP home page, https://www.somaliarfp.com/ — the best source for current Somalia NGO and UN tenders. Detail pages are public; documents need a login.
2. UNGM notice pages, https://www.ungm.org/Public/Notice/<id> — readable one at a time. Find them with WebSearch, e.g. `site:ungm.org Somalia consultancy 2026`.
3. World Bank API: `https://search.worldbank.org/api/v2/procnotices?format=json&rows=40&qterm=Somalia&srt=noticedate&order=desc`. Swap the qterm for Kenya or Ethiopia. Keep only "Request for Expression of Interest" items with a future deadline.
4. GIZ: https://ausschreibungen.giz.de/Satellite/company/welcome.do — look for Somalia, Kenya, Ethiopia or the Horn of Africa.
5. EthioNGOJobs tenders: https://www.ethiongojobs.com/category/tender/
6. hornjobs.org/tenders, ngojobsinafrica.com, and reliefweb.int via WebSearch while the ReliefWeb API is not yet switched on.
7. WebSearch for the current month, e.g. "Somalia third party monitoring RFP <month year>", "Kenya evaluation consultancy tender <month year>", "Somalia digital platform consultancy tender".

## Scoring (0-100)
- Base score by kind of work:
  - Strong (75-95): TPM/TPME, evaluation, baseline or endline surveys, political economy or conflict analysis, security advisory, formative research.
  - Good (50-74): policy advisory, statistics, EIA/ESIA monitoring, capacity building, logistics for donor programmes.
  - Tech (55-85, tag `Tech`): digital M&E, MIS, dashboards, GIS, e-government, software or data systems. Use `fit = 'strong'` when the item is combined with research or M&E.
  - Low (<50): training-only work or unrelated work.
- Adjustments:
  - Somalia: no change.
  - Kenya and Ethiopia: -8, less for northeast Kenya or the Somali Region of Ethiopia.
  - A past donor (EU, World Bank, UN agencies, SDC, DANIDA, GIZ, FCDO, major INGOs): +5.
  - Closing in under 3 days: -5.
- Exclude goods and works, staff jobs, award notices and anything already closed. Keep individual-consultant posts when the work fits, with `kind = 'individual'` and the tag `Individual`.

## Daily steps
1. Read what's already there: `select id, title, url, deadline, status from opportunities;`
2. Review the unreviewed leads as described above, then sweep the other sources and open each promising detail page to confirm the deadline. Never invent a deadline or guess one. Leave it null if none is stated.
3. Insert the new items in one statement: `insert into opportunities (id, title, org, donor, country, place, deadline, fit, score, tags, why, ref, source, url, kind) values (...) on conflict (id) do nothing;` Use a short slug for `id`. Write `why` as one or two plain sentences on why the item suits Dansom.
4. Record the run: `insert into sweep_runs (run_date, new_count, summary) values (current_date, N, '...') on conflict (run_date) do update set new_count = excluded.new_count, summary = excluded.summary;`
5. Email one digest from Gmail to jibrilmohamod@gmail.com with the subject "Dansom Bid Radar: N new, <date>". Order it like this:
   - New items by score: title linked to the notice, org, country, deadline and a one-line why.
   - Open items closing within 7 days whose status is not `skip`.
   - A link to the website.

   If nothing is new, send a short note saying so and list what's still open.
