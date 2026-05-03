import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { generatePlanCode } from "@/lib/planCode";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Users, LayoutGrid, FileDown } from "lucide-react";
import { useEffect, useState as useState2 } from "react";
import { getRecentPlans, removeRecentPlan, type RecentPlan } from "@/lib/recentPlans";
import { X } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [openCode, setOpenCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState2<RecentPlan[]>([]);
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
            <Card className="p-8 shadow-[var(--shadow-elegant)] border-border/60">
              <h2 className="font-display text-2xl mb-1">Start a new seating plan</h2>
              <p className="text-sm text-muted-foreground mb-5">You'll get a private link to share with your co-planner.</p>
              <Label htmlFor="name">Wedding name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Alex & Jordan" className="mt-1.5"/>
              <Button onClick={createPlan} disabled={loading} className="w-full mt-5 h-11">
                Create plan <ArrowRight size={16} className="ml-1.5"/>
              </Button>
            </Card>

            <Card className="p-6 border-border/60">
              <h3 className="font-display text-lg mb-3">Already have a plan?</h3>
              <div className="flex gap-2">
                <Input value={openCode} onChange={e => setOpenCode(e.target.value)} placeholder="luna-meadow-4821"/>
                <Button variant="secondary" onClick={openPlan}>Open</Button>
              </div>
            </Card>

            {recents.length > 0 && (
              <Card className="p-6 border-border/60">
                <h3 className="font-display text-lg mb-3">Recent plans</h3>
                <ul className="space-y-1">
                  {recents.map(r => (
                    <li key={r.code} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                      <button onClick={() => navigate(`/plan/${r.code}`)} className="flex-1 text-left">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.code} · {new Date(r.openedAt).toLocaleDateString()}</div>
                      </button>
                      <button
                        onClick={() => { removeRecentPlan(r.code); setRecents(getRecentPlans()); }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        aria-label="Remove from recents"
                      >
                        <X size={14}/>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
