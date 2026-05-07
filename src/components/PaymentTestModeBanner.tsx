import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;
  return (
    <div className="w-full border-b border-hairline bg-butter/40 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2">
      Test mode · payments in the preview don't charge real money.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank" rel="noopener noreferrer"
        className="underline"
      >
        Learn more
      </a>
    </div>
  );
}