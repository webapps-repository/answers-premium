// /lib/get-numerology.js

const LETTER_MAP = {
  A: 1,
  J: 1,
  S: 1,
  B: 2,
  K: 2,
  T: 2,
  C: 3,
  L: 3,
  U: 3,
  D: 4,
  M: 4,
  V: 4,
  E: 5,
  N: 5,
  W: 5,
  F: 6,
  O: 6,
  X: 6,
  G: 7,
  P: 7,
  Y: 7,
  H: 8,
  Q: 8,
  Z: 8,
  I: 9,
  R: 9,
};

const VOWELS = new Set(["A", "E", "I", "O", "U", "Y"]);

function sumDigits(n) {
  return n
    .toString()
    .split("")
    .map((d) => parseInt(d, 10))
    .reduce((a, b) => a + b, 0);
}

// Reduce number, but keep master numbers 11 and 22
function reduceNumber(n) {
  while (n > 22 || (n > 9 && n !== 11 && n !== 22)) {
    n = sumDigits(n);
  }
  return n;
}

function nameToNumber(name, { vowelsOnly = false, consonantsOnly = false } = {}) {
  const chars = name.toUpperCase().replace(/[^A-Z]/g, "").split("");

  let total = 0;
  for (const ch of chars) {
    const isVowel = VOWELS.has(ch);
    if (vowelsOnly && !isVowel) continue;
    if (consonantsOnly && isVowel) continue;

    const val = LETTER_MAP[ch] || 0;
    total += val;
  }
  return total;
}

// DOB: YYYY-MM-DD
function lifePathFromDOB(dateOfBirth) {
  const [y, m, d] = dateOfBirth.split("-").map((n) => parseInt(n, 10));
  const total = y + m + d;
  return reduceNumber(total);
}

function dateNumber(dateOfBirth) {
  const [_, __, d] = dateOfBirth.split("-");
  return reduceNumber(parseInt(d, 10));
}

export function getNumerology(person) {
  const { fullName = "", dateOfBirth } = person;

  const lifePath = lifePathFromDOB(dateOfBirth);
  const expressionNumber = reduceNumber(nameToNumber(fullName));
  const soulUrgeNumber = reduceNumber(
    nameToNumber(fullName, { vowelsOnly: true })
  );
  const personalityNumber = reduceNumber(
    nameToNumber(fullName, { consonantsOnly: true })
  );
  const birthdayNumber = dateNumber(dateOfBirth);

  // Very simple “pinnacles/challenges” style derived numbers
  const pinnacle1 = reduceNumber(lifePath + birthdayNumber);
  const pinnacle2 = reduceNumber(expressionNumber + soulUrgeNumber);
  const challenge1 = Math.abs(lifePath - birthdayNumber);
  const challenge2 = Math.abs(expressionNumber - soulUrgeNumber);

  return {
    meta: {
      source: "Internal numerology engine (Pythagorean)",
      calculatedAt: new Date().toISOString(),
    },
    coreNumbers: {
      lifePath,
      expression: expressionNumber,
      soulUrge: soulUrgeNumber,
      personality: personalityNumber,
      birthday: birthdayNumber,
    },
    pinnacles: {
      first: pinnacle1,
      second: pinnacle2,
    },
    challenges: {
      first: reduceNumber(challenge1),
      second: reduceNumber(challenge2),
    },
  };
}
