export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function cleanWhitespace(input: string | null | undefined): string {
  return (input ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitName(fullName: string): { first: string; last: string } {
  const clean = cleanWhitespace(fullName);
  // SLZ format: "LASTNAME First" — uppercase surname comes first.
  // Detect by scanning tokens until one stops being uppercase.
  const tokens = clean.split(" ");
  const lastTokens: string[] = [];
  const firstTokens: string[] = [];
  let switched = false;
  for (const t of tokens) {
    if (!switched && t === t.toLocaleUpperCase("sk-SK") && t.length > 1) {
      lastTokens.push(t);
    } else {
      switched = true;
      firstTokens.push(t);
    }
  }
  return {
    last: titleCase(lastTokens.join(" ")) || clean,
    first: firstTokens.join(" ") || "",
  };
}

function titleCase(input: string): string {
  return input
    .toLocaleLowerCase("sk-SK")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("sk-SK") + word.slice(1))
    .join(" ");
}
