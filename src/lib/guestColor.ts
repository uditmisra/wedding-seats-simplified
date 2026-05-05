import type { Guest } from "@/lib/types";

// 8 distinct Atelier-palette colours — each readable with white text.
// Guests in the same party always share a colour; guests with no party
// are coloured by a hash of their own name so they still vary visually.
export const PARTY_PALETTE = [
  "#4a5232", // olive
  "#b65a36", // terracotta
  "#5c7a6b", // sage
  "#7a4a6b", // dusty mauve
  "#4a6b7a", // slate teal
  "#7a6438", // warm amber
  "#3d5c78", // denim blue
  "#6b4a4a", // dusty rose
];

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

export function guestColor(guest: Pick<Guest, "party" | "name">): string {
  const key = guest.party?.trim() || guest.name?.trim() || "?";
  return PARTY_PALETTE[djb2(key) % PARTY_PALETTE.length];
}
