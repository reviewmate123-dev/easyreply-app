import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

type HistoryItem = {
  id: string;
  review: string;
  reply: string;
  tone: string;
  credits: number;
  createdAt: string;
  userEmail: string;
  userName: string;
  deviceId: string;
  ip: string;
  isRegenerate: boolean;
};

const toIsoStringSafe = (value: any): string => {
  if (!value) return new Date(0).toISOString();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
};

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email || null;

    const deduped = new Map<string, HistoryItem>();

    const byUid = await adminDb.collection("usageHistory").where("uid", "==", uid).get();
    byUid.docs.forEach((doc) => {
      const data = doc.data();
      deduped.set(doc.id, {
        id: doc.id,
        review: data.review || data.question || "",
        reply: data.reply || data.generatedReply || data.aiReply || "No reply generated",
        tone: data.tone || "Professional",
        credits: data.creditsDeducted || data.credits || 1,
        createdAt: toIsoStringSafe(data.createdAt || data.timestamp || data.date),
        userEmail: data.userEmail || "",
        userName: data.userName || "",
        deviceId: data.deviceId || "",
        ip: data.ip || "",
        isRegenerate: Boolean(data.isRegenerate),
      });
    });

    if (email) {
      const byEmail = await adminDb.collection("usageHistory").where("userEmail", "==", email).get();
      byEmail.docs.forEach((doc) => {
        if (deduped.has(doc.id)) return;
        const data = doc.data();
        deduped.set(doc.id, {
          id: doc.id,
          review: data.review || data.question || "",
          reply: data.reply || data.generatedReply || data.aiReply || "No reply generated",
          tone: data.tone || "Professional",
          credits: data.creditsUsed || 1,
          createdAt: toIsoStringSafe(data.createdAt || data.timestamp || data.date),
          userEmail: data.userEmail || "",
          userName: data.userName || "",
          deviceId: data.deviceId || "",
          ip: data.ip || "",
          isRegenerate: Boolean(data.isRegenerate),
        });
      });
    }

    const history = Array.from(deduped.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    console.error("History API error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
