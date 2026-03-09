# LinkFlow AI - LinkedIn Automation

This is a high-performance LinkedIn automation dashboard built with Next.js, Firebase, and Genkit AI.

## Features
- **AI Post Generation**: Powered by Gemini 2.5 Flash with BYOK (Bring Your Own Key) support.
- **LinkedIn Automation**: UI for scheduling and managing daily posts.
- **Analytics Dashboard**: Real-time performance tracking with Recharts.
- **Mobile Optimized**: Fully responsive design for Android and iOS.

## How to use on Android (Native Experience)
Since this is a Next.js application, you can use it as a Progressive Web App (PWA) on your Android device:
1. **Deploy to Firebase**: Run the deployment through the Firebase Studio interface or via Firebase CLI.
2. **Open in Chrome**: Navigate to your deployed URL on your Android phone.
3. **Add to Home Screen**: Tap the three dots in Chrome and select "Install app" or "Add to Home screen".
4. **Launch**: The app will now appear in your app drawer and run without a browser UI, providing a full-screen automation experience.

## Deployment
To deploy this project to Firebase App Hosting:
1. Ensure your project is connected to a GitHub repository.
2. Set up App Hosting in the Firebase Console.
3. Configure your Environment Variables (like `GEMINI_API_KEY`) in the Firebase Console secrets manager.

## Local Development
```bash
npm install
npm run dev
```

## Flutter Mobile App (Android APK)

This repository now includes a full Flutter mobile app at `mobile_app/` and Firebase Cloud Functions at `functions/`.

### Mobile app path
- `mobile_app/`

### Cloud Functions path
- `functions/`

### 1. Configure Firebase for Flutter Android
1. In Firebase Console, add Android app package:
	- `com.linkflowai.linkflow_ai`
2. Download `google-services.json` and replace:
	- `mobile_app/android/app/google-services.json`
3. In `mobile_app/lib/firebase_options.dart`, replace placeholder values:
	- `apiKey`
	- `appId`

### 2. Configure LinkedIn + Gemini secrets
Run from repo root:

```bash
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
firebase functions:secrets:set GEMINI_API_KEY
```

Also configure LinkedIn OAuth redirect URL to your deployed callback endpoint:
- `https://us-central1-studio-1013588681-626a8.cloudfunctions.net/linkedinCallback`

### 3. Install and deploy Cloud Functions
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 4. Deploy Firestore rules
```bash
firebase deploy --only firestore:rules
```

### 5. Run Flutter app locally
```bash
cd mobile_app
flutter pub get
flutter run
```

### 6. Build Android APK (release)
```bash
cd mobile_app
flutter build apk --release
```

APK output path:
- `mobile_app/build/app/outputs/flutter-apk/app-release.apk`

### Implemented mobile features
- Firebase Authentication (email/password)
- LinkedIn connect/disconnect flow via Cloud Functions
- AI post generation via Gemini through secure backend
- LinkedIn publishing via LinkedIn UGC Posts API
- Automation settings (daily time, target type, on/off)
- Dashboard with connection status, next post, engagement, total posts
- Analytics screen with key metrics and chart
- Post history and draft management

### Security model
- LinkedIn tokens are only stored server-side in Firestore via Cloud Functions.
- Flutter app never stores LinkedIn access tokens.
- API keys are stored as Firebase Functions secrets.
