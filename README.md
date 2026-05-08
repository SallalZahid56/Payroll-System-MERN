<!--
  Comprehensive README for payroll-system-mern
  Generated/maintained by developer assistant — edit to match your deployment details.
-->

# Payroll System (MERN)

A payroll and project management system with a React + TypeScript frontend and a Node/Express + MongoDB backend. The server integrates with Google Sheets, supports role-based access (admin/manager/profile/user), and includes payroll reports, project assignment, and a revision workflow.

Contents
- Project overview
- Quick start (dev)
- Architecture & folders
- Environment variables
- Scripts
- Common tasks (seeding, syncing, sheets)
- Development notes & troubleshooting
- Revision workflow overview
- Contributing

---

## Project overview
This app manages projects (fixed or hourly), assigns them to users, synchronizes project rows from Google Sheets to MongoDB, and computes payroll and adjustments. Admins can mark completed projects as pending revision, preview differences versus saved snapshots, and apply payroll adjustments on re-approval.

## Quick start (development)
1. Install dependencies

```bash
# from repo root
cd server && npm install
cd ../client && npm install
```

2. Run both servers (from repo root)

```bash
npm run dev
```

3. Open the frontend (Vite) in the browser (default port 5173) and the API server (default port 5000).

Notes: if ports differ, check `server/package.json` and `client/package.json` scripts.

## Architecture & important folders
- `/client` — React + TypeScript (Vite). UI components, pages, and API calls.
- `/server` — Express + TypeScript. Controllers, models, routes, and utils.
  - `src/controllers` — controller functions for admin, manager, payroll logic
  - `src/models` — Mongoose models (`Project`, `User`, etc.)
  - `src/routes` — route registrations
  - `src/config` — Google Sheets setup and auth
  - `src/utils` — schedulers (sync), helper scripts

## Environment variables (server)
Create a `.env` in `/server` with at least these values:

- `PORT` — server port (default 5000)
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — JWT signing secret
- `GOOGLE_SERVICE_ACCOUNT_BASE64` — base64-encoded Google service account JSON (optional, used to create `google-service.json` at runtime)
- `VITE_GOOGLE_CLIENT_ID` — frontend Google OAuth client ID (used by client)

Keep secrets out of source control.

## Useful npm scripts

From `server`:
- `npm run dev` — run server in dev mode (ts-node / nodemon)
- `npm run build` — build server (if present)
- `npm run seed` — seed admin user (if available)

From `client`:
- `npm run dev` — start Vite dev server
- `npm run build` — build production bundle

Top-level `npm run dev` may run both client and server concurrently (check `package.json`).

## Seeding & test data
- To create an admin user (if seed script exists):

```bash
cd server
npm run seed
```

## Google Sheets integration
- The server uses a service account to read and write Google Sheets for projects.
- Provide `GOOGLE_SERVICE_ACCOUNT_BASE64` in `.env`; the server will write `google-service.json` on startup if present.
- Key controller: `writeProjectColumns` ensures worker columns and headers exist for a project tab.

## Revision workflow (high level)
- Admins can mark a completed project as "pending revision"; the server snapshots current `workersalaries` (project state) into a `projectRevision` record.
- When the project is reprocessed (assign → submit → approve), the payroll controller provides preview endpoints to compute diffs vs snapshot.
- On approval, the server can create `payrollAdjustment` records and update `workersalaries` accordingly.

## Next project ID behavior (important)
- Project external IDs use the format `PROJ-<number>` (e.g., `PROJ-001`, `PROJ-1001`). The server endpoint `/admin/next-project-values` computes the next numeric suffix by scanning existing `project_id` values numerically, so IDs will continue increasing past `PROJ-999` (now yields `PROJ-1000`, `PROJ-1001`, etc.).

If you see the next Project ID reset unexpectedly, ensure:
- The server is restarted after code changes.
- You are calling `/admin/next-project-values` right before showing the Add Project form to avoid stale cached values.

## Troubleshooting & tips
- Duplicate key errors: `project_id` and `project_name` are unique. When updating a project via `/admin/update-project/:id` ensure:
  - The URL uses the Mongo document `_id` (not the external `project_id`).
  - The request body sends snake_case fields (e.g., `project_id`) if you intend to update those exact database fields.
- Mongoose OverwriteModelError: occurs if models are redefined at runtime — server code reuses compiled models via `mongoose.models.X || mongoose.model(...)` in several places.

## Running tests / validation
- There are no automated tests included by default. For manual checks:
  - Start the server, hit `/admin/next-project-values` to confirm next IDs.
  - Use Postman or `curl` to call admin endpoints (add/update project) and inspect responses.

## Contributing
- Open issues or PRs; follow TypeScript patterns in controllers and models. Keep changes focused and add tests where useful.

---

If you want, I can also:
- Add example `curl` requests for common admin endpoints
- Create `CONTRIBUTING.md` and a basic `LICENSE` file
- Add a short checklist to the Add Project form explaining `project_id` uniqueness

Which of those would you like next?
