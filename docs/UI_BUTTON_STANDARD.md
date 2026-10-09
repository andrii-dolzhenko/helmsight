# Workspace Button Standard (HW-15)

## Scope

Shared across HelmSight workspace pages, project sections, editors, and forms.
Navigation tabs, icon-only affordances, inline text links, destructive confirmation dialogs, and branded marketing/dashboard hero CTAs retain purpose-specific treatment.

## Semantic roles

| Role | Usage | Light theme | Dark theme |
| --- | --- | --- | --- |
| `primary` | Main create/save action within a page or form | Dark filled / light text | Light filled / dark text |
| `secondary` | Cancel, edit, open, supporting action | Surface fill, neutral border | Dark surface fill, neutral border |
| `danger` | Delete, archive, destructive actions | Surface with danger text/border | Surface with theme danger text/border |

- Default: `min-height: 2.75rem` (44px), `font-size: .875rem` (14px), `font-weight: 800`, `line-height: 1.25`, pill radius, horizontal centered alignment.
- Dense row actions may use `data-ui-size="sm"` (36px minimum height / 12.48px font), deliberately distinct from page-level CTAs.
- Interactive `:hover`, `:focus-visible`, `:disabled` states are shared and use theme tokens from `global.css`.
- Native `<button>` and React Router `<Link>` use the same visual contract via `data-ui-button`.

## Implementation

`src/shared/styles/actionButtons.css` contains the canonical action rules. JSX opts in with `data-ui-button="primary|secondary|danger"`; optional `data-ui-size="sm"` is reserved for contextual row actions. Leave local CSS Modules in place for layout, responsive widths, and specialised controls; avoid adding new role-specific overrides to modules. When adding a new shared action, reuse the semantic role rather than copy CSS.

## Exceptions

`LandingPage` and the Projects hero are branded marketing surfaces and retain their bespoke CTAs. Tabs, view-mode toggles, segmented controls, and compact icon buttons encode navigation or state rather than actions; they are not styled as CTAs. Accessibility: keep visible focus state and respect disabled semantic state.

## Heading / action placement (workspace pages)

- Shared implementation: `src/shared/styles/pageHeadings.css`, imported once by `src/main.jsx`.
- Put the eyebrow above `data-ui-page-title-row`; put the description **below** the row, not inside the same left-hand flex column. Apply `data-ui-page-header` to the outer header.
- `data-ui-page-title-row` contains an `h1`/`h2` and its page-level action or action group. Both are vertically centered in the same grid row; actions remain right-aligned on wide screens.
- All page titles use `--ui-page-title-size`, `--font-display`, one font weight, line-height and tracking. This is intentionally scoped to page titles; card and panel heading hierarchy stays unchanged.
- Header grids must explicitly reset legacy `justify-content: space-between`, otherwise auto-sized tracks place actions next to the title and squeeze the description. Descriptive text spans the full container width below the title row.
- At widths <= 760px, actions move below the title, stay right-aligned, and avoid collisions. Keep native button/link semantics, focus states and theme tokens; do not align with transforms or page-specific offsets.
- Governance's Project Charter / Stakeholder Register / Communication Plan controls are section navigation, right-aligned alongside the Governance title on wide layouts. Governance status badges move below the header, directly above the Project Charter section. On small phones, the navigation row scrolls horizontally to keep all three destinations accessible.
- Governance card edit/add controls use `data-ui-section-title-row` to align with the `h3`, not the section description. Inline row controls and brand CTAs are exempt.
- Pages covered: Projects, Overview, Governance, Success Criteria, Milestones, Risks, Metrics & EVM, Reports, Meeting Notes and Action Register.
