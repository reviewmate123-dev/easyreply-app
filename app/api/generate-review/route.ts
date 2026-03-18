import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { validateUserAccess, deductCredits } from "@/lib/server-validation";
import { detectFraud, updateUserIP } from "@/lib/fraud-detection";
import { generateReviewReply } from "@/lib/review-generator";
import { getRequiredCredits } from "@/lib/credits";
import { logReviewAIGenerated, logReviewFailed } from "@/lib/history-logger";
import { updateReviewStatus } from "@/lib/review-status";
// ✅ NEW IMPORT
import { verifyReviewOwnership } from "@/lib/review-security";

type FraudAlert = {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
};

type FraudCheckResult = {
  isFraud: boolean;
  alerts: FraudAlert[];
};

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
    // RATE LIMIT
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

    console.log("🔥 REVIEW GENERATE API CALLED");

    // =============================
    // BODY
    // =============================
    const { 
      reviewId, 
      comment, 
      rating, 
      reviewerName,
      tone, 
      deviceId, 
      businessContext, 
      isRegenerate = false 
    } = await req.json();

    if (!reviewId || !comment) {
      return NextResponse.json({ 
        error: "Review ID and comment are required" 
      }, { status: 400 });
    }

    // =============================
    // ✅ REVIEW OWNERSHIP CHECK
    // =============================
    const ownershipCheck = await verifyReviewOwnership(reviewId, uid);
    if (!ownershipCheck.valid) {
      return NextResponse.json(
        { error: ownershipCheck.error || 'Review not found' },
        { status: 403 }
      );
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
        "generate-review",
        { reviewId, comment, rating }
      );
    } catch {}

    await updateUserIP(uid, ip);

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
      const reply = `[ADMIN DEMO] Thanks for your ${rating}-star review: ${comment.substring(0, 50)}...`;

      await adminDb.collection("usageHistory").add({
        uid,
        reviewId,
        comment,
        reply,
        tone,
        creditsDeducted: 0,
        createdAt: new Date(),
      });

      // Update review status
      await updateReviewStatus(
        reviewId,
        'ai_generated',
        uid,
        reply
      );

      return NextResponse.json({
        reply,
        credits: 999999,
      });
    }

    // =============================
    // CREDIT CALCULATION
    // =============================
    let creditsToDeduct = 1; // Review = 1 credit

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

    // =============================
    // AI GENERATION
    // =============================
    let selectedTone: "friendly" | "formal" | "confident" = "friendly";
    if (tone === "Professional") selectedTone = "formal";
    if (tone === "Friendly") selectedTone = "friendly";
    if (tone === "Confident") selectedTone = "confident";

    const context = businessContext || {
      businessName: user?.businessContext?.businessName || "Our Business",
      category: user?.businessContext?.category || "Local Business",
      tone: selectedTone,
      description: user?.businessContext?.description || "",
      city: user?.businessContext?.city || "your city",
      keywords: user?.businessContext?.keywords || [],
      language: user?.businessContext?.language || ["english"],
      length: "medium",
    };

    const result = await generateReviewReply({
      comment,
      rating: rating || 0,
      reviewerName,
      context,
      tone: selectedTone
    });

    if (result.error || !result.reply) {
      // Log failure
      await logReviewFailed(uid, reviewId, {
        stage: 'generate',
        error: result.error || 'AI generation failed',
        rating
      });

      return NextResponse.json(
        { error: "AI generation failed" },
        { status: 500 }
      );
    }

    // =============================
    // DEDUCT CREDITS
    // =============================
    await deductCredits(uid, creditsToDeduct);

    // =============================
    // UPDATE REVIEW STATUS
    // =============================
    await updateReviewStatus(
      reviewId,
      'ai_generated',
      uid,
      result.reply,
      { confidence: result.confidence }
    );

    // =============================
    // LOG SUCCESS
    // =============================
    await logReviewAIGenerated(uid, reviewId, {
      locationId: ownershipCheck.review?.locationId,
      rating,
      replyPreview: result.reply.substring(0, 100),
      confidence: result.confidence
    });

    // =============================
    // SAVE HISTORY
    // =============================
    await adminDb.collection("usageHistory").add({
      uid,
      userEmail: user?.email || decoded.email,
      userName: user?.name,
      reviewId,
      comment: comment.substring(0, 200),
      reply: result.reply,
      rating,
      tone: selectedTone,
      confidence: result.confidence,
      deviceId: deviceId || "unknown-device",
      ip,
      isRegenerate,
      creditsDeducted: creditsToDeduct,
      createdAt: new Date(),
    });

    // Rate limit tracker
    await adminDb.collection("userActions").add({
      uid,
      action: "generate-review",
      createdAt: new Date(),
    });

    // =============================
    // RETURN
    // =============================
    const updatedUser = await userRef.get();

    return NextResponse.json({
      success: true,
      reply: result.reply,
      confidence: result.confidence,
      credits: updatedUser.data()?.credits || 0,
      creditsDeducted: creditsToDeduct,
      isRegenerate,
    });

  } catch (error) {
    console.error("💥 REVIEW GENERATION ERROR:", error);

    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}