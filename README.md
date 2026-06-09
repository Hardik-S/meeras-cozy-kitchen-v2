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
- Default finance reports to the selected month, initially the current month.
- Validate inquiry pickup dates as real calendar days before applying the seven-day notice rule, so impossible `YYYY-MM-DD` strings cannot pass as future dates.
- Build inquiry summaries from the live public catalog when it is available, so Sheet-managed products and flavours keep their customer-facing labels and quote ranges in emails, Apps Script rows, and the payment-instructions page.
- Treat malformed live Apps Script admin data as a fallback condition, so public catalog refreshes do not crash when a sheet or script response is incomplete.
- Treat non-object Apps Script JSON responses as request failures, so null proxy bodies do not leak raw TypeErrors into catalog or inquiry flows.
- Treat malformed public catalog responses or cached browser catalog data as a local-default fallback, so an incomplete refresh cannot poison the customer menu cache.
- Roll back optimistic admin edits when the Apps Script save request fails, so Meera sees the existing save-failure notice instead of a stale local status change.
- Reject malformed admin data returned after an Apps Script mutation, so optimistic edits roll back instead of replacing the dashboard with incomplete sheet state.
- Guard malformed admin data in the browser dashboard too, so a bad proxy response shows the load-failure notice instead of rendering incomplete arrays.
- Guard malformed admin data after browser dashboard mutations too, so optimistic edits roll back when a proxy response is incomplete.
- Treat null admin dashboard response envelopes as save/load failures, so optimistic browser edits roll back instead of leaking client TypeErrors.
- Catch rejected admin data loads after login or refresh, so a temporary Apps Script or network outage leaves the dashboard on its current screen with a clear load-failure notice instead of an unhandled client error.
- Catch rejected admin login requests too, so a temporary session endpoint outage leaves the PIN screen with a clear retry notice.
- Treat non-object admin login bodies as invalid PIN attempts, so malformed requests return a controlled 401 instead of a server error.
- Reject non-object admin mutation bodies as unsupported actions, so malformed dashboard requests return a controlled 400 instead of a server error.
- Keep email settings edits in a draft until save succeeds, so a failed sheet write does not leave unsaved inbox settings visible as if they persisted.
- Clear malformed public catalog cache entries when the live catalog is unavailable, so stale browser storage does not keep slowing fallback page loads.
- Catch rejected browser clipboard writes, so customers can fall back to email or manual selection instead of hitting an unhandled copy action.
- Catch rejected payment-instruction clipboard writes too, so customers can still email Meera or manually select the e-transfer details.
- Ignore malformed stored order summaries on the payment page, so customers can still use the URL order id fallback.
- Normalize Apps Script order ids before building payment instructions, so malformed success responses fall back to a pending local id.
- Ignore malformed order metadata returned to the browser after a successful inquiry, so customers land on a valid pending payment page instead of storing an unusable order.
- Treat null inquiry response envelopes as submit failures, so customers see the retry notice instead of an unhandled browser error.
- Create the inquiry validation schema per API request so the seven-day pickup notice window cannot freeze on a long-lived server process.
- Create the browser form validation schema at submit time too, so an already-open order tab uses the current pickup notice window before calling the API.
- Require a selected inquiry flavour at both the browser and API validation boundary, so customer summaries do not save `Not selected` flavour rows.
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
