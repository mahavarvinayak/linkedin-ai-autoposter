import * as admin from "firebase-admin";
import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

type JsonMap = Record<string, unknown>;

type ScheduledResult = {
  processedUsers: number;
  successCount: number;
  failureCount: number;
};

const WEEKLY_SCHEDULE: Record<string, string[]> = {
  "Monday": ["10:17", "12:46"],
  "Tuesday": ["09:14", "13:07"],
  "Wednesday": ["10:21", "12:52"],
  "Thursday": ["11:08", "13:19"],
  "Friday": ["09:43", "12:11"],
  "Saturday": ["10:36", "19:18"],
  "Sunday": ["09:58", "19:12"],
};

const DEFAULT_LINKEDIN_SCOPES = [
  "openid",
  "profile",
  "email",
  "w_member_social",
].join(" ");

/** Escape control characters inside JSON string values so JSON.parse won't choke */
function sanitizeLlmJson(raw: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { result += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString && ch.charCodeAt(0) < 0x20) {
      if (ch === '\n') { result += '\\n'; continue; }
      if (ch === '\r') { result += '\\r'; continue; }
      if (ch === '\t') { result += '\\t'; continue; }
      continue; // skip other control chars
    }
    result += ch;
  }
  return result;
}

async function generateWithFallback(
  groq: Groq, 
  preferredModel: string, 
  prompt: string | any[],
  fallbacks: string[] = ["llama-3.1-8b-instant", "mixtral-8x7b-32768"],
  maxTokens?: number
) {
  const modelsToTry = [preferredModel, ...fallbacks];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[AI] Attempting generation with model: ${modelName}`);
      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt as any }],
        model: modelName,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      });
      return { response: response.choices[0]?.message?.content || "", modelUsed: modelName };
    } catch (err) {
      console.warn(`[AI Warning] Model ${modelName} failed:`, err);
      lastError = err;
      continue;
    }
  }
  throw lastError || new Error("All Groq models failed");
}

/** Public diagnostic endpoint — no auth required */
export async function handlePingAI(req: NextRequest) {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    envCheck: {},
    modelTests: [],
  };

  // 1) Check env vars
  const groqKey = process.env.GROQ_API_KEY?.trim();
  diagnostics.envCheck.GROQ_API_KEY = groqKey ? `SET (${groqKey.slice(0, 6)}...${groqKey.slice(-4)})` : "MISSING";
  diagnostics.envCheck.FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? "SET" : "MISSING";
  diagnostics.envCheck.LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID ? "SET" : "MISSING";

  if (!groqKey) {
    return NextResponse.json({ ...diagnostics, error: "GROQ_API_KEY is not set on Vercel!" }, { status: 500 });
  }

  // 2) Try each model with a tiny prompt
  const groq = new Groq({ apiKey: groqKey });
  const testModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];

  for (const modelName of testModels) {
    try {
      const result = await groq.chat.completions.create({
        messages: [{ role: "user", content: "Say hello in one word." }],
        model: modelName,
      });
      const text = result.choices[0]?.message?.content || "";
      diagnostics.modelTests.push({ model: modelName, status: "OK", response: text.slice(0, 50) });
      break; // Stop at first success
    } catch (err: any) {
      diagnostics.modelTests.push({ model: modelName, status: "FAILED", error: err.message || String(err) });
    }
  }

  const anyWorking = diagnostics.modelTests.some((t: any) => t.status === "OK");
  return NextResponse.json({ ...diagnostics, overallStatus: anyWorking ? "AI_WORKING" : "ALL_MODELS_FAILED" });
}

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
  return NextResponse.json({ error: message }, { status });
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
  return Buffer.from(JSON.stringify({ uid, ts: Date.now() })).toString("base64url");
}

function decodeOAuthState(state: string): string {
  const decoded = Buffer.from(state, "base64url").toString("utf8");
  const parsed = JSON.parse(decoded) as { uid?: string };
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

function getIstNowParts(): { dateKey: string; time: string; day: string } {
  const dateObj = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "long",
  }).formatToParts(dateObj);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    day: get("weekday"),
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

    return NextResponse.json({ url });
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
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
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

    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
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
      { merge: true }
    );

    if (isGet) {
      return new Response(
        "<html><body style='font-family:Arial,sans-serif;padding:24px;'><h2>LinkedIn Connected</h2><p>You can return to LinkFlow AI app now.</p></body></html>",
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    return NextResponse.json({ success: true, linkedinId: profile.sub });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LinkedIn callback failed";
    return jsonError(message, 500);
  }
}

export async function handleGeneratePost(req: NextRequest) {
  try {
    await verifyAuth(req);
    const groqApiKey = getRequiredEnv("GROQ_API_KEY");
    const body = await readJsonBody(req);

    const topic = (body.topic as string | undefined)?.trim();
    const category = (body.category as string | undefined)?.trim();

    const groq = new Groq({ apiKey: groqApiKey });
    
    const prompt = `You are a high-end LinkedIn social media manager for top tech influencers. 
Generate a VIRAL, high-quality LinkedIn post about "${topic || category || "technology"}".

TONE:
- Use a "human" voice. Avoid "AI-isms" like "delve into," "unlock," "revolutionize."
- Be bold, insightful, and slightly opinionated.
- Write like a practitioner, not a marketer.

STRUCTURE:
- A strong "hook" as the first line (must stop the scroll).
- Short paragraphs (1-3 sentences max each).
- Use bullet points or numbered lists if it adds clarity.
- Include a "pro-tip" or a counter-intuitive insight.
- End with an engaging question to spark comments.

CONSTRAINTS:
- 800 to 1400 characters total.
- Use 5-8 relevant, trending hashtags.
- DO NOT invent facts. Use industry-standard wisdom.

Respond ONLY with JSON: {"caption": "...", "hashtags": ["#tag1", ...]}`;

    const { response: text, modelUsed: postModel } = await generateWithFallback(groq, "llama-3.3-70b-versatile", prompt, undefined, 2048);
    console.log(`[AI Success] Used post model: ${postModel}`);
    console.log("[AI] Raw Response length:", text.length);
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return jsonError("Failed to parse AI response", 500);
    }

    const parsed = JSON.parse(sanitizeLlmJson(jsonMatch[0])) as {
      caption?: string;
      hashtags?: string[];
    };

    return NextResponse.json({
      caption: parsed.caption || "",
      hashtags: parsed.hashtags || [],
    });
  } catch (error) {
    console.error("[AI Error] handleGeneratePost failed:", error);
    const message = error instanceof Error ? error.message : "Failed to generate post";
    return jsonError(message, 500);
  }
}

async function generateImageWithProviders(prompt: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const cfToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const hfToken = process.env.HF_API_KEY?.trim();

  console.log(`[AI Image] Env check — CF_ACCOUNT: ${accountId ? 'SET' : 'MISSING'}, CF_TOKEN: ${cfToken ? 'SET' : 'MISSING'}, HF_KEY: ${hfToken ? 'SET' : 'MISSING'}`);

  const errors: string[] = [];

  // Try Cloudflare first
  if (accountId && cfToken) {
    try {
      console.log("[AI Image] Attempting Cloudflare Workers AI...");
      const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`;
      const cfResp = await fetch(cfUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cfToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });
      if (!cfResp.ok) {
        const errorText = await cfResp.text();
        throw new Error(`Cloudflare HTTP ${cfResp.status}: ${errorText}`);
      }

      const contentType = cfResp.headers.get("content-type") || "image/png";
      const buffer = await cfResp.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mime = contentType.includes("png") ? "image/png" : "image/jpeg";
      console.log("[AI Image] Cloudflare success!");
      return `data:${mime};base64,${base64}`;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn("[AI Image] Cloudflare failed:", msg);
      errors.push(`Cloudflare: ${msg}`);
    }
  } else {
    errors.push("Cloudflare: missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN");
  }

  // Fallback to Hugging Face
  if (hfToken) {
    try {
      console.log("[AI Image] Attempting Hugging Face Inference API...");
      const hfUrl = "https://router.huggingface.co/models/black-forest-labs/FLUX.1-schnell";
      const hfResp = await fetch(hfUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
      });
      if (!hfResp.ok) {
        const errorText = await hfResp.text();
        throw new Error(`HuggingFace HTTP ${hfResp.status}: ${errorText}`);
      }

      const contentType = hfResp.headers.get("content-type") || "image/jpeg";
      const buffer = await hfResp.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mime = contentType.includes("png") ? "image/png" : "image/jpeg";
      console.log("[AI Image] Hugging Face success!");
      return `data:${mime};base64,${base64}`;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn("[AI Image] Hugging Face failed:", msg);
      errors.push(`HuggingFace: ${msg}`);
    }
  } else {
    errors.push("HuggingFace: missing HF_API_KEY");
  }

  // Final fallback: Pollinations AI (free, no API key, returns URL directly)
  try {
    console.log("[AI Image] Using Pollinations AI as final fallback...");
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true&model=flux&seed=${Math.floor(Math.random() * 1000000)}`;
    return pollinationsUrl;
  } catch (err: any) {
    errors.push(`Pollinations: ${err?.message || String(err)}`);
  }

  throw new Error(`All image providers failed. Details: ${errors.join(' | ')}`);
}

export async function handleGenerateImage(req: NextRequest) {
  try {
    const decodedToken = await verifyAuth(req);
    const groqApiKey = getRequiredEnv("GROQ_API_KEY");
    const body = await readJsonBody(req);

    const topic = (body.topic as string | undefined)?.trim();
    if (!topic) {
      return jsonError("Missing topic for image generation", 400);
    }

    const groq = new Groq({ apiKey: groqApiKey });

    // Step 1: Generate a SHORT image description using text model
    const descPrompt = `Write a 1-2 sentence image description for a LinkedIn post about "${topic}". Professional, modern style. ONLY the description, nothing else.`;

    const { response: text, modelUsed: descModel } = await generateWithFallback(groq, "llama-3.3-70b-versatile", descPrompt, undefined, 100);
    console.log(`[AI Image] Description generated with: ${descModel}`);
    const imageDescription = text.trim();

    // Step 2: Use Cloudflare/HuggingFace for image generation
    const imageUrl = await generateImageWithProviders(imageDescription);
    return NextResponse.json({ success: true, imageUrl });

  } catch (error) {
    console.error("[AI Image Error]:", error);
    const message = error instanceof Error ? error.message : "Image generation failed";
    return jsonError(message, 500);
  }
}

export async function handleAnalyzeCompetitor(req: NextRequest) {
  try {
    await verifyAuth(req);
    const groqApiKey = getRequiredEnv("GROQ_API_KEY");
    const body = await readJsonBody(req);

    const competitorContent = (body.competitorContent as string | undefined)?.trim();
    const screenshotData = body.screenshotData as string | undefined; // Base64 or URL
    const topic = (body.topic as string | undefined)?.trim();

    if ((!competitorContent && !screenshotData) || !topic) {
      return jsonError("Missing competitor content/screenshot or topic", 400);
    }

    const groq = new Groq({ apiKey: groqApiKey });

    let contentArr: any[] = [];
    if (screenshotData && screenshotData.startsWith("data:")) {
      contentArr.push({
        type: "image_url",
        image_url: {
          url: screenshotData,
        }
      });
    }

    const analysisPrompt = competitorContent 
      ? `Analyze the following competitor posts: "${competitorContent}"`
      : `Analyze the writing style, tone, and formatting of the LinkedIn post in this screenshot.`;

    contentArr.push({ type: "text", text: `${analysisPrompt}
    
YOUR TASK:
1. Extract or analyze the writing style, tone, sentence length, and formatting techniques.
2. Write a completely fresh, unique, and engaging LinkedIn post about THIS NEW TOPIC: "${topic}".
3. Use the EXACT SAME tone and structure as the competitor.
4. IMPORTANT: Do NOT invent fake facts, statistics, or quotes. Only include verifiable, widely known information. Focus on genuine insights and thought leadership.
5. Maximum 1500 characters.
6. Include 5-10 relevant hashtags.

Respond ONLY with valid JSON: {"caption": "...", "hashtags": ["#tag1", ...]}` });

    console.log("[AI Spy] Analyzing competitor multimodal content for topic:", topic);
    const preferredModel = screenshotData ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";
    const { response: text, modelUsed: spyModel } = await generateWithFallback(groq, preferredModel, contentArr, ["llama-3.1-8b-instant"]);
    console.log(`[AI Spy Success] Used model: ${spyModel}`);
    console.log("[AI Spy] Response received, length:", text.length);
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return jsonError("Failed to parse AI response", 500);
    }

    const parsed = JSON.parse(sanitizeLlmJson(jsonMatch[0])) as {
      caption?: string;
      hashtags?: string[];
    };

    return NextResponse.json({
      caption: parsed.caption || "",
      hashtags: parsed.hashtags || [],
    });
  } catch (error) {
    console.error("[AI Spy Error] handleAnalyzeCompetitor failed:", error);
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

    let imageAsset = null;
    const imageUrl = body.imageUrl as string | undefined;

    if (imageUrl) {
      console.log("Processing image upload for LinkedIn...");
      try {
        // 1. Register Upload
        const registerResponse = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userData.linkedinAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
              owner: author,
              serviceRelationships: [
                {
                  relationshipType: "OWNER",
                  identifier: "urn:li:userGeneratedContent",
                },
              ],
            },
          }),
        });

        if (!registerResponse.ok) {
          const errorText = await registerResponse.text();
          console.error("LinkedIn Asset Registration Error:", errorText);
        } else {
          const registerData = await registerResponse.json();
          const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
          imageAsset = registerData.value.asset;

          // 2. Upload binary data
          const imageFetch = await fetch(imageUrl);
          const imageBlob = await imageFetch.blob();
          const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${userData.linkedinAccessToken}`,
            },
            body: imageBlob,
          });

          if (!uploadResponse.ok) {
            console.error("LinkedIn Image Binary Upload Failed");
            imageAsset = null;
          }
        }
      } catch (imgError) {
        console.error("Image upload sub-process failed:", imgError);
        imageAsset = null;
      }
    }

    const postBody: any = {
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: imageAsset ? "IMAGE" : "NONE",
          media: imageAsset ? [
            {
              status: "READY",
              media: imageAsset,
              title: { text: "Post Image" },
            }
          ] : [],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const linkedinResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userData.linkedinAccessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (!linkedinResponse.ok) {
      const errorBody = await linkedinResponse.text();
      return jsonError(`LinkedIn API error: ${errorBody}`, linkedinResponse.status);
    }

    const linkedinData = (await linkedinResponse.json()) as { id?: string };

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

    if (!socialResponse.ok) {
      const errorText = await socialResponse.text();
      console.error(`LinkedIn Social Actions Error for ${postUrn}:`, errorText);
      return jsonError(`LinkedIn API error: ${socialResponse.status} - ${errorText}`, socialResponse.status);
    }

    const socialData = (await socialResponse.json()) as {
      likesSummary?: { totalLikes?: number };
      commentsSummary?: { totalFirstLevelComments?: number };
      shareCount?: number;
    };
    console.log(`Fetched social actions for ${postUrn}:`, socialData);

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
      .set(analytics, { merge: true });

    // Store history snapshot
    await db
      .collection("users")
      .doc(decodedToken.uid)
      .collection("analyticsHistory")
      .add({
        ...analytics,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

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
    const postingTimes = Array.isArray(body.postingTimes) ? body.postingTimes.map(String) : [String(body.postingTime || "09:00")];
    const targetType = String(body.targetType || "personal");
    const organizationId = (body.organizationId as string | undefined) || null;
    const dailyTopic = (body.dailyTopic as string | undefined) ?? undefined;
    console.log(`[Automation] Saving settings for user ${decodedToken.uid}:`, { enabled, postingTimes, targetType, organizationId, dailyTopic });

    await db.collection("users").doc(decodedToken.uid).set(
      {
        automationEnabled: enabled,
        postingTimes, 
        targetType,
        selectedOrganizationId: organizationId,
        ...(dailyTopic !== undefined && { dailyTopic }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("[Automation] Settings saved successfully.");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Automation Error] Failed to update settings:", error);
    const message = error instanceof Error ? error.message : "Automation update failed";
    return jsonError(`${message} (check server logs for details)`, 500);
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

    return NextResponse.json({ success: true });
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
    const groqApiKey = getRequiredEnv("GROQ_API_KEY");
    const groq = new Groq({ apiKey: groqApiKey });

    const istNow = getIstNowParts();
    const usersSnapshot = await db.collection("users").where("automationEnabled", "==", true).get();

    let processedUsers = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data() as {
        postingTime?: string;
        postingTimes?: string[];
        lastAutoPostedDate?: string;
        lastAutoPostedTime?: string;
        linkedinAccessToken?: string;
        linkedinId?: string;
        targetType?: string;
        selectedOrganizationId?: string;
        dailyTopic?: string;
      };

      // Use hardcoded schedule based on current IST day
      const postingTimes = WEEKLY_SCHEDULE[istNow.day] || ["09:00", "18:00"];

      // Convert HH:MM to total minutes for comparison
      const toMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const nowMinutes = toMinutes(istNow.time);

      // Check if any scheduled time is within ±15 minutes of current time
      // This allows cron (which runs every 30min at :00/:30) to catch times like 10:17, 12:46
      const matchedTime = postingTimes.find(pt => Math.abs(nowMinutes - toMinutes(pt)) <= 15);

      if (!matchedTime) continue;
      // Prevent double posting: store the MATCHED scheduled time, not the cron trigger time
      if (userData.lastAutoPostedDate === istNow.dateKey && userData.lastAutoPostedTime === matchedTime) continue;
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
        const userDailyTopic = userData.dailyTopic?.trim();
        const randomTopic = userDailyTopic || topics[Math.floor(Math.random() * topics.length)];

        // User requested "Gemini 3 Flash" for daily posts
        const prompt = `Generate a highly engaging LinkedIn post about "${randomTopic}".

CRITICAL: Only include facts and claims that are widely known and verifiable. Do NOT invent fake statistics, fabricated quotes, or false claims. Focus on genuine insights and thought leadership.

The post must:
- Start with a strong hook
- Provide valuable, truthful insight
- Conversational yet professional tone
- Maximum 1500 characters
- Include 5-10 relevant hashtags

Respond ONLY with valid JSON: {"caption": "...", "hashtags": ["#tag1", ...]}`;

        const { response: text, modelUsed: autoModel } = await generateWithFallback(groq, "llama-3.3-70b-versatile", prompt);
        console.log(`[AI Auto Success] User ${userDoc.id} used model: ${autoModel}`);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          failureCount += 1;
          continue;
        }

        const parsed = JSON.parse(sanitizeLlmJson(jsonMatch[0])) as {
          caption: string;
          hashtags: string[];
        };

        const fullContent = `${parsed.caption}\n\n${parsed.hashtags.join(" ")}`;

        const author =
          userData.targetType === "organization" && userData.selectedOrganizationId
            ? `urn:li:organization:${userData.selectedOrganizationId}`
            : `urn:li:person:${userData.linkedinId}`;

        // --- Generate image for daily automation ---
        let imageAsset: string | null = null;
        try {
          // Step 1: Generate image description
          const imgDescPrompt = `Describe a professional LinkedIn post image for: "${randomTopic}". Modern, clean, high-quality. Respond ONLY with the description.`;
          const { response: imgDescResp } = await generateWithFallback(groq, "llama-3.3-70b-versatile", imgDescPrompt);
          const imgDescription = imgDescResp.trim();
          
          // Step 2: Get image from Cloudflare/HuggingFace
          const imageBase64DataUrl = await generateImageWithProviders(imgDescription);
          const base64Data = imageBase64DataUrl.split(',')[1];
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          if (imageBuffer) {
            
            // Step 3: Register LinkedIn image upload
            const registerResp = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${userData.linkedinAccessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                registerUploadRequest: {
                  recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                  owner: author,
                  serviceRelationships: [{
                    relationshipType: "OWNER",
                    identifier: "urn:li:userGeneratedContent",
                  }],
                },
              }),
            });
            
            if (registerResp.ok) {
              const registerData = await registerResp.json() as any;
              const uploadUrl = registerData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
              const assetId = registerData.value?.asset;
              
              if (uploadUrl && assetId) {
                // Step 4: Upload image binary
                const uploadResp = await fetch(uploadUrl, {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${userData.linkedinAccessToken}`,
                    "Content-Type": "image/png",
                  },
                  body: new Uint8Array(imageBuffer),
                });
                
                if (uploadResp.ok) {
                  imageAsset = assetId;
                  console.log(`[Auto Image] Successfully uploaded image for user ${userDoc.id}`);
                }
              }
            }
          }
        } catch (imgErr) {
          console.warn(`[Auto Image] Image generation/upload failed for user ${userDoc.id}:`, imgErr);
          // Continue with text-only post
        }

        // --- Post to LinkedIn (with or without image) ---
        const shareMedia = imageAsset
          ? {
              shareCommentary: { text: fullContent },
              shareMediaCategory: "IMAGE" as const,
              media: [{
                status: "READY",
                media: imageAsset,
              }],
            }
          : {
              shareCommentary: { text: fullContent },
              shareMediaCategory: "NONE" as const,
            };

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
              "com.linkedin.ugc.ShareContent": shareMedia,
            },
            visibility: {
              "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
          }),
        });

        const linkedinData = (await linkedinResponse.json()) as { id?: string };

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
            lastAutoPostedTime: matchedTime,
          },
          { merge: true }
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
      const userData = userDoc.data() as { linkedinAccessToken?: string };
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
          const postData = postDoc.data() as { linkedinPostUrn?: string };
          const postUrn = postData.linkedinPostUrn;
          if (!postUrn) continue;

          const encodedUrn = encodeURIComponent(postUrn);
          console.log(`[Analytics] Refreshing for URN: ${postUrn} (Encoded: ${encodedUrn})`);
          
          const socialResponse = await fetch(
            `https://api.linkedin.com/v2/socialActions/${encodedUrn}`,
            {
              headers: {
                Authorization: `Bearer ${userData.linkedinAccessToken}`,
                "X-Restli-Protocol-Version": "2.0.0",
              },
            }
          );

          if (!socialResponse.ok) {
            const errorText = await socialResponse.text();
            console.error(`[Analytics] Failed to fetch socialActions for ${postUrn}: ${socialResponse.status} - ${errorText}`);
            continue;
          }

          const socialData = (await socialResponse.json()) as any;
          console.log(`[Analytics] Data for ${postUrn}:`, JSON.stringify(socialData));

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
              { merge: true }
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
export async function runScheduledPosts(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const db = getDb();
    const now = admin.firestore.Timestamp.now();
    
    // Find all posts that are 'scheduled' and whose time has passed
    const scheduledSnapshot = await db
      .collectionGroup("posts")
      .where("status", "==", "scheduled")
      .where("scheduledTime", "<=", now)
      .limit(50)
      .get();

    let successCount = 0;
    let failureCount = 0;

    for (const postDoc of scheduledSnapshot.docs) {
      const postData = postDoc.data() as {
        content: string;
        hashtags?: string[];
        targetType: string;
        organizationId?: string;
        imageUrl?: string;
      };
      
      const userDoc = postDoc.ref.parent.parent!;
      const userSnapshot = await userDoc.get();
      const userData = userSnapshot.data() as { linkedinAccessToken?: string; linkedinId?: string };

      if (!userData?.linkedinAccessToken) {
        await postDoc.ref.update({ status: "failed", errorMessage: "No LinkedIn access token" });
        failureCount++;
        continue;
      }

      const fullContent = `${postData.content}${postData.hashtags ? "\n\n" + postData.hashtags.join(" ") : ""}`;
      const author = postData.targetType === "organization" && postData.organizationId
        ? `urn:li:organization:${postData.organizationId}`
        : `urn:li:person:${userData.linkedinId}`;

      try {
        const body: any = {
          author,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: fullContent },
              shareMediaCategory: postData.imageUrl ? "IMAGE" : "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        };

        if (postData.imageUrl) {
          // Simplified image handling for scheduled posts (assuming already registered or handles URL)
          // For now, if there's an image, use standard registration logic
          // Note: In a full implementation, we'd ensure the asset is registered first.
        }

        const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userData.linkedinAccessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify(body),
        });

        const result = await response.json();
        if (response.ok) {
          await postDoc.ref.update({ status: "posted", linkedinPostUrn: result.id, postedAt: now });
          successCount++;
        } else {
          await postDoc.ref.update({ status: "failed", errorMessage: JSON.stringify(result) });
          failureCount++;
        }
      } catch (err) {
        await postDoc.ref.update({ status: "failed", errorMessage: `${err}` });
        failureCount++;
      }
    }

    return NextResponse.json({ success: true, processed: scheduledSnapshot.size, successCount, failureCount });
  } catch (error) {
    return jsonError(`${error}`, 500);
  }
}
