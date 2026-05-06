import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { generatePlanCode } from "@/lib/planCode";
import { toast } from "sonner";
import { ArrowUpRight, X, Loader2 } from "lucide-react";
import { getRecentPlans, removeRecentPlan, type RecentPlan } from "@/lib/recentPlans";
import { PaperTable } from "@/components/PaperTable";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";
import { loadOrCreateSamplePlan } from "@/lib/samplePlan";
import { Logo } from "@/components/Logo";
import { analytics } from "@/lib/analytics";

interface OwnedPlan { id: string; code: string; name: string }

// ─── Design token shorthands for inline styles ────────────────────────────
const TC  = "var(--terracotta)";
const INK = "var(--ink)";
const P   = "var(--paper)";
const P2  = "var(--paper-2)";
const I3  = "var(--ink-3)";
const I2  = "var(--ink-2)";
const HL  = "var(--hairline)";
const OLV = "var(--olive)";
const MONO = '"Geist Mono", ui-monospace, monospace';
const DISP = '"Newsreader", "Times New Roman", serif';

// ─── Step card: naming the plan ───────────────────────────────────────────
function StepCardName() {
  return (
    <div style={{ background: P, border: `1px solid ${HL}`, padding: 22, height: 280, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: TC }}>NEW PLAN</div>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: I3 }}>NAME</div>
        <div style={{ borderBottom: `1px solid ${INK}`, paddingBottom: 8, marginTop: 6 }}>
          <span style={{ fontFamily: DISP, fontStyle: "italic", fontSize: 28, color: INK }}>Maya &amp; Jordan</span>
          <span style={{ display: "inline-block", width: 1, height: 24, background: INK, marginLeft: 2, verticalAlign: "-4px" }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ background: INK, color: P, padding: "10px 16px", fontFamily: DISP, fontSize: 14 }}>
          Begin <span style={{ fontStyle: "italic" }}>→</span>
        </div>
      </div>
    </div>
  );
}

// ─── Step card: flagging rules (the humour is in the data) ────────────────
function StepCardFlag() {
  const rules = [
    { icon: "×", iconColor: TC, label: "Mom  ⌇  Carla", tag: "KEEP APART" },
    { icon: "+", iconColor: OLV, label: "The college roommates", tag: "TOGETHER" },
    { icon: "×", iconColor: TC, label: "Greg  ⌇  the open bar", tag: "KEEP APART" },
  ];
  return (
    <div style={{ background: P, border: `1px solid ${HL}`, padding: 22, height: 280, display: "flex", flexDirection: "column" }}>
      <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: TC, marginBottom: 16 }}>RULES</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {rules.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: `0.5px solid rgba(43,42,34,0.2)` }}>
            <span style={{ width: 18, height: 18, border: `1px solid ${r.iconColor}`, color: r.iconColor, fontFamily: DISP, fontStyle: "italic", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.icon}</span>
            <span style={{ fontFamily: DISP, fontSize: 15 }}>{r.label}</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, letterSpacing: "0.1em", color: I3, whiteSpace: "nowrap" }}>{r.tag}</span>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: I3, marginTop: 12 }}>+ ADD A RULE</div>
    </div>
  );
}

// ─── Step card: sharing the link ─────────────────────────────────────────
function StepCardShare() {
  const collaborators = [
    { c: TC,  init: "M", name: "Maya",        tag: "EDITING" },
    { c: OLV, init: "J", name: "Jordan",       tag: "EDITING · PHONE" },
    { c: "#7a6a3e", init: "R", name: "Mom (Robin)", tag: "VIEWING" },
  ];
  return (
    <div style={{ background: P, border: `1px solid ${HL}`, padding: 22, height: 280, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: TC, marginBottom: 14 }}>SHARE · ONE LINK</div>
        <div style={{ background: P2, padding: "10px 14px", fontFamily: MONO, fontSize: 12, color: INK, border: `0.5px dashed ${INK}` }}>
          weddingseater.app/m-and-j
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {collaborators.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: p.c, color: P, fontFamily: DISP, fontStyle: "italic", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>{p.init}</div>
            <div style={{ fontFamily: DISP, fontSize: 15, color: INK }}>{p.name}</div>
            <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, letterSpacing: "0.1em", color: I3 }}>{p.tag}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature card: the canvas ─────────────────────────────────────────────
function FeatureCanvas() {
  return (
    <div style={{ background: P, border: `1px solid ${HL}`, padding: 16, height: 240, overflow: "hidden" }}>
      <svg viewBox="0 0 380 220" style={{ width: "100%", height: "100%" }}>
        <rect x="10" y="10" width="360" height="200" fill="none" stroke={INK} strokeWidth="0.6" opacity="0.5" />
        {([[80, 80], [200, 80], [320, 80], [80, 170], [200, 170]] as [number,number][]).map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="28" fill={P} stroke={INK} strokeWidth="0.9" />
            {Array.from({ length: 8 }).map((_, j) => {
              const a = (j / 8) * Math.PI * 2 - Math.PI / 2;
              return <circle key={j} cx={x + Math.cos(a) * 36} cy={y + Math.sin(a) * 36} r="3.4" fill={INK} />;
            })}
            <text x={x} y={y + 4} textAnchor="middle" fontFamily={DISP} fontStyle="italic" fontSize="13" fill={INK}>T{i + 1}</text>
          </g>
        ))}
        <rect x="280" y="140" width="80" height="60" fill="none" stroke={INK} strokeDasharray="3 3" />
        <text x="320" y="174" textAnchor="middle" fontFamily={DISP} fontStyle="italic" fontSize="11" fill={INK}>dance</text>
      </svg>
    </div>
  );
}

// ─── Feature card: conflict resolution ────────────────────────────────────
function FeatureConflict() {
  return (
    <div style={{ background: P, border: `1px solid ${HL}`, padding: 22, height: 240, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ background: P2, padding: "10px 14px", border: `1px solid ${INK}`, fontFamily: DISP, fontStyle: "italic", fontSize: 22 }}>Mom</div>
        <div style={{ width: 28, height: 28, border: `1.5px solid ${TC}`, color: TC, fontFamily: DISP, fontStyle: "italic", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>×</div>
        <div style={{ background: P2, padding: "10px 14px", border: `1px solid ${INK}`, fontFamily: DISP, fontStyle: "italic", fontSize: 22 }}>Carla</div>
      </div>
      <div style={{ paddingLeft: 4, fontFamily: DISP, fontStyle: "italic", fontSize: 16, color: TC }}>
        Auto-assign placed them <strong style={{ fontStyle: "normal", color: INK }}>seven tables apart.</strong>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: I3 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: OLV, flexShrink: 0 }} />
        ALL 23 RULES SATISFIED
      </div>
    </div>
  );
}

// ─── Feature card: multi-device ───────────────────────────────────────────
function FeatureMobile() {
  return (
    <div style={{ background: P, border: `1px solid ${HL}`, padding: 16, height: 240, display: "flex", justifyContent: "center", alignItems: "center", gap: 24 }}>
      {/* laptop */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 130, height: 84, border: `1px solid ${INK}`, background: P2, position: "relative" }}>
          <div style={{ position: "absolute", inset: 6 }}>
            <svg viewBox="0 0 120 70" width="100%" height="100%">
              {([[20, 20], [60, 20], [100, 20], [40, 50], [80, 50]] as [number,number][]).map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="8" fill="none" stroke={INK} strokeWidth="0.6" />
              ))}
            </svg>
          </div>
        </div>
        <div style={{ width: 150, height: 4, background: INK }} />
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", color: I3, marginTop: 8 }}>11:47 PM</div>
      </div>
      <div style={{ fontFamily: DISP, fontStyle: "italic", fontSize: 18, color: TC }}>→</div>
      {/* phone */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 56, height: 100, border: `1px solid ${INK}`, borderRadius: 8, background: P2, padding: 4 }}>
          <div style={{ width: "100%", height: "100%", background: P, border: `0.4px solid ${INK}` }}>
            <svg viewBox="0 0 50 90" width="100%" height="100%">
              {([[15, 22], [35, 22], [15, 50], [35, 50], [15, 78], [35, 78]] as [number,number][]).map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="6" fill="none" stroke={INK} strokeWidth="0.5" />
              ))}
            </svg>
          </div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", color: I3, marginTop: 8 }}>7:14 AM</div>
      </div>
    </div>
  );
}

// ─── Persona vignette: the overwhelmed couple ─────────────────────────────
function VignetteCouple() {
  const names = ["Aunt June","Uncle Frank","Cousin Beth","Sam +1?","Lin","David","Pat","Robin","Greg","Maya","Jordan","Cory","Kim","Lou","Theo","Carla","Em","Jules","Sara","Ana","Dan","?"];
  return (
    <div style={{ height: 180, background: P2, overflow: "hidden", borderTop: `1px solid ${HL}` }}>
      <svg viewBox="0 0 320 180" width="100%" height="100%">
        {names.map((name, i) => {
          const x = 16 + (i % 6) * 50 + (i % 2) * 6;
          const y = 24 + Math.floor(i / 6) * 38 + (i % 3) * 4;
          const rot = (i * 13) % 14 - 7;
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
              <rect width="46" height="22" fill={P} stroke={INK} strokeWidth="0.5" />
              <text x="23" y="14" textAnchor="middle" fontFamily={DISP} fontStyle="italic" fontSize="9" fill={INK}>{name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Persona vignette: the helpful mom ────────────────────────────────────
function VignetteMom() {
  return (
    <div style={{ height: 180, background: P2, overflow: "hidden", borderTop: `1px solid ${HL}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "relative", width: 90, height: 152, border: `1px solid ${INK}`, borderRadius: 12, background: P, padding: 6 }}>
        <div style={{ width: "100%", height: "100%", background: P2, border: `0.4px solid ${INK}` }}>
          <svg viewBox="0 0 80 130" width="100%" height="100%">
            {([[22, 32], [58, 32], [22, 70], [58, 70], [22, 108], [58, 108]] as [number,number][]).map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="9" fill="none" stroke={INK} strokeWidth="0.6" />
                <text x={x} y={y + 3} textAnchor="middle" fontFamily={DISP} fontStyle="italic" fontSize="7" fill={INK}>T{i + 1}</text>
              </g>
            ))}
            {/* tap indicator on T4 */}
            <circle cx="58" cy="70" r="13" fill="none" stroke={TC} strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="58" cy="70" r="17" fill="none" stroke={TC} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
          </svg>
        </div>
      </div>
      <div style={{ position: "absolute", right: 22, top: 28, fontFamily: DISP, fontStyle: "italic", fontSize: 14, color: TC, transform: "rotate(-3deg)", textAlign: "right" }}>
        Uncle Jim →<br />table 9
      </div>
    </div>
  );
}

// ─── Persona vignette: complicated families ───────────────────────────────
function VignetteFamily() {
  const pairs = [["Mom","Carla"],["Dad","Step-dad"],["Cousin J","Cousin K"],["Aunt P","Uncle G"],["Ex","Ex-2"]];
  return (
    <div style={{ height: 180, background: P2, overflow: "hidden", borderTop: `1px solid ${HL}`, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
      {pairs.map(([a, b], i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: DISP, fontStyle: "italic", fontSize: 14, color: INK }}>
          <span style={{ flex: 1, textAlign: "right" }}>{a}</span>
          <span style={{ color: TC, fontWeight: 500, fontStyle: "normal" }}>×</span>
          <span style={{ flex: 1 }}>{b}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Comparison: spreadsheet → room ──────────────────────────────────────
function ContrastPair() {
  return (
    <div className="grid gap-7 md:grid-cols-[1fr_auto_1fr]" style={{ alignItems: "center" }}>
      {/* spreadsheet — crossed out */}
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: I3, marginBottom: 10 }}>TEMPLATE.XLSX</div>
        <div style={{ background: "#e8e3d4", border: `0.5px solid ${HL}`, padding: "20px 22px", fontFamily: MONO, fontSize: 12, lineHeight: 1.85, color: "rgba(43,42,34,0.62)", position: "relative", height: 280 }}>
          <div>A1 │ Aunt June       │ T?  │ ?</div>
          <div>A2 │ Uncle Frank     │ T?  │ ?</div>
          <div>A3 │ Cousin Beth     │ T2  │ OK</div>
          <div>A4 │ Cousin Beth     │ T5  │ DUP</div>
          <div>A5 │ Sam (plus 1?)   │     │ ?</div>
          <div>A6 │ =VLOOKUP(...)   │ #ERR│ !!</div>
          <div>A7 │ maybe(?)        │     │</div>
          <div>A8 │ ...142 rows     │     │</div>
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <line x1="4%" y1="10%" x2="96%" y2="92%" stroke={TC} strokeWidth="2.2" />
          </svg>
        </div>
      </div>
      {/* arrow */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontFamily: DISP, fontStyle: "italic", fontSize: 22, color: TC, whiteSpace: "nowrap" }}>becomes</div>
        <svg width="40" height="18" viewBox="0 0 40 18">
          <path d="M 0 9 L 36 9 M 30 3 L 36 9 L 30 15" fill="none" stroke={TC} strokeWidth="1.4" />
        </svg>
      </div>
      {/* room plan */}
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: TC, marginBottom: 10 }}>A PICTURE OF THE ROOM</div>
        <div style={{ background: P, border: `1px solid ${INK}`, padding: 18, height: 280 }}>
          <svg viewBox="0 0 380 250" style={{ width: "100%", height: "100%" }}>
            <rect x="10" y="10" width="360" height="230" fill="none" stroke={INK} strokeWidth="0.6" />
            {([[80, 80], [200, 80], [320, 80], [80, 180], [200, 180]] as [number,number][]).map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="28" fill={P} stroke={INK} strokeWidth="0.9" />
                {Array.from({ length: 8 }).map((_, j) => {
                  const a = (j / 8) * Math.PI * 2 - Math.PI / 2;
                  return <circle key={j} cx={x + Math.cos(a) * 36} cy={y + Math.sin(a) * 36} r="3.4" fill={INK} />;
                })}
                <text x={x} y={y + 4} textAnchor="middle" fontFamily={DISP} fontStyle="italic" fontSize="13" fill={INK}>T{i + 1}</text>
              </g>
            ))}
            <rect x="290" y="150" width="76" height="68" fill="none" stroke={INK} strokeDasharray="3 3" />
            <text x="328" y="190" textAnchor="middle" fontFamily={DISP} fontStyle="italic" fontSize="12" fill={INK}>dance</text>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Open FAQ pair ─────────────────────────────────────────────────────────
function FAQPair({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-t hairline pt-6 pb-2">
      <div className="font-display text-[20px] leading-[1.25] mb-2" style={{ letterSpacing: "-0.005em" }}>{q}</div>
      <div style={{ fontFamily: DISP, fontSize: 16, lineHeight: 1.6, color: I2, maxWidth: 620 }}>{a}</div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [name, setName] = useState("");
  const [openCode, setOpenCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<RecentPlan[]>([]);
  const [showCodeOpen, setShowCodeOpen] = useState(false);
  const [myPlans, setMyPlans] = useState<OwnedPlan[]>([]);
  const [sampleLoading, setSampleLoading] = useState(false);

  useEffect(() => { setRecents(getRecentPlans()); }, []);

  const openSample = async () => {
    setSampleLoading(true);
    try {
      const code = await loadOrCreateSamplePlan();
      navigate(`/plan/${code}`);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Could not load the sample plan");
    } finally {
      setSampleLoading(false);
    }
  };

  useEffect(() => {
    const presetName = params.get("name");
    if (presetName) setName(presetName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && params.get("create") === "1") {
      const presetName = params.get("name") ?? "";
      const next = new URLSearchParams(params); next.delete("create"); next.delete("name");
      setParams(next, { replace: true });
      setName(presetName);
      setTimeout(() => createPlan(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) { setMyPlans([]); return; }
    (async () => {
      const { data } = await supabase
        .from("plan_owners")
        .select("plan_id, plans:plan_id(id, code, name)")
        .eq("user_id", user.id);
      const list = ((data ?? []) as Array<{ plans: OwnedPlan | null }>)
        .map(r => r.plans)
        .filter((p): p is OwnedPlan => !!p);
      setMyPlans(list);
    })();
  }, [user]);

  const createPlan = async () => {
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent("/?create=1&name=" + encodeURIComponent(name))}`);
      return;
    }
    setLoading(true);
    const code = generatePlanCode();
    const { data, error } = await supabase
      .from("plans").insert({ code, name: name.trim() || "Our Wedding" })
      .select().single();
    if (error || !data) { setLoading(false); toast.error("Could not create plan"); return; }
    const { error: ownErr } = await supabase
      .from("plan_owners")
      .insert({ plan_id: data.id, user_id: user.id, role: "owner" });
    setLoading(false);
    if (ownErr) toast.error("Plan created but ownership failed");
    analytics.planCreated({ name: data.name });
    navigate(`/plan/${data.code}`);
  };

  const openPlan = async () => {
    const c = openCode.trim().toLowerCase();
    if (!c) return;
    const { data: exists } = await supabase.rpc("validate_plan_code", { _code: c });
    if (!exists) { toast.error("No plan found with that code"); return; }
    navigate(`/plan/${c}`);
  };

  const ownedCodes = new Set(myPlans.map(p => p.code));
  const orphanRecents = recents.filter(r => !ownedCodes.has(r.code));

  return (
    <div className="paper-grain min-h-screen">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="container flex items-center justify-between py-7">
        <Logo size={22} />
        <nav className="hidden items-center gap-9 text-sm text-ink-2 md:flex" aria-label="Main navigation">
          <a className="hover:text-ink" href="#how-it-works">How it works</a>
          <a className="hover:text-ink" href="#who-its-for">For couples</a>
          <Link to="/blog" className="hover:text-ink">Blog</Link>
          <button
            onClick={openSample}
            disabled={sampleLoading}
            className="inline-flex items-center gap-1 hover:text-ink disabled:opacity-60"
          >
            {sampleLoading && <Loader2 size={12} className="animate-spin" />}
            See an example
          </button>
          <button
            onClick={() => setShowCodeOpen(true)}
            className="rounded-full border hairline px-4 py-2 text-[13px] hover:bg-paper-2"
          >
            Open a plan
          </button>
          <UserMenu />
        </nav>
        <div className="md:hidden"><UserMenu /></div>
      </header>

      <main className="container pb-32">

        {/* ── § 1 · Hero ───────────────────────────────────────────────── */}
        <section aria-label="Hero" className="grid items-center gap-12 pt-10 md:grid-cols-[1.05fr_1fr] md:gap-16 md:pt-16">
          <div>
            <p className="label-mono mb-7">— Free wedding seating chart maker</p>
            <h1 className="m-0 font-display text-[60px] leading-[0.97] tracking-[-0.03em] sm:text-[76px] xl:text-[96px]">
              Your seating chart,<br />
              <span className="font-display-italic">without</span> the spreadsheet.
            </h1>
            <p className="mt-8 max-w-[500px] text-[18px] leading-[1.55] text-ink-2" style={{ fontFamily: DISP }}>
              Drag guests onto a canvas of the room. Flag the awkward pairings. Auto-assign handles the rest.
            </p>

            {/* CTA form */}
            <div className="mt-10 max-w-lg rounded-xl border hairline bg-white/30 p-5">
              <Label htmlFor="plan-name" className="label-mono">Name your plan</Label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input
                  id="plan-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createPlan()}
                  placeholder="Maya & Jordan's wedding"
                  className="h-12 rounded-full border-hairline bg-transparent px-4 text-[15px]"
                />
                <Button
                  onClick={createPlan}
                  disabled={loading}
                  className="h-12 rounded-full px-6 text-[15px]"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <>Start your seating chart <span className="ml-1 font-display-italic">→</span></>}
                </Button>
              </div>
              <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
                Free · No account · Takes about an afternoon.
              </p>
            </div>

            <div className="mt-4 max-w-lg">
              {showCodeOpen ? (
                <div className="rounded-xl border hairline bg-paper p-3">
                  <Label className="label-mono">Paste the plan code</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={openCode}
                      onChange={e => setOpenCode(e.target.value)}
                      placeholder="luna-meadow-4821"
                      autoFocus
                      className="h-9 rounded-full border-hairline bg-transparent"
                    />
                    <Button variant="secondary" onClick={openPlan} className="h-9 rounded-full">Open</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCodeOpen(true)}
                  className="text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline"
                  style={{ fontFamily: DISP, fontStyle: "italic" }}
                >
                  Helping someone with theirs? →
                </button>
              )}
            </div>
          </div>

          {/* Hero floor plan visual */}
          <div className="relative md:h-[560px]">
            <FloorPlanVignette />
            <div className="absolute -bottom-3 left-6 rounded-full border hairline bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
              Plan · Draft · 142 Guests · 17 Tables
            </div>
          </div>
        </section>

        {/* ── Your plans (signed-in) ────────────────────────────────────── */}
        {user && myPlans.length > 0 && (
          <section aria-label="Your plans" className="mt-24">
            <div className="mb-7 flex items-baseline justify-between">
              <h2 className="m-0 font-display text-3xl md:text-[36px]">
                Your <span className="font-display-italic">plans</span>
              </h2>
              <span className="label-mono">{myPlans.length} plan{myPlans.length === 1 ? "" : "s"}</span>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {myPlans.slice(0, 6).map(p => (
                <PlanCard key={p.id} code={p.code} name={p.name} />
              ))}
            </div>
          </section>
        )}

        {/* ── Recently opened (this device) ────────────────────────────── */}
        {orphanRecents.length > 0 && (
          <section aria-label="Recently opened" className={user ? "mt-12" : "mt-24"}>
            <div className="mb-7 flex items-baseline justify-between">
              <h2 className="m-0 font-display text-2xl md:text-[36px]">
                Recently <span className="font-display-italic">opened</span>
              </h2>
              <span className="label-mono">on this device</span>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {orphanRecents.slice(0, 6).map(r => (
                <PlanCard
                  key={r.code}
                  code={r.code}
                  name={r.name}
                  date={new Date(r.openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  onRemove={() => { removeRecentPlan(r.code); setRecents(getRecentPlans()); }}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── § 2 · How it works ───────────────────────────────────────── */}
        <section id="how-it-works" aria-labelledby="how-heading" className="mt-48 border-t hairline pt-14">
          <p className="label-mono mb-8" style={{ color: TC }}>— How it works</p>
          <h2 id="how-heading" className="m-0 mb-14 font-display text-[42px] leading-[1.0] tracking-[-0.025em] md:text-[56px] lg:text-[64px]">
            How the seating chart <span className="font-display-italic">maker</span> works.
          </h2>
          <div className="grid gap-10 md:grid-cols-3 md:gap-7">
            {[
              { n: "01", visual: <StepCardName />, title: "Name it. Start dragging.", body: "You're on the canvas in seconds. No account, no tutorial, no onboarding flow." },
              { n: "02", visual: <StepCardFlag />, title: "Flag the difficult ones.", body: "Auto-assign respects every rule you set — including Greg and the open bar." },
              { n: "03", visual: <StepCardShare />, title: "Share one link.", body: "Everyone edits the same chart. No conflicting spreadsheet versions. No \"which one is current?\"" },
            ].map(s => (
              <div key={s.n}>
                {s.visual}
                <div className="mt-5 mb-2 font-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: TC }}>STEP {s.n}</div>
                <h3 className="m-0 mb-2 font-display text-[22px] leading-[1.15]">{s.title}</h3>
                <p className="m-0 text-[15px] leading-[1.6] text-ink-2">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── § 3 · Three things done well ─────────────────────────────── */}
        <section aria-labelledby="product-heading" className="mt-48 border-t hairline pt-14">
          <p className="label-mono mb-8" style={{ color: TC }}>— The product</p>
          <h2 id="product-heading" className="m-0 mb-14 font-display text-[42px] leading-[1.0] tracking-[-0.025em] md:text-[56px] lg:text-[64px]">
            Three things. <span className="font-display-italic">Done well.</span>
          </h2>
          <div className="grid gap-10 md:grid-cols-3 md:gap-7">
            {[
              { visual: <FeatureCanvas />, title: "A canvas, not a grid.", body: "Tables, chairs, the dance floor, the doors. Your seating chart looks like the actual room." },
              { visual: <FeatureConflict />, title: "The family drama? Handled.", body: "Flag who can't sit near whom. Auto-assign seats 142 guests around every constraint. You deal with the flowers." },
              { visual: <FeatureMobile />, title: "One link, everyone helps.", body: "Your partner edits from their phone. Your mom moves Uncle Jim to table 9 from her couch. Same chart, always." },
            ].map((f, i) => (
              <div key={i}>
                {f.visual}
                <h3 className="m-0 mb-2 font-display text-[22px] leading-[1.15] mt-6">{f.title}</h3>
                <p className="m-0 text-[15px] leading-[1.6] text-ink-2">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── § 4 · Template vs. tool ──────────────────────────────────── */}
        <section aria-labelledby="comparison-heading" className="mt-48 border-t hairline pt-14">
          <p className="label-mono mb-8" style={{ color: TC }}>— vs. a template</p>
          <h2 id="comparison-heading" className="m-0 mb-14 font-display text-[42px] leading-[1.0] tracking-[-0.025em] md:text-[56px] lg:text-[64px]">
            Wedding seating chart <span className="font-display-italic">template</span> vs. the real thing.
          </h2>
          <ContrastPair />
          {/* editorial comparison table */}
          <div className="mt-16" style={{ border: `0.5px solid rgba(43,42,34,0.2)` }}>
            {[
              ["Layout",           "Rows and columns.",                          "Tables, dance floor, doors."],
              ["Awkward pairings", "You track them in your head and hope.",       "Flag once. Auto-assign handles the rest."],
              ["Collaboration",    "Email chains. Overwritten cells.",            "One link. Live edits."],
              ["Time",             "3 weekends.",                                 "An afternoon."],
              ["Price",            "Free (costs your sanity).",                   "Free (costs nothing)."],
            ].map((row, i) => (
              <div key={i} className="grid" style={{
                gridTemplateColumns: "1.1fr 3fr 3fr",
                borderTop: i === 0 ? "none" : "0.5px solid rgba(43,42,34,0.18)",
              }}>
                <div style={{ padding: "20px 24px", fontFamily: MONO, fontSize: 11, letterSpacing: "0.18em", color: "rgba(43,42,34,0.55)", textTransform: "uppercase", borderRight: "0.5px solid rgba(43,42,34,0.18)" }}>{row[0]}</div>
                <div style={{ padding: "20px 24px", fontFamily: DISP, fontStyle: "italic", fontSize: 17, color: "rgba(43,42,34,0.62)", borderRight: "0.5px solid rgba(43,42,34,0.18)" }}>{row[1]}</div>
                <div style={{ padding: "20px 24px", fontFamily: DISP, fontSize: 17, color: INK }}>{row[2]}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── § 5 · Who it's for ───────────────────────────────────────── */}
        <section id="who-its-for" aria-labelledby="personas-heading" className="mt-48 border-t hairline pt-14">
          <p className="label-mono mb-8" style={{ color: TC }}>— Who it's for</p>
          <h2 id="personas-heading" className="m-0 mb-14 font-display text-[42px] leading-[1.0] tracking-[-0.025em] md:text-[56px] lg:text-[64px]">
            Built for the people <span className="font-display-italic">doing</span> this.
          </h2>
          <div className="grid gap-7 md:grid-cols-3">
            {[
              { visual: <VignetteCouple />, title: "150 guests. No plan yet.", body: "You have the list. You have the floor plan PDF from the venue. What you don't have is a picture of the room. Start here." },
              { visual: <VignetteMom />,    title: "The mom who wants to help.", body: "Your daughter sent you a link. You can see the tables. Move Uncle Jim to table 9 and she'll see it instantly. No phone calls." },
              { visual: <VignetteFamily />, title: "Complicated families.", body: "Five pairs who can't be near each other. Flag them once. Auto-assign works around every one of them. Nobody makes a scene." },
            ].map((p, i) => (
              <article key={i} style={{ background: P, border: `1px solid ${HL}` }}>
                {p.visual}
                <div style={{ padding: "20px 22px 22px" }}>
                  <h3 className="m-0 mb-2 font-display text-[20px] leading-[1.15]">{p.title}</h3>
                  <p className="m-0 text-[15px] leading-[1.6] text-ink-2">{p.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── § 6 · FAQ ────────────────────────────────────────────────── */}
        <section id="faq" aria-labelledby="faq-heading" className="mt-48 border-t hairline pt-14">
          <div className="grid gap-16 md:grid-cols-[1fr_1.6fr] md:items-start">
            <div className="md:sticky md:top-8">
              <p className="label-mono mb-8" style={{ color: TC }}>— Questions</p>
              <h2 id="faq-heading" className="m-0 font-display text-[42px] leading-[0.98] tracking-[-0.025em] md:text-[52px]">
                Wedding<br />seating chart<br /><span className="font-display-italic">FAQ.</span>
              </h2>
            </div>
            <div style={{ borderBottom: "0.5px solid rgba(43,42,34,0.18)" }}>
              <FAQPair q="Is this free?" a="Yes. No trial, no upgrade wall, no credit card. Free seating chart maker — actually free." />
              <FAQPair q="Do I need an account?" a="No. Bookmark the link — that's your account. Open it on any device." />
              <FAQPair q="Can other people edit it?" a="Anyone with the link can. Share it with your partner, your parents, your maid of honour. Don't share it with your weird coworker." />
              <FAQPair q="Does it work on my phone?" a="Yes. Nothing to download. Start on your laptop, check in or make tweaks from your phone anytime." />
              <FAQPair q="How does drag-and-drop work?" a="You see the venue. Drag names onto tables. Rearrange between tables by dragging. It works the way your brain does — spatially, not in rows and columns." />
              <FAQPair q="Is this better than a wedding seating chart template?" a="Templates give you rows. This gives you the room. You can flag who can't sit together, auto-assign around those rules, and share with your whole crew." />
              <FAQPair q="Will I lose my work?" a="No. Saves automatically. Your link works on any device, any time." />
            </div>
          </div>
        </section>

        {/* ── § 7 · Final CTA ──────────────────────────────────────────── */}
        <section aria-labelledby="cta-heading" className="mt-48 border-t hairline pt-14">
          <div className="mx-auto max-w-[900px] py-16 text-center" style={{ borderBottom: "0.5px solid rgba(43,42,34,0.2)" }}>
            <p className="label-mono mb-10" style={{ color: TC }}>— Begin</p>
            <h2 id="cta-heading" className="m-0 font-display text-[44px] leading-[0.97] tracking-[-0.025em] md:text-[64px] lg:text-[80px]">
              The seating chart shouldn't be<br className="hidden md:block" />
              the <span className="font-display-italic">hardest</span> part of your wedding.
            </h2>
            <p className="mt-8 text-[18px] leading-[1.55] text-ink-2" style={{ fontFamily: DISP, fontStyle: "italic" }}>
              Name it. Start dragging. You'll be done before your wine gets warm.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4">
              <Button
                onClick={createPlan}
                disabled={loading}
                className="h-13 rounded-full px-8 text-[16px]"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <>Start your seating chart <span className="ml-1 font-display-italic">→</span></>}
              </Button>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
                Free forever · No account needed
              </p>
              <button
                onClick={() => setShowCodeOpen(true)}
                className="text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline"
                style={{ fontFamily: DISP, fontStyle: "italic" }}
              >
                Helping someone with theirs? →
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="container flex items-center justify-between py-8 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
        <Logo size={16} />
        <span>© Wedding Seater · 2026</span>
      </footer>

    </div>
  );
};

// ─── Plan card ─────────────────────────────────────────────────────────────
function PlanCard({
  code, name, date, onRemove,
}: {
  code: string; name: string; date?: string; onRemove?: () => void;
}) {
  return (
    <Link
      to={`/plan/${code}`}
      className="group relative block rounded-xl border hairline bg-white/40 p-5 transition hover:bg-white/70 hover:shadow-soft"
    >
      <div className="label-mono mb-3.5 truncate">{code.toUpperCase()}</div>
      <div className="mb-1 truncate font-display text-[22px] leading-[1.1]">{name}</div>
      {date && <div className="mb-5 text-[13px] text-ink-3">{date}</div>}
      <div className="mt-auto flex items-center justify-between">
        <span className="text-[13px] text-ink-2">Open plan</span>
        <ArrowUpRight size={14} className="text-ink-3 opacity-0 transition group-hover:opacity-100" />
      </div>
      {onRemove && (
        <button
          aria-label="Remove from recents"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-paper-2 hover:text-ink"
        >
          <X size={12} />
        </button>
      )}
    </Link>
  );
}

// ─── Hero floor plan vignette ──────────────────────────────────────────────
function FloorPlanVignette() {
  return (
    <div
      className="paper-grain-strong absolute inset-0 overflow-hidden rounded border hairline"
      style={{
        boxShadow: "0 22px 60px -28px hsl(var(--ink) / 0.32), inset 0 1px 0 rgba(255,255,255,0.6)",
        transform: "rotate(-1.1deg)",
      }}
    >
      <svg width="100%" height="100%" className="absolute inset-0" aria-hidden="true">
        <rect x="30" y="30" width="calc(100% - 60px)" height="calc(100% - 60px)"
          fill="none" stroke="hsl(var(--ink))" strokeWidth="1" opacity="0.85" />
        <rect x="60" y="22" width="80" height="16" fill="hsl(var(--paper-2))" stroke="hsl(var(--ink))" strokeWidth="1" />
        <text x="100" y="33" textAnchor="middle" fontFamily='"Geist Mono", monospace' fontSize="9" fill="hsl(var(--ink-2))" letterSpacing="0.1em">DOORS</text>
      </svg>
      <PaperTable className="absolute" style={{ top: 60, left: 50 }}  size={84} seats={8}  occupied={8}  label="T1 · Family" />
      <PaperTable className="absolute" style={{ top: 60, left: 200 }} size={84} seats={10} occupied={7}  label="T2 · College" />
      <PaperTable className="absolute" style={{ top: 60, left: 350 }} size={84} seats={8}  occupied={6}  label="T3 · Work" />
      <PaperTable className="absolute" style={{ top: 220, left: 110 }} size={94} seats={10} occupied={10} label="T4 · Head table" />
      <PaperTable className="absolute" style={{ top: 220, left: 300 }} size={84} seats={8}  occupied={4}  label="T5" />
      <PaperTable className="absolute" style={{ top: 380, left: 70 }}  size={84} seats={8}  occupied={2}  label="T6" />
      <PaperTable className="absolute" style={{ top: 380, left: 230 }} size={84} seats={8}  occupied={0}  label="T7" />
      <div
        className="absolute"
        style={{ top: 220, right: 30, width: 120, height: 180,
          background: "repeating-linear-gradient(45deg, transparent 0 6px, hsl(var(--ink) / 0.07) 6px 7px)",
          border: "1px dashed hsl(var(--ink-3))" }}
        aria-hidden="true"
      >
        <div className="mt-[80px] text-center font-mono text-[9px] uppercase tracking-[0.15em] text-ink-3">Dance floor</div>
      </div>
      {/* DJ + speakers */}
      <div className="absolute font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3"
        style={{ top: 430, right: 50, width: 60, height: 36, border: "1px solid hsl(var(--ink))", display: "flex", alignItems: "center", justifyContent: "center" }}
        aria-hidden="true">DJ</div>
      <div className="absolute" style={{ top: 434, right: 28, width: 14, height: 28, border: "1px solid hsl(var(--ink))" }} aria-hidden="true" />
      <div className="absolute" style={{ top: 434, right: 112, width: 14, height: 28, border: "1px solid hsl(var(--ink))" }} aria-hidden="true" />
      {/* annotation */}
      <div
        className="absolute font-display-italic text-[15px] text-terracotta"
        style={{ top: 376, right: 56, transform: "rotate(-4deg)", textAlign: "right", lineHeight: 1.3 }}
        aria-hidden="true"
      >
        keep aunt Pat far<br />from the speakers
      </div>
      <svg className="absolute" style={{ top: 416, right: 126, transform: "rotate(16deg)" }} width="50" height="40" aria-hidden="true">
        <path d="M 5 5 Q 25 25, 40 30" stroke="hsl(var(--terracotta))" fill="none" strokeWidth="1.2" />
        <path d="M 36 26 L 40 30 L 36 34" stroke="hsl(var(--terracotta))" fill="none" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

export default Index;
