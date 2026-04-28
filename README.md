# YearPlan

YearPlan is a static React web app for long-range planning on top of Google Calendar.

## What it does

- Shows a year view and a month view optimized for multi-day planning.
- Renders overlapping vacations, holidays, travel, hotel stays, and flights as colored bars.
- Reads and writes directly to selected existing Google Calendars.
- Stores planner metadata in Google event `extendedProperties.private`.
- Uses browser-side Google OAuth only. There is no backend and no local event database.
- Falls back to a local demo mode when Google OAuth is not configured, so the planner UI can still be tested.

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create an `.env.local` file with your Google OAuth client id:

   ```bash
   VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

If `VITE_GOOGLE_CLIENT_ID` is missing, the app starts in demo mode and shows setup instructions in the UI.

## Google setup

- Create an OAuth 2.0 Web application in Google Cloud.
- Add your local dev origin and your GitHub Pages origin to the authorized JavaScript origins.
- Enable the Google Calendar API for the same project.

## Deploy to GitHub Pages

This app is configured as a static Vite SPA and uses relative asset paths, which keeps it compatible with GitHub Pages.

Automatic deployment is configured through [`.github/workflows/deploy.yml`](/Users/stephan/Developement/Codex/yearPlan/.github/workflows/deploy.yml). Every push to `main` builds the app and publishes `dist/` to the `gh-pages` branch.

If you want Google login to work on GitHub Pages, add a repository variable named `VITE_GOOGLE_CLIENT_ID` in GitHub Actions settings. The Pages origin you need to authorize in Google Cloud will typically be:

- `https://zehrer.github.io/yearPlan/`

For local development, also authorize:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
