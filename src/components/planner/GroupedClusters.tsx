import { useMemo } from "react";
import type { Assignment, Guest, TableDef } from "@/lib/types";
import { PaperTable } from "@/components/PaperTable";
import { Button } from "@/components/ui/button";

interface Props {
  guests: Guest[];
  tables: TableDef[];
  assignments: Assignment[];
}

const GROUP_COLORS = [
  "hsl(var(--olive))",
  "hsl(var(--terracotta))",
  "hsl(var(--rose))",
  "hsl(var(--olive-2))",
  "hsl(var(--terracotta-2))",
  "hsl(var(--butter))",
];

interface ClusterTable {
  table: TableDef;
  tableNum: number;
  seated: number;
  capacity: number;
}

interface Cluster {
  party: string;
  color: string;
  totalGuests: number;
  seatedCount: number;
  tables: ClusterTable[];
  warn: boolean;
}

/**
 * Cluster guests by `party`. A table appears in a cluster if any seated
 * guest belongs to that party — clusters are a *projection* of seating,
 * not a partition (a table can show up in multiple clusters).
 *
 * "Other" cluster collects guests with empty/missing party.
 */
function buildClusters(guests: Guest[], tables: TableDef[], assignments: Assignment[]): Cluster[] {
  const guestById = new Map(guests.map(g => [g.id, g]));
  const tableNumByTableId = new Map(tables.map((t, i) => [t.id, i + 1]));

  const partyOf = (g: Guest): string => (g.party?.trim() || "Other");

  // Tally seated and total guests per party
  const totalByParty = new Map<string, number>();
  for (const g of guests) {
    if (g.rsvp === "declined") continue;
    const p = partyOf(g);
    totalByParty.set(p, (totalByParty.get(p) ?? 0) + 1);
  }

  // For each party, find tables with seated guests of that party
  const tableSetByParty = new Map<string, Map<string, number>>();
  const seatedByParty = new Map<string, number>();
  for (const a of assignments) {
    const g = guestById.get(a.guest_id);
    if (!g) continue;
    const p = partyOf(g);
    seatedByParty.set(p, (seatedByParty.get(p) ?? 0) + 1);
    if (!tableSetByParty.has(p)) tableSetByParty.set(p, new Map());
    const tableMap = tableSetByParty.get(p)!;
    tableMap.set(a.table_id, (tableMap.get(a.table_id) ?? 0) + 1);
  }

  const seatedByTable = new Map<string, number>();
  for (const a of assignments) {
    seatedByTable.set(a.table_id, (seatedByTable.get(a.table_id) ?? 0) + 1);
  }

  const parties = [...totalByParty.keys()].sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return (totalByParty.get(b) ?? 0) - (totalByParty.get(a) ?? 0);
  });

  return parties.map((party, idx): Cluster => {
    const tableMap = tableSetByParty.get(party) ?? new Map();
    const tableList: ClusterTable[] = [...tableMap.keys()]
      .map(tableId => {
        const table = tables.find(t => t.id === tableId);
        if (!table) return null;
        return {
          table,
          tableNum: tableNumByTableId.get(table.id) ?? 0,
          seated: seatedByTable.get(table.id) ?? 0,
          capacity: table.capacity,
        };
      })
      .filter((t): t is ClusterTable => t !== null)
      .sort((a, b) => a.tableNum - b.tableNum);
    const total = totalByParty.get(party) ?? 0;
    const seated = seatedByParty.get(party) ?? 0;
    return {
      party,
      color: GROUP_COLORS[idx % GROUP_COLORS.length],
      totalGuests: total,
      seatedCount: seated,
      tables: tableList,
      warn: total > 0 && seated / total < 0.4,
    };
  });
}

export function GroupedClusters({ guests, tables, assignments }: Props) {
  const clusters = useMemo(
    () => buildClusters(guests, tables, assignments),
    [guests, tables, assignments],
  );

  // Generate a quick suggestion based on the most-warned cluster.
  const suggestion = useMemo(() => {
    const warnCluster = clusters.find(c => c.warn);
    if (!warnCluster) return null;
    const remaining = warnCluster.totalGuests - warnCluster.seatedCount;
    return {
      party: warnCluster.party,
      remaining,
    };
  }, [clusters]);

  return (
    <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
      {/* Left rail — by group */}
      <aside className="rounded-2xl border hairline bg-paper p-5">
        <div className="label-mono mb-3.5">By group</div>
        <div className="flex flex-col gap-3">
          {clusters.length === 0 && (
            <p className="font-display-italic text-[13px] text-ink-3">
              Add a few guests with party labels to see them grouped here.
            </p>
          )}
          {clusters.map(c => {
            const pct = c.totalGuests > 0 ? c.seatedCount / c.totalGuests : 0;
            return (
              <div key={c.party} className="rounded-[10px] border hairline bg-paper p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: c.color }}
                    />
                    <span className="text-[14px] font-medium">{c.party}</span>
                    {c.warn && (
                      <span className="font-display-italic text-[11px] text-terracotta">
                        · needs attention
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-ink-3">
                    {c.seatedCount}/{c.totalGuests}
                  </span>
                </div>
                <div
                  className="h-[3px] rounded-full"
                  style={{ background: "hsl(var(--paper-3))" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(pct * 100)}%`, background: c.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {suggestion && (
          <div className="mt-6 border-t hairline pt-5">
            <div className="label-mono mb-2.5">Suggestions</div>
            <div
              className="rounded-[10px] border p-3 text-[12px] text-ink-2"
              style={{
                background: "hsl(var(--butter) / 0.2)",
                borderColor: "hsl(var(--butter))",
                lineHeight: 1.5,
              }}
            >
              <span className="font-display-italic text-terracotta">Try this: </span>
              the <strong className="font-medium">{suggestion.party}</strong> group has{" "}
              {suggestion.remaining} {suggestion.remaining === 1 ? "guest" : "guests"} left to seat.
              Group them at the next open table together — keeps friends near friends.
            </div>
          </div>
        )}
      </aside>

      {/* Canvas — grouped layout */}
      <div className="paper-grain relative overflow-hidden rounded-2xl border hairline" style={{ minHeight: 480 }}>
        {/* Room outline + dance floor */}
        <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none">
          <rect
            x={40}
            y={40}
            width="calc(100% - 80px)"
            height="calc(100% - 80px)"
            fill="none"
            stroke="hsl(var(--ink-2))"
            strokeWidth={1}
            opacity={0.5}
          />
        </svg>

        {/* Cluster cards laid out on a 2-column grid */}
        <div className="relative grid h-full grid-cols-1 gap-6 p-10 sm:grid-cols-2">
          {clusters.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-20 font-display-italic text-ink-3">
              No groups yet — assign guests to parties first.
            </div>
          ) : (
            clusters.map(c => (
              <ClusterCard key={c.party} cluster={c} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ClusterCard({ cluster }: { cluster: Cluster }) {
  return (
    <div className="relative rounded-3xl bg-white/50 p-5" style={{ border: `1px dashed ${cluster.color}`, minHeight: 180 }}>
      <div
        className="absolute -top-2 left-3 px-2 font-mono text-[10px] uppercase tracking-[0.16em]"
        style={{
          background: "hsl(var(--paper))",
          color: cluster.color,
          fontWeight: 500,
        }}
      >
        {cluster.party.toUpperCase()}
      </div>

      <div className="flex flex-wrap items-center justify-around gap-4 pt-2">
        {cluster.tables.length === 0 ? (
          <div className="flex h-24 items-center justify-center font-display-italic text-[12px] text-ink-3">
            no seats yet
          </div>
        ) : (
          cluster.tables.map(t => {
            const ratio = t.seated / Math.max(1, t.capacity);
            const accent = ratio < 0.4 ? "hsl(var(--terracotta))" : cluster.color;
            return (
              <div key={t.table.id} className="relative flex flex-col items-center gap-1">
                <div className="relative">
                  <PaperTable
                    size={70}
                    seats={Math.min(10, Math.max(4, t.capacity))}
                    occupied={Math.round(ratio * Math.min(10, Math.max(4, t.capacity)))}
                    accent={accent}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                    style={{ fontFamily: "Newsreader, serif", color: "hsl(var(--ink))" }}
                  >
                    <div className="text-[15px] leading-none">
                      {String(t.tableNum).padStart(2, "0")}
                    </div>
                    <div className="mt-px font-mono text-[9px] text-ink-3">
                      {t.seated}/{t.capacity}
                    </div>
                  </div>
                </div>
                <div className="font-display-italic text-[11px] text-ink-3 whitespace-nowrap">
                  {t.table.name}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
