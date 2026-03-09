import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {onRequest, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {GoogleGenerativeAI} from "@google/generative-ai";

admin.initializeApp();
const db = admin.firestore();

// Secrets - set via: firebase functions:secrets:set SECRET_NAME
const linkedinClientId = defineSecret("LINKEDIN_CLIENT_ID");
const linkedinClientSecret = defineSecret("LINKEDIN_CLIENT_SECRET");
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// LinkedIn OAuth redirect URI - update to your deployed function URL
const LINKEDIN_REDIRECT_URI =
  "https://us-central1-studio-1013588681-626a8.cloudfunctions.net/linkedinCallback";

// ========================================
// Helper: Verify Firebase Auth token
// ========================================
async function verifyAuth(
  req: functions.https.Request
): Promise<admin.auth.DecodedIdToken> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpsError("unauthenticated", "Missing auth token");
  }
  const token = authHeader.split("Bearer ")[1];
  return admin.auth().verifyIdToken(token);
}

function encodeOAuthState(uid: string): string {
  return Buffer.from(
    JSON.stringify({uid, ts: Date.now()})
  ).toString("base64url");
}

function decodeOAuthState(state: string): string {
  const decoded = Buffer.from(state, "base64url").toString("utf8");
  const parsed = JSON.parse(decoded) as {uid?: string};
  if (!parsed.uid) {
    throw new HttpsError("invalid-argument", "Invalid OAuth state");
  }
  return parsed.uid;
}

function getIstNowParts(): {dateKey: string; time: string} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

// ========================================
// 1. LinkedIn OAuth - Get Auth URL
// ========================================
export const linkedinAuthUrl = onRequest(
  {secrets: [linkedinClientId]},
  async (req, res) => {
    try {
      const decodedToken = await verifyAuth(req);
      const scopes = [
        "r_liteprofile",
        "r_emailaddress",
        "w_member_social",
        "w_organization_social",
      ].join(" ");

      const state = encodeOAuthState(decodedToken.uid);
      const url =
        `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code&` +
        `client_id=${linkedinClientId.value()}&` +
        `redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&` +
        `state=${state}&` +
        `scope=${encodeURIComponent(scopes)}`;

      res.json({url});
    } catch (error: any) {
      res.status(401).json({error: error.message});
    }
  }
);

// ========================================
// 2. LinkedIn OAuth - Exchange Code
// ========================================
export const linkedinCallback = onRequest(
  {secrets: [linkedinClientId, linkedinClientSecret]},
  async (req, res) => {
    try {
      const code = (req.method === "GET" ? req.query.code : req.body?.code) as
        | string
        | undefined;
      const state = (req.method === "GET" ? req.query.state : req.body?.state) as
        | string
        | undefined;

      let uid: string;
      if (req.headers.authorization?.startsWith("Bearer ")) {
        const decodedToken = await verifyAuth(req);
        uid = decodedToken.uid;
      } else if (state) {
        uid = decodeOAuthState(state);
      } else {
        throw new HttpsError("unauthenticated", "Missing auth context");
      }

      if (!code) {
        res.status(400).json({error: "Missing authorization code"});
        return;
      }

      // Exchange code for access token
      const tokenResponse = await fetch(
        "https://www.linkedin.com/oauth/v2/accessToken",
        {
          method: "POST",
          headers: {"Content-Type": "application/x-www-form-urlencoded"},
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            redirect_uri: LINKEDIN_REDIRECT_URI,
            client_id: linkedinClientId.value(),
            client_secret: linkedinClientSecret.value(),
          }),
        }
      );

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        res.status(400).json({error: "Failed to get access token"});
        return;
      }

      // Get LinkedIn profile
      const profileResponse = await fetch(
        "https://api.linkedin.com/v2/me",
        {
          headers: {Authorization: `Bearer ${tokenData.access_token}`},
        }
      );
      const profile = await profileResponse.json();

      // Store token securely in Firestore (server-side only)
      await db.collection("users").doc(uid).set(
        {
          linkedinId: profile.id,
          linkedinAccessToken: tokenData.access_token,
          linkedinTokenExpiry: Date.now() + tokenData.expires_in * 1000,
        },
        {merge: true}
      );

      if (req.method === "GET") {
        res
          .status(200)
          .send(
            "<html><body style='font-family:Arial,sans-serif;padding:24px;'><h2>LinkedIn Connected</h2><p>You can return to LinkFlow AI app now.</p></body></html>"
          );
        return;
      }

      res.json({success: true, linkedinId: profile.id});
    } catch (error: any) {
      res.status(500).json({error: error.message});
    }
  }
);

// ========================================
// 3. Generate AI Post via Gemini
// ========================================
export const generatePost = onRequest(
  {secrets: [geminiApiKey]},
  async (req, res) => {
    try {
      await verifyAuth(req);
      const {topic, category} = req.body;

      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});

      const prompt = `As an expert LinkedIn content creator, generate a highly engaging LinkedIn post about "${topic || category || "technology"}".

The post must:
- Start with a strong, attention-grabbing hook line
- Provide valuable industry insight or a thought-provoking idea
- Maintain a conversational yet professional tone
- Be optimized for LinkedIn formatting (short paragraphs, line breaks)
- Have a maximum caption length of 1500 characters
- Include 5-10 highly relevant hashtags

Respond ONLY with valid JSON with two keys:
- "caption": the post text (string)
- "hashtags": array of hashtag strings (each starting with #)`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.status(500).json({error: "Failed to parse AI response"});
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      res.json({
        caption: parsed.caption,
        hashtags: parsed.hashtags,
      });
    } catch (error: any) {
      res.status(500).json({error: error.message});
    }
  }
);

// ========================================
// 4. Publish Post to LinkedIn
// ========================================
export const publishPost = onRequest(async (req, res) => {
  try {
    const decodedToken = await verifyAuth(req);
    const {content, targetType, organizationId} = req.body;

    // Get stored LinkedIn credentials from Firestore
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();

    if (!userData?.linkedinAccessToken) {
      res.status(400).json({error: "LinkedIn not connected"});
      return;
    }

    // Check token expiry
    if (userData.linkedinTokenExpiry && Date.now() > userData.linkedinTokenExpiry) {
      res.status(401).json({error: "LinkedIn token expired. Please reconnect."});
      return;
    }

    // Build author URN
    let author: string;
    if (targetType === "organization" && organizationId) {
      author = `urn:li:organization:${organizationId}`;
    } else {
      author = `urn:li:person:${userData.linkedinId}`;
    }

    // Post to LinkedIn UGC API
    const linkedinResponse = await fetch(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userData.linkedinAccessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {text: content},
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        }),
      }
    );

    if (!linkedinResponse.ok) {
      const errorBody = await linkedinResponse.text();
      res.status(linkedinResponse.status).json({
        error: `LinkedIn API error: ${errorBody}`,
      });
      return;
    }

    const linkedinData = await linkedinResponse.json();

    // Save post record to Firestore
    await db
      .collection("users")
      .doc(decodedToken.uid)
      .collection("posts")
      .add({
        content,
        targetType,
        status: "posted",
        linkedinPostUrn: linkedinData.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.json({
      success: true,
      postUrn: linkedinData.id,
    });
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

// ========================================
// 5. Fetch Post Analytics
// ========================================
export const fetchAnalytics = onRequest(async (req, res) => {
  try {
    const decodedToken = await verifyAuth(req);
    const postUrn = req.query.postUrn as string;

    if (!postUrn) {
      res.status(400).json({error: "Missing postUrn parameter"});
      return;
    }

    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();

    if (!userData?.linkedinAccessToken) {
      res.status(400).json({error: "LinkedIn not connected"});
      return;
    }

    // Fetch social actions (likes, comments, shares)
    const encodedUrn = encodeURIComponent(postUrn);
    const socialResponse = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encodedUrn}`,
      {
        headers: {
          Authorization: `Bearer ${userData.linkedinAccessToken}`,
        },
      }
    );

    const socialData = await socialResponse.json();

    const analytics = {
      postId: postUrn,
      likes: socialData.likesSummary?.totalLikes || 0,
      comments: socialData.commentsSummary?.totalFirstLevelComments || 0,
      shares: socialData.shareCount || 0,
      impressions: 0, // LinkedIn API v2 requires partner program for impressions
      engagementRate: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Calculate engagement rate
    const totalEngagement = analytics.likes + analytics.comments + analytics.shares;
    if (analytics.impressions > 0) {
      analytics.engagementRate =
        (totalEngagement / analytics.impressions) * 100;
    }

    // Save analytics to Firestore
    await db
      .collection("users")
      .doc(decodedToken.uid)
      .collection("analytics")
      .doc(postUrn.replace(/[/:]/g, "_"))
      .set(analytics, {merge: true});

    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

// ========================================
// 6. Update Automation Settings
// ========================================
export const updateAutomation = onRequest(async (req, res) => {
  try {
    const decodedToken = await verifyAuth(req);
    const {enabled, postingTime, targetType, organizationId, dailyTopic} = req.body;

    await db.collection("users").doc(decodedToken.uid).set(
      {
        automationEnabled: enabled,
        postingTime,
        targetType,
        selectedOrganizationId: organizationId || null,
        ...(dailyTopic !== undefined && {dailyTopic}),
      },
      {merge: true}
    );

    res.json({success: true});
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

// ========================================
// 7. Disconnect LinkedIn
// ========================================
export const disconnectLinkedIn = onRequest(async (req, res) => {
  try {
    const decodedToken = await verifyAuth(req);

    await db.collection("users").doc(decodedToken.uid).update({
      linkedinId: admin.firestore.FieldValue.delete(),
      linkedinAccessToken: admin.firestore.FieldValue.delete(),
      linkedinTokenExpiry: admin.firestore.FieldValue.delete(),
    });

    res.json({success: true});
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

// ========================================
// 8. Scheduled: Daily AI Post Generation
// ========================================
export const scheduledDailyPost = onSchedule(
  {
    // Run frequently and execute only for users whose configured posting time matches now.
    schedule: "every 30 minutes",
    timeZone: "Asia/Kolkata",
    secrets: [geminiApiKey],
  },
  async () => {
    const istNow = getIstNowParts();

    // Get all users with automation enabled
    const usersSnapshot = await db
      .collection("users")
      .where("automationEnabled", "==", true)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const postingTime = (userData.postingTime as string | undefined) || "09:00";

      if (postingTime !== istNow.time) {
        continue;
      }

      if (userData.lastAutoPostedDate === istNow.dateKey) {
        continue;
      }

      if (!userData.linkedinAccessToken) continue;

      try {
        // Generate AI post using user's configured daily topic
        const genAI = new GoogleGenerativeAI(geminiApiKey.value());
        const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});

        const topic = (userData.dailyTopic as string | undefined) || "latest trends in AI and technology";

        const prompt = `Generate a highly engaging LinkedIn post about "${topic}".

The post must:
- Start with a strong hook
- Provide valuable insight
- Conversational yet professional tone
- Maximum 1500 characters
- Include 5-10 relevant hashtags

Respond ONLY with valid JSON: {"caption": "...", "hashtags": ["#tag1", ...]}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) continue;
        const parsed = JSON.parse(jsonMatch[0]);
        const fullContent =
          parsed.caption + "\n\n" + parsed.hashtags.join(" ");

        // Build author URN
        let author: string;
        if (
          userData.targetType === "organization" &&
          userData.selectedOrganizationId
        ) {
          author = `urn:li:organization:${userData.selectedOrganizationId}`;
        } else {
          author = `urn:li:person:${userData.linkedinId}`;
        }

        // Publish to LinkedIn
        const linkedinResponse = await fetch(
          "https://api.linkedin.com/v2/ugcPosts",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${userData.linkedinAccessToken}`,
              "Content-Type": "application/json",
              "X-Restli-Protocol-Version": "2.0.0",
            },
            body: JSON.stringify({
              author,
              lifecycleState: "PUBLISHED",
              specificContent: {
                "com.linkedin.ugc.ShareContent": {
                  shareCommentary: {text: fullContent},
                  shareMediaCategory: "NONE",
                },
              },
              visibility: {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
              },
            }),
          }
        );

        const linkedinData = await linkedinResponse.json();

        // Save to Firestore
        await db
          .collection("users")
          .doc(userDoc.id)
          .collection("posts")
          .add({
            content: parsed.caption,
            hashtags: parsed.hashtags,
            targetType: userData.targetType || "personal",
            status: linkedinResponse.ok ? "posted" : "failed",
            linkedinPostUrn: linkedinData.id || null,
            errorMessage: linkedinResponse.ok
              ? null
              : JSON.stringify(linkedinData),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        await db.collection("users").doc(userDoc.id).set(
          {
            lastAutoPostedDate: istNow.dateKey,
          },
          {merge: true}
        );

        console.log(
          `Published daily post for user ${userDoc.id}`
        );
      } catch (error) {
        console.error(
          `Failed to publish for user ${userDoc.id}:`,
          error
        );

        await db
          .collection("users")
          .doc(userDoc.id)
          .collection("posts")
          .add({
            content: "",
            status: "failed",
            errorMessage: `Automation error: ${error}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
    }
  }
);

// ========================================
// 9. Scheduled: Analytics Refresh (every 6 hours)
// ========================================
export const scheduledAnalyticsRefresh = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "Asia/Kolkata",
  },
  async () => {
    const usersSnapshot = await db
      .collection("users")
      .where("automationEnabled", "==", true)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (!userData.linkedinAccessToken) continue;

      try {
        // Get recent posted posts
        const postsSnapshot = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("posts")
          .where("status", "==", "posted")
          .where("linkedinPostUrn", "!=", null)
          .orderBy("createdAt", "desc")
          .limit(20)
          .get();

        for (const postDoc of postsSnapshot.docs) {
          const postData = postDoc.data();
          const postUrn = postData.linkedinPostUrn;
          if (!postUrn) continue;

          const encodedUrn = encodeURIComponent(postUrn);
          const socialResponse = await fetch(
            `https://api.linkedin.com/v2/socialActions/${encodedUrn}`,
            {
              headers: {
                Authorization: `Bearer ${userData.linkedinAccessToken}`,
              },
            }
          );

          if (!socialResponse.ok) continue;
          const socialData = await socialResponse.json();

          const likes = socialData.likesSummary?.totalLikes || 0;
          const comments =
            socialData.commentsSummary?.totalFirstLevelComments || 0;
          const shares = socialData.shareCount || 0;

          await db
            .collection("users")
            .doc(userDoc.id)
            .collection("analytics")
            .doc(postUrn.replace(/[/:]/g, "_"))
            .set(
              {
                postId: postUrn,
                likes,
                comments,
                shares,
                impressions: 0,
                engagementRate: 0,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              {merge: true}
            );
        }

        console.log(
          `Analytics refreshed for user ${userDoc.id}`
        );
      } catch (error) {
        console.error(
          `Analytics refresh failed for user ${userDoc.id}:`,
          error
        );
      }
    }
  }
);
