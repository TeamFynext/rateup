import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandPinterestFilled,
  IconBrandThreads,
  IconBrandX,
  IconBrandYoutube,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import { RateupStar } from "@/components/integrations/logos";
import styles from "@/styles/commonCssModules/homepagecss.module.css";

import { BookDemoModal } from "../helper/BookDemoModal";

export default function HomePageFooter() {
  const navigate = useNavigate();
  return (
    <>
      <section className={`${styles.section} ${styles["section--tight"]}`}>
        <div className={styles.page}>
          <div className={`${styles["cta-band"]} ${styles.reveal}`}>
            <h2>Ready To Turn One Sale Into A Lifetime?</h2>

            <p>
              Launch loyalty, referrals and automated engagement on WhatsApp —
              all for a flat <b style={{ color: "#fff" }}>$31/month</b>.
            </p>

            <div className={styles["cta-row"]}>
              <button
                className={`${styles.btn} ${styles["btn-primary"]}`}
                onClick={() =>
                  navigate({
                    to: "/signup",
                  })
                }
              >
                Start For Free
              </button>
              <BookDemoModal>
                <button className={`${styles.btn} ${styles["btn-ghost"]}`}>
                  Book a Demo
                </button>
              </BookDemoModal>
            </div>

            <div className={styles.micro}>
              No credit card required · Cancel anytime
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.page}>
          <div className={styles["foot-grid"]}>
            <div className={styles["foot-about"]}>
              <a className={styles.brand} href="#top">
                <RateupStar />
                <span className={styles.wm}>
                  Rate
                  <span className={styles.up}>Up</span>
                </span>
              </a>

              <p>
                Reimagine customer engagement — unified, automated and
                intelligent. One platform for WhatsApp loyalty, omnichannel
                inbox and post-purchase automation.
              </p>

              <div className={styles["foot-socials"]} style={{ marginTop: 20 }}>
                <a
                  href="https://x.com/rateup_app"
                  aria-label="X"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconBrandX className="w-5 h-5 text-gray-300 hover:text-white transition" />
                </a>

                <a
                  href="https://www.instagram.com/rateupsoftware/"
                  aria-label="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconBrandInstagram className="w-5 h-5  text-gray-300 hover:text-white transition" />
                </a>

                <a
                  href="https://www.facebook.com/rateupsapp/"
                  aria-label="Facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconBrandFacebook className="w-5 h-5 text-gray-300 hover:text-white transition" />
                </a>

                <a
                  href="https://www.linkedin.com/company/rateup"
                  aria-label="LinkedIn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconBrandLinkedin className="w-5 h-5 text-gray-300 hover:text-white transition" />
                </a>

                <a
                  href="https://www.threads.com/@rateupsoftware"
                  aria-label="Threads"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconBrandThreads className="w-5 h-5 text-gray-300 hover:text-white transition" />
                </a>

                <a
                  href="https://www.youtube.com/@TeamRateup"
                  aria-label="Youtube"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconBrandYoutube className="w-5 h-5 text-gray-300 hover:text-white transition" />
                </a>

                <a
                  href="https://www.pinterest.com/rateupapp/"
                  aria-label="Pinterest"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconBrandPinterestFilled className="w-5 h-5 text-gray-300 hover:text-white transition" />
                </a>
              </div>
            </div>

            <div className={styles["foot-col"]}>
              <h5>Product</h5>

              <a href="#features">Omnichannel Inbox</a>
              <a href="#features">WhatsApp Loyalty</a>
              <a href="#features">Campaigns</a>
              <a href="#features">AI Chatbots</a>
              <a href="#features">Mobile Apps</a>
            </div>

            <div className={styles["foot-col"]}>
              <h5>Company</h5>

              <a href="/about-us">About</a>
              <a href="#">Customers</a>
              <a href="/pricing">Pricing</a>
              <a href="#">Careers</a>
              <a href="/contact-us">Contact</a>
            </div>

            <div className={styles["foot-col"]}>
              <h5>Resources</h5>

              <a href="/blog">Blog</a>
              <a href="https://docs.rateup.app">Help Center</a>
              <a href="#">WhatsApp API</a>
              <a href="#">Integrations</a>
              <a href="#">Status</a>
            </div>
          </div>

          <div className={styles["foot-bottom"]}>
            <div>© 2026 RateUp · www.rateup.app</div>

            <div>
              Reimagine Customer Engagement — Unified. Automated. Intelligent.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
