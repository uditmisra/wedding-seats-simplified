import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Shape } from "@/lib/types";

const SHAPE_PRESETS: Record<Exclude<Shape, "long">, { name: string; capacity: number }> = {
  round: { name: "Round table", capacity: 8 },
  rectangle: { name: "Long table", capacity: 10 },
  square: { name: "Square table", capacity: 4 },
  head: { name: "Head table", capacity: 6 },
};

interface Props {
  shape: Shape;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string, capacity: number) => void;
}

/**
 * Hitched-style add-table modal: just name + chair count.
 * Shape is preselected from the rail icon the user clicked.
 */
export function AddTableModal({ shape, defaultName, onClose, onSave }: Props) {
  const preset = SHAPE_PRESETS[shape as Exclude<Shape, "long">] ?? SHAPE_PRESETS.round;
  const [name, setName] = useState(defaultName);
  const [capacity, setCapacity] = useState(preset.capacity);

  useEffect(() => { setName(defaultName); }, [defaultName]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-display text-[24px] font-normal">Add table</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 pt-1">
          <div>
            <Label className="label-mono">Table name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onSave(name.trim(), capacity); }}
              placeholder={preset.name}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="label-mono">No. chairs</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={capacity}
              onChange={(e) => setCapacity(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
              className="mt-1.5 w-28"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!name.trim()} onClick={() => onSave(name.trim(), capacity)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}