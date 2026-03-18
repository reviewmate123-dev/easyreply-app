/**
 * CLIENT SAFE LOGGER
 * Browser → API → Server → Firestore
 */

export async function logAdminAction(data: {
  targetUid: string;
  targetName?: string;
  targetEmail?: string;
  actionType: string;
  performedBy: string;
  performedByName?: string;
  performedByEmail?: string;
  before?: any;
  after?: any;
}) {
  try {
    await fetch("/api/admin-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.error("log failed", e);
  }
}
