// /lib/engines.js
// Pre-upgrade placeholder engines
// Safe, predictable, no external API calls
// Compatible with insights.js + triad.js

import { safeString } from "../lib/utils.js";

/* ============================================================
   BASIC ASTROLOGY PLACEHOLDER  
   (Upgrades later with AstrologyAPI + timezone detection)
============================================================ */
export function computeAstrologyMock(birthDate, birthTime, birthPlace) {
  // safety first
  const date = safeString(birthDate);
  const time = safeString(birthTime);
  const place = safeString(birthPlace);

  // Very simple mock structure — DO NOT MODIFY
  return {
    sun: "Aries",
    moon: "Leo",
    rising: "Sagittarius",

    transits: [
      "Sun trine Jupiter",
      "Moon conjunct Venus",
      "Mercury sextile Saturn"
    ],

    meta: {
      birthDate: date,
      birthTime: time,
      birthPlace: place || "Unknown"
    }
  };
}

/* ============================================================
   BASIC PYTHAGOREAN NUMEROLOGY  
   (Upgrades later to Master Suite: Expression, Soul Urge, etc.)
============================================================ */
export function computeBasicNumerology(fullName, birthDate) {
  const name = safeString(fullName)
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();

  // Name number (A=1 ... Z=26 → reduce)
  let nameSum = 0;
  for (let char of name) {
    nameSum += char.charCodeAt(0) - 64;
  }
  const nameNumber = reduceNum(nameSum);

  // Life Path from date
  const dateDigits = safeString(birthDate).replace(/\D/g, "");
  const lifePath = reduceNum(
    dateDigits
      .split("")
      .map((n) => Number(n))
      .reduce((a, b) => a + b, 0)
  );

  return {
    nameNumber,
    lifePath,
    meaning: {
      name:
        nameNumber === 1
          ? "Initiator, leadership"
          : nameNumber === 3
          ? "Creative, expressive"
          : nameNumber === 7
          ? "Analytical, introspective"
          : "General expression pattern",

      lifePath:
        lifePath === 1
          ? "Independence, ambition"
          : lifePath === 5
          ? "Freedom and change"
          : lifePath === 9
          ? "Humanitarian and completion"
          : "General soul trajectory"
    }
  };
}

// Helper used above
function reduceNum(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = n
      .toString()
      .split("")
      .map((d) => Number(d))
      .reduce((a, b) => a + b, 0);
  }
  return n;
}
