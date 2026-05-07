import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wand2, Trash2, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import {
  type RoomConfig,
  type Fixture,
  type FixtureType,
  DEFAULT_ROOM_CONFIG,
  FIXTURE_META,
  FIXTURE_TYPES,
  roomLayout,
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
              const isPoint = f.type === "compass";
              return (
                <div key={f.id} className="rounded-lg border hairline bg-paper/60">
                  {/* Header row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-[16px]">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      {canEdit ? (
                        <Input
                          value={f.label}
                          onChange={e => updateFixture(f.id, { label: e.target.value })}
                          className="h-7 text-[13px] border-0 border-b border-ink/20 rounded-none px-0 focus-visible:ring-0 bg-transparent"
                        />
                      ) : (
                        <span className="text-[13px]">{f.label}</span>
                      )}
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{f.type.replace(/_/g, " ")}</span>
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
                  {/* Position sliders */}
                  {canEdit && (
                    <div className="border-t hairline px-4 pb-3 pt-2.5 grid grid-cols-2 gap-x-6 gap-y-1">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">← Left / Right →</span>
                          <span className="font-mono text-[9px] text-ink-3">{Math.round((f.x_pct ?? 0) * 100)}%</span>
                        </div>
                        <input
                          type="range" min={0} max={100} step={1}
                          value={Math.round((f.x_pct ?? 0) * 100)}
                          onChange={e => updateFixture(f.id, { x_pct: Number(e.target.value) / 100 })}
                          className="w-full h-1 accent-terracotta"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">← Back / Front →</span>
                          <span className="font-mono text-[9px] text-ink-3">{Math.round((f.y_pct ?? 0) * 100)}%</span>
                        </div>
                        <input
                          type="range" min={0} max={100} step={1}
                          value={Math.round((f.y_pct ?? 0) * 100)}
                          onChange={e => updateFixture(f.id, { y_pct: Number(e.target.value) / 100 })}
                          className="w-full h-1 accent-terracotta"
                        />
                      </div>
                      {!isPoint && (
                        <>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">Width</span>
                              <span className="font-mono text-[9px] text-ink-3">{Math.round((f.w_pct ?? 0.1) * 100)}%</span>
                            </div>
                            <input
                              type="range" min={2} max={70} step={1}
                              value={Math.round((f.w_pct ?? 0.1) * 100)}
                              onChange={e => updateFixture(f.id, { w_pct: Number(e.target.value) / 100 })}
                              className="w-full h-1 accent-terracotta"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">Height</span>
                              <span className="font-mono text-[9px] text-ink-3">{Math.round((f.h_pct ?? 0.06) * 100)}%</span>
                            </div>
                            <input
                              type="range" min={2} max={70} step={1}
                              value={Math.round((f.h_pct ?? 0.06) * 100)}
                              onChange={e => updateFixture(f.id, { h_pct: Number(e.target.value) / 100 })}
                              className="w-full h-1 accent-terracotta"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
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
        {/* Live mini preview */}
        <RoomMiniPreview cfg={cfg} />

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

      </div>
    </div>
  );
}

function RoomMiniPreview({ cfg }: { cfg: RoomConfig }) {
  const PREVIEW_W = 280;
  const PAD = 12;
  const rl = roomLayout(cfg, PAD, PAD, PAD);
  // Scale to fit preview width
  const scale = PREVIEW_W / rl.canvasW;
  const previewH = Math.round(rl.canvasH * scale);

  const toCanvas = (f: Fixture) => ({
    x: (rl.roomX + f.x_pct * rl.roomW) * scale,
    y: (rl.roomY + f.y_pct * rl.roomH) * scale,
    w: (f.w_pct ?? 0.1) * rl.roomW * scale,
    h: (f.h_pct ?? 0.06) * rl.roomH * scale,
  });

  return (
    <div className="rounded-xl border hairline overflow-hidden bg-paper paper-grain">
      <div className="label-mono px-4 pt-3 pb-2">Preview</div>
      <svg width={PREVIEW_W} height={previewH} className="block">
        {/* Room outline */}
        <rect
          x={rl.roomX * scale} y={rl.roomY * scale}
          width={rl.roomW * scale} height={rl.roomH * scale}
          fill="none" stroke="hsl(var(--ink))" strokeWidth={1} opacity={0.6}
        />
        {cfg.fixtures.filter(f => f.visible).map(f => {
          const p = toCanvas(f);
          const cx = p.x + p.w / 2;
          const cy = p.y + p.h / 2;

          if (f.type === "compass") {
            return (
              <g key={f.id} transform={`translate(${p.x}, ${p.y})`}>
                <circle r={6} fill="none" stroke="hsl(var(--ink-3))" strokeWidth={0.5} />
                <path d="M 0 -5 L 1.5 2 L 0 0 L -1.5 2 Z" fill="hsl(var(--ink))" />
              </g>
            );
          }
          if (f.type === "dance_floor") {
            return (
              <g key={f.id}>
                <rect x={p.x} y={p.y} width={p.w} height={p.h}
                  fill="hsl(var(--terracotta) / 0.08)"
                  stroke="hsl(var(--terracotta))" strokeWidth={0.7} strokeDasharray="3 3" />
                <text x={cx} y={cy + 3} textAnchor="middle"
                  fontFamily="Newsreader, serif" fontStyle="italic"
                  fontSize={7} fill="hsl(var(--terracotta))">{f.label}</text>
              </g>
            );
          }
          if (f.type === "entry") {
            return (
              <g key={f.id}>
                <rect x={p.x} y={p.y} width={p.w} height={p.h}
                  fill="hsl(var(--paper))" stroke="hsl(var(--ink))" strokeWidth={0.7} />
                <text x={cx} y={p.y + p.h - 2} textAnchor="middle"
                  fontFamily='"Geist Mono", monospace' fontSize={5}
                  letterSpacing="0.1em" fill="hsl(var(--ink-2))">{f.label}</text>
              </g>
            );
          }
          return (
            <g key={f.id}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h}
                fill="hsl(var(--paper-2))" stroke="hsl(var(--ink))" strokeWidth={0.6} rx={2} />
              <text x={cx} y={cy + 3} textAnchor="middle"
                fontFamily="Newsreader, serif" fontStyle="italic"
                fontSize={7} fill="hsl(var(--ink-2))">{f.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
