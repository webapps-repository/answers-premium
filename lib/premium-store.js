// /lib/premium-store.js — FINAL STABLE IN-MEMORY STORE (NO KV)

/*
  ✅ Supports:
  - savePremiumSubmission
  - loadPremiumSubmission
  - deletePremiumSubmission

  ✅ No Vercel KV required
  ✅ No export errors possible
  ✅ No cold-start crashes
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

/* ✅ DELETE TOKEN */
export async function deletePremiumSubmission(token) {
  MEMORY_STORE.delete(token);
  console.log("✅ [PREMIUM STORE] Deleted token:", token);
  return true;
}
