import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { generateLinkedInPost } from "@/server/linkflow-backend";

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
    const currentDay = now.toLocaleDateString("en-US", { weekday: "lowercase" });
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
    const scheduledTime = schedule[currentDay];

    if (!scheduledTime) {
      return NextResponse.json(
        { message: `No post scheduled for ${currentDay}` },
        { status: 200 }
      );
    }

    // Check if current time matches scheduled time (within 1 minute window)
    const [scheduledHour, scheduledMin] = scheduledTime.split(":");
    const timeDiff = Math.abs(
      parseInt(currentHour + currentMinute) -
        parseInt(scheduledHour + scheduledMin)
    );

    if (timeDiff <= 1) {
      // Time to post!
      const postResult = await generateLinkedInPost();
      
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
