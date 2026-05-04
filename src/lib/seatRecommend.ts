import type { Assignment, ConstraintDef, Guest, TableDef } from "./types";

export interface RankedGuest {
  guest: Guest;
  score: number;
  reasons: string[];
  /** Names of seated guests this candidate must NOT sit with (warning, not block). */
  conflicts: string[];
}

/**
 * Rank unassigned guests for a target seat based on existing table composition
 * and constraints. Higher score = better match. Conflicts are surfaced but
 * candidates are never hidden — the user can override.
 */
export function rankCandidates(
  table: TableDef,
  tableSeated: Assignment[],
  candidates: Guest[],
  guestById: Map<string, Guest>,
  constraints: ConstraintDef[],
): RankedGuest[] {
  const seatedGuests = tableSeated
    .map(a => guestById.get(a.guest_id))
    .filter((g): g is Guest => !!g);
  const seatedIds = new Set(seatedGuests.map(g => g.id));

  // Tally party + side composition at the table.
  const partyCount = new Map<string, number>();
  const sideCount = new Map<string, number>();
  let kidCount = 0;
  for (const g of seatedGuests) {
    if (g.party) partyCount.set(g.party, (partyCount.get(g.party) ?? 0) + 1);
    if (g.side) sideCount.set(g.side, (sideCount.get(g.side) ?? 0) + 1);
    if (g.is_kid) kidCount++;
  }
  const dominantParty = topKey(partyCount);
  const dominantSide = topKey(sideCount);

  return candidates.map(guest => {
    const reasons: string[] = [];
    const conflicts: string[] = [];
    let score = 0;

    // 1. Must-sit-with someone here.
    const mustWith = constraints.filter(
      c => c.kind === "with" && (
        (c.guest_a === guest.id && seatedIds.has(c.guest_b)) ||
        (c.guest_b === guest.id && seatedIds.has(c.guest_a))
      )
    );
    if (mustWith.length) {
      score += 100 * mustWith.length;
      const names = mustWith.map(c => {
        const otherId = c.guest_a === guest.id ? c.guest_b : c.guest_a;
        return guestById.get(otherId)?.name ?? "—";
      });
      reasons.push(`Must sit with ${names.join(", ")}`);
    }

    // 2. Same party as the majority.
    if (guest.party && dominantParty && guest.party === dominantParty) {
      const n = partyCount.get(dominantParty) ?? 0;
      score += 30 + n * 2;
      reasons.push(`Same party (${guest.party})`);
    } else if (guest.party && partyCount.has(guest.party)) {
      score += 15;
      reasons.push(`Party already here`);
    }

    // 3. Same side as the table lean.
    if (guest.side && dominantSide && guest.side === dominantSide) {
      score += 10;
      reasons.push(`${capitalize(guest.side)} side`);
    }

    // 4. Kids cluster.
    if (guest.is_kid && kidCount > 0) {
      score += 8;
      reasons.push(`Kids table`);
    }

    // 5. Not-with conflict surfaces a warning and a score penalty.
    const notWith = constraints.filter(
      c => c.kind === "not_with" && (
        (c.guest_a === guest.id && seatedIds.has(c.guest_b)) ||
        (c.guest_b === guest.id && seatedIds.has(c.guest_a))
      )
    );
    if (notWith.length) {
      score -= 200 * notWith.length;
      for (const c of notWith) {
        const otherId = c.guest_a === guest.id ? c.guest_b : c.guest_a;
        const name = guestById.get(otherId)?.name;
        if (name) conflicts.push(name);
      }
    }

    return { guest, score, reasons, conflicts };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.guest.name.localeCompare(b.guest.name);
  });
}

function topKey(m: Map<string, number>): string | null {
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of m) if (v > n) { best = k; n = v; }
  return best;
}
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
