import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {

    const body = await req.json();

    const { uid, type, itemId, message } = body;

    if (!uid || !type || !itemId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await adminDb.collection("notifications").add({
      uid,
      type,
      itemId,
      message: message || "New notification",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );

  }
}