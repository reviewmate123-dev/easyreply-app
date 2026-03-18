"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { PLANS } from "@/lib/plans";

// ✅ IMPORT
import { logAdminAction } from "@/lib/adminActionLogger";

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [creditInputs, setCreditInputs] = useState<{ [key: string]: number }>(
    {}
  );
  const [planInputs, setPlanInputs] = useState<{ [key: string]: string }>({});
  const [expiryInputs, setExpiryInputs] = useState<{ [key: string]: string }>(
    {}
  );

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Admin details
  const [adminEmail, setAdminEmail] = useState("");
  const [adminUid, setAdminUid] = useState("");
  const [adminName, setAdminName] = useState("");

  // Admin check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/auth-login");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists() || snap.data().role !== "admin") {
        setError("Admin access only");
        setLoading(false);
        return;
      }

      setAdminEmail(snap.data().email);
      setAdminUid(user.uid);
      setAdminName(snap.data().name || "Admin");

      const userUnsub = onSnapshot(collection(db, "users"), (snap) => {
        const arr: any[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setUsers(arr);
        setLoading(false);
      });

      return () => userUnsub();
    });

    return () => unsub();
  }, []);

  // ✅ FIXED TOGGLE FUNCTION - autoReplyEnabled for Q&A, autoReviewEnabled for Review
  async function toggleAuto(userId: string, currentState: boolean, type: string) {
    try {
      const response = await fetch("/api/admin/toggle-auto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: userId,
          enabled: !currentState,
          type: type  // "review" ya "qa"
        })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle');
      }

      window.location.reload();

    } catch (error) {
      console.error("Toggle error", error);
      alert("Failed to toggle auto mode");
    }
  }

  // Add Credit
  const addCredit = async (id: string, current: number) => {
    const amount = creditInputs[id];
    if (!amount) return alert("Enter amount");

    const user = users.find((u) => u.id === id);
    if (!user) return alert("User not found");

    const before = { credits: current || 0 };
    const after = { credits: (current || 0) + amount };

    await updateDoc(doc(db, "users", id), after);

    await logAdminAction({
      actionType: "credit_add",
      targetUid: id,
      targetName: user.name,
      targetEmail: user.email,
      performedBy: adminUid,
      performedByName: adminName,
      performedByEmail: adminEmail,
      before,
      after,
    });

    setCreditInputs((p) => ({ ...p, [id]: 0 }));
  };

  // Remove Credit
  const removeCredit = async (id: string, current: number) => {
    const amount = creditInputs[id];
    if (!amount) return alert("Enter amount");

    const user = users.find((u) => u.id === id);
    if (!user) return alert("User not found");

    const before = { credits: current || 0 };
    const after = { credits: Math.max(0, (current || 0) - amount) };

    await updateDoc(doc(db, "users", id), after);

    await logAdminAction({
      actionType: "credit_remove",
      targetUid: id,
      targetName: user.name,
      targetEmail: user.email,
      performedBy: adminUid,
      performedByName: adminName,
      performedByEmail: adminEmail,
      before,
      after,
    });

    setCreditInputs((p) => ({ ...p, [id]: 0 }));
  };

  // Block/Unblock
  const toggleBlock = async (id: string, value: boolean) => {
    const user = users.find((u) => u.id === id);
    if (!user) return alert("User not found");

    const before = { blocked: value };
    const after = { blocked: !value };

    await updateDoc(doc(db, "users", id), after);

    await logAdminAction({
      actionType: value ? "unblock" : "block",
      targetUid: id,
      targetName: user.name,
      targetEmail: user.email,
      performedBy: adminUid,
      performedByName: adminName,
      performedByEmail: adminEmail,
      before,
      after,
    });
  };

  // Delete User
  const deleteUser = async (id: string) => {
    if (!confirm("Delete user?")) return;

    const user = users.find((u) => u.id === id);
    if (!user) return alert("User not found");

    const before = { userData: user };

    await deleteDoc(doc(db, "users", id));

    await logAdminAction({
      actionType: "delete_user",
      targetUid: id,
      targetName: user.name,
      targetEmail: user.email,
      performedBy: adminUid,
      performedByName: adminName,
      performedByEmail: adminEmail,
      before,
      after: { deleted: true },
    });
  };

  // Apply Plan
  const applyPlan = async (uid: string) => {
    const key = planInputs[uid];
    if (!key) return alert("Select plan");

    const user = users.find((u) => u.id === uid);
    if (!user) return alert("User not found");

    const plan = PLANS[key as keyof typeof PLANS];

    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + plan.duration);

    const before = {
      plan: user.plan,
      credits: user.credits,
    };

    const after = {
      plan: key,
      credits: plan.credits,
      planStart: start,
      planEnd: end,
    };

    await updateDoc(doc(db, "users", uid), after);

    await logAdminAction({
      actionType: "plan_change",
      targetUid: uid,
      targetName: user.name,
      targetEmail: user.email,
      performedBy: adminUid,
      performedByName: adminName,
      performedByEmail: adminEmail,
      before,
      after,
    });

    alert("Plan updated 🚀");
  };

  // Save Manual Plan
  const savePlanExpiry = async (uid: string) => {
    const plan = planInputs[uid];
    const date = expiryInputs[uid];

    if (!plan && !date) return alert("Nothing to save");

    const user = users.find((u) => u.id === uid);
    if (!user) return alert("User not found");

    const before = {
      plan: user.plan,
      planEnd: user.planEnd,
    };

    const data: any = {};
    if (plan) data.plan = plan;
    if (date) data.planEnd = new Date(date);

    await updateDoc(doc(db, "users", uid), data);

    await logAdminAction({
      actionType: "manual_plan_edit",
      targetUid: uid,
      targetName: user.name,
      targetEmail: user.email,
      performedBy: adminUid,
      performedByName: adminName,
      performedByEmail: adminEmail,
      before,
      after: data,
    });

    alert("Saved ✅");
  };

  // Filter
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());

    const matchPlan = planFilter === "all" ? true : u.plan === planFilter;

    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "blocked"
        ? u.blocked
        : !u.blocked;

    return matchSearch && matchPlan && matchStatus;
  });

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ["Name", "Email", "Credits", "Role", "Plan", "Status", "Google Connected", "Review", "Q&A"],
      ...filteredUsers.map((u) => [
        u.name,
        u.email,
        u.credits || 0,
        u.role,
        u.plan || "free",
        u.blocked ? "Blocked" : "Active",
        u.googleConnected ? "Yes" : "No",
        u.autoReviewEnabled ? "On" : "Off",
        u.autoReplyEnabled ? "On" : "Off",
      ]),
    ];

    const csv =
      "data:text/csv;charset=utf-8," +
      rows.map((r) => r.join(",")).join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", "users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;
  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;

  const totalUsers = filteredUsers.length;
  const blockedUsers = filteredUsers.filter((u) => u.blocked).length;
  const totalCredits = filteredUsers.reduce(
    (sum, u) => sum + (u.credits || 0),
    0
  );

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Admin Control Center</h1>

      <div style={styles.statsGrid}>
        <TopCard label="Users" value={totalUsers} />
        <TopCard label="Blocked" value={blockedUsers} />
        <TopCard label="Credits" value={totalCredits} />
      </div>

      <div style={styles.filterBar}>
        <input
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />

        <select
          style={styles.select}
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
        >
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="pro">Pro</option>
        </select>

        <select
          style={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>

        <button style={styles.blackBtn} onClick={exportCSV}>
          Export CSV
        </button>
      </div>

      <div style={styles.tableWrap}>
        <div style={styles.tableHeader}>
          <span>User</span>
          <span>Credits</span>
          <span>Role</span>
          <span>Status</span>
          <span>Google</span>
          <span>Review</span>
          <span>Q&A</span>
          <span>Credit Actions</span>
          <span>Plan</span>
          <span>Actions</span>
        </div>

        {filteredUsers.map((u) => (
          <div key={u.id} style={styles.row}>
            {/* User Column */}
            <div style={styles.userCell}>
              <div style={styles.name}>{u.name || "No name"}</div>
              <div style={styles.email}>{u.email}</div>
            </div>

            {/* Credits */}
            <div style={styles.credit}>
              {u.credits || 0}
            </div>

            {/* Role */}
            <div style={styles.role}>
              {u.role}
            </div>

            {/* Status Badge */}
            <div>
              <span style={u.blocked ? styles.badgeBlocked : styles.badgeActive}>
                {u.blocked ? "Blocked" : "Active"}
              </span>
            </div>

            {/* Google Status */}
            <div style={styles.googleCell}>
              {u.googleConnected ? (
                <span style={styles.googleConnected}>Connected</span>
              ) : (
                <span style={styles.googleNotConnected}>Not Connected</span>
              )}
            </div>

            {/* Review Button - ALONE in its column */}
            <div>
              <button
                onClick={() => toggleAuto(u.id, u.autoReviewEnabled || false, "review")}
                style={{
                  ...styles.autoButton,
                  background: u.autoReviewEnabled ? "#22c55e" : "#ef4444",
                }}
              >
                {u.autoReviewEnabled ? "ON" : "OFF"}
              </button>
            </div>

            {/* Q&A Button - ALONE in its column */}
            <div>
              <button
                onClick={() => toggleAuto(u.id, u.autoReplyEnabled || false, "qa")}
                style={{
                  ...styles.autoButton,
                  background: u.autoReplyEnabled ? "#22c55e" : "#ef4444",
                }}
              >
                {u.autoReplyEnabled ? "ON" : "OFF"}
              </button>
            </div>

            {/* Credit Actions */}
            <div style={styles.creditBox}>
              <input
                type="number"
                placeholder="Amt"
                value={creditInputs[u.id] || ""}
                onChange={(e) =>
                  setCreditInputs({
                    ...creditInputs,
                    [u.id]: Number(e.target.value),
                  })
                }
                style={styles.smallInput}
              />
              <button
                style={styles.addBtn}
                onClick={() => addCredit(u.id, u.credits)}
                title="Add Credits"
              >
                ➕
              </button>
              <button
                style={styles.removeBtn}
                onClick={() => removeCredit(u.id, u.credits)}
                title="Remove Credits"
              >
                ➖
              </button>
            </div>

            {/* Plan Section */}
            <div style={styles.planBox}>
              <select
                style={styles.miniSelect}
                value={planInputs[u.id] || ""}
                onChange={(e) =>
                  setPlanInputs({ ...planInputs, [u.id]: e.target.value })
                }
              >
                <option value="">Plan</option>
                <option value="free">Free</option>
                <option value="starter">Start</option>
                <option value="growth">Grow</option>
                <option value="pro">Pro</option>
              </select>

              <button style={styles.iconBtn} onClick={() => applyPlan(u.id)} title="Apply Plan">
                ✅
              </button>

              <input
                type="date"
                style={styles.miniDate}
                value={expiryInputs[u.id] || ""}
                onChange={(e) =>
                  setExpiryInputs({ ...expiryInputs, [u.id]: e.target.value })
                }
              />

              <button style={styles.iconBtn} onClick={() => savePlanExpiry(u.id)} title="Save Expiry">
                💾
              </button>
            </div>

            {/* Actions */}
            <div style={styles.actions}>
              <button
                style={u.blocked ? styles.unblockBtn : styles.blockBtn}
                onClick={() => toggleBlock(u.id, u.blocked)}
                title={u.blocked ? "Unblock" : "Block"}
              >
                {u.blocked ? "🔓" : "🔒"}
              </button>

              <button style={styles.deleteBtn} onClick={() => deleteUser(u.id)} title="Delete">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopCard({ label, value }: any) {
  return (
    <div style={styles.topCard}>
      <div style={styles.topLabel}>{label}</div>
      <div style={styles.topValue}>{value}</div>
    </div>
  );
}

// ✅ UPDATED STYLES - 10 COLUMNS with better layout
const styles: any = {
  page: { 
    padding: 30, 
    background: "#f8fafc", 
    minHeight: "100vh",
    fontFamily: "system-ui, sans-serif",
  },
  
  title: { 
    fontSize: 28, 
    fontWeight: 600, 
    marginBottom: 24,
    color: "#0f172a",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 24,
  },

  topCard: {
    background: "#fff",
    padding: 20,
    borderRadius: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },

  topLabel: { 
    color: "#64748b", 
    fontSize: 14,
    marginBottom: 6,
  },
  
  topValue: { 
    fontSize: 28, 
    fontWeight: 700,
    color: "#0f172a",
  },

  filterBar: { 
    display: "flex", 
    gap: 10, 
    marginBottom: 20,
    flexWrap: "wrap",
  },

  tableWrap: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    padding: "16px 20px",
    overflowX: "auto",
  },

  // ✅ UPDATED - 10 COLUMNS (Review and Q&A separate)
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "180px 70px 70px 80px 90px 70px 70px 130px 200px 70px",
    fontWeight: 600,
    fontSize: 13,
    color: "#64748b",
    paddingBottom: 10,
    borderBottom: "1px solid #e2e8f0",
    marginBottom: 6,
    gap: "4px",
    alignItems: "center",
  },

  // ✅ UPDATED - 10 COLUMNS
  row: {
    display: "grid",
    gridTemplateColumns: "180px 70px 70px 80px 90px 70px 70px 130px 200px 70px",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #f1f5f9",
    gap: "4px",
    fontSize: "13px",
    minHeight: "52px",
  },

  userCell: {
    overflow: "hidden",
  },

  name: { 
    fontWeight: 500,
    fontSize: 14,
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  
  email: { 
    fontSize: 12, 
    color: "#64748b",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  
  credit: { 
    fontWeight: 600,
    fontSize: 14,
    color: "#0f172a",
  },
  
  role: { 
    textTransform: "capitalize",
    fontSize: 12,
    background: "#f1f5f9",
    padding: "4px 8px",
    borderRadius: 20,
    display: "inline-block",
    textAlign: "center" as const,
    width: "fit-content",
  },

  badgeActive: {
    background: "#dcfce7",
    color: "#166534",
    padding: "4px 8px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 500,
    display: "inline-block",
  },

  badgeBlocked: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "4px 8px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 500,
    display: "inline-block",
  },

  googleCell: {
    fontSize: '12px',
  },

  googleConnected: {
    color: '#059669',
    fontWeight: 500,
  },

  googleNotConnected: {
    color: '#6b7280',
  },

  // ✅ New auto button style
  autoButton: {
    padding: "4px 8px",
    borderRadius: "6px",
    border: "none",
    color: "white",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: "11px",
    minWidth: "45px",
    transition: "all 0.2s",
  },

  creditBox: { 
    display: "flex", 
    gap: "3px", 
    alignItems: "center",
  },

  planBox: { 
    display: "flex", 
    gap: "3px", 
    alignItems: "center",
  },

  input: {
    width: "180px",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 13,
  },

  smallInput: {
    width: "45px",
    padding: "4px",
    borderRadius: 4,
    border: "1px solid #e2e8f0",
    fontSize: 11,
    textAlign: "center" as const,
  },

  miniSelect: {
    width: "55px",
    padding: "4px 2px",
    borderRadius: 4,
    border: "1px solid #e2e8f0",
    fontSize: 11,
  },

  miniDate: {
    width: "80px",
    padding: "4px 2px",
    borderRadius: 4,
    border: "1px solid #e2e8f0",
    fontSize: 11,
  },

  select: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 13,
  },

  addBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    width: "24px",
    height: "24px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  removeBtn: {
    background: "#e5e7eb",
    border: "none",
    width: "24px",
    height: "24px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  iconBtn: {
    background: "#f1f5f9",
    border: "none",
    width: "24px",
    height: "24px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  actions: { 
    display: "flex", 
    gap: "4px",
  },

  blackBtn: {
    background: "#0f172a",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  },

  blockBtn: {
    background: "#f1f5f9",
    border: "none",
    width: "28px",
    height: "28px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  unblockBtn: {
    background: "#22c55e",
    border: "none",
    width: "28px",
    height: "28px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
  },

  deleteBtn: {
    background: "#fee2e2",
    border: "none",
    width: "28px",
    height: "28px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#991b1b",
  },
};