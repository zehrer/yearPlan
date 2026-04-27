# YearPlan

YearPlan is a static React web app for long-range planning on top of Google Calendar.

## What it does

- Shows a year view and a month view optimized for multi-day planning.
- Renders overlapping vacations, holidays, travel, hotel stays, and flights as colored bars.
- Reads and writes directly to selected existing Google Calendars.
- Stores planner metadata in Google event `extendedProperties.private`.
- Uses browser-side Google OAuth only. There is no backend and no local event database.

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

## Google setup

- Create an OAuth 2.0 Web application in Google Cloud.
- Add your local dev origin and your GitHub Pages origin to the authorized JavaScript origins.
- Enable the Google Calendar API for the same project.

## Deploy to GitHub Pages

This app is configured as a static Vite SPA and uses relative asset paths, which keeps it compatible with GitHub Pages.
