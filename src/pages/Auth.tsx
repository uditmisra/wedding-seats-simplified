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
import { ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { analytics } from "@/lib/analytics";
import { useSeoHead } from "@/lib/useSeoHead";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const { user, loading } = useAuth();

  useSeoHead({ title: "Sign in | Wedding Seater", description: "Sign in to Wedding Seater.", noindex: true });

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
    analytics.signedIn();
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
    analytics.signedUp();
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

  if (sentTo) {
    return <LinkSentPage email={sentTo} onChangeEmail={() => setSentTo(null)} onResend={signUp} />;
  }

  return (
    <div className="paper-grain min-h-screen">
      <header className="container flex items-center justify-between py-7">
        <Link to="/"><Logo size={22} /></Link>
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
          {/* Left — editorial framing (hidden on mobile so the sign-in card is immediately visible) */}
          <div className="hidden md:block md:col-span-6">
            <div className="label-mono mb-7">Sign in</div>
            <h1 className="m-0 font-display text-[44px] leading-[1.05] tracking-[-0.02em] sm:text-[56px]">
              Pick up where you <span className="font-display-italic">left off.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink-2 md:text-[17px]">
              We save your plan so you can edit on your phone in bed at 11 pm — and again
              at the venue walkthrough on Saturday.
            </p>
            <ul className="mt-8 space-y-3 text-[14px] text-ink-2">
              <Bullet>One plan, every device.</Bullet>
              <Bullet>Invite your fiancé, your mom, your maid-of-honor.</Bullet>
              <Bullet>Close the laptop. Your work is safe.</Bullet>
            </ul>
          </div>

          {/* Right — sign-in card */}
          <div className="md:col-span-6">
            <div className="mx-auto max-w-md rounded-2xl border hairline bg-card/80 p-7 shadow-elegant">
              <div className="mb-6">
                <h2 className="m-0 font-display text-[34px] leading-tight">Sign in</h2>
                <p className="mt-2 text-[13px] text-ink-3">
                  Google, or an email and a password.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={signInWithGoogle}
                disabled={busy}
                className="h-11 w-full rounded-[10px] border-hairline bg-paper px-4 text-[14px] hover:bg-paper-2"
              >
                {busy ? <Loader2 size={14} className="mr-2 animate-spin" /> : <GoogleGlyph />}
                Continue with Google
              </Button>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-hairline" />
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3">or</span>
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Full-page link-sent state. Two-column: editorial framing on the left,
 * envelope letter illustration on the right (paper-2 background).
 */
function LinkSentPage({
  email,
  onChangeEmail,
  onResend,
}: {
  email: string;
  onChangeEmail: () => void;
  onResend: (e: React.FormEvent) => void;
}) {
  return (
    <div className="paper-grain min-h-screen">
      <header className="container flex items-center justify-between py-7">
        <Link to="/"><Logo size={22} /></Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
        >
          <ArrowLeft size={13} /> Back home
        </Link>
      </header>

      <main className="grid min-h-[calc(100vh-90px)] grid-cols-1 lg:grid-cols-2">
        {/* Left — editorial */}
        <div className="flex flex-col justify-center border-r-0 border-b border-hairline px-8 py-12 lg:border-r lg:border-b-0 lg:px-16 lg:py-20">
          <div className="label-mono mb-5 text-terracotta">Sent · Check your inbox</div>
          <h1 className="m-0 font-display text-[44px] leading-[0.98] tracking-[-0.025em] sm:text-[56px]">
            A letter is on<br />
            <span className="font-display-italic">its way.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-[1.55] text-ink-2 md:text-[16px]">
            We&apos;ve sent a sign-in link to <strong className="text-ink">{email}</strong>. Click
            it to open Wedding Seater with all your plans intact.
          </p>
          <div className="mt-7 flex items-center gap-3 text-[13px] text-ink-3">
            <span className="inline-block size-[6px] animate-[pulse_1.6s_ease-in-out_infinite] rounded-full bg-terracotta" aria-hidden />
            <span>Waiting for you to click the link…</span>
          </div>
          <p className="mt-12 max-w-md text-[12px] text-ink-3">
            Didn&apos;t get it? Check spam, or{" "}
            <button
              type="button"
              onClick={e => onResend(e as unknown as React.FormEvent)}
              className="text-ink underline underline-offset-4 hover:text-terracotta"
            >
              send another
            </button>
            . Or{" "}
            <button
              type="button"
              onClick={onChangeEmail}
              className="text-ink underline underline-offset-4 hover:text-terracotta"
            >
              use a different email
            </button>
            .
          </p>
        </div>

        {/* Right — envelope letter illustration */}
        <div
          className="relative flex items-center justify-center px-8 py-16 lg:px-16"
          style={{ background: "hsl(var(--paper-2))" }}
        >
          <div
            className="relative"
            style={{
              width: 360,
              maxWidth: "100%",
              height: 240,
              transform: "rotate(-3deg)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "hsl(var(--paper))",
                border: "1px solid hsl(var(--ink-2))",
                boxShadow: "0 16px 30px -12px rgba(0,0,0,0.18)",
                padding: 28,
              }}
            >
              <div
                className="label-mono"
                style={{ marginBottom: 8, fontSize: 8 }}
              >
                FROM SEATLY · TO YOU
              </div>
              <div className="font-display text-[22px] leading-[1.15]">
                Your sign-in <span className="font-display-italic">link</span>
              </div>
              <div className="mt-3.5 font-display text-[11px] leading-[1.6] text-ink-3">
                One click and you&apos;re in. Valid for the next 15 minutes.
              </div>
              <div
                className="mt-4 inline-block rounded-md px-3.5 py-2.5 text-[12px] font-medium"
                style={{
                  background: "hsl(var(--terracotta))",
                  color: "hsl(var(--paper))",
                }}
              >
                Take me to Wedding Seater →
              </div>
              <div
                className="absolute font-mono"
                style={{
                  bottom: 18,
                  left: 28,
                  fontSize: 9,
                  color: "hsl(var(--ink-3))",
                }}
              >
                weddingseater.app/auth/v/4f3a-…
              </div>
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
      className="h-11 rounded-[10px] border-hairline bg-paper px-4 placeholder:italic"
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
