import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);

  const uid = searchParams.get("uid");
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!uid || !id) {
    return NextResponse.json({ error: "Missing params" });
  }

  if (type === "review") {

    const reviewRef = adminDb.collection("reviews").doc(id);

    await reviewRef.update({
      status: "posted"
    });

  }

  if (type === "question") {

    const questionRef = adminDb.collection("questions").doc(id);

    await questionRef.update({
      status: "posted"
    });

  }

  return NextResponse.json({ success: true });
}