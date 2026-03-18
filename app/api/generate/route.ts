import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { validateUserAccess, deductCredits } from "@/lib/server-validation";
import { detectFraud, updateUserIP } from "@/lib/fraud-detection";
import { generateAIReply } from "@/lib/openai";
import { getRequiredCredits } from "@/lib/credits";

/* =====================================================
   TYPE FIX
===================================================== */

type FraudAlert = {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
};

type FraudCheckResult = {
  isFraud: boolean;
  alerts: FraudAlert[];
};

// ⭐ ADDED — EASY RATE LIMIT CONTROL
const RATE_LIMIT_MS = 4000; // 4 seconds

export async function POST(req: NextRequest) {
  try {

    // =============================
    // TOKEN CHECK
    // =============================
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // =============================
    // ✅ RATE LIMIT (SMART VERSION)
    // =============================
    const lastActionSnap = await adminDb
      .collection("userActions")
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!lastActionSnap.empty) {
      const lastCall = lastActionSnap.docs[0].data();

      const lastTime = lastCall.createdAt?.toDate
        ? lastCall.createdAt.toDate()
        : new Date(lastCall.createdAt);

      // ⭐ ADDED SMART CALCULATION
      const diff = Date.now() - lastTime.getTime();
      const remaining = Math.ceil((RATE_LIMIT_MS - diff) / 1000);

      if (diff < RATE_LIMIT_MS) {
        return NextResponse.json(
          {
            error: `Please wait ${remaining}s before generating again.`,
            retryAfter: remaining,
          },
          { status: 429 }
        );
      }
    }

    console.log("🔥 GENERATE API CALLED");

    // =============================
    // BODY
    // =============================
    const { review, tone, deviceId, businessContext, isRegenerate = false } =
      await req.json();

    if (!review) {
      return NextResponse.json({ error: "Review missing" }, { status: 400 });
    }

    // =============================
    // USER DATA
    // =============================
    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    let user = userSnap.data();

    if (!userSnap.exists) {
      const newUser = {
        email: decoded.email,
        name: decoded.name || decoded.email?.split("@")[0] || "User",
        credits: 1000,
        role: "user",
        createdAt: new Date(),
        blocked: false,
        businessContext: businessContext || {},
      };
      await userRef.set(newUser);
      user = newUser;
    }

    if (user && !user.email && decoded.email) {
      await userRef.update({ email: decoded.email });
      user.email = decoded.email;
    }

    // =============================
    // IP ADDRESS
    // =============================
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "::1";

    // =============================
    // DAILY LIMIT
    // =============================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayUsage = await adminDb
      .collection("usageHistory")
      .where("uid", "==", uid)
      .where("createdAt", ">=", today)
      .get();

    if (todayUsage.size >= 100) {
      return NextResponse.json(
        { error: "Daily usage limit reached." },
        { status: 403 }
      );
    }

    // =============================
    // FRAUD DETECTION
    // =============================
    let fraudCheck: FraudCheckResult = {
      isFraud: false,
      alerts: [],
    };

    try {
      fraudCheck = await detectFraud(
        uid,
        user?.email || "",
        ip,
        "generate",
        { review, tone }
      );
    } catch {}

    await updateUserIP(uid, ip);

    // ✅ ACTIVE FRAUD BLOCK
    if (fraudCheck?.isFraud) {
      const highRisk = fraudCheck.alerts.some(
        (a) => a.severity === "HIGH" || a.severity === "CRITICAL"
      );

      if (highRisk) {
        console.log("🚨 Fraud blocked:", fraudCheck.alerts);

        return NextResponse.json(
          { error: "Suspicious activity detected. Try later." },
          { status: 429 }
        );
      }
    }

    // =============================
    // VALIDATE USER
    // =============================
    try {
  await validateUserAccess(uid, 1);
} catch (err: any) {
  return NextResponse.json(
    { error: err.message || "Access denied" },
    { status: 403 }
  );
}

    // =============================
    // ADMIN BYPASS
    // =============================
    if (user?.role === "admin") {
      const reply = `[ADMIN DEMO] Thanks for your ${tone} review: ${review}`;

      await adminDb.collection("usageHistory").add({
        uid,
        review,
        reply,
        tone,
        creditsDeducted: 0,
        createdAt: new Date(),
      });

      return NextResponse.json({
        reply,
        credits: 999999,
      });
    }

    // =============================
    // AI GENERATION
    // =============================
    let selectedTone = "friendly";

if (tone === "Professional") selectedTone = "formal";
if (tone === "Friendly") selectedTone = "friendly";
if (tone === "Confident") selectedTone = "confident";

    let replyLength: "short" | "medium" | "detailed" = "medium";
    if (selectedTone === "Short") replyLength = "short";
    if (selectedTone === "Long") replyLength = "detailed";

    const context = businessContext || {
      businessName:
        user?.businessContext?.businessName || "Our Business",
      category: user?.businessContext?.category || "Local Business",
      tone: selectedTone,
      description: user?.businessContext?.description || "",
      city: user?.businessContext?.city || "your city",
      keywords: user?.businessContext?.keywords || [],
      language: user?.businessContext?.language || ["english"],
      length: replyLength,
    };

    const { text: reply, error: aiError } =
      await generateAIReply(review, context);

    if (aiError) {
      return NextResponse.json(
        { error: "AI generation failed" },
        { status: 500 }
      );
    }

    // =============================
    // CREDIT CALCULATION
    // =============================
    let creditsToDeduct = 1;

    if (isRegenerate) {
      const plan = user?.plan || "basic";
      const planFreeQuota =
        plan === "growth" ? 3 : plan === "pro" ? 5 : 1;

      const freeUsed = user?.freeRegenerateUsed?.review || 0;

      const { credits } = getRequiredCredits(
        "review",
        true,
        freeUsed,
        planFreeQuota
      );

      creditsToDeduct = credits;

      if (freeUsed < planFreeQuota) {
        await userRef.update({
          "freeRegenerateUsed.review": freeUsed + 1,
        });
      }
    }

    await deductCredits(uid, creditsToDeduct);

    // =============================
    // SAVE HISTORY
    // =============================
    await adminDb.collection("usageHistory").add({
      uid,
      userEmail: user?.email || decoded.email,
      userName: user?.name,
      review,
      reply,
      tone: selectedTone,
      deviceId: deviceId || "unknown-device",
      ip,
      isRegenerate,
      creditsDeducted: creditsToDeduct,
      createdAt: new Date(),
    });

    // ✅ RATE LIMIT TRACKER SAVE
    await adminDb.collection("userActions").add({
      uid,
      action: "generate",
      createdAt: new Date(),
    });

    // =============================
    // RETURN
    // =============================
    const updatedUser = await userRef.get();

    return NextResponse.json({
      reply,
      credits: updatedUser.data()?.credits || 0,
      creditsDeducted: creditsToDeduct,
      isRegenerate,
    });

  } catch (error) {
    console.error("💥 GENERATION ERROR:", error);

    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}