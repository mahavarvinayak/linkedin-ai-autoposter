import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { generateLinkedInPost } from "@/ai/flows/generate-linkedin-post-flow";

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();
    const currentDay = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const currentHour = String(now.getHours()).padStart(2, "0");
    const currentMinute = String(now.getMinutes()).padStart(2, "0");
    const currentTime = `${currentHour}:${currentMinute}`;

    // Get user's schedule from Firebase
    const scheduleRef = doc(db, "users", "default", "settings", "postSchedule");
    const scheduleSnap = await getDoc(scheduleRef);

    if (!scheduleSnap.exists()) {
      return NextResponse.json(
        { message: "No schedule found" },
        { status: 200 }
      );
    }

    const schedule = scheduleSnap.data();
    const daySchedule = schedule[currentDay];

    if (!daySchedule || (!daySchedule.time1 && !daySchedule.time2)) {
      return NextResponse.json(
        { message: `No post scheduled for ${currentDay}` },
        { status: 200 }
      );
    }

    const scheduledTimes = [daySchedule.time1, daySchedule.time2].filter(Boolean);
    const currentTimeNumber = parseInt(currentHour + currentMinute);

    let shouldPost = false;
    for (const scheduledTime of scheduledTimes) {
      const [scheduledHour, scheduledMin] = scheduledTime.split(":");
      const scheduledTimeNumber = parseInt(scheduledHour + scheduledMin);
      const timeDiff = Math.abs(currentTimeNumber - scheduledTimeNumber);

      if (timeDiff <= 1) {
        shouldPost = true;
        break;
      }
    }

    if (shouldPost) {
      // Read configured daily topic from automation settings
      const automationRef = doc(db, "users", "default", "settings", "automation");
      const automationSnap = await getDoc(automationRef);
      const dailyTopic = automationSnap.exists()
        ? (automationSnap.data().dailyTopic as string | undefined) || "latest trends in AI and technology"
        : "latest trends in AI and technology";

      // Time to post!
      const postResult = await generateLinkedInPost({ topic: dailyTopic });
      
      return NextResponse.json(
        { 
          success: true, 
          message: "Post published successfully",
          post: postResult
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "Not yet time to post" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Schedule check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
