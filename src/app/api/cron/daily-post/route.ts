import {NextRequest} from "next/server";
import {runDailyPostAutomation} from "@/server/linkflow-backend";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return runDailyPostAutomation(req);
}
