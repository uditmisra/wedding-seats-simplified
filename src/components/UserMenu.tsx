import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon } from "lucide-react";

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
      <Button asChild variant="ghost" size="sm" className="h-9">
        <Link to={`/auth?next=${next}`}>Sign in</Link>
      </Button>
    );
  }
  const label = user.email ?? "Account";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Account" className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center hover:bg-primary/15 transition">
          {initials(label)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs text-soft font-normal">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator/>
        <DropdownMenuItem onSelect={() => signOut()}>
          <LogOut size={14} className="mr-2"/>Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
