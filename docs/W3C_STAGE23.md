# Stage 23 — isolate remaining two W3C CSS errors (no CSS changes)

After Stage 22 the production radar passes its smoke check, all 37 Node and
117 Vitest tests pass, and the validator reports 2 errors / 10 warnings for
ProjectOverviewPage. The two errors are: (a) a `background-image` value error
and (b) a literal `$esc.xml($error_msg)`. The second is **not** a usable
explanation of the underlying problem.

## Goal

Identify whether these messages are independently associated with the live
radar gradient and `@property --radar-wave-radius`, or with another gradient.
Do not change the animated radar simply to silence the validator.

## Run in the repository root

```sh
git apply --check ~/Downloads/HS23_W3C_Isolation.patch
git apply ~/Downloads/HS23_W3C_Isolation.patch
node scripts/w3c-project-overview-isolate.mjs --dry-run
node scripts/w3c-project-overview-isolate.mjs
```

The script uses the latest single `dist/assets/ProjectOverviewPage-*.css`
created by Stage 22. It sends the actual CSS and three temporary variants to
the official W3C SOAP validator, waiting at least 1.6 seconds between probes.
When needed, it sends three more fallback variants. It uses the existing
`validate()` function from `scripts/w3c-css-audit.mjs`, including error handling.

**It never writes to source CSS, production CSS, themes or JS files.** It only
writes:

- `w3c-audit/stage23-isolation.json`
- `w3c-audit/stage23-isolation.md`

`--dry-run` makes no remote requests and writes no reports.

## Return for review

Upload `stage23-isolation.md` and, if anything is inconclusive,
`stage23-isolation.json` plus the terminal output. Do not modify `@property`
or the live `background-image` until the differential W3C responses have been
reviewed. A W3C reduction after a temporary deletion proves only that the
deletion changes the validator result, not that the removed CSS was invalid.
