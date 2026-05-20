import styles from "./PrivacyPolicy.module.css";

function PrivacyPolicy() {
  return (
    <div className={styles["privacy-policy-container"]}>
      <h1
        style={{
          fontWeight: 500,
        }}
      >
        Privacy Policy
      </h1>
      <p style={{ marginBottom: "1.5rem", color: "#666" }}>
        Last updated: January 2026
      </p>

      <section>
        <p>
          Uprate Technologies Private Limited ("RateUp", "we", "our", or "us")
          operates the website <strong>www.rateup.app</strong> and provides the
          RateUp Software-as-a-Service platform (the "Service").
        </p>
        <p>
          This Privacy Policy explains how we collect, use, disclose, and
          protect personal information when you visit our website, use our
          Service, or interact with our ads and marketing campaigns on platforms
          such as Google and Meta (Facebook & Instagram).
        </p>
        <p>
          By using our Service, you agree to the collection and use of
          information in accordance with this Privacy Policy.
        </p>
      </section>

      <section>
        <h2>1. Information We Collect</h2>
        <p>
          We collect information to provide, operate, improve, and market our
          Service.
        </p>
        <h3>a) Personal Information</h3>
        <p>
          When you sign up, request a demo, contact us, or use our Service, we
          may collect:
        </p>
        <ul>
          <li>Full name</li>
          <li>Business name</li>
          <li>Email address</li>
          <li>Phone number (including WhatsApp number)</li>
          <li>Billing or postal address</li>
          <li>
            Any information you voluntarily submit via forms, chats, or emails
          </li>
        </ul>
        <h3>b) Automatically Collected Information</h3>
        <p>
          When you visit our website or interact with our ads, we may
          automatically collect:
        </p>
        <ul>
          <li>IP address</li>
          <li>Device type, operating system, and browser version</li>
          <li>Pages visited and time spent</li>
          <li>Referring URLs</li>
          <li>Approximate location (city/country level)</li>
          <li>Advertising identifiers and conversion data</li>
        </ul>
      </section>

      <section>
        <h2>2. How We Use Your Information</h2>
        <p>We use collected information to:</p>
        <ul>
          <li>Provide and maintain the Service</li>
          <li>Set up accounts and deliver requested features</li>
          <li>Communicate with you via email, phone, or WhatsApp</li>
          <li>
            Send service updates, onboarding messages, and support
            communications
          </li>
          <li>Run marketing, remarketing, and conversion tracking campaigns</li>
          <li>
            Improve product performance, website experience, and ad relevance
          </li>
          <li>Comply with legal, regulatory, and contractual obligations</li>
        </ul>
        <p>We do not sell personal data to third parties.</p>
      </section>

      <section>
        <h2>3. Advertising, Analytics & Tracking</h2>
        <p>
          RateUp uses first-party and third-party analytics, advertising,
          pixels, SDKs, and server-side tracking technologies to measure
          performance and improve marketing effectiveness.
        </p>
        <h3>Tools We Use</h3>
        <ul>
          <li>Google Analytics (including GA4)</li>
          <li>Google Ads Conversion Tracking</li>
          <li>Meta Ads Tools (Meta Pixel and Meta Conversion API)</li>
          <li>LinkedIn Ads</li>
          <li>Other analytics and marketing automation tools</li>
        </ul>
        <h3>Pixel & Event Tracking</h3>
        <p>
          These tools may collect information such as page views, form
          submissions, and button clicks (including WhatsApp click events).
        </p>
        <h3>Server-Side Tracking (CAPI)</h3>
        <p>
          Meta Conversion API (CAPI) allows us to send limited event data
          directly from our servers. Data shared may include hashed identifiers
          (email/phone), IP address, and device information. We do not use this
          to identify individuals personally.
        </p>
      </section>

      <section>
        <h2>4. Cookies & Similar Technologies</h2>
        <p>
          Cookies are small files stored on your device to improve functionality
          and analytics. You can control or disable cookies via your browser
          settings. Disabling cookies may limit some features of the Service.
        </p>
      </section>

      <section>
        <h2>5. Data Sharing & Service Providers</h2>
        <p>
          We may share information with trusted third-party service providers
          assisting with hosting, analytics, customer support, and payment
          processing. These providers are contractually obligated to maintain
          confidentiality and security.
        </p>
      </section>

      <section>
        <h2>6. Data Security</h2>
        <p>
          We use commercially reasonable administrative, technical, and
          organizational safeguards to protect personal data. However, no online
          transmission is 100% secure.
        </p>
      </section>

      <section>
        <h2>7. Data Retention</h2>
        <p>
          We retain personal information only as long as necessary to provide
          the Service, fulfill legal obligations, or resolve disputes. When no
          longer required, data is securely deleted or anonymized.
        </p>
      </section>

      <section>
        <h2>8. Your Rights & Choices</h2>
        <h3>a) GDPR Rights (EEA, UK & Similar)</h3>
        <p>
          You have the right to access, correct, or request deletion of your
          personal data. You may also object to processing or request data
          portability.
        </p>
        <h3>b) CCPA / CPRA Rights (California Residents)</h3>
        <p>
          California residents have the right to know what personal information
          is collected, request deletion, and opt out of any sale or sharing.
          RateUp does not sell personal information.
        </p>
        <p>
          To exercise these rights, contact us at{" "}
          <strong>hello@rateup.app</strong>.
        </p>
      </section>

      <section>
        <h2>9. Third-Party Links</h2>
        <p>
          Our Service may contain links to third-party sites. We are not
          responsible for their content or privacy practices.
        </p>
      </section>

      <section>
        <h2>10. Children’s Privacy</h2>
        <p>
          Our Service is not intended for children under 13. We do not knowingly
          collect personal data from children.
        </p>
      </section>

      <section>
        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically. Continued use of the
          Service constitutes acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2>12. International Data Transfers</h2>
        <p>
          Your information may be stored on servers outside your country. We
          rely on appropriate safeguards such as standard data protection
          clauses.
        </p>
      </section>

      <section>
        <h2>13. Contact Us</h2>
        <p>
          For questions or privacy-related requests, contact:
          <br />
          <br />
          <strong>Uprate Technologies Private Limited</strong>
          <br />
          Email: <strong>hello@rateup.app</strong>
          <br />
          Website: <strong>www.rateup.app</strong>
        </p>
      </section>
    </div>
  );
}

export default PrivacyPolicy;
