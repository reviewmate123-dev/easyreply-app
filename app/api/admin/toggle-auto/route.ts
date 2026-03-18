import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {

    const body = await req.json();
    const { userId, enabled, type } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "User ID missing"
      });
    }

    const updateData: any = {};

    if (type === "review") {
      updateData.autoReviewEnabled = enabled;
    }

    if (type === "qa") {
      updateData.autoReplyEnabled = enabled;
    }

    await adminDb.collection("users").doc(userId).update(updateData);

    return NextResponse.json({
      success: true
    });

  } catch (error) {

    console.error("Toggle auto error:", error);

    return NextResponse.json({
      success: false,
      error: "Server error"
    });

  }
}