/**
 * How we address a family. Every explorer is named up to three; beyond that we
 * talk to the group, so no child is reduced to "& co".
 */
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function clean(names: (string | null | undefined)[]): string[] {
  return names.map((n) => (n ?? "").trim()).filter(Boolean);
}

/** Heading form: "Mia", "Mia & Leo", "Mia, Leo & Sam", "Your 6 explorers". */
export function familyHeading(names: (string | null | undefined)[]): string {
  const n = clean(names);
  if (n.length === 0) return "Explorer";
  if (n.length === 1) return n[0];
  if (n.length === 2) return `${n[0]} & ${n[1]}`;
  if (n.length === 3) return `${n[0]}, ${n[1]} & ${n[2]}`;
  return `Your ${n.length} explorers`;
}

/** Sentence form: "Mia", "Mia and Leo", "Mia, Leo and Sam", "all six explorers". */
export function familySentence(names: (string | null | undefined)[], fallback = "your explorer"): string {
  const n = clean(names);
  if (n.length === 0) return fallback;
  if (n.length === 1) return n[0];
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  if (n.length === 3) return `${n[0]}, ${n[1]} and ${n[2]}`;
  return `all ${NUMBER_WORDS[n.length] ?? n.length} explorers`;
}

/** Greeting form, for lines that open by calling out to the children: "Mia and Leo", "Explorers". */
export function familyGreeting(names: (string | null | undefined)[]): string | null {
  const n = clean(names);
  if (n.length === 0) return null;
  if (n.length <= 3) return familySentence(n);
  return "Explorers";
}
