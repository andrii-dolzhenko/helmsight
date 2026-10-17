# P2 — Auth UI Prototype

Status: implementation candidate for `feature/p2-auth-ui` (ADR-043, ADR-053, ADR-056).

## Purpose and boundaries

The four auth routes are interface previews, not an authentication system. HelmSight continues to run on browser-local project and profile data. Forms perform local validation, but do not transmit credentials, create accounts, verify passwords, issue tokens, persist credentials or protect workspace routes. Recovery forms never send email or reset passwords. Google and GitHub buttons are visible demo-only placeholders, not OAuth integrations. No `Remember me` or fabricated legal agreements.

## Routes and landing actions

| Route | Purpose |
| --- | --- |
| `/sign-in` | Email/password preview; Google/GitHub placeholders; recovery and registration links |
| `/sign-up` | Full name, email, password and confirmation preview; social placeholders |
| `/forgot-password` | Email validation with honest no-email-sent outcome; links to reset preview |
| `/reset-password` | New password and confirmation demo; no token or account verification |
| `/overview` | Existing freely accessible Demo Workspace, without route guard or fake session |

Landing `Sign in` links to `/sign-in`; `Get started` links to `/sign-up`; `Open Demo Workspace` still links directly to `/overview`. The Auth layout sits outside `AppLayout` and uses existing HelmSight branding and landing artwork. CSS Modules scope form styles, including Light/Dark surface treatments. No new libraries are required; React Hook Form and existing Router provide validation and navigation.

## Form behavior and security claims

- Required email validation with address syntax; password minimum 8 characters; name minimum 2 non-whitespace characters; repeated passwords must match.
- `noValidate` avoids conflicting native browser errors; visible field errors use `aria-invalid`, `aria-describedby` and `role="alert"`.
- Password visibility toggles are keyboard accessible, with exposed show/hide state.
- Valid preview submissions clear form contents and show a `role="status"` notice explicitly saying that no real authentication, account creation, email delivery or password change occurred.
- Provider buttons display a `coming soon` notice with a distinct link to Demo; they never perform a network authorization request.
- No auth Redux slices, auth services, JWT handling, storage keys, backend endpoints or OAuth client credentials are added.
- `Exit workspace` continues to mean navigation to the public Landing Page, not logout.

## Manual acceptance checklist

- Confirm all 4 direct routes and browser refresh, including GitHub Pages basename and Vercel rewrites.
- Verify desktop MacBook Air, iPad Mini 768px, iPhone 16 Pro Max 440px, and 320px minimum; no overflow, cropped controls or obstructed form labels. The Auth layout keeps the left narrative at a consistent start position; all form actions remain reachable with validation errors or reduced viewport height (normal page scrolling when needed).
- Verify Light, Dark and System theme, visible keyboard focus, links, error messages, password reveal controls, and reduced-motion preference. Auth route content uses a short entrance transition only when motion is allowed.
- Verify social placeholders, invalid/valid form flows, reset-preview link and always-available Demo navigation; no credentials persist in browser storage.
- Run `npm run check`, W3C CSS normal/all-warning audits across every production stylesheet, HTML validation for relevant states, and Vercel Preview smoke tests.
- Do not commit, push or merge before owner visual/functional approval. Frontend Feature Freeze follows a separately accepted and merged Auth UI PR.
