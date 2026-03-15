import * as admin from "firebase-admin";
import {GoogleGenerativeAI} from "@google/generative-ai";
import {NextRequest, NextResponse} from "next/server";

type JsonMap = Record<string, unknown>;

type ScheduledResult = {
  processedUsers: number;
  successCount: number;
  failureCount: number;
};

const DEFAULT_LINKEDIN_SCOPES = [
  "openid",
  "profile",
  "email",
  "w_member_social",
].join(" ");

function ensureAdminInitialized() {
  if (admin.apps.length > 0) return;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not found. Attempting default initialization...");
    admin.initializeApp();
    return;
  }

  try {
    const parsed = JSON.parse(serviceAccountJson) as Record<string, string>;
    const privateKey =
      (parsed.privateKey || parsed.private_key || "").replace(/\\n/g, "\n") ||
      undefined;

    const serviceAccount: admin.ServiceAccount = {
      projectId: parsed.projectId || parsed.project_id,
      clientEmail: parsed.clientEmail || parsed.client_email,
      privateKey,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized with service account.");
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON or initialize Admin SDK:", e);
    admin.initializeApp();
  }
}

function getDb() {
  ensureAdminInitialized();
  return admin.firestore();
}

function jsonError(message: string, status = 500) {
  return NextResponse.json({error: message}, {status});
}

function getRequiredEnv(name: string): string {
  // Support aliases (e.g. GEMINI_API_KEY or GENKIT_API_KEY)
  const names = name === "GEMINI_API_KEY" ? ["GEMINI_API_KEY", "GENKIT_API_KEY"] : [name];
  
  for (const n of names) {
    const value = process.env[n]?.trim();
    if (value) return value;
  }

  throw new Error(`Missing required environment variable: ${name} (checked ${names.join(", ")})`);
}

function getRedirectUri(req: NextRequest): string {
  const fromEnv = process.env.LINKEDIN_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;

  // Use the verified production URL by default to avoid mismatch errors
  return `https://linkedin-ai-autoposter-phi.vercel.app/api/linkedinCallback`;
}

function getLinkedinScopes(): string {
  return process.env.LINKEDIN_SCOPES?.trim() || DEFAULT_LINKEDIN_SCOPES;
}

function encodeOAuthState(uid: string): string {
  return Buffer.from(JSON.stringify({uid, ts: Date.now()})).toString("base64url");
}

function decodeOAuthState(state: string): string {
  const decoded = Buffer.from(state, "base64url").toString("utf8");
  const parsed = JSON.parse(decoded) as {uid?: string};
  if (!parsed.uid) {
    throw new Error("Invalid OAuth state");
  }
  return parsed.uid;
}

async function verifyAuth(req: NextRequest): Promise<admin.auth.DecodedIdToken> {
  ensureAdminInitialized();

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing auth token");
  }

  const token = authHeader.slice("Bearer ".length);
  return admin.auth().verifyIdToken(token);
}

async function readJsonBody(req: NextRequest): Promise<JsonMap> {
  try {
    return (await req.json()) as JsonMap;
  } catch {
    return {};
  }
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

function checkCronAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;

  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function handleLinkedinAuthUrl(req: NextRequest) {
  try {
    const decodedToken = await verifyAuth(req);
    const linkedinClientId = getRequiredEnv("LINKEDIN_CLIENT_ID");
    const redirectUri = getRedirectUri(req);
    const scopes = getLinkedinScopes();

    const state = encodeOAuthState(decodedToken.uid);
    const url =
      `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code&` +
      `client_id=${linkedinClientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}&` +
      `scope=${encodeURIComponent(scopes)}`;

    return NextResponse.json({url});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create auth URL";
    return jsonError(message, 401);
  }
}

export async function handleLinkedinCallback(req: NextRequest) {
  try {
    const db = getDb();
    const linkedinClientId = getRequiredEnv("LINKEDIN_CLIENT_ID");
    const linkedinClientSecret = getRequiredEnv("LINKEDIN_CLIENT_SECRET");

    const isGet = req.method === "GET";
    const body = isGet ? {} : await readJsonBody(req);
    const params = req.nextUrl.searchParams;

    const code =
      (isGet ? params.get("code") : (body.code as string | undefined)) || undefined;
    const state =
      (isGet ? params.get("state") : (body.state as string | undefined)) || undefined;

    console.log(`LinkedIn Callback [${req.method}]: code=${code ? "present" : "missing"}, state=${state ? "present" : "missing"}`);

    let uid: string;
    if (req.headers.get("authorization")?.startsWith("Bearer ")) {
      const decodedToken = await verifyAuth(req);
      uid = decodedToken.uid;
    } else if (state) {
      uid = decodeOAuthState(state);
    } else {
      console.error("LinkedIn Callback: Missing auth context (no bearer token and no valid state)");
      return jsonError("Missing auth context", 401);
    }

    if (!code) {
      return jsonError("Missing authorization code", 400);
    }

    const redirectUri = getRedirectUri(req);
    console.log(`LinkedIn Callback Redirect URI: ${redirectUri}`);

    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: linkedinClientId,
        client_secret: linkedinClientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("LinkedIn Access Token Error:", errorText);
      return jsonError(`LinkedIn Token Error: ${tokenResponse.status} - ${errorText}`, 400);
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };

    if (!tokenData.access_token) {
      const details = tokenData.error_description || tokenData.error || "Failed to get access token";
      return jsonError(details, 400);
    }

    const profileResponse = await fetch("https://api.linkedin.com/userinfo", {
      headers: {Authorization: `Bearer ${tokenData.access_token}`},
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error("LinkedIn Userinfo Error:", errorText);
      return jsonError(`LinkedIn Userinfo Error: ${profileResponse.status} - ${errorText}`, 400);
    }

    const profile = (await profileResponse.json()) as {
      sub?: string;
      name?: string;
      email?: string;
      picture?: string;
    };

    if (!profile.sub) {
      console.error("LinkedIn userinfo failed:", profile);
      return jsonError("Failed to fetch LinkedIn profile info", 400);
    }

    await db.collection("users").doc(uid).set(
      {
        linkedinId: profile.sub,
        linkedinName: profile.name,
        linkedinEmail: profile.email,
        linkedinProfilePicture: profile.picture,
        linkedinAccessToken: tokenData.access_token,
        linkedinTokenExpiry: Date.now() + (tokenData.expires_in || 0) * 1000,
      },
      {merge: true}
    );

    if (isGet) {
      return new Response(
        "<html><body style='font-family:Arial,sans-serif;padding:24px;'><h2>LinkedIn Connected</h2><p>You can return to LinkFlow AI app now.</p></body></html>",
        {
          status: 200,
          headers: {"Content-Type": "text/html; charset=utf-8"},
        }
      );
    }

    return NextResponse.json({success: true, linkedinId: profile.sub});
  } catch (error) {
    const message = error instanceof Error ? error.message : "LinkedIn callback failed";
    return jsonError(message, 500);
  }
}

export async function handleGeneratePost(req: NextRequest) {
  try {
    await verifyAuth(req);
    const geminiApiKey = getRequiredEnv("GEMINI_API_KEY");
    const body = await readJsonBody(req);

    const topic = (body.topic as string | undefined)?.trim();
    const category = (body.category as string | undefined)?.trim();

    const genAI = new GoogleGenerativeAI(geminiApiKey);
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

    console.log("Generating AI post for topic:", topic || category);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("AI Raw Response received.");
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return jsonError("Failed to parse AI response", 500);
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      caption?: string;
      hashtags?: string[];
    };

    return NextResponse.json({
      caption: parsed.caption || "",
      hashtags: parsed.hashtags || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate post";
    return jsonError(message, 500);
  }
}

export async function handleAnalyzeCompetitor(req: NextRequest) {
  try {
    await verifyAuth(req);
    const geminiApiKey = getRequiredEnv("GEMINI_API_KEY");
    const body = await readJsonBody(req);

    const competitorContent = (body.competitorContent as string | undefined)?.trim();
    const topic = (body.topic as string | undefined)?.trim();

    if (!competitorContent || !topic) {
      return jsonError("Missing competitorContent or topic", 400);
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});

    const prompt = `You are an expert LinkedIn ghostwriter. I will give you a few posts from a competitor, and a new topic I want to write about.
    
COMPETITOR's POSTS:
"""
${competitorContent}
"""

YOUR TASK:
1. Analyze the competitor's writing style, tone, sentence length, and formatting techniques (e.g., how they use line breaks, emojis, or hooks).
2. Write a completely fresh, unique, and engaging LinkedIn post about THIS NEW TOPIC: "${topic}".
3. IMPORTANT: Use the EXACT SAME tone, formatting style, and structure as the competitor, but do NOT copy their specific facts, company details, or sentences. The new post must be completely original content but feel like it was written by the same person.
4. Have a maximum caption length of 1500 characters.
5. Include 5-10 highly relevant hashtags.

Respond ONLY with valid JSON with two keys:
- "caption": the post text (string)
- "hashtags": array of hashtag strings (each starting with #)`;

    console.log("Analyzing competitor content for topic:", topic);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Competitor Analysis AI response received.");
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return jsonError("Failed to parse AI response", 500);
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      caption?: string;
      hashtags?: string[];
    };

    return NextResponse.json({
      caption: parsed.caption || "",
      hashtags: parsed.hashtags || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze competitor";
    return jsonError(message, 500);
  }
}

export async function handlePublishPost(req: NextRequest) {
  try {
    const db = getDb();
    const decodedToken = await verifyAuth(req);
    const body = await readJsonBody(req);

    const content = (body.content as string | undefined)?.trim();
    const targetType = (body.targetType as string | undefined) || "personal";
    const organizationId = (body.organizationId as string | undefined) || null;

    if (!content) {
      return jsonError("Missing content", 400);
    }

    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data() as
      | {
          linkedinId?: string;
          linkedinAccessToken?: string;
          linkedinTokenExpiry?: number;
        }
      | undefined;

    if (!userData?.linkedinAccessToken) {
      return jsonError("LinkedIn not connected", 400);
    }

    if (userData.linkedinTokenExpiry && Date.now() > userData.linkedinTokenExpiry) {
      return jsonError("LinkedIn token expired. Please reconnect.", 401);
    }

    const author =
      targetType === "organization" && organizationId
        ? `urn:li:organization:${organizationId}`
        : `urn:li:person:${userData.linkedinId}`;

    const linkedinResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userData.linkedinAccessToken}`,
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
    });

    if (!linkedinResponse.ok) {
      const errorBody = await linkedinResponse.text();
      return jsonError(`LinkedIn API error: ${errorBody}`, linkedinResponse.status);
    }

    const linkedinData = (await linkedinResponse.json()) as {id?: string};

    await db.collection("users").doc(decodedToken.uid).collection("posts").add({
      content,
      targetType,
      status: "posted",
      linkedinPostUrn: linkedinData.id || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      postUrn: linkedinData.id || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";
    return jsonError(message, 500);
  }
}

export async function handleFetchAnalytics(req: NextRequest) {
  try {
    const db = getDb();
    const decodedToken = await verifyAuth(req);
    const postUrn = req.nextUrl.searchParams.get("postUrn");

    if (!postUrn) {
      return jsonError("Missing postUrn parameter", 400);
    }

    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data() as
      | {
          linkedinAccessToken?: string;
        }
      | undefined;

    if (!userData?.linkedinAccessToken) {
      return jsonError("LinkedIn not connected", 400);
    }

    const encodedUrn = encodeURIComponent(postUrn);
    const socialResponse = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encodedUrn}`,
      {
        headers: {
          Authorization: `Bearer ${userData.linkedinAccessToken}`,
        },
      }
    );

    const socialData = (await socialResponse.json()) as {
      likesSummary?: {totalLikes?: number};
      commentsSummary?: {totalFirstLevelComments?: number};
      shareCount?: number;
    };

    const analytics = {
      postId: postUrn,
      likes: socialData.likesSummary?.totalLikes || 0,
      comments: socialData.commentsSummary?.totalFirstLevelComments || 0,
      shares: socialData.shareCount || 0,
      impressions: 0,
      engagementRate: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db
      .collection("users")
      .doc(decodedToken.uid)
      .collection("analytics")
      .doc(postUrn.replace(/[/:]/g, "_"))
      .set(analytics, {merge: true});

    return NextResponse.json(analytics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analytics fetch failed";
    return jsonError(message, 500);
  }
}

export async function handleUpdateAutomation(req: NextRequest) {
  try {
    const db = getDb();
    const decodedToken = await verifyAuth(req);
    const body = await readJsonBody(req);

    const enabled = Boolean(body.enabled);
    const postingTime = String(body.postingTime || "09:00");
    const targetType = String(body.targetType || "personal");
    const organizationId = (body.organizationId as string | undefined) || null;
    const dailyTopic = (body.dailyTopic as string | undefined) ?? undefined;

    await db.collection("users").doc(decodedToken.uid).set(
      {
        automationEnabled: enabled,
        postingTime,
        targetType,
        selectedOrganizationId: organizationId,
        ...(dailyTopic !== undefined && { dailyTopic }),
      },
      {merge: true}
    );

    return NextResponse.json({success: true});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation update failed";
    return jsonError(message, 500);
  }
}

export async function handleDisconnectLinkedin(req: NextRequest) {
  try {
    const db = getDb();
    const decodedToken = await verifyAuth(req);

    await db.collection("users").doc(decodedToken.uid).update({
      linkedinId: admin.firestore.FieldValue.delete(),
      linkedinAccessToken: admin.firestore.FieldValue.delete(),
      linkedinTokenExpiry: admin.firestore.FieldValue.delete(),
    });

    return NextResponse.json({success: true});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disconnect failed";
    return jsonError(message, 500);
  }
}

export async function runDailyPostAutomation(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const db = getDb();
    const geminiApiKey = getRequiredEnv("GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});

    const istNow = getIstNowParts();
    const usersSnapshot = await db.collection("users").where("automationEnabled", "==", true).get();

    let processedUsers = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data() as {
        postingTime?: string;
        lastAutoPostedDate?: string;
        linkedinAccessToken?: string;
        linkedinId?: string;
        targetType?: string;
        selectedOrganizationId?: string;
      };

      const postingTime = userData.postingTime || "09:00";

      if (postingTime !== istNow.time) continue;
      if (userData.lastAutoPostedDate === istNow.dateKey) continue;
      if (!userData.linkedinAccessToken) continue;

      processedUsers += 1;

      try {
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
        if (!jsonMatch) {
          failureCount += 1;
          continue;
        }

        const parsed = JSON.parse(jsonMatch[0]) as {
          caption: string;
          hashtags: string[];
        };

        const fullContent = `${parsed.caption}\n\n${parsed.hashtags.join(" ")}`;

        const author =
          userData.targetType === "organization" && userData.selectedOrganizationId
            ? `urn:li:organization:${userData.selectedOrganizationId}`
            : `urn:li:person:${userData.linkedinId}`;

        const linkedinResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userData.linkedinAccessToken}`,
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
        });

        const linkedinData = (await linkedinResponse.json()) as {id?: string};

        await db.collection("users").doc(userDoc.id).collection("posts").add({
          content: parsed.caption,
          hashtags: parsed.hashtags,
          targetType: userData.targetType || "personal",
          status: linkedinResponse.ok ? "posted" : "failed",
          linkedinPostUrn: linkedinData.id || null,
          errorMessage: linkedinResponse.ok ? null : JSON.stringify(linkedinData),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection("users").doc(userDoc.id).set(
          {
            lastAutoPostedDate: istNow.dateKey,
          },
          {merge: true}
        );

        if (linkedinResponse.ok) {
          successCount += 1;
        } else {
          failureCount += 1;
        }
      } catch (error) {
        failureCount += 1;
        await db.collection("users").doc(userDoc.id).collection("posts").add({
          content: "",
          status: "failed",
          errorMessage: `Automation error: ${error}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    const result: ScheduledResult = {
      processedUsers,
      successCount,
      failureCount,
    };

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daily automation failed";
    return jsonError(message, 500);
  }
}

export async function runAnalyticsRefresh(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const db = getDb();
    const usersSnapshot = await db.collection("users").where("automationEnabled", "==", true).get();

    let processedUsers = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data() as {linkedinAccessToken?: string};
      if (!userData.linkedinAccessToken) continue;

      processedUsers += 1;

      try {
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
          const postData = postDoc.data() as {linkedinPostUrn?: string};
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

          const socialData = (await socialResponse.json()) as {
            likesSummary?: {totalLikes?: number};
            commentsSummary?: {totalFirstLevelComments?: number};
            shareCount?: number;
          };

          const likes = socialData.likesSummary?.totalLikes || 0;
          const comments = socialData.commentsSummary?.totalFirstLevelComments || 0;
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

        successCount += 1;
      } catch {
        failureCount += 1;
      }
    }

    const result: ScheduledResult = {
      processedUsers,
      successCount,
      failureCount,
    };

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analytics refresh failed";
    return jsonError(message, 500);
  }
}
