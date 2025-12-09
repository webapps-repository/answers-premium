// lib/premium-store.js — DEBUG MODE (NO KV)

export async function savePremiumSubmission(token, data) {
  console.log("✅ [DEBUG] Premium token stored IN MEMORY ONLY:", token);
  return true;
}

