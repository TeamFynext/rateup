import { DocLink, LegalPage, type LegalSection, LegalTable, Mail, P, UL } from "./LegalPage";

const SECTIONS: readonly LegalSection[] = [
  {
    id: "subprocessors",
    title: "Subprocessors",
    body: (
      <>
        <P>
          These companies process Customer Data on RateUp's behalf to run the Service. Each is bound
          by a written agreement with data protection terms at least as protective as our{" "}
          <DocLink to="/dpa">Data Processing Agreement</DocLink>.
        </P>
        <LegalTable
          head={["Company", "What they do for RateUp", "Location"]}
          rows={[
            [
              "Railway Corporation",
              "Application hosting, databases, caching and queues",
              "European Union",
            ],
            ["Amazon Web Services", "File and media storage (S3); email delivery (SES)", "India"],
            ["SuperTokens", "Sign-in and session management", "European Union"],
            ["Functional Software (Sentry)", "Error monitoring", "Germany"],
            [
              "Expo (650 Industries)",
              "Push notifications to the RateUp mobile app",
              "United States",
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: "billing",
    title: "Billing providers",
    body: (
      <>
        <P>
          These process payment details for your RateUp subscription. They do not receive Customer
          Data.
        </P>
        <LegalTable
          head={["Company", "What they do for RateUp", "Location"]}
          rows={[
            ["Stripe", "Subscription payments", "United States, global"],
            ["Razorpay", "Subscription payments in India", "India"],
          ]}
        />
      </>
    ),
  },
  {
    id: "platforms-you-connect",
    title: "Platforms you connect",
    body: (
      <>
        <P>
          The following are not RateUp subprocessors. They receive data because you connect them,
          and they handle it under your own agreement with them:
        </P>
        <UL>
          <li>Meta (WhatsApp Business Platform, Instagram, Messenger, Meta Business AI)</li>
          <li>Payment accounts used by your shop, such as your own Stripe or Razorpay account</li>
          <li>Shopify and WooCommerce</li>
          <li>Google (Sheets, Calendar and other Google APIs you connect)</li>
          <li>HubSpot, Pipedrive, Zoho, Zapier, Make and other integrations you turn on</li>
        </UL>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this list",
    body: (
      <P>
        We update this page at least 30 days before a new subprocessor starts processing Customer
        Data. To be told by email instead, ask us at <Mail />. You may object on reasonable data
        protection grounds within that period, as set out in the DPA.
      </P>
    ),
  },
];

export default function Subprocessors() {
  return (
    <LegalPage
      title="Subprocessors"
      updated="21 October 2026"
      summary={
        <>
          The service providers that process data on RateUp's behalf, what they do, and where. Our
          main databases are in the European Union, and files and email are handled in India.
        </>
      }
      sections={SECTIONS}
    />
  );
}
