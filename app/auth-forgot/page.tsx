"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AuthForgot() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const handleReset = async () => {
    if (!email) {
      alert("Enter your email");
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setMsg("Password reset link sent to your email.");
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.style.backgroundColor = "#1a1a1a";
      document.body.style.color = "#ffffff";
    } else {
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    }
  };

  return (
    <main style={darkMode ? {...styles.page, ...styles.pageDark} : styles.page}>
      {/* ✅ Header Bar - Same as signin/signup */}
      <div style={darkMode ? {...styles.header, ...styles.headerDark} : styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>RepuLabAi</span>
        </div>
        <div style={styles.headerCenter}>
          <a href="/features" style={darkMode ? {...styles.navLink, ...styles.navLinkDark} : styles.navLink}>Features</a>
          <a href="/pricing" style={darkMode ? {...styles.navLink, ...styles.navLinkDark} : styles.navLink}>Pricing</a>
          <a href="/contact" style={darkMode ? {...styles.navLink, ...styles.navLinkDark} : styles.navLink}>Contact</a>
        </div>
        <div style={styles.headerRight}>
          <button 
            style={darkMode ? {...styles.darkModeToggle, ...styles.darkModeToggleDark} : styles.darkModeToggle}
            onClick={toggleDarkMode}
          >
            🌙
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h1 style={styles.title}>Reset your password</h1>

        <p style={styles.sub}>
          Enter your email and we'll send you a reset link
        </p>

        {msg && <p style={styles.success}>{msg}</p>}

        <input
          style={styles.input}
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          style={styles.button}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 14px 28px rgba(107, 41, 140, 0.55)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 8px 18px rgba(107, 41, 140, 0.45)";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translateY(2px)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onClick={handleReset}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>

        <p style={styles.back}>
          Remember password?{" "}
          <span
            style={styles.link}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f3e8ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            onClick={() => router.push("/auth-login")}
          >
            Back to login
          </span>
        </p>
      </div>
    </main>
  );
}

/* 🎨 STYLES - Consistent with signin/signup pages */
const styles: any = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#eef2ff,#f8fafc)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    transition: "all 0.3s ease",
    paddingTop: "80px",
  },
  pageDark: {
    background: "linear-gradient(135deg,#2d2d2d,#1a1a1a)",
  },

  // ✅ Header Styles - Exact same as signin
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 40px",
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerDark: {
    background: "rgba(26,26,26,0.9)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#6B298C",
    cursor: "pointer",
    fontFamily: "'Poppins', 'Inter', sans-serif",
    letterSpacing: "-0.02em",
  },
  headerCenter: {
    flex: 2,
    display: "flex",
    justifyContent: "center",
    gap: "40px",
  },
  headerRight: {
    flex: 1,
    display: "flex",
    justifyContent: "flex-end",
  },
  navLink: {
    color: "#333",
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: "500",
    transition: "color 0.2s ease",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  navLinkDark: {
    color: "#fff",
  },

  // ✅ Dark Mode Toggle - Purple border half moon
  darkModeToggle: {
    background: "transparent",
    border: "2px solid #6B298C",
    borderRadius: "50%",
    width: "38px",
    height: "38px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "18px",
    color: "#6B298C",
    padding: 0,
    transition: "all 0.2s ease",
  },
  darkModeToggleDark: {
    border: "2px solid #6B298C",
    color: "#6B298C",
  },

  // ✅ Card - Same as signin/signup
  card: {
    width: 550,
    background: "#ffffff",
    padding: 40,
    borderRadius: 20,
    boxShadow: "0 22px 50px rgba(107, 41, 140, 0.25)",
    margin: "20px auto",
  },
  title: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1e293b",
    fontFamily: "'Poppins', 'Inter', sans-serif",
    letterSpacing: "-0.02em",
  },
  sub: {
    textAlign: "center",
    fontSize: 14,
    color: "#64748b",
    marginBottom: 24,
    fontWeight: "400",
    fontFamily: "'Inter', sans-serif",
  },
  success: {
    textAlign: "center",
    color: "#10b981",
    fontSize: 13,
    marginBottom: 12,
    fontFamily: "'Inter', sans-serif",
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    backgroundColor: "#f8fafc",
    transition: "all 0.2s ease",
    boxSizing: "border-box" as const,
    fontFamily: "'Inter', sans-serif",
    marginBottom: 16,
    outline: "none",
    ':focus': {
      borderColor: "#6B298C",
      boxShadow: "0 0 0 3px rgba(107, 41, 140, 0.1)",
    },
  },
  button: {
    width: "100%",
    padding: 15,
    background: "#6B298C",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontWeight: "600",
    fontSize: "16px",
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(107, 41, 140, 0.45)",
    transition: "all .2s ease",
    fontFamily: "'Inter', sans-serif",
    ':disabled': {
      opacity: 0.7,
      cursor: "not-allowed",
    },
  },
  back: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 20,
    color: "#64748b",
    fontFamily: "'Inter', sans-serif",
  },
  link: {
    padding: "4px 8px",
    borderRadius: 8,
    cursor: "pointer",
    color: "#6B298C",
    fontWeight: "600",
    transition: "all 0.2s ease",
    display: "inline-block",
  },
};