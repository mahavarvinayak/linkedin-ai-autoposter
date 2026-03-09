"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledAnalyticsRefresh = exports.scheduledDailyPost = exports.disconnectLinkedIn = exports.updateAutomation = exports.fetchAnalytics = exports.publishPost = exports.generatePost = exports.linkedinCallback = exports.linkedinAuthUrl = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const generative_ai_1 = require("@google/generative-ai");
admin.initializeApp();
const db = admin.firestore();
// Secrets - set via: firebase functions:secrets:set SECRET_NAME
const linkedinClientId = (0, params_1.defineSecret)("LINKEDIN_CLIENT_ID");
const linkedinClientSecret = (0, params_1.defineSecret)("LINKEDIN_CLIENT_SECRET");
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
// LinkedIn OAuth redirect URI - update to your deployed function URL
const LINKEDIN_REDIRECT_URI = "https://us-central1-studio-1013588681-626a8.cloudfunctions.net/linkedinCallback";
// ========================================
// Helper: Verify Firebase Auth token
// ========================================
async function verifyAuth(req) {
    const authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
        throw new https_1.HttpsError("unauthenticated", "Missing auth token");
    }
    const token = authHeader.split("Bearer ")[1];
    return admin.auth().verifyIdToken(token);
}
function encodeOAuthState(uid) {
    return Buffer.from(JSON.stringify({ uid, ts: Date.now() })).toString("base64url");
}
function decodeOAuthState(state) {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (!parsed.uid) {
        throw new https_1.HttpsError("invalid-argument", "Invalid OAuth state");
    }
    return parsed.uid;
}
function getIstNowParts() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date());
    const get = (type) => { var _a; return ((_a = parts.find((p) => p.type === type)) === null || _a === void 0 ? void 0 : _a.value) || "00"; };
    return {
        dateKey: `${get("year")}-${get("month")}-${get("day")}`,
        time: `${get("hour")}:${get("minute")}`,
    };
}
// ========================================
// 1. LinkedIn OAuth - Get Auth URL
// ========================================
exports.linkedinAuthUrl = (0, https_1.onRequest)({ secrets: [linkedinClientId] }, async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const scopes = [
            "r_liteprofile",
            "r_emailaddress",
            "w_member_social",
            "w_organization_social",
        ].join(" ");
        const state = encodeOAuthState(decodedToken.uid);
        const url = `https://www.linkedin.com/oauth/v2/authorization?` +
            `response_type=code&` +
            `client_id=${linkedinClientId.value()}&` +
            `redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&` +
            `state=${state}&` +
            `scope=${encodeURIComponent(scopes)}`;
        res.json({ url });
    }
    catch (error) {
        res.status(401).json({ error: error.message });
    }
});
// ========================================
// 2. LinkedIn OAuth - Exchange Code
// ========================================
exports.linkedinCallback = (0, https_1.onRequest)({ secrets: [linkedinClientId, linkedinClientSecret] }, async (req, res) => {
    var _a, _b, _c;
    try {
        const code = (req.method === "GET" ? req.query.code : (_a = req.body) === null || _a === void 0 ? void 0 : _a.code);
        const state = (req.method === "GET" ? req.query.state : (_b = req.body) === null || _b === void 0 ? void 0 : _b.state);
        let uid;
        if ((_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.startsWith("Bearer ")) {
            const decodedToken = await verifyAuth(req);
            uid = decodedToken.uid;
        }
        else if (state) {
            uid = decodeOAuthState(state);
        }
        else {
            throw new https_1.HttpsError("unauthenticated", "Missing auth context");
        }
        if (!code) {
            res.status(400).json({ error: "Missing authorization code" });
            return;
        }
        // Exchange code for access token
        const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: LINKEDIN_REDIRECT_URI,
                client_id: linkedinClientId.value(),
                client_secret: linkedinClientSecret.value(),
            }),
        });
        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) {
            res.status(400).json({ error: "Failed to get access token" });
            return;
        }
        // Get LinkedIn profile
        const profileResponse = await fetch("https://api.linkedin.com/v2/me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileResponse.json();
        // Store token securely in Firestore (server-side only)
        await db.collection("users").doc(uid).set({
            linkedinId: profile.id,
            linkedinAccessToken: tokenData.access_token,
            linkedinTokenExpiry: Date.now() + tokenData.expires_in * 1000,
        }, { merge: true });
        if (req.method === "GET") {
            res
                .status(200)
                .send("<html><body style='font-family:Arial,sans-serif;padding:24px;'><h2>LinkedIn Connected</h2><p>You can return to LinkFlow AI app now.</p></body></html>");
            return;
        }
        res.json({ success: true, linkedinId: profile.id });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========================================
// 3. Generate AI Post via Gemini
// ========================================
exports.generatePost = (0, https_1.onRequest)({ secrets: [geminiApiKey] }, async (req, res) => {
    try {
        await verifyAuth(req);
        const { topic, category } = req.body;
        const genAI = new generative_ai_1.GoogleGenerativeAI(geminiApiKey.value());
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
            res.status(500).json({ error: "Failed to parse AI response" });
            return;
        }
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({
            caption: parsed.caption,
            hashtags: parsed.hashtags,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========================================
// 4. Publish Post to LinkedIn
// ========================================
exports.publishPost = (0, https_1.onRequest)(async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const { content, targetType, organizationId } = req.body;
        // Get stored LinkedIn credentials from Firestore
        const userDoc = await db.collection("users").doc(decodedToken.uid).get();
        const userData = userDoc.data();
        if (!(userData === null || userData === void 0 ? void 0 : userData.linkedinAccessToken)) {
            res.status(400).json({ error: "LinkedIn not connected" });
            return;
        }
        // Check token expiry
        if (userData.linkedinTokenExpiry && Date.now() > userData.linkedinTokenExpiry) {
            res.status(401).json({ error: "LinkedIn token expired. Please reconnect." });
            return;
        }
        // Build author URN
        let author;
        if (targetType === "organization" && organizationId) {
            author = `urn:li:organization:${organizationId}`;
        }
        else {
            author = `urn:li:person:${userData.linkedinId}`;
        }
        // Post to LinkedIn UGC API
        const linkedinResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
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
                        shareCommentary: { text: content },
                        shareMediaCategory: "NONE",
                    },
                },
                visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
                },
            }),
        });
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========================================
// 5. Fetch Post Analytics
// ========================================
exports.fetchAnalytics = (0, https_1.onRequest)(async (req, res) => {
    var _a, _b;
    try {
        const decodedToken = await verifyAuth(req);
        const postUrn = req.query.postUrn;
        if (!postUrn) {
            res.status(400).json({ error: "Missing postUrn parameter" });
            return;
        }
        const userDoc = await db.collection("users").doc(decodedToken.uid).get();
        const userData = userDoc.data();
        if (!(userData === null || userData === void 0 ? void 0 : userData.linkedinAccessToken)) {
            res.status(400).json({ error: "LinkedIn not connected" });
            return;
        }
        // Fetch social actions (likes, comments, shares)
        const encodedUrn = encodeURIComponent(postUrn);
        const socialResponse = await fetch(`https://api.linkedin.com/v2/socialActions/${encodedUrn}`, {
            headers: {
                Authorization: `Bearer ${userData.linkedinAccessToken}`,
            },
        });
        const socialData = await socialResponse.json();
        const analytics = {
            postId: postUrn,
            likes: ((_a = socialData.likesSummary) === null || _a === void 0 ? void 0 : _a.totalLikes) || 0,
            comments: ((_b = socialData.commentsSummary) === null || _b === void 0 ? void 0 : _b.totalFirstLevelComments) || 0,
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
            .set(analytics, { merge: true });
        res.json(analytics);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========================================
// 6. Update Automation Settings
// ========================================
exports.updateAutomation = (0, https_1.onRequest)(async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        const { enabled, postingTime, targetType, organizationId } = req.body;
        await db.collection("users").doc(decodedToken.uid).set({
            automationEnabled: enabled,
            postingTime,
            targetType,
            selectedOrganizationId: organizationId || null,
        }, { merge: true });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========================================
// 7. Disconnect LinkedIn
// ========================================
exports.disconnectLinkedIn = (0, https_1.onRequest)(async (req, res) => {
    try {
        const decodedToken = await verifyAuth(req);
        await db.collection("users").doc(decodedToken.uid).update({
            linkedinId: admin.firestore.FieldValue.delete(),
            linkedinAccessToken: admin.firestore.FieldValue.delete(),
            linkedinTokenExpiry: admin.firestore.FieldValue.delete(),
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========================================
// 8. Scheduled: Daily AI Post Generation
// ========================================
exports.scheduledDailyPost = (0, scheduler_1.onSchedule)({
    // Run frequently and execute only for users whose configured posting time matches now.
    schedule: "every 30 minutes",
    timeZone: "Asia/Kolkata",
    secrets: [geminiApiKey],
}, async () => {
    const istNow = getIstNowParts();
    // Get all users with automation enabled
    const usersSnapshot = await db
        .collection("users")
        .where("automationEnabled", "==", true)
        .get();
    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const postingTime = userData.postingTime || "09:00";
        if (postingTime !== istNow.time) {
            continue;
        }
        if (userData.lastAutoPostedDate === istNow.dateKey) {
            continue;
        }
        if (!userData.linkedinAccessToken)
            continue;
        try {
            // Generate AI post
            const genAI = new generative_ai_1.GoogleGenerativeAI(geminiApiKey.value());
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const topics = [
                "AI and machine learning trends",
                "startup growth strategies",
                "technology leadership",
                "future of work",
                "digital transformation",
                "productivity and efficiency",
                "innovation in tech",
            ];
            const randomTopic = topics[Math.floor(Math.random() * topics.length)];
            const prompt = `Generate a highly engaging LinkedIn post about "${randomTopic}".

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
            if (!jsonMatch)
                continue;
            const parsed = JSON.parse(jsonMatch[0]);
            const fullContent = parsed.caption + "\n\n" + parsed.hashtags.join(" ");
            // Build author URN
            let author;
            if (userData.targetType === "organization" &&
                userData.selectedOrganizationId) {
                author = `urn:li:organization:${userData.selectedOrganizationId}`;
            }
            else {
                author = `urn:li:person:${userData.linkedinId}`;
            }
            // Publish to LinkedIn
            const linkedinResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
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
                            shareCommentary: { text: fullContent },
                            shareMediaCategory: "NONE",
                        },
                    },
                    visibility: {
                        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
                    },
                }),
            });
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
            await db.collection("users").doc(userDoc.id).set({
                lastAutoPostedDate: istNow.dateKey,
            }, { merge: true });
            console.log(`Published daily post for user ${userDoc.id}`);
        }
        catch (error) {
            console.error(`Failed to publish for user ${userDoc.id}:`, error);
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
});
// ========================================
// 9. Scheduled: Analytics Refresh (every 6 hours)
// ========================================
exports.scheduledAnalyticsRefresh = (0, scheduler_1.onSchedule)({
    schedule: "every 6 hours",
    timeZone: "Asia/Kolkata",
}, async () => {
    var _a, _b;
    const usersSnapshot = await db
        .collection("users")
        .where("automationEnabled", "==", true)
        .get();
    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (!userData.linkedinAccessToken)
            continue;
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
                if (!postUrn)
                    continue;
                const encodedUrn = encodeURIComponent(postUrn);
                const socialResponse = await fetch(`https://api.linkedin.com/v2/socialActions/${encodedUrn}`, {
                    headers: {
                        Authorization: `Bearer ${userData.linkedinAccessToken}`,
                    },
                });
                if (!socialResponse.ok)
                    continue;
                const socialData = await socialResponse.json();
                const likes = ((_a = socialData.likesSummary) === null || _a === void 0 ? void 0 : _a.totalLikes) || 0;
                const comments = ((_b = socialData.commentsSummary) === null || _b === void 0 ? void 0 : _b.totalFirstLevelComments) || 0;
                const shares = socialData.shareCount || 0;
                await db
                    .collection("users")
                    .doc(userDoc.id)
                    .collection("analytics")
                    .doc(postUrn.replace(/[/:]/g, "_"))
                    .set({
                    postId: postUrn,
                    likes,
                    comments,
                    shares,
                    impressions: 0,
                    engagementRate: 0,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            }
            console.log(`Analytics refreshed for user ${userDoc.id}`);
        }
        catch (error) {
            console.error(`Analytics refresh failed for user ${userDoc.id}:`, error);
        }
    }
});
//# sourceMappingURL=index.js.map