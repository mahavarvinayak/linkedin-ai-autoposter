import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dailyTopic, automationEnabled, targetType } = body;

    const ref = doc(db, "users", "default", "settings", "automation");
    await setDoc(
      ref,
      {
        ...(dailyTopic !== undefined && { dailyTopic }),
        ...(automationEnabled !== undefined && { automationEnabled }),
        ...(targetType !== undefined && { targetType }),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Automation save error:", error);
    return NextResponse.json({ error: "Failed to save automation settings" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const ref = doc(db, "users", "default", "settings", "automation");
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return NextResponse.json(
        { dailyTopic: "", automationEnabled: true, targetType: "personal" },
        { status: 200 }
      );
    }

    return NextResponse.json(snap.data(), { status: 200 });
  } catch (error) {
    console.error("Automation fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch automation settings" }, { status: 500 });
  }
}
