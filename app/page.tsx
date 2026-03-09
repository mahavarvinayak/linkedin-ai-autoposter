import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

export default async function Home() {
  let status = "Checking configuration...";
  let scheduleCount = 0;

  try {
    const scheduleRef = doc(db, "users", "default", "settings", "postSchedule");
    const scheduleSnap = await getDoc(scheduleRef);
    if (scheduleSnap.exists()) {
      status = "✅ Connected to Firebase & Schedule Found!";
      scheduleCount = Object.keys(scheduleSnap.data()).length;
    } else {
      status = "⚠️ Connected to Firebase but Schedule Document not found at the expected path.";
    }
  } catch (e) {
    status = "❌ Firebase Connection Error: " + (e instanceof Error ? e.message : String(e));
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', backgroundColor: '#000', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ color: '#0070f3' }}>LinkFlow AI Dashboard</h1>
      <p style={{ fontSize: '1.2rem' }}>{status}</p>
      
      <div style={{ marginTop: '30px', border: '1px solid #333', padding: '20px', borderRadius: '8px' }}>
        <h2>System Status:</h2>
        <ul>
          <li><strong>Backend:</strong> Next.js (Vercel)</li>
          <li><strong>Database:</strong> Firebase Firestore</li>
          <li><strong>Cron Jobs:</strong> GitHub Actions (Every Minute)</li>
          <li><strong>Schedule Active:</strong> {scheduleCount} days configured</li>
        </ul>
      </div>

      <div style={{ marginTop: '30px' }}>
        <p><em>Note: This is your backend dashboard. Use strictly for status checks.</em></p>
      </div>
    </div>
  );
}
