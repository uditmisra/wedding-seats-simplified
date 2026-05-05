import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) { setState("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") setState("already");
        else if (data.valid) setState("valid");
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    if (error) { setError(error.message); setState("error"); return; }
    if (data?.success || data?.reason === "already_unsubscribed") setState("done");
    else setState("error");
  };

  return (
    <div className="paper-grain min-h-screen">
      <header className="container flex items-center justify-between py-7">
        <Link to="/"><Logo size={22} /></Link>
      </header>
      <main className="container">
        <div className="mx-auto max-w-md pt-10 md:pt-20">
          <div className="rounded-2xl border hairline bg-card/80 p-7 shadow-elegant">
            <div className="label-mono mb-3">Unsubscribe</div>
            {state === "loading" && (
              <p className="font-display-italic text-ink-3 inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Checking your link…</p>
            )}
            {state === "valid" && (
              <>
                <h1 className="m-0 font-display text-[26px] leading-tight">Stop <span className="font-display-italic">these</span> emails?</h1>
                <p className="mt-3 text-ink-2 text-[14px]">You'll no longer receive transactional emails from Seatly at this address.</p>
                <Button onClick={confirm} className="mt-5 h-11 w-full rounded-full">Confirm unsubscribe</Button>
              </>
            )}
            {state === "submitting" && (
              <p className="font-display-italic text-ink-3 inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Processing…</p>
            )}
            {state === "done" && (
              <>
                <h1 className="m-0 font-display text-[26px] leading-tight">You're <span className="font-display-italic">unsubscribed.</span></h1>
                <p className="mt-3 text-ink-2 text-[14px]">We won't send you any more emails at this address.</p>
              </>
            )}
            {state === "already" && (
              <>
                <h1 className="m-0 font-display text-[26px] leading-tight">Already <span className="font-display-italic">unsubscribed.</span></h1>
                <p className="mt-3 text-ink-2 text-[14px]">This address has already been removed from our list.</p>
              </>
            )}
            {state === "invalid" && (
              <>
                <h1 className="m-0 font-display text-[26px] leading-tight">Link <span className="font-display-italic">invalid.</span></h1>
                <p className="mt-3 text-ink-2 text-[14px]">This unsubscribe link is invalid or has expired.</p>
              </>
            )}
            {state === "error" && (
              <p className="text-[14px] text-destructive">Something went wrong{error ? `: ${error}` : "."}. Please try again.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}