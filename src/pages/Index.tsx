import { useEffect, useRef, useState } from "react";
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
import { Logo } from "@/components/Logo";
import { analytics } from "@/lib/analytics";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useUnlock } from "@/hooks/useUnlock";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/siteUrl";
import { useSeoHead } from "@/lib/useSeoHead";

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
    <div className="paper-grain-strong" style={{ border: `1px solid ${HL}`, minHeight: 260, overflow: "hidden", position: "relative", boxShadow: "0 12px 40px -12px rgba(43,42,34,0.22), inset 0 1px 0 rgba(255,255,255,0.55)" }}>
      {/* room outline — minimal, same treatment as FeatureCanvas */}
      <svg width="100%" height="100%" viewBox="0 0 370 260" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} preserveAspectRatio="xMidYMid meet">
        <rect x="13" y="13" width="344" height="234" fill="none" stroke={INK} strokeWidth="0.9" opacity="0.18" />
        <rect x="40" y="7" width="62" height="12" fill={P2} stroke={INK} strokeWidth="0.7" opacity="0.5" />
        <text x="71" y="16" textAnchor="middle" fontFamily={MONO} fontSize="7" fill={INK} opacity="0.4" letterSpacing="0.1em">ENTRY</text>
      </svg>
      {/* plan title — editorial, not a form input */}
      <div style={{ position: "absolute", top: 22, left: 20 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.14em", color: TC, marginBottom: 5, opacity: 0.85 }}>NEW · PLAN</div>
        <div style={{ fontFamily: DISP, fontStyle: "italic", fontSize: 26, color: INK, lineHeight: 1, letterSpacing: "-0.01em" }}>Maya &amp; Jordan</div>
        <svg style={{ display: "block", marginTop: 3, width: 150 }} height="5" viewBox="0 0 150 5" preserveAspectRatio="none">
          <path d="M 0 4 Q 38 1, 75 3.5 Q 112 5, 150 3" stroke={INK} fill="none" strokeWidth="0.8" opacity="0.25" />
        </svg>
      </div>
      {/* PaperTable components — same visual language as hero + FeatureCanvas */}
      <PaperTable className="absolute" style={{ top: 96, left: 16 }}  size={66} seats={8} occupied={4} label="T1 · Family" />
      <PaperTable className="absolute" style={{ top: 96, left: 156 }} size={66} seats={8} occupied={2} label="T2 · College" />
      <PaperTable className="absolute" style={{ top: 96, left: 296, opacity: 0.32 }} size={66} seats={6} occupied={0} label="T3" />
      {/* editorial annotation */}
      <div className="absolute font-display-italic" style={{ bottom: 16, right: 16, fontSize: 11, color: TC, transform: "rotate(-2deg)", textAlign: "right", lineHeight: 1.35, opacity: 0.8 }}>
        drop guests →<br />onto a table
      </div>
    </div>
  );
}

// ─── Step card: flagging rules — editorial chip style (matches FeatureConflict) ──
function StepCardFlag() {
  return (
    <div className="paper-grain-strong" style={{ border: `1px solid ${HL}`, minHeight: 260, display: "flex", flexDirection: "column", boxShadow: "0 12px 40px -12px rgba(43,42,34,0.22), inset 0 1px 0 rgba(255,255,255,0.55)" }}>
      <div style={{ padding: "20px 22px 0", flex: 1 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", color: TC, textTransform: "uppercase", marginBottom: 18 }}>KEEP APART</div>
        {/* Rule 1: Mom × Carla — chip style matching FeatureConflict */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ background: "rgba(182,90,54,0.1)", padding: "8px 14px", border: "1px solid rgba(182,90,54,0.26)", fontFamily: DISP, fontStyle: "italic", fontSize: 22, borderRadius: 6 }}>Mom</div>
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
            <line x1="3" y1="3" x2="15" y2="15" stroke={TC} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="15" y1="3" x2="3" y2="15" stroke={TC} strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <div style={{ background: "rgba(182,90,54,0.1)", padding: "8px 14px", border: "1px solid rgba(182,90,54,0.26)", fontFamily: DISP, fontStyle: "italic", fontSize: 22, borderRadius: 6 }}>Carla</div>
        </div>
        {/* Rule 2: Greg × the bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "rgba(74,82,50,0.1)", padding: "8px 14px", border: "1px solid rgba(74,82,50,0.26)", fontFamily: DISP, fontStyle: "italic", fontSize: 22, borderRadius: 6 }}>Greg</div>
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
            <line x1="3" y1="3" x2="15" y2="15" stroke={TC} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="15" y1="3" x2="3" y2="15" stroke={TC} strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <div style={{ background: "rgba(74,82,50,0.1)", padding: "8px 14px", border: "1px solid rgba(74,82,50,0.26)", fontFamily: DISP, fontStyle: "italic", fontSize: 22, borderRadius: 6 }}>the bar</div>
        </div>
      </div>
      {/* footer strip matching FeatureConflict */}
      <div style={{ borderTop: `1px solid ${HL}`, padding: "12px 22px", background: "rgba(74,82,50,0.04)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: DISP, fontSize: 32, fontWeight: 400, color: OLV, lineHeight: 1 }}>23</span>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.12em", color: OLV, textTransform: "uppercase" }}>rules handled</div>
          <div style={{ fontFamily: DISP, fontStyle: "italic", fontSize: 11, color: I3, marginTop: 1 }}>Including yours.</div>
        </div>
        <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 8, color: TC, letterSpacing: "0.1em", background: "rgba(182,90,54,0.08)", padding: "3px 8px", borderRadius: 3, border: `0.5px solid rgba(182,90,54,0.22)` }}>+ ADD RULE</div>
      </div>
    </div>
  );
}

// ─── Step card: sharing — the moment of sending, not the dashboard view ──────
function StepCardShare() {
  return (
    <div className="paper-grain-strong" style={{ border: `1px solid ${HL}`, minHeight: 260, display: "flex", flexDirection: "column", boxShadow: "0 12px 40px -12px rgba(43,42,34,0.22), inset 0 1px 0 rgba(255,255,255,0.55)" }}>
      <div style={{ padding: "20px 22px 0", fontFamily: MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.14em", color: TC }}>SEND · THE LINK</div>
      {/* message thread — the act of sharing, not the collaboration dashboard */}
      <div style={{ flex: 1, padding: "14px 22px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <div style={{ background: "rgba(43,42,34,0.07)", padding: "9px 14px", borderRadius: "12px 12px 12px 4px", fontFamily: DISP, fontStyle: "italic", fontSize: 14, color: INK, maxWidth: "78%" }}>
            where's the seating chart? can I see it?
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ background: "rgba(182,90,54,0.11)", border: "0.5px solid rgba(182,90,54,0.26)", padding: "9px 14px", borderRadius: "12px 12px 4px 12px", maxWidth: "85%" }}>
            <div style={{ fontFamily: DISP, fontStyle: "italic", fontSize: 14, color: INK, marginBottom: 6 }}>here you go 💐</div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: TC, letterSpacing: "0.01em", borderBottom: "1px solid rgba(182,90,54,0.28)", paddingBottom: 2 }}>weddingseater.app/m-and-j</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <div style={{ background: "rgba(43,42,34,0.07)", padding: "9px 14px", borderRadius: "12px 12px 12px 4px", fontFamily: DISP, fontStyle: "italic", fontSize: 14, color: INK }}>
            oh this is so good 😭
          </div>
        </div>
      </div>
      <div style={{ padding: "10px 22px 14px", borderTop: `1px solid ${HL}` }}>
        <div style={{ fontFamily: DISP, fontStyle: "italic", fontSize: 11, color: I3 }}>No account needed. Just the link.</div>
      </div>
    </div>
  );
}

// ─── Feature card: the canvas ─────────────────────────────────────────────
function FeatureCanvas() {
  return (
    <div className="paper-grain-strong" style={{ border: `1px solid ${HL}`, minHeight: 260, overflow: "hidden", position: "relative", boxShadow: "0 12px 40px -12px rgba(43,42,34,0.22), inset 0 1px 0 rgba(255,255,255,0.55)" }}>
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
    <div className="paper-grain" style={{ border: `1px solid ${HL}`, minHeight: 260, display: "flex", flexDirection: "column", boxShadow: "0 12px 40px -12px rgba(43,42,34,0.22), inset 0 1px 0 rgba(255,255,255,0.55)" }}>
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
    <div className="paper-grain" style={{ border: `1px solid ${HL}`, minHeight: 260, display: "flex", flexDirection: "column", boxShadow: "0 12px 40px -12px rgba(43,42,34,0.22), inset 0 1px 0 rgba(255,255,255,0.55)" }}>
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
  const [params] = useSearchParams();
  const [name, setName] = useState("");
  const [openCode, setOpenCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<RecentPlan[]>([]);
  const [showCodeOpen, setShowCodeOpen] = useState(false);
  const [myPlans, setMyPlans] = useState<OwnedPlan[]>([]);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { isPaid, loading: unlockLoading } = useUnlock();

  useSeoHead({
    title: "Drag-and-Drop Wedding Seating Chart Maker | Wedding Seater",
    description: "Drag your guests onto your tables. Auto-seat handles the divorced parents, the feuding cousins, the kids' table. Try the demo free; £10 unlocks it for life.",
    canonical: SITE_URL,
    ogImage: `${SITE_URL}/brand/wedding-seater-mark.png`,
  });

  useEffect(() => { setRecents(getRecentPlans()); }, []);


  useEffect(() => {
    const presetName = params.get("name");
    if (presetName) setName(presetName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Defensive — CTAs branch on isPaid (which implies user) so this
      // path shouldn't fire from the UI. Kept as a guard.
      setUpgradeOpen(true);
      return;
    }
    if (!isPaid) {
      // Pay to ship — gate plan creation behind the £10 unlock. The demo
      // (sample data) covers try-before-buy without a real plan.
      setUpgradeOpen(true);
      return;
    }
    setLoading(true);
    const code = generatePlanCode();
    const { data, error } = await supabase.rpc("create_plan_with_owner" as never, {
      _code: code,
      _name: name.trim() || "Our Wedding",
    } as never);
    setLoading(false);
    if (error || !data) {
      console.error("create_plan_with_owner failed:", error);
      toast.error(error?.message ? `Couldn't create plan: ${error.message}` : "Could not create plan");
      return;
    }
    const plan = data as unknown as { id: string; code: string; name: string };
    analytics.planCreated({ name: plan.name });
    navigate(`/plan/${plan.code}`);
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

      <JsonLd id="organization" schema={{
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Wedding Seater",
        "url": SITE_URL,
        "logo": `${SITE_URL}/og-image.png`,
        "description": "Wedding Seater is a web-based seating chart planner. Drag guests onto tables, resolve who can't sit near whom, share a link with whoever's helping.",
      }} />
      <JsonLd id="website" schema={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Wedding Seater",
        "url": SITE_URL,
      }} />
      <JsonLd id="software" schema={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Wedding Seater",
        "url": SITE_URL,
        "applicationCategory": "LifestyleApplication",
        "operatingSystem": "Web browser",
        "offers": {
          "@type": "Offer",
          "price": "10.00",
          "priceCurrency": "GBP",
          "availability": "https://schema.org/InStock",
          "url": SITE_URL,
        },
      }} />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="container flex items-center justify-between py-7">
        <Logo size={22} />
        <nav className="hidden items-center gap-9 text-sm text-ink-2 md:flex" aria-label="Main navigation">
          <a className="hover:text-ink" href="#how-it-works">How it works</a>
          <a className="hover:text-ink" href="#who-its-for">Who it's for</a>
          <Link to="/blog" className="hover:text-ink">Blog</Link>
          <Link to="/demo" className="hover:text-ink">
            Try the demo
          </Link>
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
        <section aria-label="Hero" className="grid items-center gap-12 pt-10 md:grid-cols-[1.1fr_1fr] md:gap-16 md:pt-16">
          <div>
            <p className="label-mono mb-7">— A wedding seating planner</p>
            <h1 className="m-0 font-display text-[60px] leading-[0.97] tracking-[-0.03em] sm:text-[76px] xl:text-[96px]">
              Your seating chart,<br />
              <span className="font-display-italic">without</span> the spreadsheet.
            </h1>
            <p className="mt-8 max-w-[500px] text-[18px] leading-[1.55] text-ink-2" style={{ fontFamily: DISP }}>
              You already know who can't sit near whom. You've been carrying it in your head for weeks. This is where you put it down — and get the whole thing sorted in one afternoon.
            </p>

            {/* Two-CTA block — demo (primary) + paid (secondary) */}
            <div className="mt-10 max-w-lg">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/demo"
                  className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-6 text-[15px] font-medium text-paper transition hover:bg-ink-2"
                >
                  Try the demo
                  <span className="font-display-italic">→</span>
                </Link>
                <button
                  onClick={() => (isPaid ? createPlan() : setUpgradeOpen(true))}
                  disabled={loading || unlockLoading}
                  className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full border border-ink/20 bg-paper px-6 text-[15px] text-ink transition hover:bg-paper-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <>Start your chart <span className="font-display-italic">→</span></>}
                </button>
              </div>
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
          <div className="relative h-[320px] md:h-[560px]">
            <FloorPlanVignette />
            <div className="absolute -bottom-3 left-6 rounded-full border hairline bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
              Maya &amp; Jordan · 14 September 2026
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
              { n: "01", visual: <StepCardName />, title: "You're on the canvas before you can overthink it.", body: "Type a name. You're already dragging guests onto tables. No tutorial, no demo, nothing to figure out." },
              { n: "02", visual: <StepCardFlag />, title: "The family politics? Write them down. Forget them.", body: "Mom can't be near Carla. Greg stays away from the bar. Tell it the rules — it works around every single one of them." },
              { n: "03", visual: <StepCardShare />, title: "Your whole crew, one link.", body: "Your partner, your mum, your maid of honour — all in the same chart in real time. No more 'wait, which version is current?'" },
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
          <p className="label-mono mb-8" style={{ color: TC }}>— What it does</p>
          <h2 id="product-heading" className="m-0 mb-14 font-display text-[42px] leading-[1.0] tracking-[-0.025em] md:text-[56px] lg:text-[64px]">
            The room. The rules. <span className="font-display-italic">The link.</span>
          </h2>
          <div className="grid gap-10 md:grid-cols-3 md:gap-7">
            {[
              { visual: <FeatureCanvas />, title: "A canvas, not a grid.", body: "Tables, chairs, the dance floor, the doors. For the first time, you can see the whole picture at once." },
              { visual: <FeatureConflict />, title: "The family drama? Handled.", body: "Tell it who can't be near whom. It seats everyone around every rule you've set. You deal with the flowers." },
              { visual: <FeatureMobile />, title: "Everyone helps. One link.", body: "Your partner, your mum, your maid of honour. All in. No one needs an account, no one needs to download anything." },
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
          <BeforeAfterSlider />
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
              ["Price",         "Your sanity.",                              "£10. One time."],
            ].map((row, i) => (
              <div key={i} className="grid" style={{ gridTemplateColumns: "1.2fr 2.8fr 2.8fr", borderTop: "1px solid rgba(43,42,34,0.12)" }}>
                <div style={{ padding: "20px 20px", fontFamily: MONO, fontSize: 11, letterSpacing: "0.13em", color: "rgba(43,42,34,0.78)", textTransform: "uppercase", borderRight: "1px solid rgba(43,42,34,0.12)", background: "rgba(43,42,34,0.02)" }}>{row[0]}</div>
                <div style={{ padding: "20px 20px", fontFamily: DISP, fontStyle: "italic", fontSize: 17, color: "rgba(43,42,34,0.72)", borderRight: "1px solid rgba(43,42,34,0.12)", background: "rgba(43,42,34,0.02)" }}>{row[1]}</div>
                <div style={{ padding: "20px 20px", fontFamily: DISP, fontSize: 17, color: INK, background: "rgba(74,82,50,0.028)" }}>{row[2]}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── § 5 · Who it's for ───────────────────────────────────────── */}
        <section id="who-its-for" aria-labelledby="personas-heading" className="mt-48 border-t hairline pt-14">
          <p className="label-mono mb-8" style={{ color: TC }}>— Who it's for</p>
          <h2 id="personas-heading" className="m-0 mb-14 font-display text-[42px] leading-[1.0] tracking-[-0.025em] md:text-[56px] lg:text-[64px]">
            Couples. Helpers. <span className="font-display-italic">The one who got handed the list.</span>
          </h2>
          <div className="grid gap-7 md:grid-cols-3">
            {[
              { visual: <VignetteCouple />, title: "150 guests. No plan yet.", body: "You have the guest list. You have the PDF of the venue. What you're missing is a picture of the actual room that you can drag people around in. That's this." },
              { visual: <VignetteMom />,    title: "Mum wants to help. Let her.", body: "She has the link. She can see the tables. She moves Uncle Jim to table 9 and you see it instantly. No phone calls, no emailing spreadsheets back and forth." },
              { visual: <VignetteFamily />, title: "Divorced parents. That ex.", body: "You know the pairs. Tell it once — Mom and Carla, Dad and Step-dad, the cousins who haven't spoken since 2019. It works around all of them. Nobody makes a scene." },
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
              <FAQPair q="How much does it cost?" a="£10. One payment, lifetime access — no subscription, no per-guest pricing, no upsells. Try the demo first if you want to feel it before you pay. 30-day money-back guarantee." />
              <FAQPair q="Do I need to make an account?" a="Yes — a quick email signup so your plan is saved to you and syncs across your laptop, phone, and whoever you share it with. Takes about ten seconds." />
              <FAQPair q="Can my partner edit it too?" a="Anyone with the link can. You don't need to be 'in charge' of the spreadsheet anymore — there is no spreadsheet." />
              <FAQPair q="What if I already started a spreadsheet?" a="Paste your guest list in and we'll figure out the rest. You don't have to start from zero." />
              <FAQPair q="How hard is the drag-and-drop?" a="You drag a name from the guest list. You drop it on a table. That's it. If you can move an app icon on your phone, you can do this." />
              <FAQPair q="What about the difficult families?" a="Tell it who can't sit near whom. It works around every one of those rules when it places the guests. You can always move anyone yourself too." />
              <FAQPair q="What if I lose my work?" a="You won't. It saves every change automatically. Start on your laptop, pick it up on your phone in bed. It's always where you left it." />
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
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/demo"
                  className="inline-flex h-13 items-center justify-center gap-1.5 rounded-full bg-ink px-7 text-[16px] font-medium text-paper transition hover:bg-ink-2"
                >
                  Try the demo
                  <span className="font-display-italic">→</span>
                </Link>
                <button
                  onClick={() => (isPaid ? createPlan() : setUpgradeOpen(true))}
                  disabled={loading || unlockLoading}
                  className="inline-flex h-13 items-center justify-center gap-1.5 rounded-full border border-ink/20 bg-paper px-7 text-[16px] text-ink transition hover:bg-paper-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <>Start your chart <span className="font-display-italic">→</span></>}
                </button>
              </div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-2">
                One payment · Less than one place setting at your reception
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
      <footer className="container flex flex-wrap items-center justify-between gap-y-3 py-8 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
        <Logo size={16} />
        <nav className="flex gap-5">
          <a href="/terms" className="hover:text-ink">Terms</a>
          <a href="/privacy" className="hover:text-ink">Privacy</a>
          <a href="/refunds" className="hover:text-ink">Refunds</a>
        </nav>
        <span>© Wedding Seater · 2026</span>
      </footer>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
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
