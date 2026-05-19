import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Shape, TableDef } from "@/lib/types";
import {
  type RoomConfig, type Fixture, type FixtureType,
  DEFAULT_ROOM_CONFIG, FIXTURE_META, roomLayout,
} from "@/lib/roomConfig";
import { invokeAIRoom, invokeAISingle } from "@/lib/aiParse";
import { AddTableModal } from "./AddTableModal";
import { uniqueTableName, dedupeTableNames } from "@/lib/uniqueName";

interface Props {
  planId: string;
  scenarioId: string;
  tables: TableDef[];
  roomConfig: RoomConfig | null;
  canEdit: boolean;
  onSavedRoom: (cfg: RoomConfig) => void;
  refresh: () => void;
}

const TABLE_SHAPES: Array<{ shape: Shape; label: string; seats: number }> = [
  { shape: "round", label: "Round", seats: 8 },
  { shape: "rectangle", label: "Long", seats: 10 },
  { shape: "square", label: "Square", seats: 4 },
  { shape: "head", label: "Head", seats: 6 },
];

const FIXTURE_LIST: FixtureType[] = ["dance_floor", "bar", "dj", "stage", "catering", "photo_booth", "bathroom", "coat_check", "entry"];

/** Tiny SVG preview of a table shape — draws the table outline + chair dots. */
function TableThumb({ shape }: { shape: Shape }) {
  const stroke = "hsl(var(--ink))";
  const fill = "hsl(var(--paper))";
  if (shape === "round") {
    const seats = 8;
    const cx = 32, cy = 30, r = 14, rs = 22;
    return (
      <svg viewBox="0 0 64 60" className="h-full w-full">
        <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1.1} />
        {Array.from({ length: seats }).map((_, i) => {
          const a = (i / seats) * Math.PI * 2 - Math.PI / 2;
          return <circle key={i} cx={cx + Math.cos(a) * rs} cy={cy + Math.sin(a) * rs} r={2.4} fill={fill} stroke={stroke} strokeWidth={0.9} />;
        })}
      </svg>
    );
  }
  if (shape === "square") {
    return (
      <svg viewBox="0 0 64 60" className="h-full w-full">
        <rect x={22} y={20} width={20} height={20} fill={fill} stroke={stroke} strokeWidth={1.1} rx={2} />
        {[[32,14],[32,46],[14,30],[50,30]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r={2.4} fill={fill} stroke={stroke} strokeWidth={0.9} />)}
      </svg>
    );
  }
  if (shape === "head") {
    return (
      <svg viewBox="0 0 64 60" className="h-full w-full">
        <rect x={10} y={26} width={44} height={10} fill={fill} stroke={stroke} strokeWidth={1.1} rx={2} />
        {[16,26,38,48].map((x,i) => <circle key={i} cx={x} cy={20} r={2.4} fill={fill} stroke={stroke} strokeWidth={0.9} />)}
        {[22,42].map((x,i) => <circle key={i} cx={x} cy={42} r={2.4} fill={fill} stroke={stroke} strokeWidth={0.9} />)}
      </svg>
    );
  }
  // rectangle / long
  return (
    <svg viewBox="0 0 64 60" className="h-full w-full">
      <rect x={8} y={24} width={48} height={12} fill={fill} stroke={stroke} strokeWidth={1.1} rx={2} />
      {[14,24,32,40,50].map((x,i) => <circle key={`t${i}`} cx={x} cy={18} r={2.2} fill={fill} stroke={stroke} strokeWidth={0.9} />)}
      {[14,24,32,40,50].map((x,i) => <circle key={`b${i}`} cx={x} cy={42} r={2.2} fill={fill} stroke={stroke} strokeWidth={0.9} />)}
    </svg>
  );
}

/** Tiny SVG pictogram for a venue feature. Dashed outline + italic label hint. */
function FixtureThumb({ type }: { type: FixtureType }) {
  const stroke = "hsl(var(--ink))";
  const accent = "hsl(var(--terracotta))";
  switch (type) {
    case "dance_floor":
      return (
        <svg viewBox="0 0 64 48" className="h-full w-full">
          <rect x={10} y={8} width={44} height={32} fill="none" stroke={accent} strokeWidth={1.2} strokeDasharray="3 3" rx={2}/>
          <text x={32} y={28} textAnchor="middle" fontFamily="Newsreader, serif" fontStyle="italic" fontSize="10" fill={accent}>dance</text>
        </svg>
      );
    case "bar":
      return (
        <svg viewBox="0 0 64 48" className="h-full w-full">
          <rect x={8} y={18} width={48} height={12} fill="hsl(var(--paper-2))" stroke={stroke} strokeWidth={1.1} rx={1.5}/>
          <text x={32} y={42} textAnchor="middle" fontFamily="Newsreader, serif" fontStyle="italic" fontSize="9" fill={stroke}>bar</text>
        </svg>
      );
    case "dj":
      return (
        <svg viewBox="0 0 64 48" className="h-full w-full">
          <rect x={18} y={14} width={28} height={20} fill={stroke} rx={2}/>
          <text x={32} y={28} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="hsl(var(--paper))">DJ</text>
        </svg>
      );
    case "stage":
      return (
        <svg viewBox="0 0 64 48" className="h-full w-full">
          <rect x={6} y={16} width={52} height={18} fill="none" stroke={stroke} strokeWidth={1.1} strokeDasharray="4 2" rx={2}/>
          <text x={32} y={28} textAnchor="middle" fontFamily="Newsreader, serif" fontStyle="italic" fontSize="10" fill={stroke}>stage</text>
        </svg>
      );
    case "entry":
      return (
        <svg viewBox="0 0 64 48" className="h-full w-full">
          <rect x={14} y={20} width={36} height={10} fill="hsl(var(--paper))" stroke={stroke} strokeWidth={1.1}/>
          <text x={32} y={28} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" letterSpacing="1" fill={stroke}>ENTRY</text>
        </svg>
      );
    case "catering":
      return (
        <svg viewBox="0 0 64 48" className="h-full w-full">
          <rect x={12} y={16} width={40} height={18} fill="none" stroke={stroke} strokeWidth={1.1} strokeDasharray="3 2" rx={2}/>
          <circle cx={22} cy={25} r={3} fill="none" stroke={stroke} strokeWidth={0.9}/>
          <circle cx={32} cy={25} r={3} fill="none" stroke={stroke} strokeWidth={0.9}/>
          <circle cx={42} cy={25} r={3} fill="none" stroke={stroke} strokeWidth={0.9}/>
        </svg>
      );
    case "photo_booth":
      return (
        <svg viewBox="0 0 64 48" className="h-full w-full">
          <rect x={18} y={10} width={28} height={28} fill="none" stroke={stroke} strokeWidth={1.1} rx={2}/>
          <circle cx={32} cy={24} r={6} fill="none" stroke={stroke} strokeWidth={1}/>
          <circle cx={32} cy={24} r={2.5} fill={stroke}/>
        </svg>
      );
    case "bathroom":
      return (
        <svg viewBox="0 0 64 48" className="h-full w-full">
          <rect x={14} y={10} width={36} height={28} fill="none" stroke={stroke} strokeWidth={1.1} rx={2}/>
          <text x={32} y={29} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill={stroke}>WC</text>
        </svg>
      );
    case "coat_check":
      return (
        <svg viewBox="0 0 64 48" className="h-full w-full">
          <path d="M16 30 H48 V36 H16 Z" fill="none" stroke={stroke} strokeWidth={1.1}/>
          <path d="M22 30 V18 a10 10 0 0 1 20 0" fill="none" stroke={stroke} strokeWidth={1}/>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 48" className="h-full w-full">
          <rect x={12} y={14} width={40} height={20} fill="none" stroke={stroke} strokeWidth={1.1} strokeDasharray="3 2" rx={2}/>
        </svg>
      );
  }
}

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
    <aside className="flex h-full flex-col border-r hairline">
      <div className="flex-1 overflow-y-auto p-4">
        {/* Tables */}
        <div className="label-mono mb-2.5">Tables</div>
        <div className="grid grid-cols-2 gap-2">
          {TABLE_SHAPES.map(({ shape, label, seats }) => (
            <button
              key={shape}
              disabled={!canEdit}
              onClick={() => setPendingShape(shape)}
              className="group flex flex-col items-center gap-1.5 rounded-lg border hairline bg-paper p-2.5 text-ink transition hover:-translate-y-0.5 hover:border-terracotta hover:shadow-soft disabled:opacity-40 disabled:hover:translate-y-0"
              title={`Add ${label.toLowerCase()} table`}
            >
              <div className="h-12 w-full">
                <TableThumb shape={shape} />
              </div>
              <div className="text-center">
                <div className="font-display text-[13px] leading-tight">{label}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">Seats {seats}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Features */}
        <div className="label-mono mb-2.5 mt-5">Features</div>
        <div className="grid grid-cols-2 gap-2">
          {FIXTURE_LIST.map((t) => {
            const meta = FIXTURE_META[t];
            return (
              <button
                key={t}
                disabled={!canEdit}
                onClick={() => addFixture(t)}
                className="group flex flex-col items-center gap-1.5 rounded-lg border hairline bg-paper p-2.5 text-ink transition hover:-translate-y-0.5 hover:border-terracotta hover:shadow-soft disabled:opacity-40 disabled:hover:translate-y-0"
              >
                <div className="h-10 w-full">
                  <FixtureThumb type={t} />
                </div>
                <div className="font-display text-[12px] leading-tight">{meta.label.replace(" / door", "")}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI */}
      {canEdit && (
        <div className="border-t hairline bg-paper-2/40 p-3">
          <div className="label-mono mb-1.5">Describe with AI</div>
          <Input
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runAI()}
            placeholder="20×14m room, 12 rounds of 8, bar by entry"
            className="h-9 font-display-italic text-[12px]"
            disabled={aiBusy}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={runAI}
            disabled={aiBusy || !aiText.trim()}
            className="mt-1.5 w-full gap-1.5 rounded-full border-hairline"
          >
            {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {aiBusy ? "Reading…" : "Set up with AI"}
          </Button>
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