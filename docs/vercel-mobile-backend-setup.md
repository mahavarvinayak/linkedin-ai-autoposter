# Vercel Backend Setup for Mobile Automation

This project now supports running the LinkedIn/Gemini backend on Vercel, so you can avoid Firebase Functions billing requirements.

## What Changed in Code
- Added Node API handlers in `app/api/[action]/route.ts` for these endpoints:
  - `linkedinAuthUrl`
  - `linkedinCallback`
  - `generatePost`
  - `publishPost`
  - `fetchAnalytics`
  - `updateAutomation`
  - `disconnectLinkedIn`
- Added scheduled cron endpoints:
  - `GET /api/cron/daily-post`
  - `GET /api/cron/refresh-analytics`
- Added Vercel cron config in `vercel.json`.
- Made Flutter backend URL configurable using `--dart-define=LINKFLOW_API_BASE_URL=...`.

## Deploy Steps (You Must Do)
1. Install root dependencies:
   - `npm install`
2. Push repo to GitHub.
3. Import this repo in Vercel.
4. In Vercel project settings, add environment variables:
   - `LINKEDIN_CLIENT_ID`
   - `LINKEDIN_CLIENT_SECRET`
   - `GEMINI_API_KEY`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
   - `LINKEDIN_REDIRECT_URI` (set to `https://<your-vercel-domain>/api/linkedinCallback`)
   - `CRON_SECRET` (any long random value)

### FIREBASE_SERVICE_ACCOUNT_JSON format
Use the full Firebase service account JSON as a single string.
If your deployment UI supports multiline JSON, paste raw JSON.
If not, paste minified JSON.

## LinkedIn App Config (Must Match)
In LinkedIn Developer app, set redirect URL exactly to:
- `https://<your-vercel-domain>/api/linkedinCallback`

Required products/access:
- Sign In with LinkedIn using OpenID Connect
- Share on LinkedIn
- Community Management API (only if organization posting is needed)

## Build APK Against Vercel API
From `mobile_app/`:
- `flutter build apk --release --dart-define=LINKFLOW_API_BASE_URL=https://<your-vercel-domain>/api`

Then install the newly built APK.

## Quick Health Checks
- Open `https://<your-vercel-domain>/api/linkedinAuthUrl` in browser: should return auth error (expected without Bearer token), proving route is live.
- Vercel dashboard -> Functions logs should show cron hits for:
  - `/api/cron/daily-post`
  - `/api/cron/refresh-analytics`

## Notes
- Vercel free tier has execution limits; suitable for light usage.
- LinkedIn access token expiry still requires reconnect flow (same as previous backend behavior).
