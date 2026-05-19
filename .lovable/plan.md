## Wire up the new Venue tab

The Venue components are built but not reachable. This pass swaps them into the planner and removes the now-orphaned Room/Tables surfaces.

### Changes

**`src/pages/Planner.tsx`**
- Replace `tables` + `room` entries in `TAB_DEFS` with a single `{ value: "venue", numeral: "II", label: "Venue" }`. Renumber `constraints` → III, `seating` → IV, `compare` → V, `export` → VI.
- Drop `TablesTab` + `RoomSetupPanel` imports; add `VenueTab` import.
- Replace the two `<TabsContent value="tables">` and `value="room">` blocks with one `<TabsContent value="venue">` rendering `<VenueTab>` (passes `planId`, `scenarioId`, `tables`, `assignments`, `roomConfig`, `canEdit`, `refresh`, `onSavedRoom` writing back via `setPlan`, plus `autoOpen={tablesAutoOpen}` / `onAutoOpenHandled`).
- On mount, normalize legacy query params: `?tab=tables` and `?tab=room` → `?tab=venue` (replace state).
- Keep `tablesAutoOpen` state name (already wired from onboarding); rename setter callsites only if needed.

**`src/components/planner/SeatingView.tsx`**
- Rename the `onGoToTables` prop to `onGoToVenue` semantically — or keep the prop name and just have Planner pass `() => setTab("venue")`. Go with the second (zero ripple).

**`src/components/planner/OnboardingFlow.tsx`**
- Step 2 copy "arrange the room layout in the Room tab" → "arrange the room in the Venue tab".

**Deletions** (no remaining importers after the above):
- `src/components/planner/TablesTab.tsx`
- `src/components/planner/RoomSetupPanel.tsx`
- `src/components/planner/SmartTableInput.tsx` (used only by TablesTab + OnboardingFlow step 2 — keep for now; OnboardingFlow still imports it). **Revision:** keep `SmartTableInput.tsx`.
- `src/components/planner/RoomEditor.tsx` + `src/components/planner/room/ToolPalette.tsx` + `src/components/planner/room/PropertiesPanel.tsx` — confirm no other importers via rg before deleting.

### Verification
- `rg` for each deleted file's basename to confirm zero importers remain.
- Build runs clean.
- Manual: open a plan, click Venue tab, add a table via modal, drag it, add a fixture, edit room dims, confirm Seating tab still renders the same room + fixtures.

### Out of scope
- AI edge-function changes (the unified AI input in `AddRail` already chains the two existing calls).
- Schema migrations.
- Mobile canvas (MobileVenueList already covers <lg).