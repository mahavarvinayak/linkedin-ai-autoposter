# **App Name**: LinkFlow AI

## Core Features:

- Secure LinkedIn Authentication: Allows users to securely connect their personal LinkedIn profiles and company pages (where they are admins) via OAuth 2.0, with tokens managed server-side by Next.js API routes for enhanced security.
- AI-powered Post Generation Tool: Utilizes the Gemini API (or user-provided BYOK AI models) to generate engaging, SEO-optimized LinkedIn post captions and relevant hashtags based on user-configured preferences or post categories. This is a generative AI tool that aids in creating professional content.
- Automated Daily Post Scheduling: Configurable scheduling system that leverages server-side logic (Next.js API routes with a task scheduler) to automatically publish one AI-generated post to LinkedIn each day at a user-defined time.
- Flexible Post Targeting: Enables users to select whether AI-generated or manually created posts are published to their personal LinkedIn profile or a connected company page.
- Post History and Status Tracking: Provides a comprehensive overview of all past posts, including scheduled, posted, and failed items, along with LinkedIn response details, allowing users to monitor their publishing activity.
- BYOK AI API Configuration: Allows users to integrate their own API keys for various AI models (e.g., OpenAI) by securely storing them using Firebase Secret Manager through Next.js API routes, offering flexibility in AI provider choice.

## Style Guidelines:

- The primary color is a sophisticated, deep blue (#2662D9), conveying trust, professionalism, and digital acumen for a productivity application. Its robust presence establishes a serious yet modern tone.
- The background color is a muted, desaturated blue-gray (#1F242E), providing a clean, non-distracting canvas that enhances readability in a dark theme, subtly hinting at the primary blue.
- A vibrant, almost iridescent purple (#AD6BF0) serves as the accent color. It creates strong visual contrast for calls-to-action and key interactive elements, signifying innovation and focus.
- The chosen font for both headlines and body text is 'Inter', a grotesque sans-serif. Its modern, objective, and neutral aesthetic ensures excellent readability and maintains a clean, professional appearance throughout the application.
- Utilize a consistent set of clean, modern, and universally recognizable line icons that clearly communicate functionality, reflecting the app's efficient and streamlined nature.
- Implement a structured, minimalist layout with generous whitespace. Prioritize content hierarchy and clear user flows to ensure an intuitive and efficient user experience, particularly for settings and dashboard views.
- Incorporate subtle, deliberate animations for state changes (e.g., loading states, successful actions) and interactive elements. Animations should enhance user feedback without causing distractions, emphasizing efficiency and responsiveness.