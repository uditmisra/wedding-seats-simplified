import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useBelowLg } from "@/hooks/use-mobile";
import { Clock } from "lucide-react";

interface ActivityEntry {
  id: string;
  user_display: string;
  action: string;
  subject: string | null;
  detail: string | null;
  created_at: string;
}

interface Props {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ActionLine({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-hairline last:border-0">
      <div
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-medium text-paper"
        style={{ background: "hsl(var(--olive))" }}
      >
        {entry.user_display.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-ink leading-snug">
          <span className="font-medium">{entry.user_display}</span>
          {" "}
          <span className="text-ink-2">{entry.action}</span>
          {entry.subject && (
            <> <span className="font-medium text-terracotta">{entry.subject}</span></>
          )}
          {entry.detail && (
            <span className="text-ink-3"> {entry.detail}</span>
          )}
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-ink-3">{timeAgo(entry.created_at)}</div>
      </div>
    </div>
  );
}

function Timeline({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock size={24} className="mb-3 text-ink-3 opacity-40" />
        <div className="font-display-italic text-[15px] text-ink-3">No activity yet.</div>
        <div className="mt-1.5 text-[12px] text-ink-3">
          Changes you and your collaborators make will appear here.
        </div>
      </div>
    );
  }

  // Group by day
  const groups: { label: string; items: ActivityEntry[] }[] = [];
  for (const entry of entries) {
    const label = dayLabel(entry.created_at);
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.items.push(entry);
    } else {
      groups.push({ label, items: [entry] });
    }
  }

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group.label}>
          <div className="label-mono mb-3 text-terracotta">{group.label}</div>
          <div>
            {group.items.map(e => <ActionLine key={e.id} entry={e} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityDrawer({ planId, open, onOpenChange }: Props) {
  const isMobile = useBelowLg();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    // Initial load
    supabase
      .from("activity_log")
      .select("id, user_display, action, subject, detail, created_at")
      .eq("plan_id", planId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { if (data) setEntries(data as ActivityEntry[]); });

    // Realtime subscription
    const channel = supabase
      .channel(`activity:${planId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log", filter: `plan_id=eq.${planId}` },
        (payload) => {
          setEntries(prev => [payload.new as ActivityEntry, ...prev]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, planId]);

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b hairline pb-4 mb-4">
        <div>
          <div className="label-mono">Activity</div>
          <h2 className="m-0 font-display text-[24px] leading-tight mt-1">
            Who changed <span className="font-display-italic">what.</span>
          </h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Timeline entries={entries} />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-paper px-4 pb-8" style={{ maxHeight: "85vh" }}>
          <div className="pt-4 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[380px] bg-paper p-6 overflow-y-auto"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Activity log</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}
