import { openCookieSettings } from "@/components/ui/cookie-consent";

import { LEGAL_ENTITY } from "../Legal/company";
import {
  DocLink,
  H3,
  LegalPage,
  type LegalSection,
  LegalTable,
  Mail,
  P,
  UL,
} from "../Legal/LegalPage";

const SECTIONS: readonly LegalSection[] = [
  {
    id: "scope",
    title: "Who we are and what this covers",
    body: (
      <>
        <P>
          {LEGAL_ENTITY} ("RateUp", "we", "us") operates www.rateup.app and the RateUp platform (the
          "Service"). This policy explains how we handle personal information in two different
          roles:
        </P>
        <UL>
          <li>
            <b>As a controller</b>, for information about visitors to our website, people who
            contact us, and the businesses and team members who use RateUp.
          </li>
          <li>
            <b>As a processor</b>, for information our business customers put into RateUp about
            their own customers. That is covered in section 4.
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    body: (
      <>
        <H3>Information you give us</H3>
        <UL>
          <li>Account details: name, business name, email address, phone or WhatsApp number.</li>
          <li>Profile details you add, such as your role, team, photo and business address.</li>
          <li>
            Billing details: billing name and address and tax details. Card and bank details are
            collected by our payment providers, Stripe and Razorpay; we do not store full card
            numbers.
          </li>
          <li>Anything you send us through forms, demo bookings, chat, email or calls.</li>
        </UL>
        <H3>Information collected automatically</H3>
        <UL>
          <li>Device and browser type, operating system, IP address and approximate location.</li>
          <li>Pages visited, links clicked, referring website and time on page.</li>
          <li>How you use the Service, such as features used and errors encountered.</li>
          <li>
            Advertising identifiers and conversion events, only if you accept cookies (section 6).
          </li>
        </UL>
        <H3>Information from third parties</H3>
        <UL>
          <li>
            When you connect WhatsApp, Instagram or Messenger, Meta shares details of the business
            accounts, pages and phone numbers you connect.
          </li>
          <li>
            When you connect other tools, such as Shopify, WooCommerce or Google, we receive the
            data needed for that integration to work.
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use information, and why",
    body: (
      <LegalTable
        head={["Purpose", "Legal basis"]}
        rows={[
          [
            "Providing the Service, setting up accounts, billing",
            "Performance of our contract with you",
          ],
          ["Support, service and security messages", "Contract; legitimate interests"],
          [
            "Keeping the Service secure, preventing fraud and abuse, fixing errors",
            "Legitimate interests; legal obligation",
          ],
          ["Improving the Service and our website", "Legitimate interests"],
          [
            "Marketing emails and WhatsApp messages about RateUp",
            "Consent, or legitimate interests for existing customers. You can opt out at any time.",
          ],
          ["Analytics and advertising cookies", "Consent (section 6)"],
          ["Tax, accounting and legal requests", "Legal obligation"],
        ]}
      />
    ),
  },
  {
    id: "customer-data",
    title: "Data our customers process with RateUp",
    body: (
      <>
        <P>
          Businesses use RateUp to talk to their own customers. They put information into RateUp
          about those people: names, phone numbers, Instagram and Facebook IDs, message content and
          media, survey answers, loyalty points and rewards, orders and delivery addresses.
        </P>
        <P>
          For this information, the business is the controller and RateUp is its processor. We
          process it only on the business's instructions and to provide the Service, as set out in
          our <DocLink to="/dpa">Data Processing Agreement</DocLink>. We do not use it for our own
          marketing, and we do not sell it.
        </P>
        <P>
          If you are a customer of a business that uses RateUp and want to access, correct or delete
          your information, or stop receiving messages, please contact that business directly. If
          you contact us instead, we will pass your request on to the business.
        </P>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share information with",
    body: (
      <>
        <P>We do not sell personal information. We share it only with:</P>
        <UL>
          <li>
            <b>Service providers</b> who host, secure and support the Service, such as cloud
            hosting, email delivery, error monitoring and payment processing. They may use the
            information only to provide services to us. The current list is on our{" "}
            <DocLink to="/subprocessors">Subprocessors page</DocLink>.
          </li>
          <li>
            <b>Meta</b>, when messages are sent or received through WhatsApp, Instagram or
            Messenger. Meta handles that information under its own terms and privacy policy.
          </li>
          <li>
            <b>Integrations you turn on</b>, such as Shopify, Google, HubSpot or Zapier, as needed
            for them to work.
          </li>
          <li>
            <b>Advertising and analytics partners</b> (Google and Meta), only for website visitors
            who accept cookies.
          </li>
          <li>
            <b>Authorities or others</b>, where the law requires it, or to protect the rights,
            safety and security of RateUp, our customers or the public.
          </li>
          <li>
            <b>A buyer or successor</b>, if RateUp is involved in a merger, acquisition or sale of
            assets. This policy will continue to apply to your information.
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies, analytics and advertising",
    body: (
      <>
        <P>
          Our website uses a few cookies that it needs in order to work, such as keeping you signed
          in and remembering your cookie choice for six months. These are always on.
        </P>
        <P>
          With your consent, we also use these tools to understand how the website is used and to
          measure our ads:
        </P>
        <UL>
          <li>Google Tag Manager, Google Analytics 4 and Google Ads conversion tracking</li>
          <li>
            Meta Pixel and the Meta Conversions API, which sends limited event data from our
            servers, such as hashed email or phone, IP address and device details
          </li>
        </UL>
        <P>
          Until you accept, these tools run in a consent-denied mode: they do not set analytics or
          advertising cookies, and Meta Pixel events are not sent. You can change your choice at any
          time:{" "}
          <button
            type="button"
            onClick={openCookieSettings}
            className="font-medium text-ru-blue-600 underline underline-offset-3 hover:text-ru-blue-700"
          >
            open cookie settings
          </button>
          . You can also block cookies in your browser, though parts of the site may then not work.
        </P>
      </>
    ),
  },
  {
    id: "international-transfers",
    title: "Where your information is stored",
    body: (
      <P>
        Our main databases are in the European Union, and our file storage and email delivery are in
        India. Some of our service providers process information in other countries, including the
        United States. Where information leaves the European Economic Area or the United Kingdom, we
        rely on safeguards such as the European Commission's Standard Contractual Clauses.
      </P>
    ),
  },
  {
    id: "retention",
    title: "How long we keep information",
    body: (
      <UL>
        <li>
          Account information and Customer Data are kept while the account is open. After an account
          closes, we delete them within 90 days, as described in our{" "}
          <DocLink to="/terms-of-service" hash="customer-data">
            Terms
          </DocLink>
          .
        </li>
        <li>
          Invoices and billing records are kept for as long as tax and accounting laws require.
        </li>
        <li>Enquiries and demo requests are kept for up to two years after our last contact.</li>
        <li>Backups are overwritten on their normal cycle.</li>
      </UL>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <P>
        We protect information with encryption in transit, access controls based on each team
        member's role, secure authentication, monitoring and regular backups. No system is
        completely secure. If a breach affects your personal information, we will notify you and the
        relevant authorities as the law requires.
      </P>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <P>Depending on where you live, you may have the right to:</P>
        <UL>
          <li>access the personal information we hold about you and get a copy of it;</li>
          <li>correct or update it;</li>
          <li>have it deleted;</li>
          <li>object to or restrict how we use it, including for direct marketing;</li>
          <li>withdraw consent you have given, at any time;</li>
          <li>
            nominate someone to exercise your rights if you die or become incapacitated (India).
          </li>
        </UL>
        <UL>
          <li>
            <b>European Economic Area and United Kingdom:</b> you also have the right to data
            portability and to complain to your local data protection authority.
          </li>
          <li>
            <b>India:</b> you have the rights under the Digital Personal Data Protection Act, 2023,
            including grievance redressal through the officer named in section 13.
          </li>
          <li>
            <b>California:</b> you have the right to know, delete and correct, and to opt out of
            "sale" or "sharing". RateUp does not sell personal information. Declining cookies stops
            our advertising tools from sharing it.
          </li>
        </UL>
        <P>
          To use any of these rights, email <Mail />. We will answer within 30 days. We may need to
          verify your identity first.
        </P>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <P>
        RateUp accounts are for businesses and for people aged 18 or over. We do not knowingly
        collect personal information from children for our own purposes. Businesses that use RateUp
        are responsible for any information about minors they process with it.
      </P>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <P>
        We will update the date at the top whenever this policy changes. If a change materially
        affects how we use your information, we will also tell account owners by email or in the app
        before it takes effect.
      </P>
    ),
  },
  {
    id: "contact",
    title: "Contact and Grievance Officer",
    body: (
      <>
        <P>For privacy questions, requests or complaints, contact our Grievance Officer:</P>
        <P>
          Grievance Officer, {LEGAL_ENTITY}
          <br />
          Email: <Mail />
        </P>
        <P>We acknowledge complaints within 7 days and aim to resolve them within 30 days.</P>
      </>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="21 October 2026"
      summary={
        <>
          <b className="text-ru-n-700">In short:</b> we collect what we need to run RateUp, and we
          never sell personal information. Advertising cookies stay off until you accept them. Data
          that businesses keep in RateUp about their customers belongs to those businesses; we only
          process it for them. Our main databases are in the EU.
        </>
      }
      sections={SECTIONS}
    />
  );
}
