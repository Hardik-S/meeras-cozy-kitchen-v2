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
- Roll back optimistic admin edits when the Apps Script save request fails, so Meera sees the existing save-failure notice instead of a stale local status change.
- Catch rejected admin data loads after login or refresh, so a temporary Apps Script or network outage leaves the dashboard on its current screen with a clear load-failure notice instead of an unhandled client error.

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
