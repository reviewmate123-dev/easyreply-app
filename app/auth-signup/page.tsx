"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Eye, EyeOff } from "lucide-react";

export default function AuthSignup() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleSignup = async () => {
    if (!firstName || !lastName || !business || !email || !password) {
      alert("Fill all fields");
      return;
    }

    if (!agreeTerms) {
      alert("Please agree to Terms of Service and Privacy Policy");
      return;
    }

    try {
      setLoading(true);

      const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const userRef = doc(db, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);

      // ✅ CREATE USER DOCUMENT (FULL & PROFESSIONAL)
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: `${firstName} ${lastName}`, // Combine first + last
          firstName: firstName,
          lastName: lastName,
          businessName: business,
          email: email,
          role: "user",
          plan: "free",
          credits: 20,
          blocked: "false",
          status: "active",

          subscription: {
            status: "inactive",
            stripeCustomerId: "",
            stripeSubscriptionId: "",
            currentPeriodEnd: null,
          },

          createdAt: serverTimestamp(),
        });
      }

      alert("Account created. You can login now");
      router.push("/auth-login");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if user exists in Firestore
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Create new user document for Google sign-in
        await setDoc(userRef, {
          name: result.user.displayName || "Google User",
          firstName: result.user.displayName?.split(" ")[0] || "",
          lastName: result.user.displayName?.split(" ").slice(1).join(" ") || "",
          businessName: "",
          email: result.user.email,
          role: "user",
          plan: "free",
          credits: 20,
          blocked: "false",
          status: "active",
          subscription: {
            status: "inactive",
            stripeCustomerId: "",
            stripeSubscriptionId: "",
            currentPeriodEnd: null,
          },
          createdAt: serverTimestamp(),
        });
      }
      
      router.push("/dashboard");
      
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // Toggle body class for dark mode
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
      {/* ✅ Header Bar */}
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
        <h1 style={styles.title}>Create your RepuLabAi account</h1>
        <p style={styles.sub}>
          Start managing customer reviews professionally
        </p>

        {/* ✅ First Name & Last Name in 2 columns */}
        <div style={styles.nameRow}>
          <input
            style={styles.nameInput}
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            style={styles.nameInput}
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <input
          style={styles.input}
          placeholder="Business name"
          value={business}
          onChange={(e) => setBusiness(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        {/* ✅ Password with eye icon */}
        <div style={styles.passwordContainer}>
          <input
            type={showPassword ? "text" : "password"}
            style={styles.passwordInput}
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            style={styles.eyeButton}
            onClick={() => setShowPassword(!showPassword)}
            type="button"
          >
            {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
          </button>
        </div>

        {/* ✅ Terms checkbox */}
        <div style={styles.termsContainer}>
          <input
            type="checkbox"
            id="terms"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            style={styles.checkbox}
          />
          <label htmlFor="terms" style={styles.termsLabel}>
            I agree to the <a href="/terms" style={styles.termsLink}>Terms of Service</a> and <a href="/privacy" style={styles.termsLink}>Privacy Policy</a>
          </label>
        </div>

        <button 
          style={styles.button} 
          onClick={handleSignup}
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
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Account"}
        </button>

        {/* ✅ Google Sign In */}
        <div style={styles.divider}>
          <span style={styles.dividerText}>Or continue with</span>
        </div>

        <button 
          style={styles.googleButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.05)";
          }}
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <span style={styles.googleIcon}>G</span>
          Google
        </button>

        <p style={styles.text}>
          Already have an account?{" "}
          <span
            style={styles.redirect}
            onClick={() => router.push("/auth-login")}
          >
            Sign in
          </span>
        </p>
      </div>
    </main>
  );
}

/* 🎨 STYLES – GRAPE THEME (#6B298C) */
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
  
  // ✅ Header Styles
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
    ':hover': {
      color: "#6B298C",
    },
  },
  navLinkDark: {
    color: "#fff",
  },
  
  // ✅ Dark Mode Toggle
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

  card: {
    width: 500,
    background: "#ffffff",
    padding: 40,
    borderRadius: 20,
    boxShadow: "0 22px 50px rgba(107, 41, 140, 0.25)",
    margin: "20px auto 40px",
  },
  title: { 
    textAlign: "center", 
    fontSize: 28, 
    marginBottom: 8,
    fontWeight: "600",
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
  
  // ✅ Name row with 2 columns
  nameRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: 16,
  },
  nameInput: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    backgroundColor: "#f8fafc",
    transition: "all 0.2s ease",
    boxSizing: "border-box" as const,
    fontFamily: "'Inter', sans-serif",
  },
  
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    marginBottom: 16,
    fontSize: 14,
    backgroundColor: "#f8fafc",
    transition: "all 0.2s ease",
    boxSizing: "border-box" as const,
    fontFamily: "'Inter', sans-serif",
  },
  
  // Password container with eye icon
  passwordContainer: {
    position: "relative" as const,
    width: "100%",
    marginBottom: 16,
  },
  passwordInput: {
    width: "100%",
    padding: "14px 45px 14px 14px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    boxSizing: "border-box" as const,
    backgroundColor: "#f8fafc",
    transition: "all 0.2s ease",
    fontFamily: "'Inter', sans-serif",
  },
  eyeButton: {
    position: "absolute" as const,
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  
  // Terms checkbox
  termsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: 20,
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: "#6B298C",
  },
  termsLabel: {
    fontSize: "14px",
    color: "#64748b",
    fontFamily: "'Inter', sans-serif",
  },
  termsLink: {
    color: "#6B298C",
    textDecoration: "none",
    fontWeight: "500",
    ':hover': {
      textDecoration: "underline",
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
    marginBottom: 20,
    fontFamily: "'Inter', sans-serif",
    ':disabled': {
      opacity: 0.7,
      cursor: "not-allowed",
    },
  },
  
  // Divider with text
  divider: {
    position: "relative" as const,
    textAlign: "center" as const,
    marginBottom: 20,
    ':before': {
      content: '""',
      position: "absolute",
      top: "50%",
      left: 0,
      right: 0,
      height: "1px",
      background: "#e2e8f0",
      zIndex: 1,
    },
  },
  dividerText: {
    background: "#fff",
    padding: "0 15px",
    color: "#64748b",
    fontSize: "14px",
    position: "relative" as const,
    zIndex: 2,
    fontFamily: "'Inter', sans-serif",
  },
  
  // Google button
  googleButton: {
    width: "100%",
    padding: 12,
    background: "#fff",
    color: "#333",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    fontWeight: "500",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all .2s ease",
    marginBottom: 20,
    fontFamily: "'Inter', sans-serif",
    ':hover': {
      background: "#f8fafc",
    },
    ':disabled': {
      opacity: 0.7,
      cursor: "not-allowed",
    },
  },
  googleIcon: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#6B298C",
  },
  
  text: { 
    textAlign: "center", 
    fontSize: 14, 
    marginTop: 16,
    color: "#64748b",
    fontFamily: "'Inter', sans-serif",
  },
  redirect: {
    padding: "4px 8px",
    borderRadius: 8,
    cursor: "pointer",
    color: "#6B298C",
    fontWeight: "600",
    transition: "all 0.2s ease",
    ':hover': {
      background: "#f3e8ff",
    },
  },
};