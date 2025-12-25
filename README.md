# Payroll System (MERN)

**A payroll and project management system** built with a React + TypeScript frontend and a Node/Express + MongoDB backend. The server synchronizes project data with Google Sheets and provides role-based features (admin, manager, user, profile). ✅

---

## Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Environment Variables](#environment-variables)
- [Local Setup (Development)](#local-setup-development)
- [Seeding Admin Account](#seeding-admin-account)
- [API Highlights](#api-highlights)
- [Google Sheets Integration](#google-sheets-integration)
- [Notes & Security](#notes--security)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview
This application is a payroll/project management system designed to track and assign projects (fixed/hourly), manage users and profiles, and compute payroll summaries. The backend includes a scheduled sync that reads Google Sheets tabs for project data and stores it in MongoDB to power payroll reports.

## Key Features
- Role-based access (admin, manager, user, profile)
- Add, assign, and manage fixed and hourly projects
- Sync project data from Google Sheets (automated scheduler)
- Payroll reporting: per-user, per-profile, company-specific and filtered views
- Google OAuth login + email/password authentication
- Admin utilities: user management, project column writing, and sync control

## Tech Stack
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: MongoDB (mongoose)
- Google APIs: Google Sheets API for synchronization
- Authentication: JWT, bcrypt

## Repository Layout
- /client — React + TypeScript frontend (Vite)
  - Main pages: `Login`, `Signup`, `AdminDashboard`, `ManagerDashboard`, `UserDashboard`
- /server — Express API (TypeScript)
  - `src/controllers` — business logic (auth, admin, manager)
  - `src/models` — Mongoose models (`User`, `Project`, `Column`)
  - `src/config` — Google Sheets client
  - `src/utils` — scheduled sync (`syncScheduler`)
  - `src/routes` — API routes

## Environment Variables
Create a `.env` in `/server` (or use your deployment env) and set at least:

- `PORT` — server port (e.g., 5000)
- `MONGO_URI` — MongoDB connection URI
- `JWT_SECRET` — secret for JWT signing
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID (frontend)
- `GOOGLE_SERVICE_ACCOUNT_BASE64` — base64-encoded service account JSON contents (used to create `google-service.json` at runtime)

Important: Do NOT commit secrets to the repo. The included `.env` in this workspace contains example values—replace with your own.

## Local Setup (Development)
1. Install dependencies in both root scripts (concurrently) if needed:

   - Install server deps: cd server && npm install
   - Install client deps: cd client && npm install

2. Start both client and server concurrently from the repository root:

   ```bash
   npm run dev
   ```

   - Server default port: 5000
   - Frontend dev server (Vite) default: 5173

3. Open the app in your browser and login/signup.

## Seeding Admin Account
The server includes a seed script to create an admin user:

```bash
cd server
npm run seed
```

## API Highlights
- `POST /api/auth/signup` — create user (email/password)
- `POST /api/auth/login` — login (email/password)
- `POST /api/auth/google-signup` — Google login/sign-up
- Admin routes (prefix `/api/admin`): add projects, assign project, run sync, get payrolls, user management
- Manager routes (prefix `/api/manager`): manager-specific project endpoints

For exact endpoints, check `server/src/routes/*` and controller methods in `server/src/controllers`.

## Google Sheets Integration
- The server uses a service account and the Sheets API to:
  - Ensure project sheet headers/worker columns are present (`writeProjectColumns`)
  - Periodically sync data (`syncAllProjects` called by `syncScheduler`)
- Provide `GOOGLE_SERVICE_ACCOUNT_BASE64` env var: the app will write `google-service.json` at runtime when this value is present.

## Notes & Security
- The app contains sensitive environment examples in `/server/.env` — replace them with secure values and rotate credentials before deploying.
- When deploying, ensure Google service account JSON and Mongo credentials are stored securely (e.g., secrets manager, not checked into source control).

## Contributing
- Please open an issue or PR describing your change. Follow existing code style (TypeScript, ESLint). Add tests or manual testing steps when relevant.

## License
This project does not include a license file. Add an appropriate open-source license if you plan to publish it.

---

If you'd like, I can also:
- Add an expanded section with example API requests and response samples ✅
- Create a minimal `CONTRIBUTING.md` and `LICENSE` file

Tell me which additions you want next.
