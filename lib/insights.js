// /lib/insights.js

import { getAstrology } from "./get-astrology.js";
import { getNumerology } from "./get-numerology.js";
import { getPalmistry } from "./get-palmistry.js";

/**
 * input = {
 *   person: {
 *     fullName,
 *     email,
 *     dateOfBirth: "YYYY-MM-DD",
 *     timeOfBirth?: "HH:MM",
 *     birthPlace?: string,
 *     latitude?: number,
 *     longitude?: number,
 *     gender?: string,
 *   },
 *   question?: string,
 *   handImageBase64?: string,
 *   handSide?: "left" | "right",
 * }
 */
export async function generateInsights(input) {
  const { person, question = "", handImageBase64, handSide = "left" } = input;

  const [astrology, numerology, palmistry] = await Promise.all([
    getAstrology(person),
    Promise.resolve(getNumerology(person)),
    getPalmistry({
      imageBase64: handImageBase64,
      handSide,
      fullName: person.fullName,
    }),
  ]);

  return {
    meta: {
      createdAt: new Date().toISOString(),
      version: "3.0.0-premium",
    },
    person,
    question,
    astrology,
    numerology,
    palmistry,
  };
}
