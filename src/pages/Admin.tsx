import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { UserMenu } from "@/components/UserMenu";
import { toast } from "sonner";
import { Loader2, Trash2, ExternalLink, RefreshCw } from "lucide-react";

const ADMIN_EMAIL = "udit.misra93@gmail.com";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Stats {
  total_plans: number;
  total_guests: number;
  total_tables: number;
  total_users: number;
}

interface AdminPlan {
  id: string;
  code: string;
  name: string;
  event_date: string | null;
  created_at: string;
  updated_at: string;
  owner_email: string | null;
  guest_count: number;
  table_count: number;
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  plan_count: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRelative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  return fmt(iso);
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border hairline bg-paper p-5">
      <div className="label-mono mb-2">{label}</div>
      <div className="font-display text-[36px] tabular-nums leading-none">{value}</div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type Tab = "overview" | "users" | "plans";

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  // Guard: redirect non-admins immediately
  useEffect(() => {
    if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    const { data, error } = await supabase.rpc("admin_get_stats" as never);
    setLoadingStats(false);
    if (error) { toast.error(error.message); return; }
    setStats(data as Stats);
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    const { data, error } = await supabase.rpc("admin_list_plans" as never);
    setLoadingPlans(false);
    if (error) { toast.error(error.message); return; }
    setPlans((data as AdminPlan[]) ?? []);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase.rpc("admin_list_users" as never);
    setLoadingUsers(false);
    if (error) { toast.error(error.message); return; }
    setUsers((data as AdminUser[]) ?? []);
  }, []);

  // Load data when tab becomes active
  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return;
    if (tab === "overview") fetchStats();
    if (tab === "plans") fetchPlans();
    if (tab === "users") fetchUsers();
  }, [tab, user, fetchStats, fetchPlans, fetchUsers]);

  const deletePlan = async (planId: string, planName: string) => {
    if (!confirm(`Delete "${planName}"? This cannot be undone.`)) return;
    setBusyPlan(planId);
    const { error } = await supabase.rpc("admin_delete_plan" as never, { p_plan_id: planId } as never);
    setBusyPlan(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Plan deleted");
    setPlans(ps => ps.filter(p => p.id !== planId));
    // Refresh stats if on overview tab too
    if (tab === "overview") fetchStats();
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user "${email}" and all their data? This cannot be undone.`)) return;
    setBusyUser(userId);
    const { error } = await supabase.rpc("admin_delete_user" as never, { p_user_id: userId } as never);
    setBusyUser(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${email} deleted`);
    setUsers(us => us.filter(u => u.id !== userId));
    if (tab === "overview") fetchStats();
  };

  if (loading || !user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="paper-grain flex min-h-screen items-center justify-center">
        <Loader2 size={20} className="animate-spin text-ink-3" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users",    label: `Users${users.length ? ` · ${users.length}` : ""}` },
    { id: "plans",    label: `Plans${plans.length ? ` · ${plans.length}` : ""}` },
  ];

  return (
    <div className="paper-grain min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b hairline bg-paper/85 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link to="/"><Logo size={18} /></Link>
            <span className="h-5 w-px bg-hairline" />
            <span className="label-mono text-terracotta">Admin</span>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b hairline bg-paper/60">
        <div className="container flex items-center gap-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-5 py-3.5 text-[13px] transition-colors ${
                tab === t.id
                  ? "border-ink font-medium text-ink"
                  : "border-transparent text-ink-3 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="container py-10">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h1 className="font-display text-[28px]">
                Overview
              </h1>
              <button
                onClick={fetchStats}
                disabled={loadingStats}
                className="inline-flex items-center gap-1.5 rounded-full border hairline px-3 py-1.5 text-[12px] text-ink-3 hover:text-ink disabled:opacity-50"
              >
                <RefreshCw size={11} className={loadingStats ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
            {loadingStats && !stats ? (
              <div className="flex items-center gap-2 text-[13px] text-ink-3">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total users"  value={stats.total_users}  />
                <StatCard label="Total plans"  value={stats.total_plans}  />
                <StatCard label="Total guests" value={stats.total_guests} />
                <StatCard label="Total tables" value={stats.total_tables} />
              </div>
            ) : null}
          </section>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h1 className="font-display text-[28px]">Users</h1>
              <button
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="inline-flex items-center gap-1.5 rounded-full border hairline px-3 py-1.5 text-[12px] text-ink-3 hover:text-ink disabled:opacity-50"
              >
                <RefreshCw size={11} className={loadingUsers ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {loadingUsers && users.length === 0 ? (
              <div className="flex items-center gap-2 text-[13px] text-ink-3">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border hairline">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b hairline bg-paper-2/40">
                      <th className="label-mono px-4 py-3 text-left">Email</th>
                      <th className="label-mono px-4 py-3 text-left">Signed up</th>
                      <th className="label-mono px-4 py-3 text-left">Last seen</th>
                      <th className="label-mono px-4 py-3 text-right">Plans</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr
                        key={u.id}
                        className={`border-b hairline last:border-0 ${i % 2 === 0 ? "" : "bg-paper-2/20"}`}
                      >
                        <td className="px-4 py-3 font-medium text-ink">
                          {u.email}
                          {u.email === ADMIN_EMAIL && (
                            <span className="ml-2 rounded-full bg-terracotta/10 px-1.5 py-0.5 text-[10px] font-medium text-terracotta">
                              you
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-3">{fmt(u.created_at)}</td>
                        <td className="px-4 py-3 text-ink-3">{fmtRelative(u.last_sign_in_at)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-2">{u.plan_count}</td>
                        <td className="px-4 py-3">
                          {u.email !== ADMIN_EMAIL && (
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={`https://supabase.com/dashboard/project/bqacaxesfvbcxbmqdemz/auth/users?search=${encodeURIComponent(u.email)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View in Supabase dashboard"
                                className="rounded p-1 text-ink-3 hover:bg-paper-2 hover:text-ink"
                              >
                                <ExternalLink size={13} />
                              </a>
                              <button
                                onClick={() => deleteUser(u.id, u.email)}
                                disabled={busyUser === u.id}
                                title="Delete user"
                                className="rounded p-1 text-ink-3 hover:bg-rose/10 hover:text-rose disabled:opacity-40"
                              >
                                {busyUser === u.id
                                  ? <Loader2 size={13} className="animate-spin" />
                                  : <Trash2 size={13} />}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && !loadingUsers && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-ink-3">No users yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── PLANS ── */}
        {tab === "plans" && (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h1 className="font-display text-[28px]">Plans</h1>
              <button
                onClick={fetchPlans}
                disabled={loadingPlans}
                className="inline-flex items-center gap-1.5 rounded-full border hairline px-3 py-1.5 text-[12px] text-ink-3 hover:text-ink disabled:opacity-50"
              >
                <RefreshCw size={11} className={loadingPlans ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {loadingPlans && plans.length === 0 ? (
              <div className="flex items-center gap-2 text-[13px] text-ink-3">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border hairline">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b hairline bg-paper-2/40">
                      <th className="label-mono px-4 py-3 text-left">Name</th>
                      <th className="label-mono px-4 py-3 text-left">Code</th>
                      <th className="label-mono px-4 py-3 text-left">Owner</th>
                      <th className="label-mono px-4 py-3 text-left">Date</th>
                      <th className="label-mono px-4 py-3 text-right">Guests</th>
                      <th className="label-mono px-4 py-3 text-right">Tables</th>
                      <th className="label-mono px-4 py-3 text-left">Created</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p, i) => (
                      <tr
                        key={p.id}
                        className={`border-b hairline last:border-0 ${i % 2 === 0 ? "" : "bg-paper-2/20"}`}
                      >
                        <td className="max-w-[180px] truncate px-4 py-3 font-medium text-ink">
                          {p.name || <span className="text-ink-4 italic">Untitled</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-ink-3">{p.code}</td>
                        <td className="max-w-[160px] truncate px-4 py-3 text-ink-3">
                          {p.owner_email ?? <span className="italic">anonymous</span>}
                        </td>
                        <td className="px-4 py-3 text-ink-3">{fmt(p.event_date)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-2">{p.guest_count}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-2">{p.table_count}</td>
                        <td className="px-4 py-3 text-ink-3">{fmtRelative(p.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/plan/${p.code}`}
                              target="_blank"
                              title="Open plan"
                              className="rounded p-1 text-ink-3 hover:bg-paper-2 hover:text-ink"
                            >
                              <ExternalLink size={13} />
                            </Link>
                            <button
                              onClick={() => deletePlan(p.id, p.name)}
                              disabled={busyPlan === p.id}
                              title="Delete plan"
                              className="rounded p-1 text-ink-3 hover:bg-rose/10 hover:text-rose disabled:opacity-40"
                            >
                              {busyPlan === p.id
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Trash2 size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {plans.length === 0 && !loadingPlans && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-ink-3">No plans yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
}
