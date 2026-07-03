# Meera v2

This repository is the isolated workspace for Meera v2: a smoother, mobile-first refresh of Meera's Cozy Kitchen.

## Status

V2 now contains the working Next.js app copied from v1 and refactored for faster perceived UX. V1 remains frozen in the parent folder.

## Version Boundary

The parent folder contains Meera v1. V1 is considered complete and frozen. Future work should happen here in `v2/` so v1 stays stable as a finished baseline.

## Rationale

Keeping v2 in a separate folder and repository gives the project a clean history, independent deployment path, and a clear rollback boundary. It also lets future work copy useful v1 patterns without creating accidental changes in the original site.

## Decisions

- Use `v2/` as the only editable product workspace for the next version.
- Keep this repo independent from the parent v1 Git repository.
- Use Next.js, TypeScript, Tailwind CSS, Zod, and the existing Apps Script proxy pattern.
- Render public catalog pages instantly from local defaults, then refresh from the sheet after hydration.
- Keep Apps Script as the backend source of truth while making admin edits optimistic in the browser.
- Store expense quantity in the v2 ledger contract; existing sheet rows default to quantity `1`.
- Save ledger unit amounts separately from quantity, so multi-quantity expenses are not multiplied twice in reports.
- Show ledger row totals in the admin finance list, so multi-quantity entries match the report totals Meera sees above.
- Trim copied Apps Script catalog IDs before estimating submitted orders, so Sheet-managed prices do not save as zero.
- Respect product-scoped Apps Script add-ons when estimating submitted orders, so stale direct submissions cannot price hidden options.
- Reject unsupported order statuses before Sheet mutations run, so admin writes cannot poison finance/order summaries.
- Normalize copied order status casing before Sheet mutations run, so admin write payloads stay aligned with live read normalization.
- Normalize copied admin API enum casing before Sheet mutations run, so direct status, ledger type, and offering category writes stay canonical.
- Normalize copied Apps Script ledger type and offering category casing before Sheet writes, so direct deployed mutations stay aligned with the app boundary.
- Treat copied blank catalog text as missing before Apps Script writes, so product IDs and offering links keep their safe defaults.
- Reject non-boolean order flags before Sheet mutations run, so copied direct writes cannot pin or heart orders accidentally.
- Reject non-boolean catalog toggles before Sheet mutations run, so copied direct writes cannot enable hidden menu rows accidentally.
- Reject non-boolean catalog upsert enabled values before Sheet mutations run, so copied editor payloads cannot enable hidden menu rows accidentally.
- Reject non-number or negative catalog upsert prices before Sheet mutations run, so copied editor payloads cannot zero or invert menu pricing accidentally.
- Reject inverted catalog price ranges before Sheet mutations run, so public quotes do not show impossible low/high totals.
- Reject non-integer catalog sort orders before Sheet mutations run, so copied editor payloads cannot reorder menu rows ambiguously.
- Reject non-string catalog text values before Sheet mutations run, so copied editor payloads cannot save object-shaped menu labels.
- Reject unsupported offering categories before Sheet mutations run, so copied editor payloads cannot create invisible menu rows.
- Reject malformed catalog upsert payloads before Sheet mutations run, so copied row containers cannot fall through to field defaults.
- Reject unsupported ledger entry types before Sheet mutations run, so finance totals cannot silently drop malformed rows.
- Reject non-number ledger amounts and quantities before Sheet mutations run, so copied finance payloads cannot save zeroed or fallback totals.
- Reject negative ledger amounts before Sheet mutations run, so copied expense rows cannot invert finance totals.
- Reject non-string ledger text values before Sheet mutations run, so copied finance payloads cannot save object-shaped dates or order links.
- Reject fractional ledger quantities before Sheet mutations run, so copied finance payloads cannot save partial expense counts.
- Reject malformed ledger entry payloads before Sheet mutations run, so copied finance containers cannot fall through to field defaults.
- Reject blank admin mutation IDs before Sheet mutations run, so direct deletes and patches cannot silently no-op or target stringified copied values.
- Reject malformed top-level Apps Script POST payloads before secret checks or setup run, so copied containers fail at the request boundary.
- Accept legacy Apps Script ledger rows without quantity, then normalize them to `1`, so upgraded sheets keep loading finance data.
- Normalize copied fractional ledger quantities to `1`, so manual Sheet edits cannot create partial-count finance totals.
- Normalize copied negative ledger amounts to `0`, so manual Sheet edits cannot invert finance totals after write-side validation.
- Normalize copied ledger type casing, so manual Sheet edits cannot hide valid income or expense rows.
- Normalize copied catalog category casing, so manual Sheet edits cannot hide valid add-ons, flavours, or cake sizes.
- Normalize copied catalog product ID casing, so manual Sheet edits cannot hide product-scoped add-ons or custom products.
- Normalize live Sheet ledger text before finance reports and CSV exports use it, so copied dates and order IDs stay visible in monthly totals.
- Normalize copied live order estimate ranges, so manual Sheet edits cannot invert confirmed-order finance totals.
- Normalize copied order estimates inside finance summaries too, so direct report inputs cannot invert confirmed potential.
- Normalize copied order dates inside finance summaries too, so direct report inputs cannot hide confirmed potential.
- Normalize copied order status casing inside finance summaries too, so direct report inputs cannot hide confirmed potential.
- Default finance reports to the selected month, initially the current month.
- Validate inquiry pickup dates as real calendar days before applying the seven-day notice rule, so impossible `YYYY-MM-DD` strings cannot pass as future dates.
- Build inquiry summaries from the live public catalog when it is available, so Sheet-managed products and flavours keep their customer-facing labels and quote ranges in emails, Apps Script rows, and the payment-instructions page.
- Include selected add-ons in inquiry summaries, so Sheet-backed quote extras stay visible in emails, Apps Script rows, and payment instructions.
- Ignore copied add-ons scoped to another product inside inquiry summaries, so stale direct callers cannot display or price hidden options.
- Include selected add-ons in deployed Apps Script fallback summaries too, so direct Sheet submissions keep quote extras visible.
- Omit cake-size copy from non-cake inquiry summaries, so Sheet-managed dessert products do not show irrelevant `Not selected` rows.
- Reuse that live-catalog inquiry summary when Apps Script falls back to Resend, so failed sheet writes do not send stale default product labels.
- Build the browser's pre-submit copyable summary from the same live catalog as the estimate, so customers do not copy stale default menu labels after a Sheet refresh.
- Hide offerings attached to disabled products in the public catalog, so retired Sheet products do not leave stray add-ons or options on customer-facing pages.
- Filter impossible public catalog price ranges and fractional sort orders during server catalog mapping too, so fallback API output stays aligned with live/cache validation.
- Treat malformed live Apps Script admin data as a fallback condition, so public catalog refreshes do not crash when a sheet or script response is incomplete.
- Validate live Apps Script row shapes before accepting admin data, so malformed product labels cannot crash public catalog mapping.
- Reject blank live catalog row IDs and labels too, so Sheet whitespace cannot publish empty customer-facing menu options.
- Reject impossible live catalog price ranges before accepting admin data, so manual Sheet price edits cannot reach admin or public consumers.
- Trim Sheet-backed catalog IDs, labels, product links, and servings before public mapping, so copied admin cells cannot break menu selection or pricing lookups.
- Normalize copied Sheet offering categories before public mapping, so valid add-ons, flavours, and cake sizes do not disappear after cell edits.
- Treat non-object Apps Script JSON responses as request failures, so null proxy bodies do not leak raw TypeErrors into catalog or inquiry flows.
- Treat malformed public catalog responses or cached browser catalog data as a local-default fallback, so an incomplete refresh cannot poison the customer menu cache.
- Validate cached and live public catalog row shapes before using them in the browser, so malformed Sheet snapshots cannot break customer menu rendering.
- Reject cached and live public catalog rows with impossible price ranges, so negative Sheet prices cannot reach customer menus.
- Reject cached and live public catalog rows with fractional sort orders, so copied Sheet snapshots cannot reorder menu rows ambiguously.
- Normalize cached and live public catalog text before browser consumers use it, so old Sheet snapshots with copied whitespace do not break menu selection.
- Cache only live Sheet-backed public catalog responses, so temporary server fallbacks do not pin stale customer menus.
- Drop selected add-ons that disappear after a live catalog refresh, so stale Sheet options are not submitted silently.
- Reject unavailable catalog IDs at the inquiry API boundary too, so stale direct submissions cannot save hidden menu options.
- Reject malformed direct Apps Script inquiry payloads before Sheet appends, so copied customer fields cannot save object-shaped order text.
- Reject malformed direct Apps Script inquiry summaries before Sheet appends, so copied fallback summaries cannot save object-shaped email text.
- Respect product-scoped Sheet offerings at the inquiry API boundary, so add-ons and flavours tied to one product cannot be saved against another.
- Respect product-scoped Sheet offerings in the order form too, so customers do not see add-ons, flavours, or cake sizes that the selected product cannot submit.
- Roll back optimistic admin edits when the Apps Script save request fails, so Meera sees the existing save-failure notice instead of a stale local status change.
- Reject malformed admin data returned after an Apps Script mutation, so optimistic edits roll back instead of replacing the dashboard with incomplete sheet state.
- Guard malformed admin data in the browser dashboard too, so a bad proxy response shows the load-failure notice instead of rendering incomplete arrays.
- Guard malformed admin data after browser dashboard mutations too, so optimistic edits roll back when a proxy response is incomplete.
- Normalize live Sheet order text before admin and finance consumers use it, so copied dates cannot hide confirmed monthly order potential.
- Normalize live Sheet order status casing before admin and finance consumers use it, so copied statuses cannot hide valid orders.
- Normalize live Sheet catalog text before admin consumers use it, so copied product and offering labels stay clean outside public catalog mapping.
- Treat null admin dashboard response envelopes as save/load failures, so optimistic browser edits roll back instead of leaking client TypeErrors.
- Catch rejected admin data loads after login or refresh, so a temporary Apps Script or network outage leaves the dashboard on its current screen with a clear load-failure notice instead of an unhandled client error.
- Catch rejected admin login requests too, so a temporary session endpoint outage leaves the PIN screen with a clear retry notice.
- Treat non-object admin login bodies as invalid PIN attempts, so malformed requests return a controlled 401 instead of a server error.
- Reject non-object admin mutation bodies as unsupported actions, so malformed dashboard requests return a controlled 400 instead of a server error.
- Keep email settings edits in a draft until save succeeds, so a failed sheet write does not leave unsaved inbox settings visible as if they persisted.
- Default blank copied email setting cells back to the configured owner values, so notification routing does not silently lose the recipient or sender name.
- Trim copied Apps Script deployment env values before proxying, so pasted secrets and URLs do not disable Sheet writes.
- Reject malformed admin settings payloads before Sheet mutations run, so copied direct writes cannot be treated as empty no-op saves.
- Reject non-string admin setting values before Sheet mutations run, so copied direct writes cannot save object-shaped email settings.
- Reject unknown admin setting keys before Sheet mutations run, so typos cannot pretend notification routing was saved.
- Reject non-string admin target IDs before Sheet mutations run, so copied direct writes cannot patch or delete object-shaped row keys.
- Reject missing order statuses before Sheet mutations run, so copied direct writes cannot reset an order to `new` accidentally.
- Clear malformed public catalog cache entries when the live catalog is unavailable, so stale browser storage does not keep slowing fallback page loads.
- Clear future-dated public catalog cache entries too, so clock-skewed browser storage cannot pin stale menu data.
- Catch rejected browser clipboard writes, so customers can fall back to email or manual selection instead of hitting an unhandled copy action.
- Catch rejected payment-instruction clipboard writes too, so customers can still email Meera or manually select the e-transfer details.
- Ignore malformed stored order summaries on the payment page, so customers can still use the URL order id fallback.
- Ignore stored order summaries for a different URL id too, so shared payment links cannot show stale browser-session orders.
- Normalize stored order metadata before matching payment links, so copied session data cannot hide valid payment details.
- Use the stored order payment email on the payment page when present, so copied e-transfer details stay aligned with inquiry metadata.
- Fall back from malformed stored payment emails on the payment page, so cached metadata cannot corrupt e-transfer copy or mail links.
- Normalize Apps Script order ids before building payment instructions, so malformed success responses fall back to a pending local id.
- Ignore malformed order metadata returned to the browser after a successful inquiry, so customers land on a valid pending payment page instead of storing an unusable order.
- Normalize returned order metadata before browser storage and payment-page routing, so copied response text cannot create padded summary links.
- Drop impossible returned serving counts before browser storage, so payment metadata cannot retain malformed internal response numbers.
- Treat null inquiry response envelopes as submit failures, so customers see the retry notice instead of an unhandled browser error.
- Create the inquiry validation schema per API request so the seven-day pickup notice window cannot freeze on a long-lived server process.
- Create the browser form validation schema at submit time too, so an already-open order tab uses the current pickup notice window before calling the API.
- Normalize copied inquiry catalog ID casing before validation and pricing, so direct customer payloads still match Sheet-managed menu rows.
- Require a selected inquiry flavour at both the browser and API validation boundary, so customer summaries do not save `Not selected` flavour rows.
- Accept Sheet-managed cake size IDs while still requiring a selected cake size, so live menu options can submit through browser and API validation.
- Normalize Sheet-driven quote ranges before totaling, so swapped low/high cells do not show inverted customer prices.
- Normalize Sheet-driven price ranges before rendering menu and add-on labels, so copied admin cells do not show inverted customer prices.
- Trim copied cake size IDs before catalog validation, so valid cake inquiries are not rejected because of pasted whitespace.
- Trim copied pickup dates before notice validation, so valid ISO dates are not rejected because of pasted whitespace.
- Trim whitespace-only honeypot values before spam validation, so harmless browser noise does not block real inquiries.
- Use product-neutral bakery wording in customer and chef email subjects, so non-cake inquiries do not carry stale cake-only copy.
- Trim copied Resend notification env vars before fallback mail sends, so deployment whitespace does not break inquiry routing.
- Trim pasted customer email whitespace before validation, so copied addresses stay usable in summaries, replies, and order metadata.
- Normalize copied add-on IDs before validation output, so duplicate or padded selections cannot inflate pricing or summaries.
- Return controlled email-delivery errors when Resend rejects, so fallback inquiry mail failures do not become unhandled server errors.

## Approaches Considered

- Continue work in the v1 root repo. Rejected because the user marked v1 done and asked that the original site no longer be touched.
- Create a branch in the v1 repo. Rejected because a branch still shares repository history and makes accidental v1 edits easier.
- Create a separate sibling folder outside the workspace. Rejected because the user asked for a new subfolder.

## Local Setup

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>.

## Verification

```powershell
npm run lint
npm test
npm run build
```

## Backend Notes

The v2 Apps Script copy is in `docs/apps-script/Code.gs`. It adds a `quantity` column to the Ledger sheet without clearing existing data, so it is safer for upgrading an existing sheet than the original v1 setup routine.

Payment instructions shown after inquiry submission:

- E-transfer: `m.ssethi1123@gmail.com`
- Cash: arranged directly with Meera

hello
