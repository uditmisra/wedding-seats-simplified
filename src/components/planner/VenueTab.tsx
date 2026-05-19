import { useEffect } from "react";
import { useBelowLg } from "@/hooks/use-mobile";
import type { TableDef, Assignment } from "@/lib/types";
import type { RoomConfig } from "@/lib/roomConfig";
import { AddRail } from "./venue/AddRail";
import { VenueCanvas } from "./venue/VenueCanvas";
import { MobileVenueList } from "./venue/MobileVenueList";

interface Props {
  planId: string;
  scenarioId: string;
  tables: TableDef[];
  assignments: Assignment[];
  roomConfig: RoomConfig | null;
  canEdit: boolean;
  refresh: () => void;
  onSavedRoom: (cfg: RoomConfig) => void;
  autoOpen?: "new" | "bulk" | null;
  onAutoOpenHandled?: () => void;
}

/**
 * Venue tab — one surface for building the room and arranging tables.
 * Below lg: falls back to a list view; the canvas is desktop-only.
 */
export function VenueTab({
  planId, scenarioId, tables, assignments, roomConfig, canEdit, refresh, onSavedRoom,
  autoOpen, onAutoOpenHandled,
}: Props) {
  const isBelowLg = useBelowLg();

  useEffect(() => { if (autoOpen) onAutoOpenHandled?.(); }, [autoOpen, onAutoOpenHandled]);

  if (isBelowLg) {
    return (
      <MobileVenueList
        planId={planId} scenarioId={scenarioId}
        tables={tables} assignments={assignments}
        roomConfig={roomConfig} canEdit={canEdit}
        onSavedRoom={onSavedRoom} refresh={refresh}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border hairline">
      <div className="grid lg:grid-cols-[280px_1fr]">
        <AddRail
          planId={planId} scenarioId={scenarioId}
          tables={tables} roomConfig={roomConfig}
          canEdit={canEdit} onSavedRoom={onSavedRoom} refresh={refresh}
        />
        <div className="bg-paper-2/30 p-4">
          <VenueCanvas
            planId={planId} tables={tables} assignments={assignments}
            roomConfig={roomConfig} canEdit={canEdit}
            onSavedRoom={onSavedRoom} refresh={refresh}
          />
        </div>
      </div>
    </div>
  );
}