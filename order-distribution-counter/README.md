# EquiOrder

EquiOrder is a team order distribution dashboard. It helps a team share each incoming batch fairly, track work completed, and account for teammates who are on break.

## What the app does

- Shows the active roster, teammate availability, completed and pending orders, and the latest batch allocation.
- Distributes incoming orders among teammates marked **Working**. Their pending orders are assigned first; remaining orders are divided evenly. Any remainder goes to teammates with the most pending orders.
- Updates completed totals after each batch and recalculates pending orders so the team can catch up evenly.
- Keeps the ten most recent batches available on the dashboard.
- Provides an OID Distribution page that assigns pasted OIDs using the same dashboard rules and makes them easy to paste into Google Sheets one cell per OID.
- Provides a Notes page for standardized Sales messages, CRM logs, and quick-copy snippets.
- Supports private accounts with separate rosters, order progress, and frequently used text.
- Supports light and dark themes.

## Notes page

Choose **Notes** in the main navigation to generate Sales messages and CRM logs or copy a frequently used note. Add, edit, or delete frequently used text for the signed-in account. Generated Sales and CRM text is not stored in the database.

## Manage weekday rosters

Use **Manage team** to select a weekday and configure that day's roster. Drag teammates by the grip handle to set the custom order shown on the dashboard, then select **Save day** to keep it. Add teammates with **Add teammate**, remove them with the **X** beside their name, and edit names, status, completed and pending counts, and manual break and return times. Time fields are time-only and intended for EST.

Select **Save day** to save the weekday's roster. SweetAlert2 asks for confirmation before a teammate is removed.

The selected weekday is used by the dashboard until another weekday is selected. The dashboard displays the active weekday.

## Daily order progress

Completed and pending counts, the latest allocations, and the ten most recent batches are saved for the selected weekday. Changes are saved immediately, and the active weekday's completed-order progress is also autosaved to PostgreSQL every 30 minutes while the dashboard is open. Use **Clear day** on the dashboard to reset that weekday's order progress before starting fresh. A confirmation appears before clearing; the saved roster remains in place.

## OID distribution

Choose **OID Distribution** from the menu, or select the **Actual OIDs** tab inside the dashboard's **Distribute orders** card. Paste one OID per line (for example, `N-3162-967688-4058`) and select **Calculate OID distribution**. The dashboard tab updates **Team members** exactly like a normal calculation: completed and pending counts, allocations, and recent batch history are saved. Assigned OIDs are also retained in this browser by account and weekday, so they remain after an accidental reload. The standalone **OID Distribution** page is preview/copy-only and does not change team counts, allocations, or saved history. Copy a teammate's assigned OIDs and paste them into Google Sheets; each newline becomes one cell. The displayed cells use centered Arial 10pt text with borders.

## Data storage

The app uses a PostgreSQL API. Passwords are stored as scrypt hashes and sessions use HTTP-only cookies. Each account has separate weekday rosters, order progress, and frequently used text. Clearing progress resets counts while preserving teammate details. On startup, existing roster and progress tables are assigned to the initial account. Existing browser-cached roster and progress are imported to that account when it signs in.

The database tables are created from [`server/schema.sql`](server/schema.sql) when the API starts. Configure `DATABASE_URL`, `INITIAL_ACCOUNT_EMAIL`, and `INITIAL_ACCOUNT_PASSWORD` in a private local `.env` file based on [`.env.example`](.env.example). The initial account is created once; later registrations start with no saved team, distribution history, or frequently used text.

## Run locally

Requirements: Node.js 20.6+ and PostgreSQL.

1. Create a PostgreSQL database named `equiorder`.
2. Copy `.env.example` to `.env` and set its `DATABASE_URL`.
3. Install dependencies with `npm install`.
4. Run `npm run server` and `npm run dev` in separate terminals.
5. Open the local URL printed by Vite.

Useful commands:

```powershell
npm run dev      # Start the web app
npm run server   # Start the PostgreSQL API
npm run build    # Build the web app
npm run lint     # Check the source code
```
