import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <header className="container h-16 flex items-center">
        <Link to="/" className="text-soft hover:text-foreground inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft size={14}/> Back home
        </Link>
      </header>
      <main className="flex-1 flex items-start justify-center pt-8 pb-20 px-4">
        <div className="w-full max-w-md rounded-2xl bg-card border-hairline border shadow-elegant p-7">
          <h1 className="font-display text-2xl">Set a new password</h1>
          {ready ? (
            <form onSubmit={submit} className="space-y-3 mt-5">
              <div className="space-y-1.5">
                <Label htmlFor="np" className="text-xs text-soft font-normal">New password</Label>
                <Input id="np" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required className="h-11 border-hairline"/>
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy}>Update password</Button>
            </form>
          ) : (
            <p className="text-sm text-soft mt-3">Open this page from the link in your password reset email.</p>
          )}
        </div>
      </main>
    </div>
  );
}
