import { forwardRef, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const { user, loading } = useAuth();

  useEffect(() => { if (!loading && user) navigate(next, { replace: true }); }, [user, loading, next, navigate]);

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}${next}`,
      });
      if (result.error) throw new Error(result.error.message ?? "Google sign-in failed");
      if (result.redirected) return;
      navigate(next, { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't sign in with Google");
      setBusy(false);
    }
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate(next, { replace: true });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}${next}` },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSentTo(email);
  };

  const sendReset = async () => {
    if (!email) { toast.error("Enter your email first"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Reset link sent — check your email");
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <header className="container h-16 flex items-center">
        <Link to="/" className="text-soft hover:text-foreground inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft size={14}/> Back home
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center pt-8 pb-20 px-4">
        <div className="w-full max-w-md rounded-2xl bg-card border-hairline border shadow-elegant p-7">
          {sentTo ? (
            <div className="text-center py-4">
              <Mail className="mx-auto text-primary mb-3" size={28}/>
              <h1 className="font-display text-2xl">Check your inbox</h1>
              <p className="text-sm text-soft mt-2">We sent a confirmation link to <span className="font-medium text-foreground">{sentTo}</span>. Click it to finish signing up.</p>
              <Button variant="ghost" className="mt-6" onClick={() => setSentTo(null)}>Use a different email</Button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl">Welcome</h1>
              <p className="text-sm text-soft mt-1">Sign in to manage your wedding plans.</p>

              <Button variant="outline" className="w-full mt-6 h-11 font-normal" onClick={signInWithGoogle} disabled={busy}>
                <GoogleMark/>Continue with Google
              </Button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border"/>
                <span className="text-xs text-soft uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-border"/>
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={signIn} className="space-y-3 mt-4">
                    <Field id="email-in" type="email" label="Email" value={email} onChange={setEmail} autoFocus/>
                    <Field id="pw-in" type="password" label="Password" value={password} onChange={setPassword}/>
                    <Button type="submit" className="w-full h-11" disabled={busy}>Sign in</Button>
                    <button type="button" onClick={sendReset} className="block mx-auto text-xs text-soft hover:text-foreground">Forgot your password?</button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={signUp} className="space-y-3 mt-4">
                    <Field id="email-up" type="email" label="Email" value={email} onChange={setEmail} autoFocus/>
                    <Field id="pw-up" type="password" label="Password" value={password} onChange={setPassword} minLength={8} hint="At least 8 characters"/>
                    <Button type="submit" className="w-full h-11" disabled={busy}>Create account</Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const Field = forwardRef<HTMLInputElement, { id: string; type: string; label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean; minLength?: number; hint?: string }>(
  ({ id, type, label, value, onChange, autoFocus, minLength, hint }, ref) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-soft font-normal">{label}</Label>
      <Input ref={ref} id={id} type={type} value={value} onChange={e => onChange(e.target.value)} required autoFocus={autoFocus} minLength={minLength} className="h-11 border-hairline"/>
      {hint && <div className="text-[11px] text-soft">{hint}</div>}
    </div>
  )
);
Field.displayName = "Field";

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" className="mr-2" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3.1 0 5.9 1.1 8 3l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.1 8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28L6.2 33A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
