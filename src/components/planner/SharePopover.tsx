import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link as LinkIcon, Check, Mail, Bookmark, Send, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  planName: string;
  planUrl: string;
  inviterName?: string;
}

export function SharePopover({ planName, planUrl, inviterName }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "invite">("menu");
  const [copied, setCopied] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const reset = () => {
    setView("menu");
    setRecipientName("");
    setRecipientEmail("");
    setMessage("");
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(planUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sendInvite = async () => {
    const email = recipientEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("That email doesn't look right.");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "share-invite",
          recipientEmail: email,
          idempotencyKey: `share-invite-${planUrl}-${email}-${Date.now()}`,
          templateData: {
            recipientName: recipientName.trim() || undefined,
            inviterName: inviterName || undefined,
            planName,
            planUrl,
            message: message.trim() || undefined,
          },
        },
      });
      if (error) throw error;
      toast.success("Invitation sent.");
      reset();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send the invitation.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <PopoverTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rounded-full border hairline px-3 py-1.5 text-[12px] text-ink-2 hover:bg-paper-2 inline-flex"
              aria-label="Share plan"
            >
              Share link <span className="ml-1 font-display-italic text-terracotta">↗</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Share this plan</TooltipContent>
        </Tooltip>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] rounded-xl border-hairline bg-paper p-5 shadow-elegant"
      >
        {view === "menu" ? (
          <div className="space-y-4">
            <div>
              <div className="label-mono mb-1 text-terracotta">Share</div>
              <div className="font-display text-[20px] leading-tight">
                Pass it <span className="font-display-italic">along.</span>
              </div>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start font-normal"
                onClick={copyLink}
              >
                {copied ? (
                  <Check size={14} className="mr-2 text-olive" />
                ) : (
                  <LinkIcon size={14} className="mr-2" />
                )}
                {copied ? "Link copied" : "Copy link"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start font-normal"
                onClick={() => setView("invite")}
              >
                <Mail size={14} className="mr-2" />
                Invite by email
              </Button>
            </div>
            <div className="flex items-center gap-1.5 border-t hairline pt-3 text-xs text-ink-3">
              <Bookmark size={11} /> Press ⌘+D to bookmark
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setView("menu")}
              className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink-2"
            >
              <ArrowLeft size={12} /> Back
            </button>
            <div>
              <div className="label-mono mb-1 text-terracotta">Invite by email</div>
              <div className="font-display text-[20px] leading-tight">
                A note <span className="font-display-italic">in their inbox.</span>
              </div>
            </div>
            <div className="space-y-3">
              <Field label="Their name (optional)">
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Mom"
                  className="h-9 border-0 border-b border-ink rounded-none bg-transparent px-0 font-display text-[16px] placeholder:italic placeholder:text-ink-4 focus-visible:ring-0"
                />
              </Field>
              <Field label="Their email">
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="h-9 border-0 border-b border-ink rounded-none bg-transparent px-0 font-display text-[16px] placeholder:italic placeholder:text-ink-4 focus-visible:ring-0"
                />
              </Field>
              <Field label="A short message (optional)">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Have a peek — let me know if I've got Aunt Linda in the wrong corner."
                  rows={3}
                  className="resize-none border-0 border-b border-ink rounded-none bg-transparent px-0 text-[14px] placeholder:italic placeholder:text-ink-4 focus-visible:ring-0"
                />
              </Field>
            </div>
            <Button
              onClick={sendInvite}
              disabled={sending}
              className="w-full rounded-full"
              size="sm"
            >
              <Send size={13} className="mr-1.5" />
              {sending ? "Sending…" : "Send invitation →"}
            </Button>
            <p className="m-0 text-[11px] text-ink-3">
              Anyone with the link can view this plan.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}