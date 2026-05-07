import { LegalPage } from "./LegalPage";

export default function Refunds() {
  return (
    <LegalPage kicker="Refund policy" title={<>30-day money-<em className="font-display-italic">back.</em></>}>
      <p>
        Wedding Seater offers a <strong>30-day money-back guarantee</strong> on the £10
        lifetime unlock. If the product isn't right for you, request a full refund within
        30 days of your purchase and we'll process it — no questions asked.
      </p>
      <h2>How to request a refund</h2>
      <p>
        Refunds are handled by our payment provider, Paddle, who is the Merchant of Record
        for every Wedding Seater purchase. To request a refund:
      </p>
      <ul>
        <li>Visit <a href="https://paddle.net" target="_blank" rel="noreferrer">paddle.net</a> and look up your order with the email you used at checkout, or</li>
        <li>Email <a href="mailto:hello@weddingseater.app">hello@weddingseater.app</a> with your order reference and we'll forward the request to Paddle for you.</li>
      </ul>
      <p>
        Refunds are processed back to the original payment method. Most card refunds appear
        within 5–10 business days; bank transfer refunds can take a little longer.
      </p>
      <h2>After 30 days</h2>
      <p>
        Refund requests after the 30-day window are reviewed on a case-by-case basis.
        Reach out and we'll see what we can do.
      </p>
    </LegalPage>
  );
}