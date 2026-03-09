import {NextRequest} from "next/server";
import {runAnalyticsRefresh} from "@/server/linkflow-backend";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return runAnalyticsRefresh(req);
}
