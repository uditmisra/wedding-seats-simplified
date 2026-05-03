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

/** Greedy auto-assign respecting hard constraints and preferring grouping. */
export function autoAssign(
  guests: Guest[],
  tables: TableDef[],
  existing: Assignment[],
  constraints: ConstraintDef[],
  opts: { includeMaybe?: boolean; respectPinned?: boolean } = {}
): Map<string, string> {
  const result = new Map<string, string>();
  const tableFill = new Map<string, number>();
  tables.forEach(t => tableFill.set(t.id, 0));

  // Keep pinned & existing assignments where requested
  if (opts.respectPinned) {
    for (const a of existing) {
      if (a.pinned) {
        result.set(a.guest_id, a.table_id);
        tableFill.set(a.table_id, (tableFill.get(a.table_id) ?? 0) + 1);
      }
    }
  }

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

  // Group guests by party — keep groups together
  const groupBy = new Map<string, Guest[]>();
  for (const g of eligible) {
    if (result.has(g.id)) continue;
    const key = g.party?.trim() || `__solo_${g.id}`;
    if (!groupBy.has(key)) groupBy.set(key, []);
    groupBy.get(key)!.push(g);
  }
  // Sort groups largest-first
  const groups = [...groupBy.values()].sort((a, b) => b.length - a.length);

  for (const group of groups) {
    // Pick best table: enough room, no not_with conflict
    const best = tables
      .map(t => {
        const fill = tableFill.get(t.id) ?? 0;
        const room = t.capacity - fill;
        return { t, fill, room };
      })
      .filter(x => x.room >= group.length || (x.room > 0 && group.length > x.t.capacity))
      .filter(x => {
        const seated = [...result.entries()].filter(([, tid]) => tid === x.t.id).map(([gid]) => gid);
        for (const g of group) {
          const enemies = notWith.get(g.id);
          if (enemies && seated.some(s => enemies.has(s))) return false;
        }
        return true;
      })
      // Prefer tables that already have someone they "must sit with"
      .sort((a, b) => {
        const aBonus = scoreTable(a.t.id, group, mustWith, result);
        const bBonus = scoreTable(b.t.id, group, mustWith, result);
        if (aBonus !== bBonus) return bBonus - aBonus;
        // then tightest fit
        return a.room - b.room;
      });

    if (best.length === 0) continue; // can't seat group; skip
    let target = best[0];
    for (const g of group) {
      if ((tableFill.get(target.t.id) ?? 0) >= target.t.capacity) {
        // overflow: pick next available with room
        const next = tables.find(t => (tableFill.get(t.id) ?? 0) < t.capacity);
        if (!next) break;
        target = { t: next, fill: tableFill.get(next.id) ?? 0, room: next.capacity - (tableFill.get(next.id) ?? 0) };
      }
      result.set(g.id, target.t.id);
      tableFill.set(target.t.id, (tableFill.get(target.t.id) ?? 0) + 1);
    }
  }

  return result;
}

function scoreTable(
  tableId: string,
  group: Guest[],
  mustWith: Map<string, Set<string>>,
  current: Map<string, string>
): number {
  const seated = [...current.entries()].filter(([, tid]) => tid === tableId).map(([gid]) => gid);
  let score = 0;
  for (const g of group) {
    const friends = mustWith.get(g.id);
    if (friends) score += seated.filter(s => friends.has(s)).length;
  }
  return score;
}