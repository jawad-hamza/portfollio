# Portfolio — Jawad Hamza

Everything here was generated from your actual project folders
(`Desktop\2`, `Desktop\work`, `Desktop\L-P folder`) plus your resume.

## What's in here

| File | What it is |
| --- | --- |
| `index.html` | The portfolio site — page shell only; everything else is rendered from data. |
| `assets/data.js` | **The single source of truth.** All 32 projects, experience, education, skills. |
| `assets/app.js` | The application: deployment map, filtering, command palette, lightbox, chart. |
| `assets/app.css` | Design tokens and every component, light + dark. |
| `Jawad-Hamza-Portfolio.pdf` | 22-page print portfolio. |
| `portfolio-artifact.html` | Generated single file (CSS, JS and images inlined) — what's published online. |
| `assets/img/` | 54 optimised JPEGs. `assets/shots/` holds the original PNGs. |
| `build_pdf.py` | Rebuilds the PDF. Run `python build_pdf.py`. |
| `build_project_pdfs.py` | Builds one case-study PDF per major project into `fiverr/`. |
| `fiverr/` | 11 per-project PDFs sized for a Fiverr gig gallery — see `fiverr/README.md`. |
| `assets/data.json` | Generated from `data.js` so the PDF builders share one source of truth. |

## How it works

The register, the deployment map, the filter chips, the command palette and the
technology chart are **all derived from `PROJECTS` in `assets/data.js`**. Add a
project there and it appears in every one of them — no HTML to touch.

Interactions built in:

- **Deployment map** — canvas node graph. Nodes are sized by scope, coloured by
  status, clustered by domain. Hover to see shared-technology links; click to jump
  to the record. Follows the active filter.
- **Command palette** — `Ctrl/Cmd + K`, fuzzy search over projects, technologies,
  sections and actions. Arrow keys, Enter, Esc.
- **Live filtering** — status, domain, technology and free text. Each chip shows
  how many entries it would leave *given the other active filters*.
- **Screenshot viewer** — click any capture; `←` `→` to move through that project's
  set, `Esc` to close. Neighbours preload.
- **Technology chart** — counted from the register at runtime, not hand-written.
  Click a bar to filter.
- **Keyboard** — `/` search, `G` register, `T` theme, `?` shortcuts, `Esc` clears.

Entries with no screenshot render as compact cards instead of full records, so no
row is ever left with a dead column.

## Rebuilding the published single file

`portfolio-artifact.html` is generated — don't edit it by hand. It is `index.html`
with `app.css`, `data.js`, `app.js` and every `assets/img/*.jpg` inlined
(images as base64 data URIs).

## Where the screenshots came from

Real captures, not mockups:

- **Vendora POS/IMS**, **Genetic Research LIMS**, **Restaurant MS** — I started each
  Django server locally, signed in, and captured the live pages.
- **FutureSpace**, **DevCore** — served the built site over a local HTTP server so the
  WebGL and particle heroes rendered before capture.
- **Apex Unify**, **Jinnah Motors**, **Havenworks**, blood-drive sites, learning-lab
  projects — captured from the static builds.
- **Nexus AI**, FutureSpace responsive QA — your existing PNGs in `OSIMA\`.

Three temporary admin accounts (`pf_shot_tmp`) were created in the local dev
databases to reach the signed-in pages. **All three were deleted afterwards** —
POS, LIMS and RMS are back to the users they had before.

Two systems have no screenshots because they need SQL Server to boot
(**Blood Bank MS** and **DHQ HMIS**). Instead of faking them, both are shown as
module maps built from their real controller and area names.

## Updating it

- **Text or layout:** edit `index.html`, then regenerate the shareable copy:
  it is just `index.html` with `assets/img/*.jpg` replaced by base64 data URIs.
- **PDF:** edit `build_pdf.py` and re-run it.
- **New screenshots:** drop a PNG in `assets/shots/`, then re-run the optimiser
  (resize to 1280px wide, save as JPEG q82 into `assets/img/`).

## A few things worth checking

The content is drawn from your resume and READMEs, so please verify:

1. **Dates.** Your resume lists MUST University as Sep–Dec 2025 and FutureSpace as
   Oct 2025–Jul 2026. Those overlap; I reproduced them as written.
2. **"20+ systems" and "4 live deployments"** in the stats strip — my count from the
   folders. Adjust if you'd put it differently.
3. **DHQ HMIS** — I described your role as "contributing developer", per the resume.
4. **Client names.** Prof. Sundas Farooq, RBC Mirpur, DHQ Hospital and QAU are named.
   Remove any that shouldn't be public.
5. **Video work** is described in general terms — no client footage is included.
