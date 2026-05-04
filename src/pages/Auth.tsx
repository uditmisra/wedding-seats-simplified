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
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

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
    <div className="paper-grain min-h-screen">
      <header className="container flex items-center justify-between py-7">
        <Link to="/" className="flex items-baseline gap-1.5">
          <span className="font-display text-[22px] tracking-tight">Seatly</span>
          <span className="inline-block size-[5px] -translate-y-0.5 rounded-full bg-terracotta" aria-hidden />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
        >
          <ArrowLeft size={13} />
          Back home
        </Link>
      </header>

      <main className="container">
        <div className="grid items-start gap-12 pt-6 md:grid-cols-12 md:gap-16 md:pt-16">
          {/* Left — editorial framing */}
          <div className="md:col-span-6">
            <div className="label-mono mb-7">Welcome back</div>
            <h1 className="m-0 font-display text-[44px] leading-[1.05] tracking-[-0.02em] sm:text-[56px]">
              Save your plans to <span className="font-display-italic">your</span> corner.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink-2 md:text-[17px]">
              Sign in to keep every plan in one place, sync between devices, and name the people helping
              you arrange the room.
            </p>
            <ul className="mt-8 space-y-3 text-[14px] text-ink-2">
              <Bullet>Every plan you&apos;ve started, in one quiet dashboard.</Bullet>
              <Bullet>Edits sync between your laptop and phone.</Bullet>
              <Bullet>Named collaborators instead of anonymous edits.</Bullet>
            </ul>
          </div>

          {/* Right — sign-in card */}
          <div className="md:col-span-6">
            <div className="mx-auto max-w-md rounded-2xl border hairline bg-card/80 p-7 shadow-elegant">
              {sentTo ? (
                <LinkSent email={sentTo} onChangeEmail={() => setSentTo(null)} />
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="m-0 font-display text-[22px] leading-tight">Sign in</h2>
                    <p className="mt-1 text-[13px] text-ink-3">
                      Use Google, or pick an email and password.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={signInWithGoogle}
                    disabled={busy}
                    className="h-11 w-full rounded-full border-hairline bg-paper text-[14px] hover:bg-paper-2"
                  >
                    {busy ? <Loader2 size={14} className="mr-2 animate-spin" /> : <GoogleGlyph />}
                    Continue with Google
                  </Button>

                  <div className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-hairline" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">or</span>
                    <span className="h-px flex-1 bg-hairline" />
                  </div>

                  <Tabs value={tab} onValueChange={v => setTab(v as "signin" | "signup")}>
                    <TabsList className="grid w-full grid-cols-2 rounded-full border-hairline bg-paper-2 p-0.5">
                      <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-paper data-[state=active]:shadow-soft">
                        Sign in
                      </TabsTrigger>
                      <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-paper data-[state=active]:shadow-soft">
                        Create account
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="signin">
                      <form onSubmit={signIn} className="mt-4 space-y-3">
                        <Field id="email-in" type="email" label="Email" value={email} onChange={setEmail} autoFocus />
                        <Field id="pw-in" type="password" label="Password" value={password} onChange={setPassword} />
                        <Button type="submit" className="h-11 w-full rounded-full" disabled={busy}>
                          Sign in
                          <span className="ml-1 font-display-italic">→</span>
                        </Button>
                        <button
                          type="button"
                          onClick={sendReset}
                          className="mx-auto block text-xs text-ink-3 hover:text-ink"
                        >
                          Forgot your password?
                        </button>
                      </form>
                    </TabsContent>
                    <TabsContent value="signup">
                      <form onSubmit={signUp} className="mt-4 space-y-3">
                        <Field id="email-up" type="email" label="Email" value={email} onChange={setEmail} autoFocus />
                        <Field
                          id="pw-up"
                          type="password"
                          label="Password"
                          value={password}
                          onChange={setPassword}
                          minLength={8}
                          hint="At least 8 characters"
                        />
                        <Button type="submit" className="h-11 w-full rounded-full" disabled={busy}>
                          Create account
                          <span className="ml-1 font-display-italic">→</span>
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-terracotta" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function LinkSent({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 inline-flex size-16 items-center justify-center rounded-full bg-paper-2">
        <Mail size={22} className="text-terracotta" />
      </div>
      <h2 className="m-0 font-display text-[22px] leading-tight">
        Check your <span className="font-display-italic">inbox.</span>
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-[14px] text-ink-2">
        We sent a confirmation link to{" "}
        <span className="font-medium">{email}</span>. Click it to finish.
      </p>
      <button
        onClick={onChangeEmail}
        className="mt-5 text-[12px] text-ink-3 underline-offset-4 hover:text-ink hover:underline"
      >
        Use a different email
      </button>
    </div>
  );
}

const Field = forwardRef<
  HTMLInputElement,
  { id: string; type: string; label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean; minLength?: number; hint?: string }
>(({ id, type, label, value, onChange, autoFocus, minLength, hint }, ref) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="label-mono">{label}</Label>
    <Input
      ref={ref}
      id={id}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      required
      autoFocus={autoFocus}
      minLength={minLength}
      className="h-11 rounded-full border-hairline bg-transparent px-4"
    />
    {hint && <div className="font-mono text-[11px] text-ink-3">{hint}</div>}
  </div>
));
Field.displayName = "Field";

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" className="mr-2 shrink-0" aria-hidden>
      <path fill="#EA4335" d="M9 3.48c1.69 0 2.85.73 3.5 1.34l2.55-2.49C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z" />
      <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.13-.84 2.09-1.78 2.73l2.84 2.2c1.66-1.53 2.62-3.79 2.62-6.58z" />
      <path fill="#FBBC05" d="M3.88 10.78c-.21-.63-.33-1.31-.33-2s.12-1.37.33-2L.96 4.52A8.99 8.99 0 0 0 0 8.78c0 1.45.35 2.83.96 4.04l2.92-2.04z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.79.53-1.81.85-3.12.85-2.38 0-4.4-1.57-5.13-3.74L.96 12.82C2.44 15.98 5.48 18 9 18z" />
    </svg>
  );
}
