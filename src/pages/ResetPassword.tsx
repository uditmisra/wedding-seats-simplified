import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(event => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate("/", { replace: true });
  };

  return (
    <div className="paper-grain min-h-screen">
      <header className="container flex items-center justify-between py-7">
        <Link to="/"><Logo size={22} /></Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
          <ArrowLeft size={13} /> Back home
        </Link>
      </header>

      <main className="container">
        <div className="mx-auto max-w-md pt-10 md:pt-20">
          <div className="rounded-2xl border hairline bg-card/80 p-7 shadow-elegant">
            <div className="label-mono mb-3">Reset</div>
            <h1 className="m-0 font-display text-[26px] leading-tight">
              Set a <span className="font-display-italic">new</span> password.
            </h1>
            {ready ? (
              <form onSubmit={submit} className="mt-6 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="np" className="label-mono">New password</Label>
                  <Input
                    id="np"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={8}
                    required
                    className="h-11 rounded-full border-hairline bg-transparent px-4"
                  />
                  <div className="font-mono text-[11px] text-ink-3">At least 8 characters</div>
                </div>
                <Button type="submit" className="h-11 w-full rounded-full" disabled={busy}>
                  {busy && <Loader2 size={14} className="mr-1.5 animate-spin" />}
                  Update password
                  <span className="ml-1 font-display-italic">→</span>
                </Button>
              </form>
            ) : (
              <p className="mt-4 font-display-italic text-[14px] text-ink-3">
                Open this page from the link in your password reset email.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
