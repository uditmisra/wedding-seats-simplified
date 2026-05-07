export type RSVP = "attending" | "declined" | "pending" | "maybe";
export type Shape = "round" | "rectangle" | "square" | "long" | "head";
export type ConstraintKind = "with" | "not_with";

import type { RoomConfig } from "./roomConfig";

export interface Plan {
  id: string;
  code: string;
  name: string;
  event_date: string | null;
  room_config: RoomConfig | null;
}

export interface Scenario {
  id: string;
  plan_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface Guest {
  id: string;
  plan_id: string;
  name: string;
  party: string | null;
  rsvp: RSVP;
  meal: string | null;
  side: string | null;
  is_kid: boolean;
  accessibility: string | null;
  notes: string | null;
}

export interface TableDef {
  id: string;
  plan_id: string;
  scenario_id: string;
  name: string;
  capacity: number;
  shape: Shape;
  x: number;
  y: number;
  rotation: number;
}

export interface Assignment {
  id: string;
  plan_id: string;
  scenario_id: string;
  guest_id: string;
  table_id: string;
  seat_index: number | null;
  pinned: boolean;
}

export interface ConstraintDef {
  id: string;
  plan_id: string;
  guest_a: string;
  guest_b: string;
  kind: ConstraintKind;
}