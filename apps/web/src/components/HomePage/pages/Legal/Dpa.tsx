import { LEGAL_ENTITY } from "./company";
import { DocLink, H3, LegalPage, type LegalSection, Mail, P, UL } from "./LegalPage";

const SECTIONS: readonly LegalSection[] = [
  {
    id: "scope",
    title: "Scope and parties",
    body: (
      <>
        <P>
          This Data Processing Agreement ("DPA") is between {LEGAL_ENTITY} ("RateUp") and the
          customer that has agreed to the RateUp{" "}
          <DocLink to="/terms-of-service">Terms of Service</DocLink> ("Customer"). It applies
          automatically, without a signature, whenever RateUp processes personal data in Customer
          Data on Customer's behalf. Terms not defined here have the meaning given in the Terms.
        </P>
        <P>
          If you need a countersigned copy for your records, email <Mail />.
        </P>
      </>
    ),
  },
  {
    id: "roles",
    title: "Roles",
    body: (
      <P>
        For personal data in Customer Data, Customer is the controller and RateUp is the processor.
        For account, billing and website data about Customer and its Users, RateUp is an independent
        controller under its <DocLink to="/privacy-policy">Privacy Policy</DocLink>.
      </P>
    ),
  },
  {
    id: "processing-details",
    title: "Details of processing",
    body: (
      <UL>
        <li>
          <b>Subject matter and purpose:</b> providing the Service: messaging, inbox, automations,
          campaigns, surveys, loyalty, shop, pipelines and related features.
        </li>
        <li>
          <b>Duration:</b> the term of the Terms, plus the deletion period in section 9.
        </li>
        <li>
          <b>Data subjects:</b> Customer's End Customers, leads, loyalty members, survey respondents
          and buyers, and Customer's Users.
        </li>
        <li>
          <b>Personal data:</b> names, phone numbers, email addresses, Instagram and Facebook IDs,
          message content and media, survey answers, loyalty and referral activity, orders and
          delivery addresses, and other data Customer chooses to add.
        </li>
        <li>
          <b>Special categories:</b> none are required. Customer must not send them unless the law
          allows it.
        </li>
      </UL>
    ),
  },
  {
    id: "obligations",
    title: "RateUp's obligations",
    body: (
      <UL>
        <li>
          Process personal data only on Customer's documented instructions. The Terms, Customer's
          settings and its use of the Service count as those instructions. RateUp will tell Customer
          if it believes an instruction breaks the law.
        </li>
        <li>Make sure everyone authorised to process the data is bound by confidentiality.</li>
        <li>Apply the security measures in section 10.</li>
        <li>
          Help Customer, taking into account the nature of the processing, to respond to data
          subject requests, carry out data protection impact assessments and consult regulators.
        </li>
        <li>
          Not sell Customer Data, or use it for RateUp's own marketing or to train models offered to
          other customers.
        </li>
      </UL>
    ),
  },
  {
    id: "subprocessors",
    title: "Subprocessors",
    body: (
      <P>
        Customer authorises RateUp to use the subprocessors listed on our{" "}
        <DocLink to="/subprocessors">Subprocessors page</DocLink>. RateUp binds each one to data
        protection terms at least as protective as this DPA and remains responsible for them. RateUp
        will update that page at least 30 days before adding a subprocessor. If Customer objects on
        reasonable data protection grounds within that time and we cannot resolve the objection,
        Customer may terminate the affected Service and receive a pro-rated refund of prepaid fees
        for it.
      </P>
    ),
  },
  {
    id: "third-party-platforms",
    title: "Meta and other platforms Customer connects",
    body: (
      <P>
        Meta (for WhatsApp, Instagram and Messenger), and any other Third-Party Platform Customer
        connects, process data under Customer's own agreement with them. They are not RateUp's
        subprocessors. RateUp exchanges data with them on Customer's instruction.
      </P>
    ),
  },
  {
    id: "transfers",
    title: "International transfers",
    body: (
      <P>
        RateUp's main databases are in the European Union, and file storage and email delivery are
        in India. Where personal data is transferred out of the European Economic Area, the United
        Kingdom or Switzerland to a country without an adequacy decision, the parties agree to the
        European Commission's Standard Contractual Clauses (Module 2 or Module 3, as applicable) and
        the UK Addendum. These are incorporated by reference, with the governing law and courts
        named in the Terms where the Clauses allow it.
      </P>
    ),
  },
  {
    id: "breach",
    title: "Personal data breaches",
    body: (
      <P>
        RateUp will notify Customer without undue delay, and in any case within 72 hours, after
        becoming aware of a personal data breach affecting Customer Data. The notice will include
        what RateUp knows of the breach, the likely impact and the steps taken. RateUp will add more
        information as it becomes available.
      </P>
    ),
  },
  {
    id: "deletion",
    title: "Return and deletion",
    body: (
      <P>
        Customer can export Customer Data during the term and for 30 days after it ends. RateUp then
        deletes Customer Data within 90 days, except where the law requires it to be kept. Backups
        are overwritten on their normal cycle and are protected until then.
      </P>
    ),
  },
  {
    id: "security",
    title: "Security measures",
    body: (
      <>
        <H3>Technical</H3>
        <UL>
          <li>TLS encryption for data in transit.</li>
          <li>
            Encryption at rest for file storage, and where our hosting provider offers it for
            databases.
          </li>
          <li>Separation of each customer's data by organisation in the application.</li>
          <li>Regular backups, error monitoring and logging.</li>
        </UL>
        <H3>Organisational</H3>
        <UL>
          <li>
            Role-based permissions in the product, so Customer controls what each User can see and
            do.
          </li>
          <li>
            Staff access to production data limited to those who need it to run and support the
            Service.
          </li>
          <li>Confidentiality obligations for all staff and contractors.</li>
        </UL>
      </>
    ),
  },
  {
    id: "audits",
    title: "Audits",
    body: (
      <P>
        On request, RateUp will provide information reasonably needed to show compliance with this
        DPA. If that is not enough, Customer may audit RateUp once a year on 30 days' notice, during
        business hours and at its own cost, subject to confidentiality.
      </P>
    ),
  },
  {
    id: "general",
    title: "Liability and precedence",
    body: (
      <P>
        Each party's liability under this DPA is subject to the limits in the Terms. If this DPA
        conflicts with the Terms on data protection, this DPA wins. If it conflicts with the
        Standard Contractual Clauses, the Clauses win.
      </P>
    ),
  },
];

export default function Dpa() {
  return (
    <LegalPage
      title="Data Processing Agreement"
      updated="21 October 2026"
      summary={
        <>
          <b className="text-ru-n-700">In short:</b> you control the data you keep in RateUp about
          your customers; we process it only to run the Service for you. We keep it secure, tell you
          about breaches within 72 hours, list our subprocessors, and delete it when you leave. This
          DPA applies to every RateUp customer automatically.
        </>
      }
      sections={SECTIONS}
    />
  );
}
