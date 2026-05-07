import { LegalPage } from "./LegalPage";

export default function Privacy() {
  return (
    <LegalPage kicker="Privacy notice" title={<>How we handle your <em className="font-display-italic">data.</em></>}>
      <p>
        Wedding Seater is operated by <strong>Udit Misra</strong> ("we", "us"), trading as
        Wedding Seater. We are the data controller for personal data collected through
        weddingseater.app.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — your email address and authentication identifiers.</li>
        <li><strong>Plan content</strong> — the names, parties, dietary notes, and seating arrangements you enter.</li>
        <li><strong>Usage data</strong> — anonymised page views and product analytics, plus device/browser information for security and debugging.</li>
        <li><strong>Support correspondence</strong> — anything you email us.</li>
      </ul>
      <h2>Why we collect it</h2>
      <ul>
        <li>To create your account and let you sign in (legal basis: contract).</li>
        <li>To save and sync your seating plans (contract).</li>
        <li>To improve the product and detect abuse (legitimate interests).</li>
        <li>To respond to support requests (contract / legitimate interests).</li>
      </ul>
      <h2>Who we share it with</h2>
      <ul>
        <li><strong>Paddle.com Market Limited</strong> — our Merchant of Record, who processes payments, calculates and remits sales tax/VAT, issues invoices, and handles refunds and chargebacks.</li>
        <li><strong>Hosting and infrastructure providers</strong> (Supabase, Lovable) — to store your data and run the application.</li>
        <li><strong>Email delivery providers</strong> — to send you transactional emails (sign-in links, receipts).</li>
        <li><strong>Authorities</strong> — when required by law.</li>
      </ul>
      <h2>How long we keep it</h2>
      <p>
        We keep account and plan data for as long as your account is active. If you delete
        your account, we delete your plans within 30 days. Payment records are retained by
        Paddle for the period required by tax law.
      </p>
      <h2>International transfers</h2>
      <p>
        Some of our providers are based outside the UK/EEA. Where data is transferred, we
        rely on Standard Contractual Clauses or the provider's adequacy decision.
      </p>
      <h2>Your rights</h2>
      <p>
        You can request access to, correction or deletion of your data, restriction or
        objection to processing, or data portability. You can also withdraw consent and
        complain to your local supervisory authority. Email{" "}
        <a href="mailto:hello@weddingseater.app">hello@weddingseater.app</a> and we'll
        respond within one month.
      </p>
      <h2>Security</h2>
      <p>
        Data is encrypted in transit and at rest. Access to production systems is
        restricted and audited.
      </p>
      <h2>Cookies</h2>
      <p>
        We use essential cookies for sign-in and session management, and privacy-friendly
        product analytics. We do not run advertising or third-party tracking cookies.
      </p>
    </LegalPage>
  );
}