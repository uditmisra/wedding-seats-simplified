import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wand2, Plus, Trash2, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import {
  type RoomConfig,
  type Fixture,
  type FixtureType,
  DEFAULT_ROOM_CONFIG,
  FIXTURE_META,
  FIXTURE_TYPES,
} from "@/lib/roomConfig";

interface Props {
  planId: string;
  roomConfig: RoomConfig | null;
  onSaved: (cfg: RoomConfig) => void;
  canEdit?: boolean;
}

export function RoomSetupPanel({ planId, roomConfig, onSaved, canEdit = true }: Props) {
  const [cfg, setCfg] = useState<RoomConfig>(roomConfig ?? { ...DEFAULT_ROOM_CONFIG });
  const [aiText, setAiText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (next: RoomConfig) => { setCfg(next); setDirty(true); };

  const updateFixture = (id: string, patch: Partial<Fixture>) => {
    update({ ...cfg, fixtures: cfg.fixtures.map(f => f.id === id ? { ...f, ...patch } : f) });
  };

  const removeFixture = (id: string) => {
    update({ ...cfg, fixtures: cfg.fixtures.filter(f => f.id !== id) });
  };

  const addFixture = (type: FixtureType) => {
    const meta = FIXTURE_META[type];
    const newF: Fixture = {
      id: `${type}_${Date.now()}`,
      type,
      label: meta.label,
      x_pct: 0.1,
      y_pct: 0.1,
      w_pct: meta.defaultW,
      h_pct: meta.defaultH,
      visible: true,
    };
    update({ ...cfg, fixtures: [...cfg.fixtures, newF] });
  };

  const parseWithAI = async () => {
    if (!aiText.trim()) return;
    setParsing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? (await supabase.auth.getSession().then(r => r.data.session?.access_token)) ?? "";
      const resp = await supabase.functions.invoke("ai-parse", {
        body: { mode: "room", input: aiText },
      });
      if (resp.error) throw new Error(resp.error.message);
      const parsed = resp.data as { width_m?: number; height_m?: number; fixtures?: Fixture[] };
      const next: RoomConfig = {
        width_m: parsed.width_m ?? cfg.width_m,
        height_m: parsed.height_m ?? cfg.height_m,
        fixtures: parsed.fixtures ?? cfg.fixtures,
      };
      setCfg(next);
      setDirty(true);
      toast.success("Room layout parsed — review and save below.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI parse failed");
    } finally {
      setParsing(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("plans")
        .update({ room_config: cfg as unknown as null })
        .eq("id", planId);
      if (error) throw error;
      setDirty(false);
      onSaved(cfg);
      toast.success("Room saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setCfg(DEFAULT_ROOM_CONFIG);
    setDirty(true);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-8">
      {/* Main column */}
      <div className="space-y-8">
        {/* AI input */}
        {canEdit && (
          <div className="space-y-3">
            <p className="label-mono">Describe your room</p>
            <div className="flex gap-2">
              <Input
                value={aiText}
                onChange={e => setAiText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && parseWithAI()}
                placeholder="e.g. 20m × 14m ballroom, dance floor on the right, bar near the entry, DJ in the corner"
                className="flex-1 font-display-italic text-[15px] h-11"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={parseWithAI}
                disabled={parsing || !aiText.trim()}
                className="gap-1.5 shrink-0"
              >
                <Wand2 size={14} className={parsing ? "animate-spin" : ""} />
                {parsing ? "Parsing…" : "Parse"}
              </Button>
            </div>
            <p className="font-mono text-[11px] text-ink-3">
              Describe the room in plain English — dimensions, table layout hints, and venue features. Press Enter or click Parse.
            </p>
          </div>
        )}

        {/* Dimensions */}
        <div>
          <p className="label-mono mb-4">Room dimensions</p>
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 block mb-1.5">Width (m)</label>
              <Input
                type="number"
                min={4} max={100}
                value={cfg.width_m}
                onChange={e => update({ ...cfg, width_m: Math.max(4, Number(e.target.value)) })}
                disabled={!canEdit}
                className="h-10 font-mono text-[14px]"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 block mb-1.5">Length (m)</label>
              <Input
                type="number"
                min={4} max={100}
                value={cfg.height_m}
                onChange={e => update({ ...cfg, height_m: Math.max(4, Number(e.target.value)) })}
                disabled={!canEdit}
                className="h-10 font-mono text-[14px]"
              />
            </div>
          </div>
          <p className="font-mono text-[11px] text-ink-3 mt-2">
            Canvas will be {cfg.width_m}m × {cfg.height_m}m — roughly{" "}
            {Math.round(cfg.width_m * 3.28)}ft × {Math.round(cfg.height_m * 3.28)}ft
          </p>
        </div>

        {/* Fixture list */}
        <div>
          <p className="label-mono mb-4">Venue features</p>
          <div className="space-y-2">
            {cfg.fixtures.map(f => {
              const meta = FIXTURE_META[f.type];
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-lg border hairline bg-paper/60 px-4 py-3">
                  <span className="text-[16px]">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    {canEdit ? (
                      <Input
                        value={f.label}
                        onChange={e => updateFixture(f.id, { label: e.target.value })}
                        className="h-8 text-[13px] border-0 border-b border-ink/20 rounded-none px-0 focus-visible:ring-0 bg-transparent"
                      />
                    ) : (
                      <span className="text-[13px]">{f.label}</span>
                    )}
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{f.type.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canEdit && (
                      <button
                        onClick={() => updateFixture(f.id, { visible: !f.visible })}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-paper-2 transition"
                        title={f.visible ? "Hide" : "Show"}
                      >
                        {f.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => removeFixture(f.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-4 hover:text-rose hover:bg-rose/10 transition"
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {cfg.fixtures.length === 0 && (
              <p className="font-display-italic text-ink-3 text-[14px] py-4 text-center">
                No features yet — add some below.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right rail */}
      <div className="space-y-6">
        {canEdit && (
          <div className="bg-paper-2/40 rounded-xl border hairline p-5 space-y-4">
            <p className="label-mono">Add a feature</p>
            <div className="grid grid-cols-2 gap-2">
              {FIXTURE_TYPES.filter(t => t !== "annotation" && t !== "compass").map(t => {
                const meta = FIXTURE_META[t];
                return (
                  <button
                    key={t}
                    onClick={() => addFixture(t)}
                    className="flex items-center gap-2 rounded-lg border hairline bg-paper/60 hover:bg-paper px-3 py-2 text-left transition"
                  >
                    <span>{meta.emoji}</span>
                    <span className="text-[12px] text-ink-2 truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t hairline pt-4 space-y-2">
              <button
                onClick={() => addFixture("annotation")}
                className="w-full flex items-center gap-2 rounded-lg border hairline bg-paper/60 hover:bg-paper px-3 py-2 text-left transition"
              >
                <span>{FIXTURE_META.annotation.emoji}</span>
                <span className="text-[12px] text-ink-2">Text annotation</span>
              </button>
              <button
                onClick={() => addFixture("compass")}
                className="w-full flex items-center gap-2 rounded-lg border hairline bg-paper/60 hover:bg-paper px-3 py-2 text-left transition"
              >
                <span>{FIXTURE_META.compass.emoji}</span>
                <span className="text-[12px] text-ink-2">Compass rose</span>
              </button>
            </div>
          </div>
        )}

        {/* Save / reset */}
        {canEdit && (
          <div className="space-y-2">
            <Button
              onClick={save}
              disabled={saving || !dirty}
              className="w-full gap-1.5"
            >
              <Save size={13} />
              {saving ? "Saving…" : dirty ? "Save room →" : "Saved"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="w-full text-ink-3"
            >
              Reset to defaults
            </Button>
          </div>
        )}

        <div className="bg-paper-2/40 rounded-xl border hairline p-5">
          <p className="label-mono mb-3">About positions</p>
          <p className="font-mono text-[11px] text-ink-3 leading-relaxed">
            After saving, switch to the Seating tab and use{" "}
            <span className="text-ink font-medium">Arrange room</span> to drag tables
            into their exact positions. Fixture positions are approximate — the AI
            places them as fractions of the room.
          </p>
        </div>
      </div>
    </div>
  );
}
