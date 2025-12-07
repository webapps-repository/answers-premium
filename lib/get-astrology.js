// /lib/get-astrology.js
import crypto from "crypto";

const ASTROLOGY_BASE_URL =
  process.env.ASTROLOGY_API_BASE_URL || "https://json.astrologyapi.com/v1";

function hasAstrologyCredentials() {
  return (
    !!process.env.ASTROLOGY_API_USER_ID && !!process.env.ASTROLOGY_API_KEY
  );
}

function basicAuthHeader() {
  const token = Buffer.from(
    `${process.env.ASTROLOGY_API_USER_ID}:${process.env.ASTROLOGY_API_KEY}`
  ).toString("base64");
  return `Basic ${token}`;
}

// Generic helper to call AstrologyAPI endpoint
async function callAstrology(endpoint, payload) {
  if (!hasAstrologyCredentials()) {
    return {
      ok: false,
      offline: true,
      message: "Astrology API credentials not configured.",
    };
  }

  const url = `${ASTROLOGY_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false,
      offline: true,
      message: `Astrology API error: ${res.status} ${text}`,
    };
  }

  const data = await res.json();
  return { ok: true, data };
}

/**
 * person = {
 *   fullName,
 *   dateOfBirth: "YYYY-MM-DD",
 *   timeOfBirth: "HH:MM",
 *   birthPlace,
 *   latitude,
 *   longitude,
 *   gender: "male" | "female" | "other"
 * }
 */
export async function getAstrology(person) {
  const {
    dateOfBirth,
    timeOfBirth = "12:00",
    latitude = 0,
    longitude = 0,
    gender = "male",
  } = person;

  const [year, month, day] = dateOfBirth.split("-").map((n) => parseInt(n, 10));
  const [hour, min] = timeOfBirth.split(":").map((n) => parseInt(n, 10));

  // These endpoints are examples – adjust to match your AstrologyAPI plan.
  const payload = {
    day,
    month,
    year,
    hour,
    min,
    lat: latitude,
    lon: longitude,
    tzone: 0, // UTC offset – customise if you want more precision
    gender,
  };

  // Example endpoints – can be expanded later
  const [natalRes, housesRes, aspectsRes] = await Promise.all([
    callAstrology("/astro_details", payload).catch(() => null),
    callAstrology("/horo_chart_details", payload).catch(() => null),
    callAstrology("/ashtakvarga_details", payload).catch(() => null),
  ]);

  const offline = !hasAstrologyCredentials();

  // Fallback structure if API unavailable
  if (
    offline ||
    !natalRes?.ok ||
    !housesRes?.ok ||
    !aspectsRes?.ok
  ) {
    return {
      offline: true,
      meta: {
        message:
          "AstrologyAPI not fully configured; using offline placeholder astrology data.",
      },
      natal: {
        sunSign: "Unknown",
        moonSign: "Unknown",
        risingSign: "Unknown",
      },
      houses: [],
      aspects: [],
    };
  }

  return {
    offline: false,
    meta: {
      source: "AstrologyAPI",
      fetchedAt: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
    natal: natalRes.data || {},
    houses: housesRes.data || [],
    aspects: aspectsRes.data || [],
  };
}
