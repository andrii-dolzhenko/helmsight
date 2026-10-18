# HelmSight — rendered HTML QA (ADR-059)

Status: **PASS — W3C HTML 47/47, 0 errors, 0 warnings, 0 unverified** (2026-10-18).
This is the HTML validation gate only, **not overall release approval**.
CSS regression review and interactive-state QA have separate acceptance criteria.

## Verified HTML result — 2026-10-18

The **official Nu Html Checker**, hosted locally on the owner's Mac and accessed
through `http://127.0.0.1:8888/?out=json`, validated the saved HTML from all 47
rendered route templates after HTML Fix Batches A and B (including readiness
hotfixes). This avoided public endpoint HTTP 429 without suppressing diagnostics.

| Gate / evidence | Verified result |
| --- | --- |
| Chromium full-route capture | **47/47 CAPTURED** |
| Nu HTML validation | **47/47 VERIFIED**, 0 issues, 0 unverified |
| Raw Nu diagnostics | **0 errors / 0 warnings / 0 informational** |
| HTML gate | **PASS — W3C HTML 0/0** |
| HTML QA Node suite | **38/38 PASS** (final local endpoint patch) |
| Vitest | **438/438 PASS** |
| Combined Node QA suite | **117/117 PASS** |
| ESLint / Vite production build / radar production check | **PASS** |
| W3C CSS Normal (39 assets) | **0 errors / 425 warnings** |
| W3C CSS Extended (39 assets) | **0 errors / 4256 warnings** |
| CSS warning delta | **NO PER-ASSET REGRESSION** (ADR-042 baseline) |

Full capture: `2026-10-17T19:43:39.462Z`. Nu validation:
`2026-10-18T07:30:19.169Z`. Capture report records Git HEAD
`5e6bc1ecf0853c239069207243aca9f51f4ccfa9` **before these uncommitted
HTML QA changes are committed**. Integrity checks bind the report to the actual
snapshot SHA-256 hashes, build fingerprint, route inventory and capture manifest;
Git HEAD alone is not the content proof. After a commit changes HEAD, an old
`--report-only` result is not evidence for a new capture/build state; follow the
normal recapture and revalidation workflow if fresh release evidence is required.

The successful `--report-only` check reproduced the complete 47/47 0/0 result
without making network calls. Raw per-route Nu messages are stored in ignored
`w3c-audit/html/w3c-all.json`; the human-readable report is
`w3c-audit/html/w3c-all.md`. Generated snapshots/reports are **not committed**.
The HTML gate covers initial page renders, not all interactive states or release
readiness. CSS zero-error and no-regression gates pass, but raw CSS 0/0 is **not**
met; review warning policy under ADR-042. Neither QA script grants release
approval by itself.

## Reproduce on macOS without Docker or a system JDK

The official `vnu.osx.zip` distribution includes its own Java runtime. To install
and run the local Nu Checker, open **terminal A**:

```bash
mkdir -p ~/Downloads/helmsight-vnu
curl -fL --retry 2 -o ~/Downloads/helmsight-vnu/vnu.osx.zip \
  https://github.com/validator/validator/releases/download/latest/vnu.osx.zip
unzip -q ~/Downloads/helmsight-vnu/vnu.osx.zip -d ~/Downloads/helmsight-vnu

~/Downloads/helmsight-vnu/vnu-runtime-image/bin/java \
  -Dnu.validator.servlet.bind-address=127.0.0.1 \
  nu.validator.servlet.Main 8888
```

Keep terminal A open. In **terminal B**, confirm both port and JSON POST:

```bash
lsof -nP -iTCP:8888 -sTCP:LISTEN
printf '<!doctype html><html lang="en"><head><title>Test</title></head><body><h1>Test</h1></body></html>' \
  | curl --fail-with-body -sS -H 'Content-Type: text/html; charset=utf-8' \
      --data-binary @- 'http://127.0.0.1:8888/?out=json'
```

Expect an HTTP success and a JSON `messages` array. With the **47/47 capture
already completed**, run a new endpoint-specific audit:

```bash
HELMSIGHT_HTML_NU_ENDPOINT='http://127.0.0.1:8888/?out=json' \
  npm run qa:html -- --all
HELMSIGHT_HTML_NU_ENDPOINT='http://127.0.0.1:8888/?out=json' \
  npm run qa:html -- --report-only
cat w3c-audit/html/w3c-all.md
```

If a prior **local-endpoint** run was interrupted, use `--resume-all` in place of
`--all`, preserving the same `HELMSIGHT_HTML_NU_ENDPOINT`. Do not rebuild,
recapture or switch capture modes before resuming/report-only. Public Nu results
must never be merged with local Nu evidence. In the successful 2026-10-18 run,
`--resume-all` completed the 47/47 check after the earlier local attempt was
UNVERIFIED because no server was listening; `--report-only` then confirmed PASS.

## Scope

The route inventory contains 47 rendered React Router leaf templates.
`src/app/router/router.htmlQa.test.jsx` checks the inventory against the router.
Stage 1 originally covered five smoke routes; the completed Stage 2 captures all 47,
and Stage 3 validates those snapshots with the official Nu Html Checker.
Only the **initial rendered state per route** is covered. Alternate user interactions,
modals, invalid/empty/archive states, themes and viewports require separate QA.

## Install and run locally (macOS)

After the changes to `package.json` and `package-lock.json` are present, use
a Node version compatible with the project's `engines` field:

```bash
npm ci
npx playwright install chromium
npm run qa:html:test
npm run lint
npm run test:run
npm run qa:html:capture
cat w3c-audit/html/all.md
```

`@playwright/test` is the only new devDependency; Chromium is the only browser
needed for capture. `npm ci` is appropriate when the matching lockfile is
present. Capturing HTML does **not** itself validate it. See the local Nu Checker
procedure above for a complete validation run.

The smoke command builds Vite with `--base=/helmsight/`, runs a loopback-only production preview on an ephemeral port, launches isolated Chromium contexts with synthetic demo/lesson records, waits for per-route content, and records `w3c-audit/html/smoke.json`, `smoke.md` and `.html` snapshots. The repository's existing `w3c-audit/` ignore rules should keep all generated documents out of Git. Verify `git status -sb` before committing.

## Interpreting results

- `CAPTURED — NOT W3C VALIDATED`: in the historical five-route smoke, all five documents were rendered and fingerprinted; **this is not a W3C pass**.
- `UNVERIFIED`: timeout, missing content, missing fixture, page exception, incomplete snapshot or failed preview. Exit status nonzero; inspect `smoke.md` and browser diagnostics.
- Stage 1 made no W3C Nu HTTP requests or HTML error/warning claims. See the current full-route gate above.
- Existing CSS QA baseline is not modified. Browser context isolation prevents access to the owner's regular browser data. The synthetic lessons fixture is QA-only and never written into the source application's seed data.

## Implementation history and remaining scope

Stages 1–3 have completed route inventory, 47/47 browser capture and Nu JSON
validation with bounded retry/resume. The archived stage notes below explain the
implementation and original failure modes. Interactive-state coverage (forms,
modals, invalid IDs, empty/archived states, viewport/theme variants) remains
separate follow-up work. `npm run qa:html -- --full` is not implemented; the
capture and validation commands remain intentionally separate.

Do not stage or alter `docs/ROADMAP_INVENTORY.md`.

## Stage 2 — full route capture (implementation history, ADR-059)

Stage 1 smoke remains available and unchanged:

```bash
npm run qa:html:smoke
```

Stage 2 captures the full route inventory without calling W3C:

```bash
npm run qa:html:test
npm run test:run
npm run qa:html:capture
cat w3c-audit/html/all.md
```

The `--all` mode uses individually reviewed route readiness markers, the stable
`demo-project` record IDs and an isolated synthetic Lesson fixture. The report-new
route uses `?periodEnd=2026-10-09` to enter a deterministic new-report state.
Each route is opened in a fresh Chromium browser context; no credentials or real
browser storage are loaded. In addition to readiness markers, editor routes must
render a form. Missing records, redirects, uncaught errors, startup failures and
capture timeouts are marked `UNVERIFIED` and yield a nonzero exit code.
Previously captured HTML for a route is removed before each recapture, so a
failure cannot silently reuse an earlier snapshot.

Expected output files: ignored `w3c-audit/html/all.json`, `all.md` and the 47
per-route `.html` snapshots. The full report includes the Git HEAD, route paths,
SHA-256 hashes, captured counts, errors and verification status. **Even 47/47
CAPTURED is not HTML W3C validation**. Missing routes, interactive states and
Nu-validator results remain separate acceptance gates. If capture fails, review
`UNVERIFIED` entries with the current JSX and fixtures; do not weaken selectors
merely to produce a green count.

No additional dependency is needed beyond `@playwright/test` from Stage 1.
Do not stage or modify `docs/ROADMAP_INVENTORY.md`.

### Stage 2 focused Risk Editor readiness correction

The current `ProjectLayout` single-segment `/risks/:segment` detection also puts
`/projects/demo-project/risks/new` into the focused layout. The initial Stage 2
readiness selector incorrectly expected the full workspace tabs wrapper and
therefore reported 46/47 `CAPTURED`. For this *one* route, the capture now requires
the actual `New risk` editor heading and its own visible form, regardless of the
workspace wrapper. This was a QA-only readiness correction; no product layout or routing behaviour
was changed by that earlier fix. **Final W3C status is PASS** (see verified
result above). Later Batch A/B HTML semantic changes have their own tests.

## Stage 3 — W3C Nu validation of saved rendered HTML (ADR-059)

The owner's final Chromium capture on 2026-10-17 reached **47/47 CAPTURED**.
Capture alone is not conformance evidence; Stage 3 adds Node-based Nu validation
against either the public or the official locally hosted endpoint, with no
additional npm dependency.

### Important: snapshot order and stale report protections

The five smoke routes and corresponding full-route captures use the **same**
per-route HTML filenames. Every capture overwrites those snapshots; therefore
**validate each capture immediately**, before starting a different capture mode.
The validator checks SHA-256 of every expected snapshot, manifest coverage, Git
HEAD and the current `dist/index.html` build hash *before any remote request*.
Incomplete or stale results fail closed. A **new** `--smoke` or `--all` audit
replaces the corresponding report with a fail-closed checkpoint. `--resume-smoke`
and `--resume-all` instead verify and retain the existing report and update it
after each completed route; see the retry/resume section below.

### Small five-route validation first

```bash
npm run qa:html:test
npm run qa:html:smoke
npm run qa:html -- --smoke
cat w3c-audit/html/w3c-smoke.md
```

`--smoke` POSTs five captured synthetic documents sequentially to the official
`https://validator.w3.org/nu/?out=json` endpoint. It saves complete raw
per-route messages to ignored `w3c-audit/html/w3c-smoke.json` and a Markdown
summary to `w3c-smoke.md`.

A nonzero exit may indicate real HTML errors/warnings (`ISSUES`) or a validation
transport/coverage failure (`UNVERIFIED`); **inspect the report rather than
silencing warnings**. HTTP 429, 408 and 5xx receive bounded retries. W3C
response failures never count as zero errors.

### Complete 47-route validation

Once the five-route transport works and diagnostics are reviewed, recapture
all routes because smoke refreshed some shared snapshot files:

```bash
npm run qa:html:capture
npm run qa:html -- --all
cat w3c-audit/html/w3c-all.md
npm run qa:html -- --report-only
```

The full run has a delay between HTTP requests to avoid hammering the public
validator. `--report-only` **does not use the network**; it rechecks the current
47 HTML files and build/commit hashes against the saved complete W3C response.
It does not recreate a missing or stale report and fails nonzero if 0/0 is not
met. `--full` is **not** yet implemented as one automatic capture + validation
command; capture and validate remain explicit independent stages.

Reported states:

- `VALIDATED`: W3C responded with zero `error` and zero warning-subtype messages.
- `ISSUES`: W3C returned at least one genuine HTML error/warning; exact raw
  messages, locations and totals are preserved for triage.
- `UNVERIFIED`: missing/changed capture, Nu outage, invalid response, timeout,
  or otherwise incomplete evidence; never interpreted as 0/0.

The result is limited to initial rendered documents of 47 *leaf route templates*,
not all interactive states. Modal, invalid form, empty/archived and alternative
viewport/theme states require a separately reviewed follow-up matrix. The
validator sends only synthetic isolated demo HTML — never the owner's real
browser profile, credentials or user data. No HTML success implies independent
CSS, visual, accessibility or release approval.

Do not commit the generated `w3c-audit/html` snapshots. Do not add or touch
`docs/ROADMAP_INVENTORY.md`.

## Stage 3 follow-up — bounded Nu retry/resume (ADR-059)

The W3C public endpoint may respond with **HTTP 429**. A 429 is **not** an
HTML error and never counts as verified 0/0. The validation CLI now supports
explicit resume modes without a new Chromium run:

```bash
# Only after a successfully captured and partially validated five-route smoke:
npm run qa:html -- --resume-smoke
cat w3c-audit/html/w3c-smoke.md

# Only after a successfully captured and partially validated full 47-route run:
npm run qa:html -- --resume-all
cat w3c-audit/html/w3c-all.md

# Verify the saved full report without network access:
npm run qa:html -- --report-only
```

**Do not run `qa:html:smoke` or `qa:html:capture` immediately before resume.**
The capture must match its existing W3C report and snapshots **exactly**:
mode, route inventory, Git HEAD, `dist/index.html` SHA-256, each HTML snapshot
SHA-256 and the recorded capture timestamp. The existing report is validated
*before* contacting W3C or overwriting evidence. Old full-route validation
from a build **before HTML Fix Batch A** is not reusable against a later
capture/build. It is correct for `--resume-all` to reject this mismatch.

A resumed run reuses all existing `VALIDATED` **and** `ISSUES` diagnostics
unchanged; only `UNVERIFIED` routes are requested again. Re-requesting pages
that already reported genuine W3C warnings would erase their original evidence
and waste rate-limited requests, so this is intentionally forbidden. Changing
JSX or CSS requires a new build, capture and fresh W3C run, **not** resume.

Both initial and resumed runs create a complete, fail-closed JSON checkpoint
before sending requests and replace it atomically after **each** completed
route. Unattempted routes remain `UNVERIFIED` with `PENDING` reasons. An
interrupted run can therefore be resumed without re-requesting completed
routes. JSON is the canonical generated report; Markdown is derived from it.
The validator waits between requests, retries 429 with bounded backoff, and
respects a server `Retry-After` minimum when it fits within a **30-second
per-retry limit**. Longer instructions are reported as `UNVERIFIED` for a later
manual resume, rather than stalling or retrying too soon. If W3C still returns
429 after its bounded retry budget, the current route stays `UNVERIFIED` and
**no further routes** are submitted in that execution. Wait for the service's
cooldown before resuming again; repeated immediate reruns are discouraged.

A nonzero exit code after resume is expected if any routes remain `UNVERIFIED`
or if any verified route contains actual W3C errors/warnings. The HTML 0/0
release gate is **not** relaxed; CSS QA and interactive-state checks remain
independent. Generated reports stay inside ignored `w3c-audit/html/` and must
not be committed. Do not stage or edit `docs/ROADMAP_INVENTORY.md`.

## Local Nu checker fallback for public HTTP 429 (ADR-059)

If `https://validator.w3.org/nu/?out=json` consistently returns HTTP 429,
use the **official** Nu Html Checker on `127.0.0.1` instead of repeatedly
retrying the shared public service. This runs the same type of HTML checker,
not a replacement parser or a suppression of W3C warnings.

With Docker installed, start the server in a **separate terminal**:

```bash
docker run --rm -p 127.0.0.1:8888:8888 ghcr.io/validator/validator:latest
```

Confirm JSON POST support without touching the saved capture/report:

```bash
printf '<!doctype html><html lang="en"><head><title>Test</title></head><body><h1>Test</h1></body></html>' \
  | curl --fail-with-body -sS -H 'Content-Type: text/html; charset=utf-8' \
      --data-binary @- 'http://127.0.0.1:8888/?out=json'
```

On a **different terminal**, after a confirmed 47/47 capture, run:

```bash
HELMSIGHT_HTML_NU_ENDPOINT='http://127.0.0.1:8888/?out=json' npm run qa:html -- --all
```

`--all` begins a *new* endpoint-specific validation report. An existing
public report will be replaced; archive it separately first if it contains
useful verified diagnostics. In the original 0/47 HTTP-429 public report, no public
validation results existed to reuse. If the local service becomes unavailable,
continue **only** with the same environment variable:

```bash
HELMSIGHT_HTML_NU_ENDPOINT='http://127.0.0.1:8888/?out=json' npm run qa:html -- --resume-all
HELMSIGHT_HTML_NU_ENDPOINT='http://127.0.0.1:8888/?out=json' npm run qa:html -- --report-only
```

Never build, recapture, or switch to smoke between these commands: snapshot
hashes must match the saved report. The only permitted endpoint override is
`http://127.0.0.1:8888/?out=json`; other URLs fail closed before requests.
The public URL remains the default when the environment variable is unset.
The JSON report records which endpoint produced results and rejects
cross-endpoint resume, because remote and local reports must not be mixed.
The 47/47, 0 errors, 0 warnings requirement remains unchanged. Any Nu
checker deployment/version differences should be recorded when reviewing QA.

Do not commit generated `w3c-audit/` reports. Do not touch
`docs/ROADMAP_INVENTORY.md`.
