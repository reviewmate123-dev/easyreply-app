"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileMenu({
  profile,
  profileOpen,
  setProfileOpen,
  logout,
  onHistoryClick, // ✅ NEW PROP ADDED
}: any) {
  const router = useRouter();
  const letter = profile?.name?.charAt(0)?.toUpperCase() || "U";

  /* ESC close */
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [setProfileOpen]);

  /* expiry */
  const getDaysLeft = () => {
    if (!profile?.planExpire) return "—";
    const expire = new Date(profile.planExpire);
    const now = new Date();
    const diff = Math.ceil(
      (expire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? `${diff} days` : "Expired";
  };

  return (
    <>
      {/* AVATAR BUTTON – TUMHARA ORIGINAL FEEL */}
      <button
        onClick={() => setProfileOpen(true)}
        style={styles.avatar}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        title="Account"
      >
        {letter}
      </button>

      {/* MODAL */}
      {profileOpen && (
        <div style={styles.overlay} onClick={() => setProfileOpen(false)}>
          <div style={styles.card} onClick={(e) => e.stopPropagation()}>
            {/* TOP */}
            <div style={styles.top}>
              <div style={styles.bigAvatar}>{letter}</div>
              <div>
                <div style={styles.name}>{profile?.name}</div>
                <div style={styles.email}>{profile?.email}</div>
              </div>
            </div>

            {/* BODY */}
            <div style={styles.box}>
              <InfoRow label="Business" value={profile?.businessName || "—"} />
              <InfoRow
                label="Current Plan"
                value={
                  <span style={styles.planBadge}>
                    {profile?.plan || "Free"}
                  </span>
                }
              />
              <InfoRow
                label="Credits Left"
                value={<b>{profile?.credits ?? 0}</b>}
              />
              <InfoRow
                label="Expires In"
                value={<b style={{ color: "#dc2626" }}>{getDaysLeft()}</b>}
                last
              />
            </div>

            {/* ACTIONS - 3 BUTTONS NOW */}
            <div style={styles.actions}>
              {/* ✅ HISTORY BUTTON - NEW */}
              <button
                style={styles.history}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
                onClick={() => {
                  setProfileOpen(false);
                  if (onHistoryClick) onHistoryClick();
                }}
              >
                📜 History
              </button>

              {/* UPGRADE BUTTON */}
              <button
                style={styles.upgrade}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
                onClick={() => {
                  setProfileOpen(false);
                  router.push("/pricing");
                }}
              >
                ⚡ Upgrade Plan
              </button>

              {/* LOGOUT BUTTON */}
              <button
                style={styles.logout}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* reusable row */
function InfoRow({ label, value, last = false }: any) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "12px 0",
        borderBottom: last ? "none" : "1px solid #e5e7eb",
        fontSize: 14,
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/* STYLES */
const styles: any = {
  /* OLD BUTTON BACK */
  avatar: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    fontSize: 18,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(37,99,235,.6)",
    transition: "all .15s ease",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.6)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },

  card: {
    width: 440,
    background: "#fff",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 30px 80px rgba(0,0,0,.35)",
  },

  top: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    marginBottom: 18,
  },

  bigAvatar: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#2563eb",
    color: "#fff",
    fontSize: 24,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    fontSize: 18,
    fontWeight: 700,
  },

  email: {
    fontSize: 13,
    color: "#6b7280",
  },

  box: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "0 14px",
  },

  planBadge: {
    background: "#eef2ff",
    color: "#2563eb",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  },

  actions: {
    display: "grid",
    gap: 10,
    marginTop: 18,
  },

  // ✅ NEW HISTORY BUTTON STYLE
  history: {
    height: 46,
    borderRadius: 12,
    border: "none",
    background: "#7c3aed", // Purple color
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },

  upgrade: {
    height: 46,
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },

  logout: {
    height: 44,
    borderRadius: 12,
    border: "none",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    transition: "all .2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
};