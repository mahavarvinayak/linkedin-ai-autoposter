import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const { schedules } = await request.json();

    // schedules format:
    // {
    //   "monday": { "time1": "09:00", "time2": "14:00" },
    //   "tuesday": { "time1": "10:00", "time2": "15:00" },
    //   ...
    // }

    // Save to Firebase
    const scheduleRef = doc(db, "users", "default", "settings", "postSchedule");
    await setDoc(scheduleRef, schedules, { merge: true });

    return NextResponse.json(
      { 
        success: true, 
        message: "Schedule updated successfully",
        schedules: schedules
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Schedule save error:", error);
    return NextResponse.json(
      { error: "Failed to save schedule" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const scheduleRef = doc(db, "users", "default", "settings", "postSchedule");
    const scheduleSnap = await getDoc(scheduleRef);

    if (!scheduleSnap.exists()) {
      return NextResponse.json(
        { schedules: {} },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { schedules: scheduleSnap.data() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Schedule fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
