/**
 * Return `base` if it's not already taken, otherwise append " (2)", " (3)", ...
 * Case-insensitive. `existing` is a list of names already in use.
 */
export function uniqueTableName(base: string, existing: Iterable<string>): string {
  const taken = new Set<string>();
  for (const n of existing) taken.add(n.trim().toLowerCase());
  const b = base.trim();
  if (!taken.has(b.toLowerCase())) return b;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${b} (${i})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${b} (${Date.now()})`;
}

/**
 * Dedupe a batch of new names against `existing` AND against each other,
 * suffixing as needed. Returns names in input order.
 */
export function dedupeTableNames(names: string[], existing: Iterable<string>): string[] {
  const taken = new Set<string>();
  for (const n of existing) taken.add(n.trim().toLowerCase());
  return names.map(raw => {
    const unique = uniqueTableName(raw, taken);
    taken.add(unique.toLowerCase());
    return unique;
  });
}
