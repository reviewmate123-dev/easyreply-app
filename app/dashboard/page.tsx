"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import ProfileMenu from "@/app/components/ProfileMenu";
// ✅ LINE 1 ADD KARO - Onboarding import
import OnboardingGuide from "@/app/components/OnboardingGuide";
import { MessageSquare, Bell } from "lucide-react"; // ✅ ADDED - Bell icon for notifications

const tones = ["Professional", "Friendly", "Apology", "Short", "Long"];

const loadingSteps = [
  "Analyzing review...",
  "Understanding tone...",
  "Writing perfect reply...",
];

export default function Page() {
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [review, setReview] = useState("");
  const [reply, setReply] = useState("");
  const [tone, setTone] = useState("Professional");
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingText, setLoadingText] = useState(loadingSteps[0]);
  // ✅ STEP 6 — Notification count state
  const [notificationCount, setNotificationCount] = useState(0);

  /* AUTH */
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/auth-login");
        return;
      }

      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        const newUser = {
          name: u.displayName || "User",
          email: u.email,
          credits: 20,
          role: "user",
          blocked: "false",
          plan: "free",
          createdAt: new Date(),
        };
        await setDoc(ref, newUser);
        setProfile({ uid: u.uid, ...newUser });
        
        // ✅ Fetch notification count for new user
        await fetchNotificationCount(u.uid);
        return;
      }

      const data = snap.data();

      /* BLOCK CHECK */
      if (data.blocked === "true") {
        alert("Your account has been blocked by admin.");
        await signOut(auth);
        router.replace("/auth-login");
        return;
      }

      /* ================================
         AUTO EXPIRY SYSTEM (NEW)
      =================================*/
      if (data.planExpire) {
        const expireDate = data.planExpire.toDate
          ? data.planExpire.toDate()
          : new Date(data.planExpire);

        if (new Date() > expireDate) {
          await updateDoc(ref, {
            plan: "free",
            credits: 0,
            planExpire: null,
          });

          alert("Your plan expired. You are moved to Free plan.");
          data.plan = "free";
          data.credits = 0;
        }
      }
      /* ================================ */

      setProfile({
        uid: u.uid,
        name: data.name,
        email: data.email,
        credits: data.credits ?? 0,
        role: data.role ?? "user",
        blocked: data.blocked ?? "false",
        plan: data.plan ?? "free",
      });

      // ✅ STEP 6 — Fetch notification count
      await fetchNotificationCount(u.uid);
    });
  }, [router]);

  // ✅ STEP 6 — Function to fetch notification count
  const fetchNotificationCount = async (uid: string) => {
    try {
      const notificationsRef = collection(db, "notifications");
      const q = query(
        notificationsRef, 
        where("uid", "==", uid), 
        where("read", "==", false)
      );
      const snapshot = await getDocs(q);
      setNotificationCount(snapshot.size);
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  };

  /* CLOSE PROFILE */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* rotating loader */
  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % loadingSteps.length;
      setLoadingText(loadingSteps[i]);
    }, 1200);
    return () => clearInterval(interval);
  }, [loading]);

  if (!profile) return null;

  const typeReply = (fullText: string) => {
    let i = 0;
    setReply("");
    const interval = setInterval(() => {
      i++;
      setReply(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(interval);
    }, 10);
  };

  const generate = async () => {
    if (!review.trim()) return alert("📝 Please paste a review first");

    setLoading(true);
    setReply("");

    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/auth-login");
        return;
      }

      const token = await user.getIdToken();

      const deviceId =
        typeof window !== "undefined"
          ? btoa(navigator.userAgent)
          : "unknown";

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ review, tone, deviceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        // ✅ IMPROVED ERROR MESSAGES
        let errorMessage = "Something went wrong. Please try again.";
        
        if (data.error?.includes("credit") || data.error?.includes("credits")) {
          errorMessage = "💰 No credits left. Please buy more credits to continue.";
        } else if (data.error?.includes("blocked")) {
          errorMessage = "🚫 Account blocked. Contact support@easyreply.com";
        } else if (data.error?.includes("expired")) {
          errorMessage = "⏰ Plan expired. Please upgrade to continue.";
        } else if (data.error?.includes("suspended")) {
          errorMessage = "⚠️ Account suspended due to suspicious activity.";
        } else if (data.error?.includes("network")) {
          errorMessage = "📡 Network error. Please check your connection.";
        } else if (data.error?.includes("rate")) {
          errorMessage = "⏱️ Too many requests. Please wait a minute.";
        }
        
        alert(errorMessage);
        setLoading(false);
        return;
      }

      typeReply(data.reply);
      setProfile({ ...profile, credits: data.credits });
      setReview("");
    } catch (error) {
      console.error("Generate error:", error);
      // ✅ IMPROVED CATCH BLOCK
      let errorMessage = "📡 Network error. Please check your internet connection.";
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "📡 Network error. Please check your internet connection.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "⏱️ Request timed out. Please try again.";
        } else {
          errorMessage = "Server error. Our team has been notified.";
        }
      }
      
      alert(errorMessage);
    }

    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const logout = async () => {
    await signOut(auth);
    router.replace("/auth-login");
  };

  /* hover lift */
  const lift = (el: any) => {
    el.style.transform = "translateY(-3px)";
    el.style.boxShadow = "0 14px 28px rgba(0,0,0,.18)";
  };

  const drop = (el: any) => {
    el.style.transform = "translateY(0px)";
    el.style.boxShadow = "";
  };

  return (
    <main style={styles.page}>
      {/* ✅ ADDED - Q&A Button (Left side) with Notification Badge */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
        <button
          onClick={() => router.push('/reputation')}
          style={{
            padding: '10px 20px',
            background: '#6B298C',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(107,41,140,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 18px rgba(107,41,140,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(107,41,140,0.3)';
          }}
        >
          <MessageSquare size={18} />
          Q&A Management
          
          {/* ✅ Notification badge if count > 0 */}
          {notificationCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -8,
              right: -8,
              background: '#ef4444',
              color: 'white',
              borderRadius: '20px',
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: 'bold',
              minWidth: '18px',
              textAlign: 'center',
            }}>
              {notificationCount}
            </span>
          )}
        </button>
      </div>

      {/* ✅ LINE 2 ADD KARO - Onboarding component */}
      <OnboardingGuide />
      
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      {/* ✅ FIXED - Profile section with History INSIDE dropdown */}
      <div ref={profileRef} style={styles.profileWrap}>
        <ProfileMenu
          profile={profile}
          profileOpen={profileOpen}
          setProfileOpen={setProfileOpen}
          logout={logout}
          onHistoryClick={() => router.push('/dashboard/history')}  // ✅ NEW PROP
        />
      </div>

      <div style={styles.card}>
        <h1 style={styles.title}>TruStaga</h1>

        <textarea
          style={styles.textarea}
          placeholder="Paste customer review here..."
          value={review}
          onChange={(e) => setReview(e.target.value)}
        />

        <div style={styles.toneWrap}>
          {tones.map((t) => (
            <button
              key={t}
              style={{
                ...styles.toneBtn,
                background: tone === t ? "#2563eb" : "#eef2ff",
                color: tone === t ? "#fff" : "#000",
              }}
              onMouseEnter={(e) => lift(e.currentTarget)}
              onMouseLeave={(e) => drop(e.currentTarget)}
              onClick={() => setTone(t)}
              disabled={loading}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          style={styles.generate}
          onMouseEnter={(e) => lift(e.currentTarget)}
          onMouseLeave={(e) => drop(e.currentTarget)}
          onClick={generate}
          disabled={loading}
        >
          {loading ? loadingText : "Generate Reply"}
        </button>

        {reply && (
          <>
            <div style={styles.reply}>{reply}</div>
            <button
              style={styles.copy}
              onMouseEnter={(e) => lift(e.currentTarget)}
              onMouseLeave={(e) => drop(e.currentTarget)}
              onClick={copy}
            >
              {copied ? "Copied ✓" : "Copy Reply"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(120deg,#eef2ff,#ffffff)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    padding: 40,
  },

  orb1: {
    position: "absolute",
    width: 400,
    height: 400,
    background: "#6366f1",
    opacity: 0.15,
    borderRadius: "50%",
    filter: "blur(120px)",
    top: -100,
    left: -100,
  },
  orb2: {
    position: "absolute",
    width: 400,
    height: 400,
    background: "#2563eb",
    opacity: 0.12,
    borderRadius: "50%",
    filter: "blur(120px)",
    bottom: -120,
    right: -120,
  },

  card: {
    width: 900,
    padding: 40,
    borderRadius: 24,
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 40px 80px rgba(0,0,0,.15)",
    zIndex: 2,
  },

  title: { textAlign: "center", fontSize: 34, marginBottom: 24 },

  textarea: {
    width: "100%",
    minHeight: 160,
    padding: 16,
    borderRadius: 14,
    border: "none",
    boxShadow: "0 10px 25px rgba(0,0,0,.12)",
    marginBottom: 20,
  },

  toneWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 12,
    marginBottom: 20,
  },

  toneBtn: {
    height: 44,
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    transition: "all .2s ease",
    boxShadow: "0 8px 18px rgba(0,0,0,.15)",
  },

  generate: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .2s ease",
    boxShadow: "0 12px 26px rgba(37,99,235,.45)",
    marginBottom: 20,
  },

  reply: {
    minHeight: 160,
    padding: 16,
    borderRadius: 14,
    background: "#f9fafb",
    boxShadow: "0 10px 25px rgba(0,0,0,.12)",
    marginBottom: 14,
  },

  copy: {
    width: "100%",
    height: 46,
    borderRadius: 14,
    border: "none",
    background: "#000",
    color: "#fff",
    cursor: "pointer",
    transition: "all .2s ease",
    boxShadow: "0 12px 26px rgba(0,0,0,.35)",
  },

  profileWrap: {
    position: "absolute" as const,
    top: 20,
    right: 20,
    zIndex: 1000,
  },
};