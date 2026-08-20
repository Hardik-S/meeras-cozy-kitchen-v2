# Meera v2

This repository is the isolated workspace for Meera v2: a smoother, mobile-first refresh of Meera's Cozy Kitchen.

## Status

V2 is the active cake-only Next.js app. It has its own catalogue, quote flow, Apps Script migration, admin compatibility layer, and Vercel deployment. V1 remains frozen in the parent folder.

## Current cake-only contract

- Public navigation is exactly Home, Menu, Photos, Reviews, FAQ, and Quote.
- Canonical sizes are 4-inch at $35, 6-inch at $60, and 8-inch at $75, all shown as starting prices.
- The public catalogue contains only cake sizes, five cake flavours, eight independently selectable frosting flavours, multiple fillings, and multiple toppings.
- Quote submissions require a pickup date, one of seven two-hour pickup windows, a frosting flavour, and all six acknowledgements.
- Homepage customer policies use four compact 230px cards in one desktop row; halal-certification wording appears with the allergen notice.
- Client submissions do not accept product, servings, budget, or legacy add-on fields. The server writes `productType: "cake"` only for historical order compatibility.
- The Apps Script catalogue migration version is `cake-frosting-flavours-v2`; the contact-settings migration is `canonical-contact-email-v1`. Both are idempotent and preserve orders, ledger rows, settings, and historical columns.
- The browser catalogue cache key is versioned so pre-migration products and pricing cannot reappear.
- `/photos` is canonical; `/portfolio` redirects there. Food-safety guidance lives at `/faq#food-safety`; `/food-safety` redirects there.
- `/reviews` accepts a required 1-5 star rating, public display name, private email, and 10-1000 character description. New reviews stay pending until Meera publishes them from the private admin dashboard.
- Brand colours are `#9A1E1E`, `#FFF4E8`, `#E7D3C1`, `#60442E`, and `#3B2F2F`. The UI intentionally uses no box shadows.
- Nunito is self-hosted from `src/app/fonts` so the site's typography does not fall back to Arial when an external font fetch or local build cache is unavailable.

## Version Boundary

The parent folder contains Meera v1. V1 is considered complete and frozen. Future work should happen here in `v2/` so v1 stays stable as a finished baseline.

## Rationale

Keeping v2 in a separate folder and repository gives the project a clean history, independent deployment path, and a clear rollback boundary. It also lets future work copy useful v1 patterns without creating accidental changes in the original site.

## Historical engineering decisions

The entries below preserve earlier hardening rationale and compatibility history. Where they mention older products, add-ons, servings, or budgets, the current cake-only contract above takes precedence.

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
- Reject blank catalog labels before Sheet mutations run, so copied editor payloads cannot save invisible menu rows.
- Reject unsupported offering categories before Sheet mutations run, so copied editor payloads cannot create invisible menu rows.
- Reject malformed catalog upsert payloads before Sheet mutations run, so copied row containers cannot fall through to field defaults.
- Normalize copied admin catalog IDs before Sheet mutations run, so editor writes stay aligned with canonical menu IDs.
- Collapse copied admin catalog display text before Sheet mutations run, so edited menu labels and serving notes stay single-line at the write boundary.
- Collapse copied deployed Apps Script catalog text before Sheet mutations too, so direct serving-note edits do not save hidden rows.
- Reject unsupported ledger entry types before Sheet mutations run, so finance totals cannot silently drop malformed rows.
- Reject non-number ledger amounts and quantities before Sheet mutations run, so copied finance payloads cannot save zeroed or fallback totals.
- Reject negative ledger amounts before Sheet mutations run, so copied expense rows cannot invert finance totals.
- Reject non-string ledger text values before Sheet mutations run, so copied finance payloads cannot save object-shaped dates or order links.
- Collapse copied admin ledger text before Sheet mutations run, so finance rows stay single-line at the write boundary.
- Reject fractional ledger quantities before Sheet mutations run, so copied finance payloads cannot save partial expense counts.
- Reject malformed ledger entry payloads before Sheet mutations run, so copied finance containers cannot fall through to field defaults.
- Reject blank admin mutation IDs before Sheet mutations run, so direct deletes and patches cannot silently no-op or target stringified copied values.
- Reject malformed top-level Apps Script POST payloads before secret checks or setup run, so copied containers fail at the request boundary.
- Accept legacy Apps Script ledger rows without quantity, then normalize them to `1`, so upgraded sheets keep loading finance data.
- Normalize copied fractional ledger quantities to `1`, so manual Sheet edits cannot create partial-count finance totals.
- Keep deployed Apps Script ledger quantity reads integer-only too, so manual Sheet edits cannot bypass the TypeScript finance guard.
- Collapse copied deployed Apps Script ledger text too, so direct admin reads match finance report normalization.
- Normalize copied negative ledger amounts to `0`, so manual Sheet edits cannot invert finance totals after write-side validation.
- Normalize copied ledger type casing, so manual Sheet edits cannot hide valid income or expense rows.
- Normalize copied catalog category casing, so manual Sheet edits cannot hide valid add-ons, flavours, or cake sizes.
- Normalize copied catalog product ID casing, so manual Sheet edits cannot hide product-scoped add-ons or custom products.
- Normalize copied catalog offering ID casing, so visible Sheet options still validate and price after submission.
- Normalize direct pricing catalog ID lookups too, so copied Sheet-backed quote inputs cannot fall back to stale default prices.
- Collapse copied Sheet-backed quote labels inside pricing too, so estimates cannot surface hidden line breaks.
- Normalize live Sheet ledger text before finance reports and CSV exports use it, so copied dates and order IDs stay visible in monthly totals.
- Collapse copied live Sheet ledger text before finance reports and CSV exports use it, so hidden line breaks cannot split rows.
- Ignore malformed direct ledger text before finance reports and CSV exports use it, so copied row objects cannot crash monthly totals.
- Normalize copied live order estimate ranges, so manual Sheet edits cannot invert confirmed-order finance totals.
- Normalize copied order estimates inside finance summaries too, so direct report inputs cannot invert confirmed potential.
- Normalize copied order dates inside finance summaries too, so direct report inputs cannot hide confirmed potential.
- Normalize copied order status casing inside finance summaries too, so direct report inputs cannot hide confirmed potential.
- Default finance reports to the selected month, initially the current month.
- Validate inquiry pickup dates as real calendar days before applying the seven-day notice rule, so impossible `YYYY-MM-DD` strings cannot pass as future dates.
- Build inquiry summaries from the live public catalog when it is available, so Sheet-managed products and flavours keep their customer-facing labels and quote ranges in emails, Apps Script rows, and the payment-instructions page.
- Include selected add-ons in inquiry summaries, so Sheet-backed quote extras stay visible in emails, Apps Script rows, and payment instructions.
- Collapse copied Sheet-backed labels inside inquiry summaries too, so customer emails and payment instructions stay single-line after manual cell edits.
- Ignore copied add-ons scoped to another product inside inquiry summaries, so stale direct callers cannot display or price hidden options.
- Include selected add-ons in deployed Apps Script fallback summaries too, so direct Sheet submissions keep quote extras visible.
- Include Sheet-backed cake size and flavour labels in deployed Apps Script fallback summaries too, so direct submissions do not save bare catalog IDs.
- Collapse copied Sheet-backed deployed fallback summary labels too, so direct submissions cannot save hidden line breaks in selected options.
- Normalize copied Apps Script estimate input casing, so direct deployed submissions still price Sheet-managed cake sizes and add-ons.
- Order copied Apps Script estimate ranges before totaling, so direct deployed summaries cannot show inverted quote totals.
- Normalize copied Apps Script admin order reads, so manual Sheet edits cannot leak multiline text or inverted estimates back to admin consumers.
- Ignore copied non-add-on offering IDs inside Apps Script add-on selections, so direct deployed submissions cannot double-price cake sizes or flavours as extras.
- Omit cake-size copy from non-cake inquiry summaries, so Sheet-managed dessert products do not show irrelevant `Not selected` rows.
- Normalize copied cake product casing before summary branching, so direct inquiry payloads still show the chosen cake size.
- Reuse that live-catalog inquiry summary when Apps Script falls back to Resend, so failed sheet writes do not send stale default product labels.
- Build the browser's pre-submit copyable summary from the same live catalog as the estimate, so customers do not copy stale default menu labels after a Sheet refresh.
- Hide offerings attached to disabled products in the public catalog, so retired Sheet products do not leave stray add-ons or options on customer-facing pages.
- Filter impossible public catalog price ranges and fractional sort orders during server catalog mapping too, so fallback API output stays aligned with live/cache validation.
- Treat malformed live Apps Script admin data as a fallback condition, so public catalog refreshes do not crash when a sheet or script response is incomplete.
- Validate live Apps Script row shapes before accepting admin data, so malformed product labels cannot crash public catalog mapping.
- Reject blank live catalog row IDs and labels too, so Sheet whitespace cannot publish empty customer-facing menu options.
- Reject impossible live catalog price ranges before accepting admin data, so manual Sheet price edits cannot reach admin or public consumers.
- Reject negative live catalog sort orders before accepting admin data, so manual Sheet edits cannot pin menu rows ahead of validated admin writes.
- Trim Sheet-backed catalog IDs, labels, product links, and servings before public mapping, so copied admin cells cannot break menu selection or pricing lookups.
- Normalize copied Sheet offering categories before public mapping, so valid add-ons, flavours, and cake sizes do not disappear after cell edits.
- Treat non-object Apps Script JSON responses as request failures, so null proxy bodies do not leak raw TypeErrors into catalog or inquiry flows.
- Treat malformed public catalog responses or cached browser catalog data as a local-default fallback, so an incomplete refresh cannot poison the customer menu cache.
- Validate cached and live public catalog row shapes before using them in the browser, so malformed Sheet snapshots cannot break customer menu rendering.
- Reject cached and live public catalog rows with impossible price ranges, so negative Sheet prices cannot reach customer menus.
- Reject cached and live public catalog rows with fractional or negative sort orders, so copied Sheet snapshots cannot reorder menu rows ambiguously.
- Normalize cached and live public catalog text before browser consumers use it, so old Sheet snapshots with copied whitespace do not break menu selection.
- Collapse copied Sheet catalog display text before public API mapping returns it, so labels and serving notes stay single-line outside the browser cache.
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
- Collapse copied live Sheet order text before admin and finance consumers use it, so hidden line breaks cannot split dashboard rows.
- Normalize live Sheet order catalog IDs before admin and finance consumers use them, so copied casing stays aligned with menu IDs.
- Normalize live Sheet order status casing before admin and finance consumers use it, so copied statuses cannot hide valid orders.
- Normalize live Sheet catalog text before admin consumers use it, so copied product and offering labels stay clean outside public catalog mapping.
- Collapse copied live Sheet catalog display text before admin consumers use it, so product labels and serving notes cannot add hidden rows in dashboards.
- Normalize copied deployed Apps Script catalog reads too, so direct admin consumers see clean product and offering rows after manual Sheet edits.
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
- Trim copied admin setting values before Sheet mutations run, so pasted notification routing does not save padded emails or names.
- Collapse copied notification routing settings before admin API writes, live reads, and deployed writes, so hidden line breaks cannot split sender, receiver, or sender-name values.
- Default blank copied notification settings before admin API and deployed writes, so direct saves cannot persist empty routing values.
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
- Collapse copied stored payment metadata to single lines, so cached customer names cannot create extra e-transfer memo instructions.
- Collapse copied payment order IDs to single lines too, so URL-decoded IDs cannot create extra e-transfer memo instructions.
- Normalize Apps Script order ids before building payment instructions, so malformed success responses fall back to a pending local id.
- Collapse copied Apps Script order IDs before returning them to the browser, so successful sheet writes cannot create multiline payment links.
- Ignore malformed order metadata returned to the browser after a successful inquiry, so customers land on a valid pending payment page instead of storing an unusable order.
- Normalize returned order metadata before browser storage and payment-page routing, so copied response text cannot create padded summary links.
- Collapse returned order IDs before browser storage and routing, so copied success responses cannot put hidden line breaks into payment links.
- Normalize returned order catalog IDs before browser storage, so copied response casing stays aligned with payment-page metadata.
- Drop impossible returned serving counts before browser storage, so payment metadata cannot retain malformed internal response numbers.
- Treat null inquiry response envelopes as submit failures, so customers see the retry notice instead of an unhandled browser error.
- Create the inquiry validation schema per API request so the seven-day pickup notice window cannot freeze on a long-lived server process.
- Create the browser form validation schema at submit time too, so an already-open order tab uses the current pickup notice window before calling the API.
- Normalize copied inquiry catalog ID casing before validation and pricing, so direct customer payloads still match Sheet-managed menu rows.
- Collapse copied single-line inquiry contact fields during validation, so names, phone numbers, and budgets cannot add hidden summary rows.
- Collapse direct Apps Script single-line inquiry fields too, so fallback submissions cannot save hidden summary rows.
- Collapse copied public catalog display text in the browser cache, so menu labels and serving notes cannot add hidden customer-facing lines.
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

The v2 Apps Script copy is in `docs/apps-script/Code.gs`. It adds a `quantity` column to the Ledger sheet and creates the moderated Reviews sheet without clearing existing data, so it is safer for upgrading an existing sheet than the original v1 setup routine.

After changing `Code.gs`, paste the complete file into the existing Apps Script project, create a new web-app deployment version, and keep the same `/exec` URL in `GOOGLE_APPS_SCRIPT_URL`. The next proxy request runs `setupMeeraCozyKitchen`, which creates the Reviews sheet and missing headers idempotently. Review submissions are stored before notification emails are attempted; failed email delivery does not turn a stored submission into a browser error. Only published review fields are returned publicly, and reviewer emails remain available exclusively through the authenticated admin data route.

Canonical business contact and e-transfer address: `meerascozykitchen@gmail.com`.
Set Vercel `ORDER_NOTIFY_EMAIL` to that same address. The technical Resend
sender remains `Meera's Cozy Kitchen <orders@resend.dev>` until the business has
a verified sending domain.

Payment guidance shown after inquiry submission:

> Do not send payment until Meera accepts your order and confirms the final price in writing. Once accepted, 50% of the confirmed final price is due by e-transfer within 48 hours. The remaining 50% is due at pickup and may be paid by e-transfer or cash.

`setupMeeraCozyKitchen` runs the idempotent `canonical-contact-email-v1`
migration. On its first run, populated `defaultSender` and `defaultReceiver`
settings are updated to the canonical Gmail address; later runs leave them
untouched once the migration marker is present.

hello
