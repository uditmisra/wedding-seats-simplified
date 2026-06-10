import { describe, it, expect } from "vitest";
import { autoAssign, tableConflicts } from "./seating";
import { DEMO_GUESTS, DEMO_TABLES, DEMO_CONSTRAINTS } from "./demo/sampleData";
import type { Guest, TableDef, ConstraintDef, Assignment } from "./types";

const guest = (id: string, party: string, rsvp: Guest["rsvp"] = "attending"): Guest => ({
  id, plan_id: "p", name: id, party, rsvp, meal: null, side: null,
  is_kid: false, accessibility: null, notes: null, metadata: null,
});
const table = (id: string, capacity: number): TableDef => ({
  id, plan_id: "p", scenario_id: "s", name: id, capacity,
  shape: "round", x: 0, y: 0, rotation: 0,
});
const not = (a: string, b: string): ConstraintDef =>
  ({ id: `${a}-${b}`, plan_id: "p", guest_a: a, guest_b: b, kind: "not_with" });
const must = (a: string, b: string): ConstraintDef =>
  ({ id: `${a}+${b}`, plan_id: "p", guest_a: a, guest_b: b, kind: "with" });

const toAssignments = (m: Map<string, string>): Assignment[] =>
  [...m.entries()].map(([guest_id, table_id]) => ({
    id: guest_id, plan_id: "p", scenario_id: "s", guest_id, table_id, seat_index: null, pinned: false,
  }));

describe("autoAssign keep-apart enforcement", () => {
  it("never seats a keep-apart pair together — even when they share a party", () => {
    // The exact demo failure: divorced parents both on "Bride's family".
    const guests = [
      guest("linda", "Bride's family"),
      guest("robert", "Bride's family"),
      guest("emma", "Bride's family"),
      guest("kate", "Bride's family"),
    ];
    const tables = [table("t1", 4), table("t2", 4)];
    const constraints = [not("linda", "robert")];

    const result = autoAssign(guests, tables, [], constraints);
    expect(result.get("linda")).toBeDefined();
    expect(result.get("robert")).toBeDefined();
    expect(result.get("linda")).not.toBe(result.get("robert"));

    // No table should report any conflict.
    const assigns = toAssignments(result);
    for (const t of tables) {
      expect(tableConflicts(t.id, assigns, constraints)).toHaveLength(0);
    }
  });

  it("keeps a must-with pair together", () => {
    const guests = [
      guest("a", "Friends"), guest("b", "Friends"),
      guest("c", "Other"), guest("d", "Other"),
    ];
    const tables = [table("t1", 2), table("t2", 2)];
    const result = autoAssign(guests, tables, [], [must("a", "d")]);
    expect(result.get("a")).toBe(result.get("d"));
  });

  it("keeps a party together when no rule forbids it", () => {
    const guests = ["g1", "g2", "g3", "g4"].map(id => guest(id, "College"));
    const tables = [table("t1", 8), table("t2", 8)];
    const result = autoAssign(guests, tables, [], []);
    const seatedTables = new Set(guests.map(g => result.get(g.id)));
    expect(seatedTables.size).toBe(1); // all at one table
  });

  it("respects pinned guests and seats around them without conflict", () => {
    const guests = [guest("x", "A"), guest("y", "A")];
    const tables = [table("t1", 4)];
    const existing: Assignment[] = [
      { id: "x", plan_id: "p", scenario_id: "s", guest_id: "x", table_id: "t1", seat_index: 0, pinned: true },
    ];
    // y is an enemy of x → y must NOT go to t1, and there's no other table.
    const result = autoAssign(guests, tables, existing, [not("x", "y")], { respectPinned: true });
    expect(result.get("x")).toBe("t1");
    expect(result.get("y")).toBeUndefined(); // correctly left unseated rather than placed in conflict
  });

  it("handles a fully-constrained chain across enough tables", () => {
    // Three mutual enemies need three different tables.
    const guests = [guest("a", "P"), guest("b", "P"), guest("c", "P")];
    const tables = [table("t1", 4), table("t2", 4), table("t3", 4)];
    const constraints = [not("a", "b"), not("b", "c"), not("a", "c")];
    const result = autoAssign(guests, tables, [], constraints);
    const seats = new Set(["a", "b", "c"].map(g => result.get(g)));
    expect(seats.size).toBe(3);
  });

  // The real product guard: the demo is the first thing every visitor runs.
  it("produces zero conflicts on the real demo wedding (incl. divorced parents)", () => {
    const result = autoAssign(DEMO_GUESTS, DEMO_TABLES, [], DEMO_CONSTRAINTS, { includeMaybe: true });
    const assigns = toAssignments(result);
    let conflicts = 0;
    for (const t of DEMO_TABLES) conflicts += tableConflicts(t.id, assigns, DEMO_CONSTRAINTS).length;
    expect(conflicts).toBe(0);
    expect(result.size).toBeGreaterThan(80);
  });
});
