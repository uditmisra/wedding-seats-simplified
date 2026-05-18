import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Circle, Square, RectangleHorizontal, Crown } from "lucide-react";
import { toast } from "sonner";
import type { Shape, TableDef } from "@/lib/types";
import {
  type RoomConfig, type Fixture, type FixtureType,
  DEFAULT_ROOM_CONFIG, FIXTURE_META, roomLayout,
} from "@/lib/roomConfig";
import { invokeAIRoom, invokeAISingle } from "@/lib/aiParse";
import { AddTableModal } from "./AddTableModal";

interface Props {
  planId: string;
  scenarioId: string;
  tables: TableDef[];
  roomConfig: RoomConfig | null;
  canEdit: boolean;
  onSavedRoom: (cfg: RoomConfig) => void;
  refresh: () => void;
}

const TABLE_SHAPES: Array<{ shape: Shape; icon: React.ReactNode; label: string }> = [
  { shape: "round", icon: <Circle size={18} />, label: "Round" },
  { shape: "rectangle", icon: <RectangleHorizontal size={20} />, label: "Long" },
  { shape: "square", icon: <Square size={18} />, label: "Square" },
  { shape: "head", icon: <Crown size={18} />, label: "Head" },
];

const FIXTURE_LIST: FixtureType[] = ["bar", "dj", "dance_floor", "stage", "catering", "photo_booth", "bathroom", "coat_check", "entry"];

export function AddRail({ planId, scenarioId, tables, roomConfig, canEdit, onSavedRoom, refresh }: Props) {
  const cfg: RoomConfig = {
    width_m: roomConfig?.width_m ?? DEFAULT_ROOM_CONFIG.width_m,
    height_m: roomConfig?.height_m ?? DEFAULT_ROOM_CONFIG.height_m,
    fixtures: Array.isArray(roomConfig?.fixtures) ? roomConfig!.fixtures : DEFAULT_ROOM_CONFIG.fixtures,
  };
  const [pendingShape, setPendingShape] = useState<Shape | null>(null);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const rl = roomLayout(cfg, 40, 40, 40);

  const dropTableAt = (shape: Shape, name: string, capacity: number) => {
    const idx = tables.length;
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const jitter = (Math.random() - 0.5) * 30;
    const x = Math.round(rl.roomX + 100 + col * 180 + jitter);
    const y = Math.round(rl.roomY + 100 + row * 160 + jitter);
    return { x, y };
  };

  const addTable = async (shape: Shape, name: string, capacity: number) => {
    const { x, y } = dropTableAt(shape, name, capacity);
    await supabase.from("tables_def").insert({
      plan_id: planId, scenario_id: scenarioId,
      name, shape, capacity, x, y, rotation: 0,
    });
    setPendingShape(null);
    refresh();
  };

  const addFixture = async (type: FixtureType) => {
    const meta = FIXTURE_META[type];
    const newF: Fixture = {
      id: `${type}_${Date.now()}`,
      type,
      label: meta.label,
      x_pct: 0.5,
      y_pct: 0.5,
      w_pct: meta.defaultW,
      h_pct: meta.defaultH,
      visible: true,
    };
    const next: RoomConfig = { ...cfg, fixtures: [...cfg.fixtures, newF] };
    const { error } = await supabase.from("plans").update({ room_config: next as unknown as null }).eq("id", planId);
    if (error) { toast.error(error.message); return; }
    onSavedRoom(next);
  };

  const runAI = async () => {
    if (!aiText.trim()) return;
    setAiBusy(true);
    try {
      const [roomRes, tablesRes] = await Promise.all([
        invokeAIRoom(aiText),
        invokeAISingle("tables", aiText),
      ]);

      let nextCfg = cfg;
      if (roomRes.data) {
        const parsed = roomRes.data as { width_m?: number; height_m?: number; fixtures?: Fixture[] };
        nextCfg = {
          width_m: parsed.width_m ?? cfg.width_m,
          height_m: parsed.height_m ?? cfg.height_m,
          fixtures: parsed.fixtures ?? cfg.fixtures,
        };
        const { error } = await supabase.from("plans").update({ room_config: nextCfg as unknown as null }).eq("id", planId);
        if (error) { toast.error(error.message); setAiBusy(false); return; }
        onSavedRoom(nextCfg);
      }

      const newRl = roomLayout(nextCfg, 40, 40, 40);
      const parsedTables = (tablesRes.data as { tables?: Array<{ name: string; shape: Shape; capacity: number }> } | undefined)?.tables ?? [];
      if (parsedTables.length) {
        const base = tables.length;
        const rows = parsedTables.map((t, i) => {
          const idx = base + i;
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          return {
            plan_id: planId,
            scenario_id: scenarioId,
            name: t.name,
            shape: t.shape,
            capacity: t.capacity,
            x: Math.round(newRl.roomX + 100 + col * 180),
            y: Math.round(newRl.roomY + 100 + row * 160),
            rotation: 0,
          };
        });
        await supabase.from("tables_def").insert(rows);
      }

      if (!roomRes.data && !parsedTables.length) {
        toast.error(roomRes.error ?? tablesRes.error ?? "Couldn't read that description");
      } else {
        toast.success("Venue updated.");
        setAiText("");
      }
      refresh();
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <aside className="flex flex-col gap-5 border-r hairline p-4">
      {/* Tables */}
      <div>
        <div className="label-mono mb-2">Add table</div>
        <div className="grid grid-cols-4 gap-1.5">
          {TABLE_SHAPES.map(({ shape, icon, label }) => (
            <button
              key={shape}
              disabled={!canEdit}
              onClick={() => setPendingShape(shape)}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border hairline bg-paper text-ink-2 transition hover:border-terracotta hover:text-terracotta disabled:opacity-40"
              title={`Add ${label.toLowerCase()} table`}
            >
              {icon}
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fixtures */}
      <div>
        <div className="label-mono mb-2">Add feature</div>
        <div className="grid grid-cols-1 gap-1">
          {FIXTURE_LIST.map(t => {
            const meta = FIXTURE_META[t];
            return (
              <button
                key={t}
                disabled={!canEdit}
                onClick={() => addFixture(t)}
                className="flex items-center gap-2 rounded-md border hairline bg-paper px-2.5 py-1.5 text-left text-[13px] text-ink-2 transition hover:border-terracotta hover:text-terracotta disabled:opacity-40"
              >
                <span className="text-[14px]">{meta.emoji}</span>
                <span className="flex-1 truncate">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI */}
      {canEdit && (
        <div className="mt-auto border-t hairline pt-4">
          <div className="label-mono mb-2">Describe with AI</div>
          <Input
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runAI()}
            placeholder="e.g. 20×14m ballroom, 12 rounds of 8, dance floor by the bar"
            className="h-10 font-display-italic text-[13px]"
            disabled={aiBusy}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={runAI}
            disabled={aiBusy || !aiText.trim()}
            className="mt-2 w-full gap-1.5 rounded-full border-hairline"
          >
            {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {aiBusy ? "Reading…" : "Set up with AI"}
          </Button>
          <p className="mt-2 font-mono text-[10px] leading-snug text-ink-3">
            One sentence — dimensions, table count, and where the bar/DJ/dance floor go.
          </p>
        </div>
      )}

      {pendingShape && (
        <AddTableModal
          shape={pendingShape}
          defaultName={`Table ${tables.length + 1}`}
          onClose={() => setPendingShape(null)}
          onSave={(name, capacity) => addTable(pendingShape, name, capacity)}
        />
      )}
    </aside>
  );
}