// SessionStorage persistence for the /demo route.
//
// State persists across refreshes within a tab session; closing the tab
// resets to the seeded sample wedding. This matches the brief's "refresh
// resets" intent at the session boundary while keeping accidental cmd-R
// from killing 3 minutes of dragging.

import type { Guest, TableDef, Assignment, ConstraintDef } from "@/lib/types";
import {
  DEMO_GUESTS,
  DEMO_TABLES,
  DEMO_ASSIGNMENTS,
  DEMO_CONSTRAINTS,
} from "./sampleData";

const KEY = "demo:state:v1";

export interface DemoState {
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
  constraints: ConstraintDef[];
}

const seed = (): DemoState => ({
  guests: DEMO_GUESTS.map(g => ({ ...g })),
  tables: DEMO_TABLES.map(t => ({ ...t })),
  assignments: DEMO_ASSIGNMENTS.map(a => ({ ...a })),
  constraints: DEMO_CONSTRAINTS.map(c => ({ ...c })),
});

export function loadDemoState(): DemoState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as DemoState;
    // Sanity guard — if anything is missing, fall back to a fresh seed.
    if (!parsed.guests || !parsed.tables || !parsed.assignments || !parsed.constraints) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

export function saveDemoState(state: DemoState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // sessionStorage can throw in private browsing or when full — ignore.
  }
}

export function resetDemoState(): DemoState {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(KEY);
  return seed();
}
