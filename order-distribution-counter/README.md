# EquiOrder

EquiOrder is a React and Vite order distribution dashboard with a small PostgreSQL API.

## PostgreSQL setup

Install PostgreSQL and create a database named `equiorder`. For a local PostgreSQL installation with command line tools available, run:

```powershell
createdb equiorder
```

Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string. For example:

```text
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/equiorder
API_PORT=3001
```

If your password contains URL-reserved characters such as `@`, `#`, or `/`, percent-encode those characters in the connection string.

Install dependencies:

```powershell
npm install
```

Run the API and frontend in separate terminals:

```powershell
npm run server
```

```powershell
npm run dev
```

On startup, the API creates the tables from `server/schema.sql` if they do not exist. The frontend saves and loads each weekday's teammate names, work status, time-only break/return fields, completed and pending counts, the latest allocations, and the five most recent batches. Progress stays with the selected weekday until you use **Clear day** on the dashboard to reset it. Existing saved weekday rosters and cached order progress in browser storage are copied into PostgreSQL when that weekday does not yet have database data.

The API health check is available at `http://localhost:3001/api/health`.
