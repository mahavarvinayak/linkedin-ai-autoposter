# LinkFlow AI — Full Project Report

**Date:** March 10, 2026  
**Version:** 1.0.0  
**Developer:** Vinayak Mahavar  

---

## 1. Project Overview

**LinkFlow AI** ek fully automated LinkedIn content posting platform hai jo AI (Google Gemini) ka use karke professional LinkedIn posts generate karta hai aur unhe automatically publish karta hai — bina user ke daily kuch kiye.

### Core Idea
- User ek **topic set karta hai** (e.g., "daily latest trends in AI")
- System **khud 2 posts/day** generate karke LinkedIn pe publish karta hai
- User sirf ek baar setup karta hai, baaki sab automatically hota hai

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Web Backend + Frontend** | Next.js 15 (App Router), TypeScript |
| **Hosting** | Vercel (free tier) |
| **Mobile App** | Flutter 3.x (Android) |
| **Database** | Firebase Firestore |
| **Authentication** | Firebase Auth (Email/Password) |
| **AI** | Google Gemini 2.0 Flash (via `@google/generative-ai`) |
| **AI Framework** | Genkit 1.28 |
| **Scheduling / Cron** | GitHub Actions (every minute, free, unlimited) |
| **LinkedIn API** | LinkedIn OAuth 2.0 + UGC Posts API |
| **UI Components** | shadcn/ui + Radix UI + Tailwind CSS |
| **Charts** | Recharts (web), fl_chart (mobile) |

---

## 3. Project Structure

```
linkedin-ai-autoposter/
├── app/                          # Next.js App Router — API Routes
│   └── api/
│       ├── [action]/route.ts     # LinkedIn OAuth, AI generate, publish, analytics
│       ├── automation/route.ts   # Save/load daily topic & automation settings
│       ├── schedule/
│       │   ├── check-and-post/   # GitHub Actions calls this every minute
│       │   └── save/             # Schedule save/fetch
│       └── cron/
│           ├── daily-post/       # Legacy cron endpoint
│           └── refresh-analytics/
│
├── src/
│   ├── app/                      # Next.js Pages (Web Dashboard)
│   │   ├── page.tsx              # Landing page
│   │   └── dashboard/
│   │       ├── page.tsx          # Dashboard home
│   │       ├── analytics/        # Analytics charts
│   │       ├── automation/       # Automation settings + topic
│   │       ├── create/           # Manual post creation
│   │       ├── history/          # Past posts table
│   │       └── settings/         # User profile + LinkedIn connect
│   ├── ai/
│   │   ├── genkit.ts             # Gemini AI config
│   │   └── flows/
│   │       └── generate-linkedin-post-flow.ts  # AI post generation flow
│   ├── firebase/                 # Firebase client SDK setup
│   └── server/
│       └── linkflow-backend.ts   # All server-side handlers (Vercel)
│
├── functions/                    # Firebase Cloud Functions (not required)
│   └── src/index.ts
│
├── mobile_app/                   # Flutter Android App
│   └── lib/
│       ├── main.dart
│       ├── firebase_options.dart
│       ├── models/               # AppUser, Post, Analytics data models
│       ├── providers/            # Auth, Settings, Post, Analytics state
│       ├── screens/              # Login, Dashboard, Create, Analytics, History, Settings
│       ├── services/
│       │   ├── cloud_function_service.dart   # Calls Vercel API
│       │   └── firestore_service.dart        # Direct Firestore operations
│       └── theme/
│
├── .github/
│   └── workflows/
│       └── scheduled-posts.yml   # Runs every minute → triggers Vercel API
│
├── firestore.rules               # Firestore security rules
├── firebase.json
├── vercel.json
└── package.json
```

---

## 4. Architecture Diagram

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  GitHub Actions  │────▶│   Vercel (Next.js)   │────▶│  Gemini AI API  │
│  (every minute) │     │  /api/schedule/       │     │  (post gen)     │
└─────────────────┘     │  check-and-post       │     └─────────────────┘
                        └──────────┬───────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼               ▼
             ┌──────────┐  ┌──────────────┐  ┌────────────┐
             │ Firebase │  │ LinkedIn API │  │  Flutter   │
             │Firestore │  │  (publish)   │  │  Android   │
             └──────────┘  └──────────────┘  └────────────┘
                    ▲
                    │
             ┌──────────────┐
             │  Web Dashboard│
             │  (Next.js UI) │
             └──────────────┘
```

---

## 5. Key Features

### 5.1 Auto Daily Posting (Main Feature)
- User ek baar **Daily Auto-Post Topic** set karta hai (e.g., "latest trends in AI")
- GitHub Actions **har minute** Vercel ko ping karta hai
- Vercel check karta hai ki scheduled time match ho raha hai ya nahi (±1 min window)
- Match hone pe Gemini se SEO-optimized post + hashtags generate hoti hai
- Post automatically LinkedIn pe publish ho jaati hai
- **Koi daily input nahi chahiye**

### 5.2 AI Post Generation
- **Model:** Gemini 2.0 Flash
- **Output:** Caption (1300 chars max) + 8–12 hashtags + image prompt
- **SEO Optimized:** Power words, LinkedIn algorithm ke liye keywords
- Topic user ke configured topic se aata hai (ya default: "latest trends in AI and technology")

### 5.3 Manual Post Creation
- App aur web dashboard se manually topic deke post generate karo
- Edit karo, hashtag add karo, LinkedIn pe publish karo

### 5.4 Post History
- Sare purane posts — date, status (posted/failed/draft), hashtags
- Per-post engagement data (likes, comments, shares)

### 5.5 Analytics
- Impressions, likes, comments, engagement rate
- Bar charts aur line charts for trends
- Per-post performance breakdown

### 5.6 LinkedIn OAuth Connect
- Full OAuth 2.0 flow — LinkedIn account securely connect hota hai
- Access token server-side (Vercel + Firestore) mein store hota hai — client pe kabhi nahi aata
- Personal profile ya Company page pe post karne ka option

---

## 6. API Endpoints (Vercel)

| Endpoint | Method | Description |
|---|---|---|
| `/api/linkedinAuthUrl` | GET | LinkedIn OAuth URL generate karo |
| `/api/linkedinCallback` | GET/POST | OAuth token exchange + user data save |
| `/api/generatePost` | POST | Gemini se AI post generate karo |
| `/api/publishPost` | POST | Post LinkedIn pe publish karo |
| `/api/fetchAnalytics` | GET | LinkedIn post analytics fetch karo |
| `/api/updateAutomation` | POST | Automation settings save karo |
| `/api/disconnectLinkedIn` | POST | LinkedIn account disconnect karo |
| `/api/schedule/check-and-post` | POST | GitHub Actions trigger — time check + post |
| `/api/schedule/save` | GET/POST | Post schedule save/fetch |
| `/api/automation` | GET/POST | Daily topic + automation settings |

---

## 7. Firestore Data Structure

```
Firestore (studio-1013588681-626a8)
│
├── users/
│   └── {userId}/
│       ├── linkedinId            (string)
│       ├── linkedinAccessToken   (string, server-only)
│       ├── linkedinTokenExpiry   (timestamp)
│       ├── automationEnabled     (boolean)
│       ├── postingTime           (string, e.g. "09:00")
│       ├── targetType            (string: "personal" | "organization")
│       ├── dailyTopic            (string, e.g. "latest trends in AI")
│       ├── selectedOrganizationId (string | null)
│       ├── organizationIds       (string[])
│       ├── aiProvider            (string: "gemini")
│       │
│       ├── posts/
│       │   └── {postId}/
│       │       ├── content       (string)
│       │       ├── hashtags      (string[])
│       │       ├── targetType    (string)
│       │       ├── status        (string: "posted"|"draft"|"failed"|"scheduled")
│       │       ├── linkedinPostUrn (string | null)
│       │       ├── errorMessage  (string | null)
│       │       └── createdAt     (timestamp)
│       │
│       └── analytics/
│           └── {postUrn}/
│               ├── likes         (number)
│               ├── comments      (number)
│               ├── shares        (number)
│               ├── impressions   (number)
│               ├── engagementRate (number)
│               └── updatedAt     (timestamp)
│
└── users/
    └── default/
        └── settings/
            ├── postSchedule      (per-day schedule object)
            └── automation        (dailyTopic, automationEnabled, targetType)
```

---

## 8. Environment Variables (Vercel)

| Variable | Description |
|---|---|
| `LINKEDIN_CLIENT_ID` | LinkedIn Developer App Client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn Developer App Client Secret |
| `LINKEDIN_REDIRECT_URI` | `https://linkedin-ai-autoposter-phi.vercel.app/api/linkedinCallback` |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CRON_SECRET` | Secret token for GitHub Actions to call schedule API |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin SDK service account JSON (stringified) |

---

## 9. GitHub Actions Secrets Required

| Secret | Value |
|---|---|
| `VERCEL_API_URL` | `https://linkedin-ai-autoposter-phi.vercel.app` |
| `CRON_SECRET` | Same as Vercel `CRON_SECRET` env var |

---

## 10. Mobile App Details

- **Platform:** Android (Flutter)
- **Min SDK:** Android 5.0+ (API 21)
- **APK Location:** `mobile_app/build/app/outputs/flutter-apk/app-release.apk`
- **APK Size:** ~51.8 MB
- **API Base URL:** `https://linkedin-ai-autoposter-phi.vercel.app/api` (hardcoded default)

### Screens:
| Screen | Description |
|---|---|
| Login | Email/password sign in + sign up |
| Dashboard | Stats overview, next post time, LinkedIn status |
| Create Post | AI topic input, generate, edit, publish |
| History | All past posts with date, status, hashtags |
| Analytics | Engagement charts, per-post metrics |
| Settings | LinkedIn connect/disconnect, automation toggle, daily topic, posting time |

### Flutter Dependencies:
- `firebase_auth` — Authentication
- `cloud_firestore` — Database
- `http` — API calls to Vercel
- `url_launcher` — Open LinkedIn OAuth in browser
- `provider` — State management
- `fl_chart` — Analytics charts
- `flutter_secure_storage` — Secure local token storage
- `google_fonts` — Typography
- `shared_preferences` — Local settings

---

## 11. LinkedIn App Setup (Required)

**LinkedIn Developer Portal:** https://www.linkedin.com/developers/apps

| Setting | Value |
|---|---|
| App Name | LinkFlow AI |
| Client ID | `77jeenbnyqxcn` |
| App Type | Standalone App |
| **Redirect URI (must add)** | `https://linkedin-ai-autoposter-phi.vercel.app/api/linkedinCallback` |

### OAuth 2.0 Scopes Required:
- `r_liteprofile` — Read basic profile
- `r_emailaddress` — Read email
- `w_member_social` — Post to personal profile
- `w_organization_social` — Post to company page

---

## 12. How Auto-Posting Works (Step by Step)

```
1. User sets "Daily Topic" in app settings → saved to Firestore
2. GitHub Actions runs every minute (free, unlimited)
3. GitHub Actions calls:
   POST https://linkedin-ai-autoposter-phi.vercel.app/api/schedule/check-and-post
   Authorization: Bearer {CRON_SECRET}
4. Vercel checks current IST time vs scheduled time (±1 min)
5. If match found:
   a. Reads dailyTopic from Firestore
   b. Calls Gemini AI with topic → gets caption + hashtags
   c. Publishes to LinkedIn via UGC API
   d. Saves post record to Firestore
6. If no match → returns "Not yet time to post"
```

---

## 13. Deployment Info

| Service | URL / Location |
|---|---|
| **Web App** | https://linkedin-ai-autoposter-phi.vercel.app |
| **GitHub Repo** | https://github.com/mahavarvinayak/linkedin-ai-autoposter |
| **Firebase Project** | studio-1013588681-626a8 |
| **Firebase Auth Domain** | studio-1013588681-626a8.firebaseapp.com |

---

## 14. Known Limitations & Pending Items

| Item | Status | Notes |
|---|---|---|
| LinkedIn Redirect URI | ⚠️ **Must configure** | Add `https://linkedin-ai-autoposter-phi.vercel.app/api/linkedinCallback` in LinkedIn Developer Portal |
| Firebase Blaze Plan | ❌ Not needed | All functions moved to Vercel — Firebase free tier sufficient |
| LinkedIn impressions | ⚠️ Always 0 | LinkedIn API v2 requires Partner Program for impression data |
| iOS App | ❌ Not built | Only Android APK available currently |
| Post image generation | 🟡 Prompt only | Image prompt is generated by AI but image itself is not attached |
| `lastAutoPostedDate` dedup | ⚠️ Only in Firebase Functions | Vercel route does not deduplicate — may post multiple times if workflow runs overlap |

---

## 15. Cost Breakdown

| Service | Plan | Monthly Cost |
|---|---|---|
| Vercel | Hobby (Free) | ₹0 |
| Firebase | Spark (Free) | ₹0 |
| GitHub Actions | Free tier | ₹0 |
| Google Gemini API | Free tier (60 req/min) | ₹0 |
| LinkedIn API | Free (standard access) | ₹0 |
| **Total** | | **₹0/month** |

---

*Report generated automatically. Last updated: March 10, 2026.*
