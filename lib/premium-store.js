// /lib/premium-store.js
import { kv } from "@vercel/kv";

/* ===============================
   SAVE SUBMISSION (7 DAYS)
================================ */
export async function savePremiumSubmission(token, payload) {
  await kv.set(`premium:${token}`, payload, {
    ex: 60 * 60 * 24 * 7
  });
}

/* ===============================
   LOAD SUBMISSION
================================ */
export async function loadPremiumSubmission(token) {
  return await kv.get(`premium:${token}`);
}

/* ===============================
   DELETE AFTER USE (OPTIONAL)
================================ */
export async function deletePremiumSubmission(token) {
  await kv.del(`premium:${token}`);
}
