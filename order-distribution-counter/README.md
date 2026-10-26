# EquiOrder

EquiOrder is a team order distribution dashboard. It helps a team share each incoming batch fairly, track work completed, and account for teammates who are on break.

## What the app does

- Shows the active roster, teammate availability, completed and pending orders, and the latest batch allocation.
- Distributes incoming orders among teammates marked **Working**. Their pending orders are assigned first; remaining orders are divided evenly. Any remainder goes to teammates with the most pending orders.
- Updates completed totals after each batch and recalculates pending orders so the team can catch up evenly.
- Keeps the ten most recent batches available on the dashboard.
- Provides a Notes page for standardized Sales messages, CRM logs, and quick-copy snippets.
- Supports light and dark themes.

## Notes page

Choose **Notes** in the main navigation to generate Sales messages and CRM logs or copy a frequently used note. Outputs update as you fill in the fields; generated text is not stored in the database.

## Manage weekday rosters

Use **Manage team** to select a weekday and configure that day's roster. Add teammates with **Add teammate**, remove them with the **X** beside their name, and edit names, status, completed and pending counts, and manual break and return times. Time fields are time-only and intended for EST.

Select **Save day** to save the weekday's roster. SweetAlert2 asks for confirmation before a teammate is removed.

The selected weekday is used by the dashboard until another weekday is selected. The dashboard displays the active weekday.

## Daily order progress

Completed and pending counts, the latest allocations, and the ten most recent batches are saved for the selected weekday. Use **Clear day** on the dashboard to reset that weekday's order progress before starting fresh. A confirmation appears before clearing; the saved roster remains in place.

## Data storage

The app uses a PostgreSQL API. Weekday rosters are stored separately from order progress, so clearing progress does not delete teammates or break times. Existing weekday rosters and cached progress in browser storage are imported when that weekday has no saved database data.

The database tables are created from [`server/schema.sql`](server/schema.sql) when the API starts. Configure `DATABASE_URL` in a local `.env` file based on [`.env.example`](.env.example). Keep `.env` private.

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
