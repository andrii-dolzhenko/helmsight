# Text input and character-limit policy

## Goal

Preserve user-entered content, make length constraints understandable, and prevent
invalid records from reaching feature services. This policy must not change the
React + Vite + Redux Toolkit architecture or the asynchronous service boundary
reserved for future backend integration.

## Rules

1. Define limits in the owning domain module; do not duplicate hard-coded limits
   in presentation components or change existing product limits without review.
2. Display a live `current / maximum characters` counter on text fields where a
   counter has been implemented. Show it even when a validation message is present.
   Highlight the count when the limit is exceeded.
3. **Do not silently truncate** input or clipboard pastes with `maxLength` or slicing.
   Users may edit the full text; invalid values cannot be submitted.
4. Validate the same boundaries in the React form and again in the feature service.
   Show a field-level validation message for invalid values.
5. Test exact boundary values (maximum and maximum plus one), and keep min-length
   and list-count validations intact. Confirm that long inputs and saved drafts
   remain editable.
6. When a service trims outer whitespace on save, its UI counter must measure the
   **trimmed string** as well, to avoid disagreeing with validation. Counts use
   JavaScript string length (UTF-16 code units), matching the service logic.
7. Character counters and error messages must remain readable in Light, Dark,
   and System themes, on mobile viewports, and without browser-specific CSS.

## Implemented: Meeting Notes

Source of truth: `src/features/meetings/lib/meetingNotes.js`.

| Field | Minimum when entered | Maximum |
| --- | ---: | ---: |
| Title | 2, required | 140 |
| Owner | 2, required | 100 |
| Participant | 2, optional | 100 |
| Notes | 2, required | 5,000 |
| Decision | 2, optional | 400 |
| Follow-up | 2, optional | 400 |

Participants, decisions, and follow-ups each allow at most 30 nonempty items.
The form blocks invalid submissions; `meetingsService` independently enforces
these same constraints before writing to browser storage. Values are trimmed on
save. No backend or database is claimed or required by the current homework.

## Scope

Other existing feature forms retain their current, domain-specific limits and
validation behavior. The live counter is rolled out to **Meeting Notes first**;
extending it across Projects, Risks, Management Actions, Governance, or Reports
requires an individual UX and service-validation review so that no existing
limits, requirements, or business behavior change accidentally.
