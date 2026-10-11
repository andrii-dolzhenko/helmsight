# Stage 21 — Radar standards-mask longhands (controlled pilot)

## Evidence and scope

The user-submitted Stage 20 W3C isolation reports for the `ProjectOverviewPage-BZ1rLveF.css` production chunk, profile `css3svg`, normal `warning=1`, establish:

- `radar`: the full `.radarPulse` rule returned **1 error / 1 warning**; dropping its other declarations reduced the failure to the standard `mask` shorthand alone (**1 error / 0 warnings**). Diagnostic: `Too many values or values are not recognized`.
- `remaining`: after removing that radar rule **only in-memory**, the stylesheet still returned **2 errors / 6 warnings**. A separate reduction identified a surviving `@property --radar-wave-radius` at-rule (**1 error / 0 warnings**).
- The most recent **full production audit** remains **17/26 assets at 0/0**, with **3 recorded errors and 46 warnings**; no new production audit has yet verified this change.
- A third error remains to be isolated after the mask and registered property are accounted for (Stage 17 had independently identified the `.indexGauge` multi-layer gradient as an isolated W3C error).

The W3C failure of the `@property` at-rule is **not evidence of invalid modern CSS**: registration with `syntax: '<percentage>'`, `inherits: false`, and `initial-value: 8%` is a modern standards-based way to make CSS variables interpolate smoothly. We **do not remove or relocate it** merely to please an older validator profile.

## Change

Change only the *standards-based* declaration in the primary `.radarPulse` rule from the single `mask` shorthand to **four equivalent longhand declarations**:

```css
mask-image: url('../../shared/assets/signal-radar.svg');
mask-position: center;
mask-size: contain;
mask-repeat: no-repeat;
```

Keep the original `-webkit-mask` fallback byte-for-byte identical for Safari/WebKit. Defaults not specified by the previous mask shorthand (`mask-origin`, `mask-clip`, `mask-composite`, `mask-mode`) remain at their defaults. Preserve the SVG asset, mask dimensions and alignment, live gradient, `@property` registration, 30-second pulse animation, reduced-motion rules and all UI code.

This is a **hypothesis to validate against W3C**, not a guaranteed fix. Vendor warnings for `-webkit-mask` remain expected, and the unchanged `@property` error may persist.

## Apply and verify (from project root)

```sh
git apply --check ~/Downloads/HS21_Radar_Mask.patch
git apply ~/Downloads/HS21_Radar_Mask.patch
git diff --check
npm run w3c:preview:test
npm run check
npm run w3c:audit
```

In `w3c-audit/summary-normal.md`, compare `ProjectOverviewPage-*.css` to Stage 19 (**3 errors / 7 warnings**). Send `summary-normal.md` plus the terminal log. If W3C errors do not decrease, do not claim success or start replacing other CSS properties without new isolated evidence.

## Browser QA

After `npm run preview`, inspect Project Overview on desktop Light and Dark and check the 30-second radar pulse. Confirm that the SVG shape, center alignment and radial wave remain visible and animated. Check that prefers-reduced-motion suppresses animation as before, and test the narrow layout. Do not judge animation accuracy from a single static screenshot.

Do not re-run Stage 20's original minimizers against previous hashes for evidence after changing CSS. When ready, run `npm run w3c:repro -- --only=ProjectOverviewPage --max=24` if more W3C errors persist; it can localize one surviving error at a time.
