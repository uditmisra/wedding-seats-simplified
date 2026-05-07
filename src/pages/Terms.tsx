import { LegalPage } from "./LegalPage";

export default function Terms() {
  return (
    <LegalPage kicker="Terms & conditions" title={<>The fine <em className="font-display-italic">print.</em></>}>
      <p>
        These terms govern your use of Wedding Seater, operated by{" "}
        <strong>Udit Misra</strong> trading as Wedding Seater ("we", "us"). By using
        weddingseater.app you agree to these terms.
      </p>
      <h2>The service</h2>
      <p>
        Wedding Seater is a web-based seating chart planner. We grant you a limited,
        non-exclusive, non-transferable right to use it for planning your event. The
        software, branding, and content are our intellectual property.
      </p>
      <h2>Your account</h2>
      <p>
        You're responsible for keeping your sign-in credentials confidential and for any
        activity under your account. You must provide accurate information and keep it up
        to date.
      </p>
      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the service unlawfully, including for fraud or spam,</li>
        <li>infringe anyone's intellectual property,</li>
        <li>interfere with the security of the service (probing, scanning, malware, scraping at scale), or</li>
        <li>resell, redistribute, or reverse-engineer the service.</li>
      </ul>
      <h2>Payments</h2>
      <p>
        Wedding Seater is free to try. The £10 lifetime unlock is a one-time purchase that
        unlocks PDF exports and unlimited plans on your account.
      </p>
      <p>
        Our order process is conducted by our online reseller{" "}
        <strong>Paddle.com</strong>. Paddle.com is the Merchant of Record for all our
        orders. Paddle provides all customer service inquiries and handles returns. The
        terms of sale, payment, and refund mechanics are set out in Paddle's{" "}
        <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noreferrer">
          Buyer Terms
        </a>
        . See our <a href="/refunds">refund policy</a> for our 30-day money-back guarantee.
      </p>
      <h2>Service level</h2>
      <p>
        We work hard to keep Wedding Seater running smoothly, but we do not guarantee
        uninterrupted or error-free operation. To the fullest extent permitted by law, we
        disclaim all implied warranties of merchantability or fitness for a particular
        purpose. Nothing in these terms limits liability for fraud, death, or personal
        injury where excluded by law.
      </p>
      <h2>Suspension and termination</h2>
      <p>
        We may suspend or terminate your access for material breach, non-payment, security
        or fraud risk, or repeated policy violations. You can stop using the service at any
        time. On termination we'll let you export your data for 30 days before deletion.
      </p>
      <h2>User content</h2>
      <p>
        You retain ownership of the guest data and plans you upload. You grant us a
        limited licence to host and process that content solely to provide the service.
      </p>
      <h2>Liability</h2>
      <p>
        To the maximum extent permitted by law, our aggregate liability is capped at the
        fees you paid to us in the 12 months preceding the claim. We are not liable for
        indirect, consequential, or special damages including lost profits or goodwill.
      </p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of England and Wales.</p>
      <h2>Contact</h2>
      <p>
        Questions? Email <a href="mailto:hello@weddingseater.app">hello@weddingseater.app</a>.
      </p>
    </LegalPage>
  );
}