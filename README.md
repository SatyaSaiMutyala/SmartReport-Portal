# SmartReport Portal

Turns a TrustLab LIMS visit into a **Smart Report**: every approved result read by body system, explained in plain
language, linked into cross-system patterns, and trended against the patient's earlier visits.
Patient results are fetched live from the LIMS for each request and **never stored** — MongoDB holds only the
interpretation catalogue.

```
frontend/   React 19 + Vite + MUI v9 + Recharts
backend/    Node.js + Express 5 + MongoDB (Mongoose)
```

## How it works

```
visit no. ──► GET /api/smart-report/:visitId
                 ├─ LIMS  Design/Lab/GetReports.aspx?visitId=…         current approved results (JSON mode)
                 ├─ LIMS  Design/Lab/GetPatientHistory.aspx?visitId=…  earlier results, same UHID (X-SmartReport-Key)
                 ├─ match LIMS parameter names → TLP parameters (names/aliases, test context, manual mappings)
                 └─ engine (ported from Smart Report Studio v1.0): bands → body systems → patterns → trends → re-test
```

`GetPatientHistory.aspx` is a separate, read-only page added next to `GetReports.aspx` in the LIMS
(`D:\App\Trustlab\Design\Lab`); `GetReports.aspx` itself is unchanged. Its key lives in the LIMS at
`App_Data\smartreport-history.key` and must equal `LIMS_HISTORY_KEY` here.

## Backend

```bash
cd backend
cp .env.example .env    # MONGO_URI, LIMS_BASE_URL, LIMS_HISTORY_KEY
npm install
npm run seed            # load the catalogue (first time / new Studio build)
npm run dev             # http://localhost:5000
```

Endpoints:
- `GET /api/smart-report/:visitId` (`?package=<catalogue name>` to force a package) — the Smart Report, computed live
- `GET /api/mappings`, `PUT /api/mappings {limsName, tlp|null}`, `DELETE /api/mappings/:limsName` — manual LIMS-name mappings
- `GET /api/mappings/resolve?name=…&context=…` — what the matcher does with a LIMS name
- `GET /api/health`
- `GET /api/catalog` — catalogue version + counts
- `GET /api/catalog/parameters` (`?cl= &type= &review=true &q= &full=true`), `/parameters/:id` (TLP-###)
- `GET /api/catalog/clusters`, `/packages` (`?group=`), `/packages/:slug`, `/rules` (`?package=<name>`)
- `GET /api/catalog/terms`, `/catalog/settings/lab`

Development without the live LIMS:

```bash
npm run mock-lims                                            # fake LIMS on :5099 (any visit no.; NOTFOUND → 404)
LIMS_BASE_URL=http://localhost:5099/Trustlab npm run dev
STUDIO_HTML="C:/path/to/TrustLab_SmartReport_Studio_N.html" npm test   # engine parity with the Studio, all 69 packages
```

### Smart Report content (catalogue)

The interpretation database, T&C and lab defaults come from the single-file
**TrustLab Smart Report Studio** HTML. To load a new Studio build:

```bash
npm run extract -- "C:/path/to/TrustLab_SmartReport_Studio_N.html"   # writes data/studio/*.json + frontend logo
npm run seed                    # upserts into MongoDB
```

| Collection      | Contents |
|-----------------|----------|
| `parameters`    | 307 TLP parameters: bands (sex-split where needed), significance, per-band patient text, ranges, sources, re-test guidance, `review` flag |
| `clusters`      | 16 body systems with caption and optimal / borderline / attention stories |
| `packages`      | 69 catalogue packages (`_id` = catalogue name, `slug` for URLs) with parameter → cluster mapping |
| `rules`         | 86 cross-system pattern rules for the Integrated Read |
| `settings`      | `catalog` (source build, T&C) and `lab` (lab identity, signatories, LIS defaults — created once, never overwritten; no LIS secrets) |
| `parametermaps` | manual LIMS observation name → TLP id mappings |

## Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173 (proxies /api -> :5000; API_PROXY=… to override)
```

Open `http://localhost:5173/?visit=<visit no.>` or type the visit number. **Print / PDF** prints an A4 report.
