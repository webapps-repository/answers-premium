// /lib/premium-store.js — FULL DEBUG MODE (NO KV, IN-MEMORY STORE)

/*
  ✅ This file now supports:
  - savePremiumSubmission
  - loadPremiumSubmission
  - deletePremiumSubmission

  ✅ Works without Vercel KV
  ✅ Persists in memory during runtime
  ✅ Prevents ALL current 500 errors
*/

const MEMORY_STORE = new Map();

/* ✅ SAVE TOKEN */
export async function savePremiumSubmission(token, data) {
  MEMORY_STORE.set(token, data);
  console.log("✅ [PREMIUM STORE] Saved token:", token);
  return true;
}

/* ✅ LOAD TOKEN */
export async function loadPremiumSubmission(token) {
  const data = MEMORY_STORE.get(token);
  console.log("✅ [PREMIUM STORE] Loaded token:", token, Boolean(data));
  return data || null;
}

/* ✅ DELETE TOKEN (PREVENT REUSE) */
export async function deletePremiumSubmission(token) {
  MEMORY_STORE.delete(token);
  console.log("✅ [PREMIUM STORE] Deleted token:", token);
  return true;
}
