import {NextRequest, NextResponse} from "next/server";
import {
  handleDisconnectLinkedin,
  handleFetchAnalytics,
  handleGeneratePost,
  handleLinkedinAuthUrl,
  handleLinkedinCallback,
  handlePublishPost,
  handleUpdateAutomation,
  handleAnalyzeCompetitor,
} from "@/server/linkflow-backend";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{action: string}>;
};

async function routeForAction(req: NextRequest, action: string) {
  switch (action) {
    case "linkedinAuthUrl":
      if (req.method !== "GET") return NextResponse.json({error: "Method not allowed"}, {status: 405});
      return handleLinkedinAuthUrl(req);

    case "linkedinCallback":
      if (req.method !== "GET" && req.method !== "POST") {
        return NextResponse.json({error: "Method not allowed"}, {status: 405});
      }
      return handleLinkedinCallback(req);

    case "generatePost":
      if (req.method !== "POST") return NextResponse.json({error: "Method not allowed"}, {status: 405});
      return handleGeneratePost(req);

    case "analyzeCompetitor":
      if (req.method !== "POST") return NextResponse.json({error: "Method not allowed"}, {status: 405});
      return handleAnalyzeCompetitor(req);

    case "publishPost":
      if (req.method !== "POST") return NextResponse.json({error: "Method not allowed"}, {status: 405});
      return handlePublishPost(req);

    case "fetchAnalytics":
      if (req.method !== "GET") return NextResponse.json({error: "Method not allowed"}, {status: 405});
      return handleFetchAnalytics(req);

    case "updateAutomation":
      if (req.method !== "POST") return NextResponse.json({error: "Method not allowed"}, {status: 405});
      return handleUpdateAutomation(req);

    case "disconnectLinkedIn":
      if (req.method !== "POST") return NextResponse.json({error: "Method not allowed"}, {status: 405});
      return handleDisconnectLinkedin(req);

    default:
      return NextResponse.json({error: "Endpoint not found"}, {status: 404});
  }
}

export async function GET(req: NextRequest, context: RouteParams) {
  const {action} = await context.params;
  return routeForAction(req, action);
}

export async function POST(req: NextRequest, context: RouteParams) {
  const {action} = await context.params;
  return routeForAction(req, action);
}
