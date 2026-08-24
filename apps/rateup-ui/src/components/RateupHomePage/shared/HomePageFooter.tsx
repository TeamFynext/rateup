import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandPinterestFilled,
  IconBrandThreads,
  IconBrandX,
  IconBrandYoutube,
} from "@tabler/icons-react";
import { Image } from "@unpic/react";

import { imagesPath } from "@/components/HomePage/constants";
import { RateupStar } from "@/components/integrations/logos";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

export default function HomePageFooter() {
  return (
    <footer className={`${styles.footer} ${styles["footer-theme"]} mt-0!`}>
      <div className={styles.page}>
        <div className={styles["foot-grid"]}>
          <div className={styles["foot-about"]}>
            <a className={styles.brand} href="#top">
              <RateupStar className="h-8 w-8" />
              <span className={styles.wm}>
                Rate
                <span className={styles.up}>Up</span>
              </span>
            </a>

            <p>
              Reimagine customer engagement — unified, automated and intelligent. One platform for
              WhatsApp loyalty, omnichannel inbox and post-purchase automation.
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
            <h3>Product</h3>

            <a href="#features">Omnichannel Inbox</a>
            <a href="#features">WhatsApp Loyalty</a>
            <a href="#features">Campaigns</a>
            <a href="#features">AI Chatbots</a>
            <a href="#features">Mobile Apps</a>
          </div>

          <div className={styles["foot-col"]}>
            <h3>Company</h3>

            <a href="/about-us">About</a>
            <a href="#">Customers</a>
            <a href="/pricing">Pricing</a>
            <a href="#">Careers</a>
            <a href="/contact-us">Contact</a>
          </div>

          <div className={styles["foot-col"]}>
            <h3>Resources</h3>

            <a href="/blog">Blog</a>
            <a href="https://docs.rateup.app">Help Center</a>
            <a href="#">WhatsApp API</a>
            <a href="#">Integrations</a>
            <a href="#">Status</a>
          </div>

          {/*
            Tools get their own column rather than a line in Resources: these
            are the site's search-entry pages, and a link from every footer on the
            site is what ties the cluster to the rest of the domain.
          */}
          <div className={styles["foot-col"]}>
            <h3>Tools</h3>

            <a href="/tools/whatsapp-link-generator">WhatsApp Link Generator</a>
            <a href="/tools/whatsapp-qr-code-generator">WhatsApp QR Code Generator</a>
            <a href="/tools/whatsapp-pricing-calculator">WhatsApp API Pricing Calculator</a>
            <a href="/tools/rto-loss-calculator">COD RTO Loss Calculator</a>
            <a href="/tools/nps-survey-templates">NPS Survey Templates</a>
            <a href="/tools">All tools →</a>
          </div>

          <div className={styles["foot-col"]}>
            <h3>Download App</h3>

            {/*
              Both badges are the official, unmodified artwork (Apple's US/UK black lockup SVG,
              Google's current "Get it on Google Play" web SVG from the Partner Marketing Hub) —
              neither vendor permits a hand-built recreation, which is what used to live here.
              Apple's black lockup is required because another app-platform badge shares the layout,
              and it goes first for the same reason. Both render at 40px tall: that is Apple's
              onscreen minimum, and it keeps Google's badge "the same size or larger" as required.
              The clear space (a quarter of the badge height) is the padding on each link — nothing
              may be drawn inside it, so the old bordered pill wrapper is gone.
            */}
            <div className={styles["foot-dl"]}>
              <a
                href="https://apps.apple.com/in/app/rateup/id6761990608"
                target="_blank"
                rel="noopener noreferrer"
                className={styles["foot-dl-badge"]}
              >
                <Image
                  src={`${imagesPath}/landing/app-store-badge.svg`}
                  alt="Download on the App Store"
                  width={120}
                  height={40}
                  loading="lazy"
                  decoding="async"
                />
              </a>

              <a
                href="https://play.google.com/store/apps/details?id=com.rateupapp.rateup&pcampaignid=web_share"
                target="_blank"
                rel="noopener noreferrer"
                className={styles["foot-dl-badge"]}
              >
                <Image
                  src={`${imagesPath}/landing/google-play-badge.svg`}
                  alt="Get it on Google Play"
                  width={135}
                  height={40}
                  loading="lazy"
                  decoding="async"
                />
              </a>
            </div>
          </div>
        </div>

        <div className={styles["foot-bottom"]}>
          <div>© 2026 RateUp · www.rateup.app</div>

          <div>Reimagine Customer Engagement — Unified. Automated. Intelligent.</div>

          {/* Credit lines both vendors require wherever their badges appear. */}
          <div className={styles["foot-legal"]}>
            Apple and the Apple logo are trademarks of Apple Inc., registered in the U.S. and other
            countries. App Store is a service mark of Apple Inc. Google Play and the Google Play
            logo are trademarks of Google LLC.
          </div>
        </div>
      </div>
    </footer>
  );
}
