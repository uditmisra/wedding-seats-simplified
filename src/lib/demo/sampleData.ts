// Sample wedding for the public /demo route — Emma & James, 120 guests,
// 15 tables, 10 named constraints, ~25 pre-assigned guests with three
// intentional conflicts visible at first glance.
//
// The data is fully static so the demo is reproducible across sessions.
// Constraint and assignment IDs reference guest IDs, so don't rename slugs
// without updating both arrays.

import type { Guest, TableDef, Assignment, ConstraintDef, Plan } from "@/lib/types";
import { DEFAULT_ROOM_CONFIG, type RoomConfig } from "@/lib/roomConfig";

const id = (slug: string) => `demo-${slug}`;

export const DEMO_PLAN_ID = id("plan");
export const DEMO_SCENARIO_ID = id("scenario");

// Demo uses a larger room (26m × 18m) than the default 20m × 14m so all
// 12 tables fit with clean breathing room around the bar, dance floor and
// DJ booth. Fixture percentages match DEFAULT_ROOM_CONFIG.
const DEMO_ROOM_CONFIG: RoomConfig = {
  ...DEFAULT_ROOM_CONFIG,
  width_m: 26,
  height_m: 18,
  fixtures: DEFAULT_ROOM_CONFIG.fixtures.map(f => ({ ...f })),
};

export const DEMO_PLAN: Plan = {
  id: DEMO_PLAN_ID,
  code: "EMMA-JAMES",
  name: "Emma & James",
  event_date: "2026-09-14",
  room_config: DEMO_ROOM_CONFIG,
};

// ── Named characters — referenced in constraints + pre-assignments ───────
export const DEMO_GUEST_IDS = {
  bride: id("g-emma"),
  groom: id("g-james"),
  // Bride family
  mum: id("g-linda"),
  dad: id("g-robert"),
  gran: id("g-margaret"),
  veganAunt: id("g-beatrice"),
  veganCousin: id("g-lily"),
  loudUncle: id("g-pete"),
  // Groom family
  quietGrandma: id("g-rose"),
  groomMum: id("g-helen"),
  groomDad: id("g-stephen"),
  estrangedAunt: id("g-karen"),
  estrangedUncle: id("g-steve"),
  groomCousin: id("g-marcus"),
  // Friends
  moh: id("g-sophie"),
  collegeBff: id("g-hannah"),
  bestMan: id("g-daniel"),
  bestManWife: id("g-charlotte"),
  exGirlfriend: id("g-olivia"),
} as const;

const guest = (
  slug: string,
  name: string,
  party: string,
  extras: Partial<Guest> = {},
): Guest => ({
  id: id(slug),
  plan_id: DEMO_PLAN_ID,
  name,
  party,
  rsvp: "attending",
  meal: null,
  side: null,
  is_kid: false,
  accessibility: null,
  notes: null,
  metadata: null,
  ...extras,
});

export const DEMO_GUESTS: Guest[] = [
  // ── Bride's family (18) ──────────────────────────────────────────
  guest("g-emma", "Emma Bennett", "Bride's family"),
  guest("g-linda", "Linda Bennett", "Bride's family", { meal: "Salmon" }),
  guest("g-robert", "Robert Bennett", "Bride's family", { meal: "Beef" }),
  guest("g-margaret", "Margaret Bennett", "Bride's family", { accessibility: "Wheelchair access" }),
  guest("g-beatrice", "Beatrice Bennett", "Bride's family", { meal: "Vegan" }),
  guest("g-lily", "Lily Bennett", "Bride's family", { meal: "Vegan" }),
  guest("g-pete", "Pete Bennett", "Bride's family", { meal: "Beef", notes: "Loud after 8pm" }),
  guest("g-bf-1", "Lucy Bennett", "Bride's family"),
  guest("g-bf-2", "Oliver Bennett", "Bride's family"),
  guest("g-bf-3", "Ruth Bennett", "Bride's family"),
  guest("g-bf-4", "Edward Bennett", "Bride's family"),
  guest("g-bf-5", "Vicky Bennett", "Bride's family"),
  guest("g-bf-6", "Henry Bennett", "Bride's family"),
  guest("g-bf-7", "Anna Bennett", "Bride's family"),
  guest("g-bf-8", "William Bennett", "Bride's family"),
  guest("g-bf-9", "Sarah Bennett", "Bride's family"),
  guest("g-bf-10", "George Bennett", "Bride's family"),
  guest("g-bf-11", "Tom Bennett", "Bride's family"),

  // ── Groom's family (18) ──────────────────────────────────────────
  guest("g-james", "James Walker", "Groom's family"),
  guest("g-rose", "Rose Walker", "Groom's family", { notes: "Prefers calm tables" }),
  guest("g-helen", "Helen Walker", "Groom's family"),
  guest("g-stephen", "Stephen Walker", "Groom's family"),
  guest("g-karen", "Karen Walker", "Groom's family"),
  guest("g-steve", "Steve Walker", "Groom's family"),
  guest("g-marcus", "Marcus Walker", "Groom's family"),
  guest("g-gf-1", "Mary Walker", "Groom's family"),
  guest("g-gf-2", "Jack Walker", "Groom's family"),
  guest("g-gf-3", "Beth Walker", "Groom's family"),
  guest("g-gf-4", "Grace Walker", "Groom's family"),
  guest("g-gf-5", "Edward Walker", "Groom's family"),
  guest("g-gf-6", "Ruth Walker", "Groom's family"),
  guest("g-gf-7", "Frank Walker", "Groom's family"),
  guest("g-gf-8", "Eva Walker", "Groom's family"),
  guest("g-gf-9", "Joe Walker", "Groom's family"),
  guest("g-gf-10", "Iris Walker", "Groom's family"),
  guest("g-gf-11", "Albie Walker Sr.", "Groom's family"),

  // ── Bride's friends (16) ─────────────────────────────────────────
  guest("g-sophie", "Sophie Carter", "Bride's friends", { notes: "Maid of Honour" }),
  guest("g-hannah", "Hannah Reid", "Bride's friends", { notes: "College best friend" }),
  guest("g-bfr-1", "Megan Brown", "Bride's friends"),
  guest("g-bfr-2", "Alice Cooper", "Bride's friends"),
  guest("g-bfr-3", "Zoe Mitchell", "Bride's friends"),
  guest("g-bfr-4", "Ella Robinson", "Bride's friends"),
  guest("g-bfr-5", "Mia Bell", "Bride's friends"),
  guest("g-bfr-6", "Chloe Edwards", "Bride's friends"),
  guest("g-bfr-7", "Grace Hall", "Bride's friends"),
  guest("g-bfr-8", "Rachel Wood", "Bride's friends"),
  guest("g-bfr-9", "Amber Ward", "Bride's friends"),
  guest("g-bfr-10", "Holly Adams", "Bride's friends"),
  guest("g-bfr-11", "Eve King", "Bride's friends"),
  guest("g-bfr-12", "Niamh O'Brien", "Bride's friends"),
  guest("g-bfr-13", "Phoebe Stone", "Bride's friends"),
  guest("g-bfr-14", "Lucy Davis", "Bride's friends"),

  // ── Groom's friends (16) ─────────────────────────────────────────
  guest("g-daniel", "Daniel Hughes", "Groom's friends", { notes: "Best Man" }),
  guest("g-charlotte", "Charlotte Hughes", "Groom's friends"),
  guest("g-olivia", "Olivia Mason", "Groom's friends"),
  guest("g-gfr-1", "Mark Williams", "Groom's friends"),
  guest("g-gfr-2", "Tom Davies", "Groom's friends"),
  guest("g-gfr-3", "Henry Phillips", "Groom's friends"),
  guest("g-gfr-4", "Ben Roberts", "Groom's friends"),
  guest("g-gfr-5", "Jack Cooper", "Groom's friends"),
  guest("g-gfr-6", "Sam Patel", "Groom's friends"),
  guest("g-gfr-7", "Will Hughes", "Groom's friends"),
  guest("g-gfr-8", "Peter Knight", "Groom's friends"),
  guest("g-gfr-9", "Andrew Reid", "Groom's friends"),
  guest("g-gfr-10", "Greg Mitchell", "Groom's friends"),
  guest("g-gfr-11", "Joe Marsh", "Groom's friends"),
  guest("g-gfr-12", "Adam Foster", "Groom's friends"),
  guest("g-gfr-13", "Luke Anderson", "Groom's friends"),

  // ── College (14) ─────────────────────────────────────────────────
  guest("g-c-1", "Felix Hart", "College"),
  guest("g-c-2", "Aisha Khan", "College"),
  guest("g-c-3", "Maya Singh", "College"),
  guest("g-c-4", "Theo Wood", "College"),
  guest("g-c-5", "Isla Mason", "College"),
  guest("g-c-6", "Jordan Pierce", "College"),
  guest("g-c-7", "Tara Lewis", "College"),
  guest("g-c-8", "Connor Briggs", "College"),
  guest("g-c-9", "Ryan Foster", "College"),
  guest("g-c-10", "Lucas Bell", "College"),
  guest("g-c-11", "Vera Liu", "College"),
  guest("g-c-12", "Caleb Howard", "College"),
  guest("g-c-13", "Ines Romero", "College"),
  guest("g-c-14", "Wes Larsen", "College"),

  // ── Work (14) ────────────────────────────────────────────────────
  guest("g-w-1", "David Cohen", "Work"),
  guest("g-w-2", "Priya Shah", "Work"),
  guest("g-w-3", "Marcus Webb", "Work"),
  guest("g-w-4", "Anna Klein", "Work"),
  guest("g-w-5", "Oscar Tate", "Work"),
  guest("g-w-6", "Naomi Brennan", "Work"),
  guest("g-w-7", "Kyle Russo", "Work"),
  guest("g-w-8", "Bella Powell", "Work"),
  guest("g-w-9", "Theo Page", "Work"),
  guest("g-w-10", "Sam Kerr", "Work"),
  guest("g-w-11", "Rosa Mendez", "Work"),
  guest("g-w-12", "Liam Brooks", "Work"),
  guest("g-w-13", "Yuki Tanaka", "Work"),
  guest("g-w-14", "Zara Ahmed", "Work"),

  // ── Plus-ones (12) ───────────────────────────────────────────────
  guest("g-p-1", "Sasha Ortiz", "Plus-ones"),
  guest("g-p-2", "Ezra Black", "Plus-ones"),
  guest("g-p-3", "Nora Wells", "Plus-ones"),
  guest("g-p-4", "Cole Patterson", "Plus-ones"),
  guest("g-p-5", "Reese Donnelly", "Plus-ones"),
  guest("g-p-6", "Tess Hardy", "Plus-ones"),
  guest("g-p-7", "Henry Ng", "Plus-ones"),
  guest("g-p-8", "Iris Park", "Plus-ones"),
  guest("g-p-9", "Maxime Dupont", "Plus-ones"),
  guest("g-p-10", "Stella Volkov", "Plus-ones"),
  guest("g-p-11", "Andre Reyes", "Plus-ones"),
  guest("g-p-12", "Mia Suzuki", "Plus-ones"),

  // ── Kids (12) ────────────────────────────────────────────────────
  guest("g-k-1", "Olive Bennett", "Kids", { is_kid: true, meal: "Kids" }),
  guest("g-k-2", "Toby Walker", "Kids", { is_kid: true, meal: "Kids" }),
  guest("g-k-3", "Eli Walker", "Kids", { is_kid: true, meal: "Kids" }),
  guest("g-k-4", "Beatrix Bennett", "Kids", { is_kid: true, meal: "Kids" }),
  guest("g-k-5", "Otto Hughes", "Kids", { is_kid: true, meal: "Kids" }),
  guest("g-k-6", "Daisy Carter", "Kids", { is_kid: true, meal: "Kids" }),
  guest("g-k-7", "Jude Walker", "Kids", { is_kid: true, meal: "Kids" }),
  guest("g-k-8", "Penny Bennett", "Kids", { is_kid: true, meal: "Kids" }),
  guest("g-k-9", "Maeve Hughes", "Kids", { is_kid: true, meal: "Kids" }),
  guest("g-k-10", "Arthur Bennett", "Kids", { is_kid: true, meal: "Kids" }),
  guest("g-k-11", "Tilly Walker", "Kids", { is_kid: true, meal: "Kids" }),
  guest("g-k-12", "Albie Walker Jr.", "Kids", { is_kid: true, meal: "Kids" }),
];

// ── Tables (15) ──────────────────────────────────────────────────────
// 1 head (10) + 1 long kids (14) + 7 rounds (12 each) = 10 + 14 + 84
// = 108 seats for 120 guests. 12 guests intentionally unseated so the
// "Auto-seat" CTA has real work to do in the demo. Layout fits cleanly
// inside the 26m × 18m demo room (canvas clamps to 1200 × 800 px).

const table = (
  slug: string,
  name: string,
  capacity: number,
  shape: TableDef["shape"],
  x: number,
  y: number,
): TableDef => ({
  id: id(slug),
  plan_id: DEMO_PLAN_ID,
  scenario_id: DEMO_SCENARIO_ID,
  name,
  capacity,
  shape,
  x,
  y,
  rotation: 0,
});

export const DEMO_TABLES: TableDef[] = [
  // 26m × 18m demo room — fixtures: Entry (top), DJ (NE), Bar (SW),
  // Dance floor (SE). The Seating canvas auto-grids tables by array
  // order (it ignores stored x/y outside arrange-mode), so order here
  // is what determines visual placement.
  //
  // Goal: Head table centred along the top (front of room, facing
  // dance floor). Kids' table tucked into the opposite corner from
  // the head table, well away from the bridal party. Rounds wrap
  // around to fill the remaining cells.
  //
  // Capacity: head(10) + kids(14) + 7 rounds(12) = 108 seats for
  // 120 guests. 12 unseated by design — gives Auto-seat a real job.

  // Top row: round, HEAD (centred), round, round
  table("t-1",    "Table 1",    12, "round", 150, 230),
  table("t-head", "Head Table", 10, "head",  440, 230),
  table("t-2",    "Table 2",    12, "round", 740, 230),
  table("t-3",    "Table 3",    12, "round", 950, 230),

  // Middle row: four rounds across
  table("t-4", "Table 4", 12, "round", 150, 430),
  table("t-5", "Table 5", 12, "round", 350, 430),
  table("t-6", "Table 6", 12, "round", 550, 430),
  table("t-7", "Table 7", 12, "round", 750, 430),

  // Bottom-left corner: kids' table (away from head, away from dance floor)
  table("t-kids", "Kids' Table", 14, "long", 440, 680),
];

// ── Constraints (10) ─────────────────────────────────────────────────
// Three NOT_WITH that drive visible conflicts at first paint, plus
// MUST_WITH constraints that auto-assign respects when the user runs it.

const constraint = (
  slug: string,
  a: string,
  b: string,
  kind: ConstraintDef["kind"],
): ConstraintDef => ({
  id: id(slug),
  plan_id: DEMO_PLAN_ID,
  guest_a: a,
  guest_b: b,
  kind,
});

export const DEMO_CONSTRAINTS: ConstraintDef[] = [
  // Visible conflicts in the pre-assigned state
  constraint("c-divorced-parents", DEMO_GUEST_IDS.mum, DEMO_GUEST_IDS.dad, "not_with"),
  constraint("c-loud-vs-quiet", DEMO_GUEST_IDS.loudUncle, DEMO_GUEST_IDS.quietGrandma, "not_with"),
  constraint("c-estranged", DEMO_GUEST_IDS.estrangedAunt, DEMO_GUEST_IDS.estrangedUncle, "not_with"),

  // Lurking conflict — fires if the user drags the ex anywhere near Marcus
  constraint("c-ex-cousin", DEMO_GUEST_IDS.exGirlfriend, DEMO_GUEST_IDS.groomCousin, "not_with"),

  // Must-with bonds — auto-assign respects these
  constraint("c-moh-bff", DEMO_GUEST_IDS.moh, DEMO_GUEST_IDS.collegeBff, "with"),
  constraint("c-vegans", DEMO_GUEST_IDS.veganAunt, DEMO_GUEST_IDS.veganCousin, "with"),
  constraint("c-best-man-wife", DEMO_GUEST_IDS.bestMan, DEMO_GUEST_IDS.bestManWife, "with"),
  constraint("c-gran-mum", DEMO_GUEST_IDS.gran, DEMO_GUEST_IDS.mum, "with"),
  constraint("c-bff-college", DEMO_GUEST_IDS.collegeBff, id("g-c-1"), "with"),
  constraint("c-grandma-helen", DEMO_GUEST_IDS.quietGrandma, DEMO_GUEST_IDS.groomMum, "with"),
];

// ── Pre-assignments (~25) ────────────────────────────────────────────
// Three visible NOT_WITH conflicts at first paint:
//   1. Linda + Robert at the head table (divorced parents)
//   2. Pete + Rose at Table 1 (loud uncle next to quiet grandma)
//   3. Karen + Steve at Table 3 (estranged aunt and uncle)
// Plus several MUST_WITH violations the user can fix or auto-resolve.

const seat = (
  slug: string,
  guestId: string,
  tableId: string,
  seatIndex: number,
): Assignment => ({
  id: id(slug),
  plan_id: DEMO_PLAN_ID,
  scenario_id: DEMO_SCENARIO_ID,
  guest_id: guestId,
  table_id: tableId,
  seat_index: seatIndex,
  pinned: false,
});

export const DEMO_ASSIGNMENTS: Assignment[] = [
  // Head Table — divorced parents conflict
  seat("a-h-0", DEMO_GUEST_IDS.bride, id("t-head"), 0),
  seat("a-h-1", DEMO_GUEST_IDS.groom, id("t-head"), 1),
  seat("a-h-2", DEMO_GUEST_IDS.mum, id("t-head"), 2),
  seat("a-h-3", DEMO_GUEST_IDS.dad, id("t-head"), 3),
  seat("a-h-4", DEMO_GUEST_IDS.groomMum, id("t-head"), 4),
  seat("a-h-5", DEMO_GUEST_IDS.groomDad, id("t-head"), 5),
  seat("a-h-6", DEMO_GUEST_IDS.moh, id("t-head"), 6),
  seat("a-h-7", DEMO_GUEST_IDS.bestMan, id("t-head"), 7),

  // Table 1 — loud-vs-quiet conflict; vegan pair satisfies its constraint
  seat("a-1-0", DEMO_GUEST_IDS.loudUncle, id("t-1"), 0),
  seat("a-1-1", DEMO_GUEST_IDS.quietGrandma, id("t-1"), 1),
  seat("a-1-2", DEMO_GUEST_IDS.gran, id("t-1"), 2),
  seat("a-1-3", DEMO_GUEST_IDS.veganAunt, id("t-1"), 3),
  seat("a-1-4", DEMO_GUEST_IDS.veganCousin, id("t-1"), 4),
  seat("a-1-5", id("g-bf-1"), id("t-1"), 5),

  // Table 2 — bride's friends starter group (BFF + a few)
  seat("a-2-0", DEMO_GUEST_IDS.collegeBff, id("t-2"), 0),
  seat("a-2-1", id("g-bfr-1"), id("t-2"), 1),
  seat("a-2-2", id("g-bfr-2"), id("t-2"), 2),
  seat("a-2-3", id("g-bfr-3"), id("t-2"), 3),
  seat("a-2-4", id("g-bfr-4"), id("t-2"), 4),
  seat("a-2-5", id("g-bfr-5"), id("t-2"), 5),

  // Table 3 — estranged Karen + Steve sit together (conflict)
  seat("a-3-0", DEMO_GUEST_IDS.bestManWife, id("t-3"), 0),
  seat("a-3-1", DEMO_GUEST_IDS.estrangedAunt, id("t-3"), 1),
  seat("a-3-2", DEMO_GUEST_IDS.estrangedUncle, id("t-3"), 2),
  seat("a-3-3", id("g-gfr-1"), id("t-3"), 3),
  seat("a-3-4", id("g-gfr-2"), id("t-3"), 4),
];
