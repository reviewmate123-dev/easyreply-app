"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminHistory() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(
          collection(db, "adminActions"),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.log(err);
      }

      setLoading(false);
    };

    load();
  }, []);

  const getColor = (type: string) => {
    switch (type) {
      case "CREDIT_ADD":
        return "#16a34a";
      case "USER_BLOCK":
        return "#dc2626";
      case "USER_UNBLOCK":
        return "#2563eb";
      case "PLAN_CHANGE":
        return "#7c3aed";
      case "AUTO_EXPIRE":
        return "#ea580c";
      default:
        return "#333";
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        Admin Action History
      </h1>

      {loading && <p>Loading history...</p>}

      {!loading && logs.length === 0 && (
        <p>No actions found.</p>
      )}

      {logs.map((log) => (
        <div
          key={log.id}
          style={{
            marginBottom: 12,
            padding: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              color: getColor(log.actionType),
              marginBottom: 6,
            }}
          >
            {log.actionType}
          </div>

          <p><b>User:</b> {log.targetEmail || "-"}</p>
          <p><b>Admin:</b> {log.performedByEmail || "-"}</p>

          <p style={{ fontSize: 12, color: "#666" }}>
            {log.createdAt?.seconds
              ? new Date(log.createdAt.seconds * 1000).toLocaleString()
              : "-"}
          </p>
        </div>
      ))}
    </div>
  );
}
