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
    <div className="paper-grain" style={{ border: `1px solid ${HL}`, padding: 22, height: 280, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 2px 14px rgba(43,42,34,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: TC, flexShrink: 0 }} />
        <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: TC }}>NEW PLAN</div>
      </div>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: I3, marginBottom: 10, textTransform: "uppercase" }}>Name</div>
        <div style={{ position: "relative", paddingBottom: 12 }}>
          <span style={{ fontFamily: DISP, fontStyle: "italic", fontSize: 30, color: INK, letterSpacing: "-0.01em" }}>Maya &amp; Jordan</span>
          <span style={{ display: "inline-block", width: 1.5, height: 28, background: TC, marginLeft: 3, verticalAlign: "-5px", opacity: 0.75 }} />
          {/* hand-drawn underline */}
          <svg style={{ position: "absolute", bottom: 2, left: 0, width: "100%", height: 7 }} preserveAspectRatio="none" viewBox="0 0 220 7">
            <path d="M 0 5 Q 55 3, 110 5 Q 165 7, 220 4" stroke={INK} fill="none" strokeWidth="0.9" opacity="0.35" />
          </svg>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ background: TC, color: "#fbf6e9", padding: "11px 20px", fontFamily: DISP, fontSize: 15, boxShadow: "2px 2px 0 rgba(43,42,34,0.14)" }}>
          Begin <span style={{ fontStyle: "italic" }}>→</span>
        </div>
      </div>
    </div>
  );
}

// ─── Step card: flagging rules (the humour is in the data) ────────────────
function StepCardFlag() {
  const rules = [
    { icon: "×", bg: "rgba(182,90,54,0.08)", label: "Mom  ⌇  Carla",         tag: "KEEP APART", tagC: TC,  tagBg: "rgba(182,90,54,0.12)" },
    { icon: "+", bg: "rgba(74,82,50,0.08)",  label: "College roommates",      tag: "TOGETHER",   tagC: OLV, tagBg: "rgba(74,82,50,0.12)" },
    { icon: "×", bg: "rgba(182,90,54,0.08)", label: "Greg  ⌇  the open bar",  tag: "KEEP APART", tagC: TC,  tagBg: "rgba(182,90,54,0.12)" },
  ];
  return (
    <div className="paper-grain" style={{ border: `1px solid ${HL}`, padding: 22, height: 280, display: "flex", flexDirection: "column", boxShadow: "0 2px 14px rgba(43,42,34,0.07)" }}>
      <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: TC, marginBottom: 18 }}>RULES</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
        {rules.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: r.bg, borderRadius: 6 }}>
            <span style={{ width: 20, height: 20, border: `1.5px solid ${r.icon === "+" ? OLV : TC}`, color: r.icon === "+" ? OLV : TC, fontFamily: DISP, fontStyle: "italic", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, flexShrink: 0 }}>{r.icon}</span>
            <span style={{ fontFamily: DISP, fontSize: 15, flex: 1 }}>{r.label}</span>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.1em", color: r.tagC, background: r.tagBg, padding: "2px 7px", borderRadius: 3, whiteSpace: "nowrap" }}>{r.tag}</span>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", marginTop: 14, display: "flex", alignItems: "center", gap: 6, color: I3 }}>
        <span style={{ color: TC, fontSize: 13 }}>+</span> ADD A RULE
      </div>
    </div>
  );
}

// ─── Step card: sharing the link ─────────────────────────────────────────
function StepCardShare() {
  const collaborators = [
    { c: TC,        init: "M", name: "Maya",         tagLabel: "EDITING",       tagBg: "rgba(182,90,54,0.1)",  tagC: TC  },
    { c: OLV,       init: "J", name: "Jordan",        tagLabel: "EDITING · PHONE", tagBg: "rgba(74,82,50,0.1)", tagC: OLV },
    { c: "#7a6a3e", init: "R", name: "Mom (Robin)",   tagLabel: "VIEWING",       tagBg: "transparent",          tagC: I3  },
  ];
  return (
    <div className="paper-grain" style={{ border: `1px solid ${HL}`, padding: 22, height: 280, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 2px 14px rgba(43,42,34,0.07)" }}>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: TC, marginBottom: 14 }}>SHARE · ONE LINK</div>
        {/* link slug — butter-wash stamp */}
        <div style={{ background: "rgba(232,210,146,0.28)", padding: "10px 14px", fontFamily: MONO, fontSize: 12, color: INK, border: "0.5px dashed rgba(43,42,34,0.3)", borderRadius: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: TC, fontSize: 11 }}>↗</span>
          weddingseater.app/m-and-j
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {collaborators.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: p.c, color: "#fbf6e9", fontFamily: DISP, fontStyle: "italic", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 4px rgba(43,42,34,0.18)" }}>{p.init}</div>
            <div style={{ fontFamily: DISP, fontSize: 15, color: INK, flex: 1 }}>{p.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.1em", padding: "2px 7px", borderRadius: 3, background: p.tagBg, color: p.tagC, border: i === 2 ? `0.5px solid ${HL}` : "none" }}>{p.tagLabel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature card: the canvas ─────────────────────────────────────────────
function FeatureCanvas() {
  return (
    <div className="paper-grain-strong" style={{ border: `1px solid ${HL}`, height: 260, overflow: "hidden", position: "relative", boxShadow: "0 12px 40px -12px rgba(43,42,34,0.22), inset 0 1px 0 rgba(255,255,255,0.55)" }}>
      {/* room outline + dance floor — SVG layer */}
      <svg width="100%" height="100%" viewBox="0 0 370 260" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} preserveAspectRatio="xMidYMid meet">
        <rect x="13" y="13" width="344" height="234" fill="none" stroke={INK} strokeWidth="0.9" opacity="0.22" />
        <rect x="44" y="7" width="72" height="12" fill="var(--paper-2)" stroke={INK} strokeWidth="0.7" opacity="0.55" />
        <text x="80" y="16" textAnchor="middle" fontFamily={MONO} fontSize="7" fill={INK} opacity="0.45" letterSpacing="0.12em">ENTRY</text>
        <rect x="284" y="128" width="78" height="118" fill="rgba(182,90,54,0.07)" stroke={TC} strokeWidth="0.9" strokeDasharray="3 2" />
        <text x="323" y="192" textAnchor="middle" fontFamily={DISP} fontStyle="italic" fontSize="9.5" fill={TC} opacity="0.9">dance floor</text>
      </svg>
      {/* actual PaperTable components — same as hero */}
      <PaperTable className="absolute" style={{ top: 24, left: 14 }}  size={70} seats={8}  occupied={8}  label="T1 · Family" />
      <PaperTable className="absolute" style={{ top: 24, left: 166 }} size={70} seats={8}  occupied={6}  label="T2 · College" />
      <PaperTable className="absolute" style={{ top: 144, left: 88 }} size={76} seats={10} occupied={10} label="T3 · Head table" />
      {/* editorial annotation */}
      <div className="absolute font-display-italic text-terracotta"
        style={{ bottom: 18, right: 20, fontSize: 12, transform: "rotate(-3deg)", textAlign: "right", lineHeight: 1.35, opacity: 0.85 }}>
        keep aunt Pat far<br />from the speakers
      </div>
    </div>
  );
}

// ─── Feature card: conflict resolution ────────────────────────────────────
function FeatureConflict() {
  return (
    <div className="paper-grain" style={{ border: `1px solid ${HL}`, height: 260, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 12px 40px -12px rgba(43,42,34,0.22), inset 0 1px 0 rgba(255,255,255,0.55)" }}>
      {/* constraint card */}
      <div style={{ padding: "28px 26px 20px", flex: 1 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: TC, textTransform: "uppercase", marginBottom: 20 }}>KEEP APART</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ background: "rgba(182,90,54,0.1)", padding: "12px 20px", border: "1px solid rgba(182,90,54,0.26)", fontFamily: DISP, fontStyle: "italic", fontSize: 26, borderRadius: 7 }}>Mom</div>
          <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
            <line x1="5" y1="5" x2="23" y2="23" stroke={TC} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="23" y1="5" x2="5" y2="23" stroke={TC} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div style={{ background: "rgba(182,90,54,0.1)", padding: "12px 20px", border: "1px solid rgba(182,90,54,0.26)", fontFamily: DISP, fontStyle: "italic", fontSize: 26, borderRadius: 7 }}>Carla</div>
        </div>
        <div style={{ fontFamily: DISP, fontStyle: "italic", fontSize: 17, color: I2, lineHeight: 1.5 }}>
          Auto-assign put them{" "}
          <span style={{ fontStyle: "normal", color: INK, borderBottom: `2px solid ${TC}`, paddingBottom: 1 }}>seven tables apart.</span>
        </div>
      </div>
      {/* footer strip */}
      <div style={{ borderTop: `1px solid ${HL}`, padding: "14px 26px", background: "rgba(74,82,50,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: DISP, fontSize: 36, fontWeight: 400, color: OLV, lineHeight: 1 }}>23</span>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", color: OLV, textTransform: "uppercase" }}>rules satisfied</div>
          <div style={{ fontFamily: DISP, fontStyle: "italic", fontSize: 12, color: I3, marginTop: 2 }}>Including yours, your mum's, and the one your fiancé added at midnight.</div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature card: multi-device ───────────────────────────────────────────
function FeatureMobile() {
  const people = [
    { init: "M", bg: TC,        name: "Maya",         status: "EDITING NOW",       statusC: OLV, statusBg: "rgba(74,82,50,0.1)"  },
    { init: "J", bg: OLV,       name: "Jordan",       status: "PHONE · LIVE",      statusC: OLV, statusBg: "rgba(74,82,50,0.1)"  },
    { init: "R", bg: "#7a6a3e", name: "Mom (Robin)",  status: "MOVED TABLE 9",     statusC: I3,  statusBg: "rgba(43,42,34,0.04)" },
  ];
  return (
    <div className="paper-grain" style={{ border: `1px solid ${HL}`, height: 260, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 12px 40px -12px rgba(43,42,34,0.22), inset 0 1px 0 rgba(255,255,255,0.55)" }}>
      <div style={{ padding: "22px 24px 0" }}>
        {/* link stamp */}
        <div style={{ background: "rgba(232,210,146,0.32)", border: "0.5px dashed rgba(43,42,34,0.28)", padding: "10px 14px", fontFamily: MONO, fontSize: 11.5, color: INK, display: "flex", alignItems: "center", gap: 8, marginBottom: 22, borderRadius: 4 }}>
          <span style={{ color: TC, fontSize: 12 }}>↗</span>
          weddingseater.app/m-and-j
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 8, letterSpacing: "0.1em", color: TC, background: "rgba(182,90,54,0.12)", padding: "2px 7px", borderRadius: 3 }}>LIVE</span>
        </div>
        {/* collaborators */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {people.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: p.bg, color: "#fbf6e9", fontFamily: DISP, fontStyle: "italic", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 5px rgba(43,42,34,0.18)" }}>{p.init}</div>
              <div style={{ fontFamily: DISP, fontSize: 16, color: INK, flex: 1 }}>{p.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.1em", color: p.statusC, background: p.statusBg, padding: "3px 8px", borderRadius: 3, border: "0.5px solid rgba(43,42,34,0.1)" }}>{p.status}</div>
            </div>
          ))}
        </div>
      </div>
      {/* footnote */}
      <div style={{ marginTop: "auto", borderTop: `1px solid ${HL}`, padding: "12px 24px" }}>
        <div style={{ fontFamily: DISP, fontStyle: "italic", fontSize: 12.5, color: I3, lineHeight: 1.45 }}>
          No account needed. No download. Just the link.
        </div>
      </div>
    </div>
  );
}

// ─── Persona vignette: the overwhelmed couple ─────────────────────────────
function VignetteCouple() {
  const names = ["Aunt June","Uncle Frank","Cousin Beth","Sam +1?","Lin","David","Pat","Robin","Greg","Maya","Jordan","Cory","Kim","Lou","Theo","Carla","Em","Jules","Sara","Ana","Dan","?"];
  // warm variety: paper, butter, terracotta wash, rose wash
  const fills = [P, "rgba(232,210,146,0.55)", P, "rgba(182,90,54,0.09)", P, "rgba(232,210,146,0.4)", P, P, "rgba(182,90,54,0.12)", P, "rgba(232,210,146,0.5)", P, "rgba(201,131,112,0.14)", P, "rgba(232,210,146,0.45)", "rgba(182,90,54,0.1)", P, P, "rgba(232,210,146,0.52)", P, P, "rgba(201,131,112,0.11)"];
  return (
    <div style={{ height: 180, background: "rgba(235,228,213,0.7)", overflow: "hidden", borderTop: `1px solid ${HL}` }}>
      <svg viewBox="0 0 320 180" width="100%" height="100%">
        {names.map((name, i) => {
          const x = 10 + (i % 6) * 50 + (i % 3) * 5;
          const y = 18 + Math.floor(i / 6) * 36 + (i % 4) * 6;
          const rot = (i * 17) % 24 - 12;
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
              <rect width="50" height="24" rx="1" fill={fills[i] ?? P} stroke="rgba(43,42,34,0.22)" strokeWidth="0.6" />
              <line x1="0" y1="0" x2="50" y2="0" stroke="rgba(43,42,34,0.07)" strokeWidth="2.5" />
              <text x="25" y="15.5" textAnchor="middle" fontFamily={DISP} fontStyle="italic" fontSize="9.5" fill={INK}>{name}</text>
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
    <div style={{ height: 180, background: "rgba(235,228,213,0.7)", overflow: "hidden", borderTop: `1px solid ${HL}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {/* phone */}
      <div style={{ position: "relative", width: 86, height: 146, border: "1px solid rgba(43,42,34,0.65)", borderRadius: 14, background: P, padding: 5, boxShadow: "0 4px 18px rgba(43,42,34,0.14)" }}>
        <div style={{ width: "100%", height: "100%", background: "rgba(235,228,213,0.7)", borderRadius: 10, overflow: "hidden" }}>
          <svg viewBox="0 0 76 126" width="100%" height="100%">
            {([[20, 26], [56, 26], [20, 64], [56, 64], [20, 102], [56, 102]] as [number, number][]).map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="10" fill="rgba(243,238,227,0.96)" stroke={INK} strokeWidth="0.7" />
                {Array.from({ length: 6 }).map((_, j) => {
                  const a = (j / 6) * Math.PI * 2 - Math.PI / 2;
                  return <circle key={j} cx={x + Math.cos(a) * 14} cy={y + Math.sin(a) * 14}
                    r="2.8" fill={j < 4 ? "rgba(74,82,50,0.82)" : "rgba(243,238,227,0.9)"}
                    stroke={INK} strokeWidth="0.45" />;
                })}
                <text x={x} y={y + 3.5} textAnchor="middle" fontFamily={DISP} fontStyle="italic" fontSize="7.5" fill={INK}>T{i + 1}</text>
              </g>
            ))}
            {/* terracotta tap ripples on T4 */}
            <circle cx="56" cy="64" r="3.5" fill={TC} opacity="0.7" />
            <circle cx="56" cy="64" r="14" fill="rgba(182,90,54,0.1)" stroke={TC} strokeWidth="1.2" strokeDasharray="2 2" />
            <circle cx="56" cy="64" r="20" fill="none" stroke={TC} strokeWidth="0.7" strokeDasharray="2 2" opacity="0.45" />
          </svg>
        </div>
      </div>
      {/* annotation */}
      <div style={{ position: "absolute", right: 14, top: 22, fontFamily: DISP, fontStyle: "italic", fontSize: 15, color: TC, transform: "rotate(-3deg)", textAlign: "right", lineHeight: 1.4 }}>
        Uncle Jim →<br />table 9
      </div>
      {/* MOVED badge */}
      <div style={{ position: "absolute", bottom: 14, right: 14, background: "rgba(74,82,50,0.1)", border: "0.5px solid rgba(74,82,50,0.28)", fontFamily: MONO, fontSize: 8, letterSpacing: "0.1em", color: OLV, padding: "3px 8px", borderRadius: 3 }}>
        MOVED
      </div>
    </div>
  );
}

// ─── Persona vignette: complicated families ───────────────────────────────
function VignetteFamily() {
  const pairs: [string, string, string][] = [
    ["Mom",      "Carla",    "rgba(182,90,54,0.08)"],
    ["Dad",      "Step-dad", "transparent"],
    ["Cousin J", "Cousin K", "rgba(232,210,146,0.22)"],
    ["Aunt P",   "Uncle G",  "transparent"],
    ["Ex",       "Ex-2",     "rgba(201,131,112,0.13)"],
  ];
  return (
    <div style={{ height: 180, background: "rgba(235,228,213,0.7)", overflow: "hidden", borderTop: `1px solid ${HL}`, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 5 }}>
      {pairs.map(([a, b, bg], i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: DISP, fontStyle: "italic", fontSize: 13.5, color: INK, background: bg, padding: "4px 10px", borderRadius: 4 }}>
          <span style={{ flex: 1, textAlign: "right" }}>{a}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
            <line x1="3" y1="3" x2="13" y2="13" stroke={TC} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="13" y1="3" x2="3" y2="13" stroke={TC} strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <span style={{ flex: 1 }}>{b}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Comparison: spreadsheet → room ──────────────────────────────────────
function ContrastPair() {
  const sheetRows: [string, string, string, string, string][] = [
    ["1", "Aunt June",           "T?",    "?",   ""],
    ["2", "Uncle Frank",         "T?",    "Yes", ""],
    ["3", "Cousin Beth",         "T2",    "Yes", ""],
    ["4", "Cousin Beth",         "T5",    "Yes", "DUP!"],
    ["5", "Sam (+ guest?)",      "",      "?",   ""],
    ["6", "=VLOOKUP(A6,...)",    "#REF!", "",    "!!"],
    ["7", "Jordan's colleague?", "",      "?",   ""],
    ["8", "... 134 more rows",   "",      "",    ""],
  ];
  const floorTables: [number, number, number, number, string, string][] = [
    [72,  72, 8,  8,  OLV, "Fam."],
    [186, 72, 7,  8,  TC,  "Coll."],
    [300, 72, 5,  8,  OLV, "Work"],
    [72, 178, 10, 10, TC,  "Head"],
    [186,178,  4,  8, OLV, "Fr."],
  ];
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Left: messy spreadsheet with grid cells */}
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: "rgba(43,42,34,0.4)", textTransform: "uppercase", marginBottom: 10, textDecoration: "line-through" }}>template.xlsx</div>
        <div style={{ background: "#f7f4ee", border: `1px solid rgba(43,42,34,0.2)`, height: 280, overflow: "hidden", position: "relative", fontFamily: MONO, lineHeight: 1 }}>
          {/* column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "26px 1fr 52px 48px 62px", background: "rgba(43,42,34,0.06)", borderBottom: "1px solid rgba(43,42,34,0.14)" }}>
            {(["", "NAME", "TABLE", "RSVP", "NOTES"] as string[]).map((h, j) => (
              <div key={j} style={{ padding: "6px 8px", borderRight: j < 4 ? "1px solid rgba(43,42,34,0.11)" : "none", fontSize: 9, letterSpacing: "0.1em", color: "rgba(43,42,34,0.45)" }}>{h}</div>
            ))}
          </div>
          {/* data rows */}
          {sheetRows.map(([n, name, table, rsvp, notes], i) => {
            const isErr = table === "#REF!" || notes === "DUP!";
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "26px 1fr 52px 48px 62px", borderBottom: "1px solid rgba(43,42,34,0.09)", background: isErr ? "rgba(182,90,54,0.08)" : "transparent" }}>
                <div style={{ padding: "7px 8px", borderRight: "1px solid rgba(43,42,34,0.09)", color: "rgba(43,42,34,0.28)", fontSize: 9 }}>{n}</div>
                <div style={{ padding: "7px 8px", borderRight: "1px solid rgba(43,42,34,0.09)", fontSize: 11, color: "rgba(43,42,34,0.62)" }}>{name}</div>
                <div style={{ padding: "7px 8px", borderRight: "1px solid rgba(43,42,34,0.09)", fontSize: 11, color: table === "T?" || table === "" ? "rgba(43,42,34,0.3)" : table === "#REF!" ? TC : "rgba(43,42,34,0.62)" }}>{table}</div>
                <div style={{ padding: "7px 8px", borderRight: "1px solid rgba(43,42,34,0.09)", fontSize: 11, color: rsvp === "?" ? "rgba(43,42,34,0.35)" : "rgba(43,42,34,0.62)" }}>{rsvp}</div>
                <div style={{ padding: "7px 8px", fontSize: 11, color: notes === "DUP!" || notes === "!!" ? TC : "rgba(43,42,34,0.4)" }}>{notes}</div>
              </div>
            );
          })}
          {/* coffee ring + X overlay */}
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <ellipse cx="80%" cy="30%" rx="38" ry="34" fill="none" stroke="rgba(110,75,30,0.11)" strokeWidth="9" />
            <ellipse cx="80%" cy="30%" rx="29" ry="25" fill="none" stroke="rgba(110,75,30,0.05)" strokeWidth="3" />
            <line x1="5%" y1="12%" x2="95%" y2="88%" stroke={TC} strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
            <line x1="5%" y1="88%" x2="95%" y2="12%" stroke={TC} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
          </svg>
        </div>
      </div>

      {/* Right: warm named floor plan */}
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: TC, textTransform: "uppercase", marginBottom: 10 }}>Wedding Seater → a picture of the room</div>
        <div className="paper-grain" style={{ border: `1px solid rgba(43,42,34,0.28)`, height: 280, overflow: "hidden", position: "relative" }}>
          <div style={{ textAlign: "center", paddingTop: 12 }}>
            <span style={{ fontFamily: DISP, fontStyle: "italic", fontSize: 15, color: INK, letterSpacing: "0.02em" }}>Maya &amp; Jordan</span>
          </div>
          <svg viewBox="0 0 340 228" style={{ width: "100%", height: "calc(100% - 32px)" }}>
            <path d="M 12 8 L 328 7 L 327 221 L 11 223 Z" fill="none" stroke={INK} strokeWidth="0.7" opacity="0.35" />
            <rect x="258" y="148" width="62" height="66" fill="rgba(182,90,54,0.07)" stroke={TC} strokeWidth="0.9" strokeDasharray="3 2" />
            <text x="289" y="186" textAnchor="middle" fontFamily={DISP} fontStyle="italic" fontSize="9" fill={TC}>dance floor</text>
            {floorTables.map(([x, y, occ, cap, dotC, lbl], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="26" fill="rgba(243,238,227,0.97)" stroke={INK} strokeWidth="0.9" />
                {Array.from({ length: cap }).map((_, j) => {
                  const a = (j / cap) * Math.PI * 2 - Math.PI / 2;
                  return <circle key={j} cx={x + Math.cos(a) * 34} cy={y + Math.sin(a) * 34}
                    r="4" fill={j < occ ? dotC : "rgba(243,238,227,0.9)"}
                    stroke="rgba(43,42,34,0.2)" strokeWidth="0.5" />;
                })}
                <text x={x} y={y + 3.5} textAnchor="middle" fontFamily={DISP} fontStyle="italic" fontSize="9.5" fill={INK}>{lbl}</text>
              </g>
            ))}
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
            Name it. Flag it. <span className="font-display-italic">Share it.</span>
          </h2>
          <div className="grid gap-10 md:grid-cols-3 md:gap-7">
            {[
              { n: "01", visual: <StepCardName />, title: "On the canvas in thirty seconds.", body: "Name it. You're already dragging guests onto tables. No account, no pricing page, nothing to learn." },
              { n: "02", visual: <StepCardFlag />, title: "The family politics? Flag them. Forget them.", body: "Mom can't be near Carla. Greg stays away from the bar. Auto-assign places everyone around every rule you've set." },
              { n: "03", visual: <StepCardShare />, title: "Your whole crew, one link.", body: "Your partner, your mum, your maid of honour — all editing the same chart in real time. No more 'wait, which version is current?'" },
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
            The room. The rules. <span className="font-display-italic">The link.</span>
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
          {/* comparison table */}
          <div className="mt-16" style={{ border: `1px solid rgba(43,42,34,0.18)`, overflow: "hidden", borderRadius: 4 }}>
            {/* header row */}
            <div className="grid" style={{ gridTemplateColumns: "1.2fr 2.8fr 2.8fr", background: "rgba(43,42,34,0.04)", borderBottom: "1px solid rgba(43,42,34,0.16)" }}>
              <div style={{ padding: "12px 20px", borderRight: "1px solid rgba(43,42,34,0.12)" }} />
              <div style={{ padding: "12px 20px", fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: "rgba(43,42,34,0.55)", textTransform: "uppercase", borderRight: "1px solid rgba(43,42,34,0.12)", textDecoration: "line-through" }}>Template.xlsx</div>
              <div style={{ padding: "12px 20px", fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: TC, textTransform: "uppercase" }}>Wedding Seater</div>
            </div>
            {[
              ["Layout",        "Rows and columns.",                        "Tables, dance floor, doors."],
              ["Pairings",      "Track it in your head. Hope for the best.", "Flag once. Auto-assign handles the rest."],
              ["Collaboration", "Email chains. Overwritten cells.",          "One link. Live edits."],
              ["Time",          "Three weekends.",                           "An afternoon."],
              ["Price",         "Free. (Costs your sanity.)",                "Free. (Costs nothing.)"],
            ].map((row, i) => (
              <div key={i} className="grid" style={{ gridTemplateColumns: "1.2fr 2.8fr 2.8fr", borderTop: "1px solid rgba(43,42,34,0.12)" }}>
                <div style={{ padding: "18px 20px", fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: "rgba(43,42,34,0.62)", textTransform: "uppercase", borderRight: "1px solid rgba(43,42,34,0.12)", background: "rgba(43,42,34,0.02)" }}>{row[0]}</div>
                <div style={{ padding: "18px 20px", fontFamily: DISP, fontStyle: "italic", fontSize: 16, color: "rgba(43,42,34,0.62)", borderRight: "1px solid rgba(43,42,34,0.12)", background: "rgba(43,42,34,0.02)" }}>{row[1]}</div>
                <div style={{ padding: "18px 20px", fontFamily: DISP, fontSize: 16, color: INK, background: "rgba(74,82,50,0.028)" }}>{row[2]}</div>
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
