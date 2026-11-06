import { LEGAL_ENTITY, LEGAL_JURISDICTION } from "../Legal/company";
import { DocLink, H3, LegalPage, type LegalSection, Mail, P, UL } from "../Legal/LegalPage";

const SECTIONS: readonly LegalSection[] = [
  {
    id: "agreement",
    title: "About these Terms",
    body: (
      <>
        <P>
          RateUp is operated by {LEGAL_ENTITY} ("RateUp", "we", "us"). These Terms of Service (the
          "Terms") govern your use of the RateUp website at www.rateup.app, the RateUp web and
          mobile apps, our API and any related services (together, the "Service").
        </P>
        <P>
          The Service is built for businesses. By creating an account, or by using the Service, you
          agree to these Terms on behalf of the business you represent (the "Customer", "you"), and
          you confirm that you have authority to do so and are at least 18 years old. If you do not
          agree, do not use the Service.
        </P>
        <P>
          These Terms include, by reference, our{" "}
          <DocLink to="/privacy-policy">Privacy Policy</DocLink>,{" "}
          <DocLink to="/acceptable-use">Acceptable Use Policy</DocLink>,{" "}
          <DocLink to="/refund-policy">Refund &amp; Cancellation Policy</DocLink> and{" "}
          <DocLink to="/dpa">Data Processing Agreement</DocLink>. If you have signed an order form
          with us, the order form takes precedence where it differs.
        </P>
      </>
    ),
  },
  {
    id: "definitions",
    title: "Definitions",
    body: (
      <UL>
        <li>
          <b>Users</b> are the people you allow to use your account, such as your team members.
        </li>
        <li>
          <b>End Customers</b> are the people your business talks to through the Service, such as
          your customers, leads, loyalty members and survey respondents.
        </li>
        <li>
          <b>Customer Data</b> is everything you or your End Customers put into the Service:
          contacts, messages, media, survey responses, loyalty activity, orders and similar data.
        </li>
        <li>
          <b>Third-Party Platforms</b> are services that you connect to RateUp and that we do not
          control, such as WhatsApp, Instagram and Messenger (operated by Meta), Shopify,
          WooCommerce, Google, Stripe and Razorpay.
        </li>
      </UL>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <UL>
        <li>Give us accurate registration and billing details, and keep them up to date.</li>
        <li>
          Each User needs their own login. Do not share logins, and do not let people use the
          Service in a way meant to avoid paying for seats or usage.
        </li>
        <li>
          You are responsible for everything done through your account and for keeping passwords and
          API keys secure. Tell us promptly at <Mail /> if you suspect unauthorised access.
        </li>
        <li>
          You may not use the Service if you are barred from receiving it under the laws of India,
          the country you are based in, or any other applicable sanctions law.
        </li>
      </UL>
    ),
  },
  {
    id: "plans-and-usage",
    title: "Plans, limits and usage",
    body: (
      <>
        <P>
          The Service is offered on a Free plan and on paid plans. What each plan includes, and its
          limits, are shown on our <DocLink to="/pricing">Pricing page</DocLink> and in your
          account's billing settings. Limits may include monthly active contacts, campaign credits,
          Users, shop orders and other usage.
        </P>
        <UL>
          <li>
            Usage is measured by RateUp's systems, and those measurements decide what counts against
            your limits, unless we agree otherwise in writing.
          </li>
          <li>
            When you reach a limit, some features may pause until the next billing period, until you
            upgrade, or until you buy an add-on such as a campaign credit pack.
          </li>
          <li>
            Credit packs and other add-ons are valid until the expiry date shown when you buy them.
          </li>
          <li>
            We may change what the Free plan includes. If we reduce a paid plan's features during a
            period you have already paid for, we will tell you first.
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "fees",
    title: "Fees, billing and taxes",
    body: (
      <UL>
        <li>
          Paid plans are billed in advance, either annually or monthly, and renew automatically for
          the same period until cancelled.
        </li>
        <li>
          Upgrades start immediately where your payment method allows it, and otherwise at your next
          renewal. Downgrades and switches from annual to monthly take effect at your next renewal.
          We don't charge or refund a pro-rated difference for the current period; the new price
          applies from your next bill.
        </li>
        <li>
          You authorise us, and our payment providers, to charge the payment method you choose at
          checkout. Payments are processed by Stripe or Razorpay; we do not store full card numbers.
        </li>
        <li>
          Fees do not include taxes. You are responsible for any taxes, duties or levies that apply
          to your purchase, other than taxes on our income.
        </li>
        <li>
          If a payment fails, we will let you know. If it is still unpaid 14 days later, we may move
          your account to the Free plan or suspend paid features until it is paid.
        </li>
        <li>
          We may change our prices. We will tell you at least 30 days in advance, and a new price
          applies from your next renewal after that notice.
        </li>
        <li>
          Message fees charged by Meta for WhatsApp, and charges for the Meta Business AI agent, are
          billed to your own Meta business account by Meta directly. They are not part of your
          RateUp fees.
        </li>
      </UL>
    ),
  },
  {
    id: "cancellation-and-refund",
    title: "Cancellation and refunds",
    body: (
      <>
        <P>
          You can cancel a paid plan at any time from Settings → Billing in your account. You keep
          every paid feature until the end of the period you have paid for, and you will not be
          charged again. Your account then moves to the Free plan.
        </P>
        <P>
          Fees already paid are non-refundable, including for unused time, except where we made a
          billing error or where the law requires a refund. The full policy is in our{" "}
          <DocLink to="/refund-policy">Refund &amp; Cancellation Policy</DocLink>.
        </P>
      </>
    ),
  },
  {
    id: "third-party-platforms",
    title: "WhatsApp, Meta and other platforms",
    body: (
      <>
        <P>
          Much of the Service works through Third-Party Platforms. Your use of them is governed by
          their own terms, which you are responsible for accepting and following, including the
          WhatsApp Business Terms of Service, the WhatsApp Business Messaging Policy, Meta's
          Commerce Policies and Meta's Platform Terms.
        </P>
        <UL>
          <li>
            Meta decides whether to approve your business account, phone numbers and message
            templates, sets messaging limits and quality ratings, and may restrict or ban a number
            or account. RateUp does not control these decisions and is not responsible for them.
          </li>
          <li>
            If a Third-Party Platform changes or withdraws a feature or its API, the matching RateUp
            feature may change or stop working. We will try to tell you in advance where we can.
          </li>
          <li>
            When you connect a Third-Party Platform, you authorise us to exchange data with it on
            your behalf so that the integration works.
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "messaging-and-consent",
    title: "Messaging and consent",
    body: (
      <>
        <P>You are responsible for the messages you send through the Service. In particular:</P>
        <UL>
          <li>
            Only send marketing or broadcast messages to people who have opted in to receive them
            from your business, and keep a record of that consent.
          </li>
          <li>Honour opt-out requests promptly, on every channel.</li>
          <li>
            Follow the marketing, anti-spam, consumer protection and privacy laws that apply to you
            and to your End Customers.
          </li>
          <li>
            Follow our <DocLink to="/acceptable-use">Acceptable Use Policy</DocLink>.
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "shop-and-payments",
    title: "Shop, checkout and payments",
    body: (
      <>
        <P>
          If you sell through RateUp's shop and checkout features, you are the seller and RateUp is
          not. In particular:
        </P>
        <UL>
          <li>
            Payments from your buyers are taken by your own Stripe, Razorpay or other payment
            account, under your agreement with that provider. RateUp does not receive, hold or
            transfer your buyers' money.
          </li>
          <li>
            You are responsible for your products, prices, descriptions, taxes, delivery, returns,
            refunds and customer service, and for meeting consumer law where you sell.
          </li>
          <li>
            You must not sell products or services that Meta's Commerce Policies, your payment
            provider or the law prohibit.
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "loyalty-surveys-ai",
    title: "Loyalty, reviews and AI features",
    body: (
      <UL>
        <li>
          Loyalty points, rewards, referral bonuses and offers belong to your programme. You set the
          rules, honour them with your End Customers and are responsible for any value they carry.
          RateUp does not issue or guarantee them.
        </li>
        <li>
          If you use RateUp to ask for reviews on Google or any other site, you are responsible for
          following that site's review policies.
        </li>
        <li>
          Automations, chatbots and AI agents can produce answers that are wrong or incomplete. You
          are responsible for the content and instructions you give them, for reviewing what they
          send, and for any decision you make based on their output.
        </li>
      </UL>
    ),
  },
  {
    id: "customer-data",
    title: "Your data",
    body: (
      <>
        <P>
          You own your Customer Data. You give RateUp permission to host, process and transmit it
          only as needed to provide, secure and support the Service, and as described in our{" "}
          <DocLink to="/dpa">Data Processing Agreement</DocLink>, which forms part of these Terms.
        </P>
        <P>
          You are responsible for having a lawful basis, and any notices or consents needed, to
          collect Customer Data and to share it with us. We may use aggregated, de-identified data
          about how the Service is used to operate and improve it; this data does not identify you
          or your End Customers.
        </P>
        <H3>Export and deletion</H3>
        <P>
          While your account is open you can export your data from the Service where the product
          offers an export, or ask us at <Mail />. For 30 days after your account closes, we will
          help you export it on request. After that we delete Customer Data within 90 days, except
          what the law requires us to keep and copies in backups, which are overwritten on their
          normal cycle.
        </P>
      </>
    ),
  },
  {
    id: "service-changes",
    title: "Changes to the Service and availability",
    body: (
      <P>
        We improve the Service continually, which means features may be added, changed or removed.
        We aim to keep the Service available at all times, but it may be interrupted for
        maintenance, by Third-Party Platforms or by events outside our control. Unless you have a
        separate written service-level agreement with us, we do not guarantee any particular uptime.
      </P>
    ),
  },
  {
    id: "suspension-and-termination",
    title: "Suspension and termination",
    body: (
      <>
        <P>
          You may stop using the Service and close your account at any time. We may suspend or end
          your access, in whole or in part, if:
        </P>
        <UL>
          <li>you seriously or repeatedly breach these Terms or the Acceptable Use Policy;</li>
          <li>fees remain unpaid after the notice described above;</li>
          <li>
            your use creates a legal or security risk for RateUp, other customers or End Customers;
            or
          </li>
          <li>a Third-Party Platform requires us to, or bans your account or number.</li>
        </UL>
        <P>
          Where it is reasonable, we will tell you first and give you a chance to fix the problem.
          Sections that by their nature should survive termination, such as fees owed, data export,
          liability and indemnity, continue to apply.
        </P>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Our intellectual property",
    body: (
      <>
        <P>
          RateUp and its licensors own the Service, including its software, design and content.
          Subject to these Terms, we give you a limited, non-exclusive, non-transferable right to
          use the Service for your business during your subscription.
        </P>
        <P>You must not, and must not let anyone else:</P>
        <UL>
          <li>
            copy, modify, reverse engineer or decompile the Service, except where the law allows it
            despite this restriction;
          </li>
          <li>resell, sublicense or rent the Service without our written agreement;</li>
          <li>bypass usage limits, security controls or access restrictions; or</li>
          <li>scrape the Service or use it to build a competing product.</li>
        </UL>
        <P>If you send us ideas or feedback, we may use them without any obligation to you.</P>
      </>
    ),
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    body: (
      <P>
        Each of us will keep the other's non-public business information confidential, use it only
        for the purposes of these Terms, and share it only with people who need it and are bound by
        similar duties. This does not apply to information that is public through no fault of the
        receiving party, or that must be disclosed by law.
      </P>
    ),
  },
  {
    id: "warranties",
    title: "Disclaimers",
    body: (
      <P>
        Except as expressly stated in these Terms, the Service is provided "as is" and "as
        available". To the extent the law allows, we disclaim all implied warranties, including
        merchantability, fitness for a particular purpose and non-infringement. We do not guarantee
        that the Service will be uninterrupted or error-free, or that messages will be delivered by
        Third-Party Platforms.
      </P>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <P>To the extent the law allows:</P>
        <UL>
          <li>
            Neither party is liable for indirect, incidental, special or consequential losses, or
            for loss of profits, revenue, goodwill or data, however caused.
          </li>
          <li>
            Each party's total liability arising out of or relating to these Terms is limited to the
            fees you paid to RateUp in the 12 months before the event giving rise to the claim. If
            you use only the Free plan, RateUp's total liability is limited to USD 100.
          </li>
          <li>
            These limits do not apply to your obligation to pay fees, to your indemnity below, to
            fraud or wilful misconduct, or to any liability that cannot be limited by law.
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <P>
        You will defend and indemnify RateUp, its affiliates and their officers and employees
        against third-party claims, and the resulting losses, costs and reasonable legal fees,
        arising from your Customer Data, the messages you send, the products you sell, or your
        breach of these Terms, the Acceptable Use Policy, a Third-Party Platform's terms or the law.
        We will tell you promptly about any such claim and let you control its defence.
      </P>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <P>
        We may update these Terms from time to time. For material changes, we will notify the
        account owner by email or in the app at least 30 days before they take effect. If you do not
        agree to a change, you can cancel before it takes effect; continuing to use the Service
        after that date means you accept the updated Terms.
      </P>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law and disputes",
    body: (
      <P>
        These Terms are governed by the laws of India. If a dispute arises, we will first try to
        resolve it in good faith for 30 days after one party notifies the other in writing. If it is
        not resolved, the courts at {LEGAL_JURISDICTION} have exclusive jurisdiction.
      </P>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <UL>
        <li>
          These Terms, the policies they include and any order form are the whole agreement between
          us about the Service, and replace any earlier agreement on the same subject.
        </li>
        <li>
          You may not transfer these Terms without our written consent. We may transfer them to an
          affiliate or to a successor in a merger, acquisition or sale of assets.
        </li>
        <li>
          Neither party is liable for delays caused by events beyond its reasonable control, such as
          natural disasters, outages of Third-Party Platforms, or government action.
        </li>
        <li>
          If any part of these Terms cannot be enforced, the rest stays in effect. Not enforcing a
          right is not a waiver of it.
        </li>
        <li>
          We send notices to the account owner's email address or in the app. You can send notices
          to <Mail />.
        </li>
      </UL>
    ),
  },
  {
    id: "shipping-and-delivery",
    title: "Delivery of the Service",
    body: (
      <P>
        RateUp is a cloud service; nothing is shipped. You get access as soon as you sign up, and
        paid features become available as soon as your payment is confirmed. You use the Service
        through a web browser or the RateUp mobile app on an internet-connected device.
      </P>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <P>
        Questions about these Terms can be sent to {LEGAL_ENTITY} at <Mail />.
      </P>
    ),
  },
];

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="21 October 2026"
      summary={
        <>
          <b className="text-ru-n-700">In short:</b> use RateUp lawfully and follow Meta's WhatsApp
          and Instagram rules. Paid plans renew until you cancel, and paid fees aren't refunded. You
          own your data and can export it. Meta bills its message fees to you directly. If you sell
          through RateUp, you are the seller. This summary isn't part of the Terms; the full text
          below is.
        </>
      }
      sections={SECTIONS}
    />
  );
}
