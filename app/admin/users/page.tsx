"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function AdminUsersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");

  // 🔐 AUTH + ADMIN CHECK
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/auth-login");
        return;
      }

      try {
        const myDoc = await getDoc(doc(db, "users", user.uid));

        if (!myDoc.exists() || myDoc.data().role !== "admin") {
          setError("You do not have permission to view users.");
          setLoading(false);
          return;
        }

        const snap = await getDocs(collection(db, "users"));
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setUsers(list);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Missing or insufficient permissions.");
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  // ➕ ADD CREDITS
  const addCredits = async (id: string, current: number) => {
    await updateDoc(doc(db, "users", id), {
      credits: current + 10,
    });

    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, credits: current + 10 } : u
      )
    );
  };

  // ➖ REMOVE CREDITS
  const removeCredits = async (id: string, current: number) => {
    if (current <= 0) return;

    await updateDoc(doc(db, "users", id), {
      credits: current - 10,
    });

    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, credits: current - 10 } : u
      )
    );
  };

  // 🔒 BLOCK / UNBLOCK
  const toggleBlock = async (id: string, blocked: string) => {
    const newStatus = blocked === "true" ? "false" : "true";

    await updateDoc(doc(db, "users", id), {
      blocked: newStatus,
    });

    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, blocked: newStatus } : u
      )
    );
  };

  if (loading) return <p style={{ padding: 40 }}>Loading users...</p>;
  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>All Users</h1>

        {users.map((u) => (
          <div key={u.id} style={styles.user}>
            <b>{u.name || "No name"}</b>
            <div>Email: {u.email}</div>
            <div>Role: {u.role}</div>
            <div>Credits: {u.credits}</div>
            <div>Status: {u.blocked === "true" ? "🚫 Blocked" : "✅ Active"}</div>

            <div style={styles.actions}>
              <button onClick={() => addCredits(u.id, u.credits)}>
                ➕ Add 10
              </button>
              <button onClick={() => removeCredits(u.id, u.credits)}>
                ➖ Remove 10
              </button>
              <button onClick={() => toggleBlock(u.id, u.blocked)}>
                {u.blocked === "true" ? "🔓 Unblock" : "🔒 Block"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: 40,
    background: "#f8fafc",
  },
  card: {
    width: 1000,
    background: "#fff",
    padding: 30,
    borderRadius: 16,
    boxShadow: "0 20px 40px rgba(0,0,0,.15)",
  },
  title: {
    fontSize: 26,
    marginBottom: 20,
  },
  user: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    background: "#f1f5f9",
  },
  actions: {
    marginTop: 10,
    display: "flex",
    gap: 10,
  },
};
