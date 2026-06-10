import type { Guest, TableDef, Assignment, ConstraintDef } from "./types";

export function tableConflicts(
  tableId: string,
  assignments: Assignment[],
  constraints: ConstraintDef[]
): ConstraintDef[] {
  const seated = new Set(assignments.filter(a => a.table_id === tableId).map(a => a.guest_id));
  return constraints.filter(c => c.kind === "not_with" && seated.has(c.guest_a) && seated.has(c.guest_b));
}

export function unmetMustWith(
  assignments: Assignment[],
  constraints: ConstraintDef[]
): ConstraintDef[] {
  const tableOf = new Map(assignments.map(a => [a.guest_id, a.table_id]));
  return constraints.filter(c => {
    if (c.kind !== "with") return false;
    const ta = tableOf.get(c.guest_a);
    const tb = tableOf.get(c.guest_b);
    return ta && tb && ta !== tb;
  });
}

/**
 * Greedy auto-assign. Keep-apart ("not_with") is a HARD rule enforced at every
 * placement; keeping a party together and honouring "must_with" are soft
 * preferences expressed through table scoring.
 *
 * The previous version placed each party as one atomic block and only checked
 * conflicts against already-seated guests — so two people in the SAME party
 * with a keep-apart rule (e.g. divorced parents both on "Bride's family")
 * landed at the same table. Now guests are placed one at a time, biased toward
 * their party's table, and no placement is allowed beside an enemy.
 */
export function autoAssign(
  guests: Guest[],
  tables: TableDef[],
  existing: Assignment[],
  constraints: ConstraintDef[],
  opts: { includeMaybe?: boolean; respectPinned?: boolean } = {}
): Map<string, string> {
  const result = new Map<string, string>();
  const seatedAt = new Map<string, Set<string>>(); // tableId -> guestIds at that table
  const fillOf = (tid: string) => seatedAt.get(tid)?.size ?? 0;
  const place = (gid: string, tid: string) => {
    result.set(gid, tid);
    if (!seatedAt.has(tid)) seatedAt.set(tid, new Set());
    seatedAt.get(tid)!.add(gid);
  };

  // Keep pinned assignments where requested.
  if (opts.respectPinned) {
    for (const a of existing) {
      if (a.pinned) place(a.guest_id, a.table_id);
    }
  }

  const partyOf = new Map<string, string | null>();
  for (const g of guests) partyOf.set(g.id, g.party?.trim() || null);

  const eligible = guests.filter(g => g.rsvp === "attending" || (opts.includeMaybe && g.rsvp === "maybe"));
  const notWith = new Map<string, Set<string>>();
  const mustWith = new Map<string, Set<string>>();
  for (const c of constraints) {
    const m = c.kind === "not_with" ? notWith : mustWith;
    if (!m.has(c.guest_a)) m.set(c.guest_a, new Set());
    if (!m.has(c.guest_b)) m.set(c.guest_b, new Set());
    m.get(c.guest_a)!.add(c.guest_b);
    m.get(c.guest_b)!.add(c.guest_a);
  }

  // Placement order. Two grouping forces, strongest first:
  //   1. must_with — union-find clusters so linked guests are placed
  //      back-to-back and claim a table together before anyone fills it.
  //   2. party — secondary tie-break so a party still tends to land together.
  // Each guest is still seated individually so keep-apart can always split a
  // group that contains an internal conflict.
  const toSeat = eligible.filter(g => !result.has(g.id));

  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== r) { const n = parent.get(c)!; parent.set(c, r); c = n; }
    return r;
  };
  for (const g of toSeat) parent.set(g.id, g.id);
  for (const c of constraints) {
    if (c.kind === "with" && parent.has(c.guest_a) && parent.has(c.guest_b)) {
      parent.set(find(c.guest_a), find(c.guest_b));
    }
  }
  const clusterSize = new Map<string, number>();
  for (const g of toSeat) {
    const r = find(g.id);
    clusterSize.set(r, (clusterSize.get(r) ?? 0) + 1);
  }
  const partyCount = new Map<string, number>();
  for (const g of toSeat) {
    const p = partyOf.get(g.id);
    if (p) partyCount.set(p, (partyCount.get(p) ?? 0) + 1);
  }

  const order = [...toSeat].sort((a, b) => {
    const ca = clusterSize.get(find(a.id)) ?? 1;
    const cb = clusterSize.get(find(b.id)) ?? 1;
    if (ca !== cb) return cb - ca;                       // bigger must_with clusters first
    if (find(a.id) !== find(b.id)) return find(a.id) < find(b.id) ? -1 : 1; // keep clusters contiguous
    const pa = partyOf.get(a.id), pb = partyOf.get(b.id);
    const na = pa ? partyCount.get(pa) ?? 0 : 0;
    const nb = pb ? partyCount.get(pb) ?? 0 : 0;
    if (na !== nb) return nb - na;                       // bigger parties first
    if (pa !== pb) return (pa ?? "") < (pb ?? "") ? -1 : 1; // keep parties contiguous
    return 0;
  });

  const hasEnemyAt = (gid: string, tid: string): boolean => {
    const enemies = notWith.get(gid);
    if (!enemies) return false;
    const here = seatedAt.get(tid);
    if (!here) return false;
    for (const e of enemies) if (here.has(e)) return true;
    return false;
  };

  for (const g of order) {
    const candidates = tables
      .filter(t => fillOf(t.id) < t.capacity)   // has room
      .filter(t => !hasEnemyAt(g.id, t.id));     // HARD: no keep-apart enemy seated here
    if (candidates.length === 0) continue;       // can't seat this guest without a conflict

    const myParty = partyOf.get(g.id) ?? null;
    const friends = mustWith.get(g.id);
    const scored = candidates.map(t => {
      const here = seatedAt.get(t.id);
      let score = 0;
      if (here) {
        for (const other of here) {
          if (friends?.has(other)) score += 100;                          // must_with: strongest pull
          else if (myParty && partyOf.get(other) === myParty) score += 10; // same party
        }
      }
      return { t, score, fill: fillOf(t.id) };
    });
    // Highest score; among ties, the fuller table (finish tables before
    // spreading thin) so parties consolidate rather than scatter.
    scored.sort((a, b) => b.score - a.score || b.fill - a.fill);
    place(g.id, scored[0].t.id);
  }

  return result;
}