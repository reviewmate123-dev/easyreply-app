"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main style={styles.page}>
      {/* NAVBAR */}
      <header style={styles.nav}>
        <div style={styles.logo}>TruStaga</div>
        <div style={styles.navActions}>
          <button style={styles.linkBtn} onClick={() => router.push("/auth-login")}>
            Login
          </button>
          <button style={styles.primaryBtn} onClick={() => router.push("/auth-signup")}>
            Get Started
          </button>
        </div>
      </header>

      {/* HERO */}
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>
          AI-Powered Google Review Replies <br /> for Serious Businesses
        </h1>
        <p style={styles.heroText}>
          Respond to customer reviews professionally, instantly, and safely.
          Built for local businesses who care about reputation.
        </p>

        <div style={styles.heroBtns}>
          <button
            style={styles.primaryBtnBig}
            onClick={() => router.push("/dashboard?preview=true")}
          >
            Try Live Demo
          </button>
          <button
            style={styles.secondaryBtn}
            onClick={() => router.push("/auth-signup")}
          >
            Start Free
          </button>
        </div>
      </section>

      {/* FEATURES */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Why EasyReply?</h2>

        <div style={styles.grid}>
          <Feature
            title="Professional Tone"
            text="AI replies designed to match Google guidelines and business standards."
          />
          <Feature
            title="Save Hours Daily"
            text="Reply to reviews in seconds instead of typing manually."
          />
          <Feature
            title="Built for Businesses"
            text="Restaurants, salons, gyms, hotels & local services."
          />
        </div>
      </section>

      {/* DEMO */}
      <section style={styles.demo}>
        <h2 style={styles.sectionTitle}>See It In Action</h2>

        <div style={styles.demoCard}>
          <p style={styles.demoLabel}>Customer Review</p>
          <p style={styles.demoBox}>
            “Service was good but delivery was delayed.”
          </p>

          <p style={styles.demoLabel}>AI-Generated Reply</p>
          <p style={styles.demoReply}>
            Thank you for your feedback. We appreciate your patience and are
            actively working to improve our delivery times.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <p>© 2026 EasyReply. All rights reserved.</p>
        <div style={styles.footerLinks}>
          <span>Privacy</span>
          <span>Terms</span>
          <span>Support</span>
        </div>
      </footer>
    </main>
  );
}

/* FEATURE CARD */
function Feature({ title, text }: any) {
  return (
    <div style={styles.featureCard}>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

/* STYLES */
const styles: any = {
  page: {
    fontFamily: "Inter, system-ui, Arial",
    color: "#0f172a",
  },

  nav: {
    height: 72,
    padding: "0 64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #e5e7eb",
  },

  logo: {
    fontSize: 22,
    fontWeight: 700,
  },

  navActions: {
    display: "flex",
    gap: 16,
  },

  linkBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 15,
  },

  primaryBtn: {
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },

  hero: {
    padding: "120px 24px",
    textAlign: "center",
    background:
      "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
  },

  heroTitle: {
    fontSize: 48,
    fontWeight: 800,
    marginBottom: 20,
  },

  heroText: {
    maxWidth: 720,
    margin: "0 auto 32px",
    fontSize: 18,
    color: "#475569",
  },

  heroBtns: {
    display: "flex",
    justifyContent: "center",
    gap: 16,
  },

  primaryBtnBig: {
    padding: "14px 26px",
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(37,99,235,.35)",
  },

  secondaryBtn: {
    padding: "14px 26px",
    borderRadius: 12,
    border: "1px solid #cbd5f5",
    background: "#fff",
    cursor: "pointer",
  },

  section: {
    padding: "96px 64px",
  },

  sectionTitle: {
    textAlign: "center",
    fontSize: 32,
    marginBottom: 48,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 28,
  },

  featureCard: {
    padding: 32,
    borderRadius: 16,
    background: "#fff",
    boxShadow: "0 20px 40px rgba(0,0,0,.08)",
  },

  demo: {
    padding: "96px 24px",
    background: "#f8fafc",
  },

  demoCard: {
    maxWidth: 720,
    margin: "0 auto",
    padding: 40,
    borderRadius: 18,
    background: "#fff",
    boxShadow: "0 24px 48px rgba(0,0,0,.12)",
  },

  demoLabel: {
    fontWeight: 600,
    marginBottom: 6,
  },

  demoBox: {
    padding: 16,
    borderRadius: 12,
    background: "#f1f5f9",
    marginBottom: 20,
  },

  demoReply: {
    padding: 16,
    borderRadius: 12,
    background: "#eef2ff",
  },

  footer: {
    padding: 32,
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#64748b",
  },

  footerLinks: {
    display: "flex",
    gap: 20,
  },
};
