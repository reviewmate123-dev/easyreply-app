"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function AuthLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [savedEmails, setSavedEmails] = useState<string[]>([]);

  // Load saved emails from localStorage
  useEffect(() => {
    const emails = localStorage.getItem('savedEmails');
    if (emails) {
      setSavedEmails(JSON.parse(emails));
    }
  }, []);

  // Save email to localStorage on successful login
  const saveEmail = (email: string) => {
    const emails = localStorage.getItem('savedEmails');
    let emailList: string[] = emails ? JSON.parse(emails) : [];
    
    if (!emailList.includes(email)) {
      emailList = [email, ...emailList].slice(0, 5);
      localStorage.setItem('savedEmails', JSON.stringify(emailList));
      setSavedEmails(emailList);
    }
  };

  const handleSignin = async () => {
    if (!email || !password) {
      setError("Email and password required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // ✅ Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // ✅ Get Firebase ID token
      const token = await userCredential.user.getIdToken();
      
      // ✅ Create session cookie via API
      const sessionRes = await fetch('/api/auth-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      if (!sessionRes.ok) {
        throw new Error('Failed to create session');
      }
      
      saveEmail(email);

      setTimeout(() => {
        router.replace("/dashboard");
      }, 300);

    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // ✅ Get Firebase ID token
      const token = await result.user.getIdToken();
      
      // ✅ Create session cookie via API
      const sessionRes = await fetch('/api/auth-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      if (!sessionRes.ok) {
        throw new Error('Failed to create session');
      }
      
      if (result.user.email) {
        saveEmail(result.user.email);
      }
      
      setTimeout(() => {
        router.replace("/dashboard");
      }, 300);
      
    } catch (err: any) {
      setError(err.message || "Google sign in failed");
    } finally {
      setLoading(false);
    }
  };

  // GitHub Sign In
  const handleGithubSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // ✅ Get Firebase ID token
      const token = await result.user.getIdToken();
      
      // ✅ Create session cookie via API
      const sessionRes = await fetch('/api/auth-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      if (!sessionRes.ok) {
        throw new Error('Failed to create session');
      }
      
      if (result.user.email) {
        saveEmail(result.user.email);
      }
      
      setTimeout(() => {
        router.replace("/dashboard");
      }, 300);
      
    } catch (err: any) {
      setError(err.message || "GitHub sign in failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSignin();
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
    <main 
      style={darkMode ? {...styles.page, ...styles.pageDark} : styles.page}
      onKeyPress={handleKeyPress}
    >
      {/* ✅ Header Bar */}
      <div style={darkMode ? {...styles.header, ...styles.headerDark} : styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>TruStaga</span>
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
        <h1 style={styles.title}>Welcome Back</h1>
        <p style={styles.sub}>
          Reply to customer reviews faster and smarter
        </p>

        {/* Social Login Icons - FUNCTIONAL NOW */}
        <div style={styles.socialContainer}>
          <button 
            style={styles.socialButton}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#6B298C" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#6B298C" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#6B298C" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#6B298C" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </button>
          <button 
            style={styles.socialButton}
            onClick={handleGithubSignIn}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#6B298C" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </button>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or continue with email</span>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* ✅ Email input with datalist for saved emails */}
        <div style={styles.emailContainer}>
          <input
            style={styles.input}
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            list="saved-emails"
          />
          <datalist id="saved-emails">
            {savedEmails.map((savedEmail, index) => (
              <option key={index} value={savedEmail} />
            ))}
          </datalist>
        </div>

        {/* ✅ Password field with eye icon */}
        <div style={styles.passwordContainer}>
          <input
            type={showPassword ? "text" : "password"}
            style={styles.passwordInput}
            placeholder="Password"
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
          onClick={handleSignin}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div style={styles.actions}>
          <div
            style={styles.actionBox}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 10px 20px rgba(107, 41, 140, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 14px rgba(107, 41, 140, 0.2)";
            }}
            onClick={() => router.push("/auth-signup")}
          >
            Create account
          </div>

          <div
            style={styles.actionBox}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 10px 20px rgba(107, 41, 140, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 14px rgba(107, 41, 140, 0.2)";
            }}
            onClick={() => router.push("/auth-forgot")}
          >
            Forgot password
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div style={styles.testimonials}>
        <div style={styles.testimonialCard}>
          <p style={styles.testimonialText}>"TruStaga has transformed how we handle customer reviews. Response time down by 80%!"</p>
          <p style={styles.testimonialAuthor}>- Sarah Johnson, Marketing Director</p>
        </div>
        <div style={styles.testimonialCard}>
          <p style={styles.testimonialText}>"The AI-generated replies save us hours every week. Absolutely game-changing."</p>
          <p style={styles.testimonialAuthor}>- Michael Chen, Business Owner</p>
        </div>
        <div style={styles.testimonialCard}>
          <p style={styles.testimonialText}>"Finally a tool that understands our brand voice. Our customers love the quick responses."</p>
          <p style={styles.testimonialAuthor}>- Priya Patel, Customer Success</p>
        </div>
      </div>
    </main>
  );
}

/* 🎨 STYLES — PROFESSIONAL FONTS + GRAPE COLOR (#6B298C) */
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
  },
  navLinkDark: {
    color: "#fff",
  },

  // ✅ Dark Mode Toggle - Simple half moon with purple border and color
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
    width: 550,
    background: "#ffffff",
    padding: 40,
    borderRadius: 20,
    boxShadow: "0 22px 50px rgba(107, 41, 140, 0.25)",
    margin: "20px auto",
  },
  title: {
    textAlign: "center",
    fontSize: 32,
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
  socialContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  socialButton: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    border: "2px solid #6B298C",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    ':hover': {
      background: "rgba(107, 41, 140, 0.05)",
      transform: "translateY(-2px)",
    },
    ':disabled': {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
  divider: {
    position: "relative" as const,
    textAlign: "center" as const,
    marginBottom: "24px",
  },
  dividerText: {
    background: "#fff",
    padding: "0 16px",
    color: "#64748b",
    fontSize: "12px",
    position: "relative" as const,
    zIndex: 1,
    fontFamily: "'Inter', sans-serif",
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center" as const,
    fontFamily: "'Inter', sans-serif",
  },
  emailContainer: {
    width: "100%",
    marginBottom: 16,
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
  },
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
    marginTop: "8px",
    fontFamily: "'Inter', sans-serif",
    ':disabled': {
      opacity: 0.7,
      cursor: "not-allowed",
    },
  },
  actions: {
    marginTop: 24,
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
  },
  actionBox: {
    flex: 1,
    textAlign: "center",
    padding: "12px 12px",
    borderRadius: 12,
    background: "#f8fafc",
    color: "#6B298C",
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
    transition: "all .2s ease",
    boxShadow: "0 6px 14px rgba(107, 41, 140, 0.2)",
    border: "1px solid #e2e8f0",
    fontFamily: "'Inter', sans-serif",
  },
  testimonials: {
    display: "flex",
    justifyContent: "center",
    gap: "24px",
    maxWidth: "1200px",
    margin: "40px auto",
    padding: "0 20px",
  },
  testimonialCard: {
    flex: 1,
    background: "#ffffff",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(107, 41, 140, 0.1)",
    border: "1px solid #e2e8f0",
  },
  testimonialText: {
    fontSize: "14px",
    color: "#1e293b",
    lineHeight: "1.6",
    marginBottom: "12px",
    fontStyle: "italic",
    fontFamily: "'Inter', sans-serif",
  },
  testimonialAuthor: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "500",
    fontFamily: "'Inter', sans-serif",
  },
};