import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

function initials(s: string) {
  return s.split(/[@\s.]+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function UserMenu() {
  const { user, signOut, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return (
      <Link
        to={`/auth?next=${next}`}
        className="inline-flex h-9 items-center rounded-full border-hairline border px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2 hover:bg-paper-2"
      >
        Sign in
      </Link>
    );
  }
  const label = user.email ?? "Account";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account"
          className="flex size-9 items-center justify-center rounded-full bg-olive font-mono text-[11px] font-medium text-paper transition hover:bg-olive-2"
        >
          {initials(label)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border-hairline">
        <DropdownMenuLabel className="truncate text-[12px] font-normal text-ink-3">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut()}>
          <LogOut size={14} className="mr-2" />Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
