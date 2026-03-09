# GitHub Actions + Vercel + Firebase Setup Guide

## Your Schedule Configuration

Save this to Firebase first:

```json
{
  "monday": {
    "time1": "10:17",
    "time2": "12:46"
  },
  "tuesday": {
    "time1": "09:14",
    "time2": "13:07"
  },
  "wednesday": {
    "time1": "10:21",
    "time2": "12:52"
  },
  "thursday": {
    "time1": "11:08",
    "time2": "13:19"
  },
  "friday": {
    "time1": "09:43",
    "time2": "12:11"
  },
  "saturday": {
    "time1": "10:36",
    "time2": "19:18"
  },
  "sunday": {
    "time1": "09:58",
    "time2": "19:12"
  }
}
```

---

## Step 1: GitHub Secrets Setup (5 mins)

1. Open your GitHub repo: https://github.com/mahavarvinayak/linkedin-ai-autoposter
2. Click **Settings** (top right)
3. Left sidebar → **Secrets and variables** → **Actions**
4. Click **"New repository secret"**

### Add these 3 secrets:

**Secret 1:**
```
Name: CRON_SECRET
Value: your-super-secret-token-change-me-12345
```

**Secret 2:**
```
Name: VERCEL_API_URL
Value: https://your-app-name.vercel.app
```
(Replace "your-app-name" with your actual Vercel project name)

**Secret 3:**
```
Name: FIREBASE_SERVICE_ACCOUNT_JSON
Value: [Entire service account JSON from Firebase]
```

To get Firebase JSON:
- Go Firebase Console → Project Settings → Service Accounts
- Click "Generate new private key"
- Copy the entire JSON and paste it

---

## Step 2: Vercel Environment Variables (5 mins)

1. Login to https://vercel.com
2. Select your project
3. Click **Settings** → **Environment Variables**
4. Add these variables:

```
CRON_SECRET = your-super-secret-token-change-me-12345
FIREBASE_SERVICE_ACCOUNT_JSON = [Entire JSON from Firebase]
LINKEDIN_CLIENT_ID = your-linkedin-app-id
LINKEDIN_CLIENT_SECRET = your-linkedin-app-secret
GENKIT_API_KEY = your-google-gemini-api-key
```

---

## Step 3: Firebase Schedule Data (2 mins)

1. Go Firebase Console → Firestore
2. Create path: `users` → `default` → `settings` → `postSchedule` (Create `postSchedule` as a document)
3. Paste the schedule JSON above in that document

---

## Step 4: Deploy! (1 min)

1. Vercel automatically deploys when you push changes
2. GitHub Actions automatically triggers cron checks every minute
3. Done! ✅

---

## How It Works

```
Every minute (GitHub Actions runs):
    ↓
POST /api/schedule/check-and-post
    ↓
Checks Firebase: "Is this the posting time for today?"
    ↓
If YES → Generates AI post + Image → LinkedIn
If NO → Waits for next minute
```

---

## Troubleshooting

**Q: Cron jobs not running?**
- Check GitHub Actions tab → Workflows → See if they're active
- Verify secrets are added correctly

**Q: Posts not posting?**
- Check Vercel logs: Vercel Dashboard → your project → Deployments → Function tab
- Ensure Firebase credentials are correct
- Check LinkedIn OAuth tokens are valid

**Q: How do I change posting times?**
- Edit the Firebase document `postSchedule`
- Changes take effect immediately (next minute)
- You can also do this from mobile app!

---

## Mobile App Support

Your mobile app will also work:
- Manual posts: Upload anytime via app
- Scheduled posts: Set from app, saved to Firebase
- Both work together seamlessly!

---

## Final Checklist

- [ ] GitHub secrets added (CRON_SECRET, VERCEL_API_URL, FIREBASE_SERVICE_ACCOUNT_JSON)
- [ ] Vercel environment variables added
- [ ] Firebase schedule document created with your timings
- [ ] Pushed code to GitHub
- [ ] Vercel deployed successfully
- [ ] Test: Check Vercel logs after 1 minute for "Post published"

**You're done!** 🚀
