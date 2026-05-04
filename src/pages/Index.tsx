import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { generatePlanCode } from "@/lib/planCode";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Users, LayoutGrid, FileDown, ArrowUpRight } from "lucide-react";
import { getRecentPlans, removeRecentPlan, type RecentPlan } from "@/lib/recentPlans";
import { X } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [openCode, setOpenCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<RecentPlan[]>([]);
  const [showCodeOpen, setShowCodeOpen] = useState(false);
  useEffect(() => { setRecents(getRecentPlans()); }, []);

  const createPlan = async () => {
    setLoading(true);
    const code = generatePlanCode();
    const { data, error } = await supabase
      .from("plans")
      .insert({ code, name: name.trim() || "Our Wedding" })
      .select()
      .single();
    setLoading(false);
    if (error || !data) { toast.error("Could not create plan"); return; }
    navigate(`/plan/${data.code}`);
  };

  const openPlan = async () => {
    const c = openCode.trim().toLowerCase();
    if (!c) return;
    const { data } = await supabase.from("plans").select("code").eq("code", c).maybeSingle();
    if (!data) { toast.error("No plan found with that code"); return; }
    navigate(`/plan/${data.code}`);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <header className="container pt-8 pb-4 flex items-center gap-2">
        <Sparkles className="text-primary" size={20} />
        <span className="font-display text-xl font-semibold">Seatly</span>
      </header>

      <main className="container py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="font-display text-5xl md:text-6xl leading-[1.05] text-foreground">
              Every guest <em className="text-primary">in their</em> perfect seat.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md">
              Import your guest list, define your tables, and assign seats with drag-and-drop or auto-assign. Share the link with your partner — no logins, no fuss.
            </p>

            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Users size={16} className="text-primary"/>CSV / Excel import</div>
              <div className="flex items-center gap-2"><LayoutGrid size={16} className="text-primary"/>Floor plan + list view</div>
              <div className="flex items-center gap-2"><FileDown size={16} className="text-primary"/>Print place cards</div>
            </div>
          </div>

          <div className="space-y-4">
            {recents.length > 0 && (
              <Card className="p-6 shadow-[var(--shadow-elegant)] border-border/60">
                <h2 className="font-display text-2xl mb-1">Pick up where you left off</h2>
                <p className="text-sm text-muted-foreground mb-4">Your plans are saved on this device — bookmark this page to find them anytime.</p>
                <ul className="space-y-1">
                  {recents.map(r => (
                    <li key={r.code} className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/60 transition">
                      <button onClick={() => navigate(`/plan/${r.code}`)} className="flex-1 text-left">
                        <div className="font-medium truncate flex items-center gap-1.5">{r.name} <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-60 transition"/></div>
                        <div className="text-xs text-muted-foreground">Last opened {new Date(r.openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                      </button>
                      <button
                        onClick={() => { removeRecentPlan(r.code); setRecents(getRecentPlans()); }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1"
                        aria-label="Remove from recents"
                      >
                        <X size={14}/>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className={`p-8 border-border/60 ${recents.length === 0 ? "shadow-[var(--shadow-elegant)]" : ""}`}>
              <h2 className="font-display text-2xl mb-1">{recents.length > 0 ? "Start a new plan" : "Start your seating plan"}</h2>
              <p className="text-sm text-muted-foreground mb-5">A private link, just for the two of you. No accounts, no fuss.</p>
              <Label htmlFor="name">What should we call it?</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Alex & Jordan's wedding" className="mt-1.5"/>
              <Button onClick={createPlan} disabled={loading} className="w-full mt-5 h-11">
                Create plan <ArrowRight size={16} className="ml-1.5"/>
              </Button>
            </Card>

            <div className="text-center text-sm">
              {showCodeOpen ? (
                <Card className="p-4 border-border/60 text-left">
                  <Label className="text-xs text-muted-foreground">Got a code from your partner?</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input value={openCode} onChange={e => setOpenCode(e.target.value)} placeholder="luna-meadow-4821" autoFocus/>
                    <Button variant="secondary" onClick={openPlan}>Open</Button>
                  </div>
                </Card>
              ) : (
                <button onClick={() => setShowCodeOpen(true)} className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                  Got a plan code from your partner?
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
