import { ReactNode, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Assignment, Guest, TableDef } from "@/lib/types";
import { Pin, PinOff, UserMinus, ArrowRightLeft, Move } from "lucide-react";

interface Props {
  children: ReactNode;
  assignment: Assignment;
  guest: Guest;
  table: TableDef;
  allTables: TableDef[];
  tableSeated: Assignment[];
  guestById: Map<string, Guest>;
  onUnassign: (a: Assignment) => void;
  onTogglePin: (a: Assignment) => void;
  onMoveTo: (a: Assignment, tableId: string) => void;
  onSwapWith: (a: Assignment, b: Assignment) => void;
}

export function SeatMenu({ children, assignment, guest, table, allTables, tableSeated, guestById, onUnassign, onTogglePin, onMoveTo, onSwapWith }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <span
          onContextMenu={(e) => { e.preventDefault(); setOpen(true); }}
          style={{ display: "contents" }}
        >
          {children}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{guest.name} · {table.name}</div>
        <DropdownMenuSeparator/>
        <DropdownMenuItem onSelect={() => onTogglePin(assignment)}>
          {assignment.pinned ? <><PinOff size={14} className="mr-2"/>Unpin</> : <><Pin size={14} className="mr-2"/>Pin to seat</>}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><Move size={14} className="mr-2"/>Move to table</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            {allTables.filter(t => t.id !== table.id).map(t => (
              <DropdownMenuItem key={t.id} onSelect={() => onMoveTo(assignment, t.id)}>{t.name}</DropdownMenuItem>
            ))}
            {allTables.length <= 1 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No other tables</div>}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><ArrowRightLeft size={14} className="mr-2"/>Swap with…</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            {tableSeated.filter(a => a.id !== assignment.id).map(a => {
              const g = guestById.get(a.guest_id);
              return <DropdownMenuItem key={a.id} onSelect={() => onSwapWith(assignment, a)}>{g?.name ?? "—"}</DropdownMenuItem>;
            })}
            {tableSeated.length <= 1 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No one else here</div>}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator/>
        <DropdownMenuItem className="text-destructive" onSelect={() => onUnassign(assignment)}>
          <UserMinus size={14} className="mr-2"/>Remove from seat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
