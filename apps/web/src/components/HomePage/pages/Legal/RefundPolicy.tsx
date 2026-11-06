import { DocLink, LegalPage, type LegalSection, Mail, P, UL } from "./LegalPage";

const SECTIONS: readonly LegalSection[] = [
  {
    id: "free-plan",
    title: "Free plan",
    body: <P>The Free plan costs nothing and needs no card, so there is nothing to refund.</P>,
  },
  {
    id: "cancelling",
    title: "Cancelling a paid plan",
    body: (
      <UL>
        <li>Cancel at any time from Settings → Billing in your RateUp account.</li>
        <li>
          You keep every paid feature until the end of the period you have already paid for, and you
          will not be charged again.
        </li>
        <li>At the end of that period, your account moves to the Free plan. Your data stays.</li>
        <li>
          To close your account and delete your data entirely, email <Mail />.
        </li>
      </UL>
    ),
  },
  {
    id: "refunds",
    title: "Refunds",
    body: (
      <>
        <P>
          Monthly and annual subscription fees are paid in advance and are non-refundable. We do not
          give refunds or credits for unused time, unused limits, or for cancelling partway through
          a period.
        </P>
        <P>We will refund you when:</P>
        <UL>
          <li>you were charged twice, or charged the wrong amount, because of a billing error;</li>
          <li>you were charged after cancelling, for a period you had already cancelled; or</li>
          <li>the law where you are based requires a refund.</li>
        </UL>
        <P>
          Email <Mail /> within 30 days of the charge with your account email and the invoice
          number. Approved refunds go back to the original payment method, usually within 5–10
          business days, depending on your bank.
        </P>
      </>
    ),
  },
  {
    id: "plan-changes",
    title: "Upgrades, downgrades and billing period",
    body: (
      <UL>
        <li>
          <b>Upgrade:</b> starts immediately where your payment method allows it, and otherwise at
          your next renewal. Your account shows which applies before you confirm.
        </li>
        <li>
          <b>Downgrade, or annual to monthly:</b> takes effect at your next renewal.
        </li>
        <li>
          We don&apos;t charge or refund a pro-rated difference for the current period. The new
          price applies from your next bill.
        </li>
      </UL>
    ),
  },
  {
    id: "add-ons",
    title: "Credit packs and add-ons",
    body: (
      <P>
        Campaign credit packs and other add-ons are non-refundable once bought. Each is valid until
        the expiry date shown when you buy it, and unused credits are not refunded when it expires
        or when you cancel.
      </P>
    ),
  },
  {
    id: "meta-charges",
    title: "WhatsApp and Meta charges",
    body: (
      <P>
        Meta bills message fees for WhatsApp, and charges for the Meta Business AI agent, to your
        own Meta business account. RateUp does not collect these, so refunds for them must be
        requested from Meta.
      </P>
    ),
  },
  {
    id: "shop-orders",
    title: "Orders placed in your shop",
    body: (
      <P>
        If you sell through RateUp's shop and checkout, your buyers pay you through your own payment
        provider. Refunds to your buyers are made by you, under your own returns policy. If you
        bought something from a business that uses RateUp, please contact that business.
      </P>
    ),
  },
  {
    id: "terms",
    title: "Relationship to our Terms",
    body: (
      <P>
        This policy forms part of our <DocLink to="/terms-of-service">Terms of Service</DocLink>. If
        you have a signed order form with different payment terms, the order form applies.
      </P>
    ),
  },
];

export default function RefundPolicy() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      updated="21 October 2026"
      summary={
        <>
          <b className="text-ru-n-700">In short:</b> cancel any time from Settings → Billing. You
          keep paid features until your period ends and are never charged again. Paid fees aren't
          refunded, except for billing errors or where the law requires it.
        </>
      }
      sections={SECTIONS}
    />
  );
}
