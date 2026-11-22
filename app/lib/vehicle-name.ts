/**
 * One display name for a vehicle: the brand appears once and repeated model
 * words ("S450 S450 4MATIC", "G 63 G 63 4MATIC") are collapsed. Display only —
 * stored titles are not changed.
 */
export function collapseRepeats(text: string): string {
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean);
  for (let n = 3; n >= 1; n--) {
    for (let i = 0; i + 2 * n <= words.length; ) {
      const a = words.slice(i, i + n).join(" ").toLowerCase();
      const b = words.slice(i + n, i + 2 * n).join(" ").toLowerCase();
      if (a === b) words.splice(i + n, n);
      else i++;
    }
  }
  return words.join(" ");
}

export function vehicleDisplayName(brand: string | null | undefined, title: string): string {
  const b = (brand ?? "").trim();
  const t = collapseRepeats(title);
  if (!b || b === "—") return t;
  return t.toLowerCase().startsWith(b.toLowerCase()) ? t : `${b} ${t}`;
}
