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
