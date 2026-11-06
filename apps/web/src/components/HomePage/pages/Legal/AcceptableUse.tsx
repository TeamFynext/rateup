import { DocLink, LegalPage, type LegalSection, Mail, P, UL } from "./LegalPage";

const SECTIONS: readonly LegalSection[] = [
  {
    id: "messaging",
    title: "Messaging",
    body: (
      <>
        <P>When you message people through RateUp, you must:</P>
        <UL>
          <li>
            send marketing and broadcast messages only to people who opted in to hear from your
            business on that channel;
          </li>
          <li>stop messaging anyone who asks you to, on every channel, promptly;</li>
          <li>
            not buy, rent or scrape contact lists, or message numbers you got without the person's
            consent;
          </li>
          <li>
            not send messages that are misleading about who you are, or that imitate another
            business, a government body or RateUp;
          </li>
          <li>
            follow the WhatsApp Business Messaging Policy, Meta's Commerce Policies and the rules of
            every other platform you connect.
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "prohibited-content",
    title: "Content and products you may not use RateUp for",
    body: (
      <UL>
        <li>
          Anything illegal where you or your recipients are, or that promotes illegal activity.
        </li>
        <li>
          Products and services that Meta's Commerce Policies or your payment provider prohibit,
          such as illegal drugs, weapons and ammunition, counterfeit goods or adult content.
        </li>
        <li>Phishing, scams, pyramid schemes, malware or links to them.</li>
        <li>Harassment, threats, hate speech, or content that sexualises minors.</li>
        <li>Content that infringes someone else's intellectual property or privacy.</li>
      </UL>
    ),
  },
  {
    id: "personal-data",
    title: "Personal data",
    body: (
      <UL>
        <li>
          Collect and use personal data only with a lawful basis and the notices or consents the law
          requires.
        </li>
        <li>
          Do not ask for or store passwords, full card numbers or government ID numbers in
          conversations, forms or surveys.
        </li>
        <li>
          Do not use health, financial or other sensitive data unless the law allows it and you have
          the necessary consent.
        </li>
        <li>Do not knowingly collect personal data from children without parental consent.</li>
      </UL>
    ),
  },
  {
    id: "platform",
    title: "Using the platform",
    body: (
      <UL>
        <li>Do not try to break, overload or probe the Service, or get around its security.</li>
        <li>Do not bypass usage limits, for example by spreading one business across accounts.</li>
        <li>Do not scrape the Service or access it with bots, except through our public API.</li>
        <li>Do not resell or white-label RateUp without a written agreement with us.</li>
        <li>Do not share logins between people.</li>
      </UL>
    ),
  },
  {
    id: "enforcement",
    title: "What happens if this policy is broken",
    body: (
      <>
        <P>
          Depending on how serious it is, we may warn you, remove content, pause messaging or
          features, or suspend or close the account, as described in our{" "}
          <DocLink to="/terms-of-service" hash="suspension-and-termination">
            Terms of Service
          </DocLink>
          . Where it is reasonable, we will contact you first. Meta may also act against your
          account or number on its own.
        </P>
        <P>
          To report abuse by a RateUp customer, email <Mail /> with the sender's number or account
          and an example of the message.
        </P>
      </>
    ),
  },
];

export default function AcceptableUse() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      updated="21 October 2026"
      summary={
        <>
          <b className="text-ru-n-700">In short:</b> only message people who agreed to hear from
          you, stop when they ask, follow Meta's rules, and don't use RateUp for anything illegal,
          deceptive or harmful. This policy is part of our Terms of Service.
        </>
      }
      sections={SECTIONS}
    />
  );
}
