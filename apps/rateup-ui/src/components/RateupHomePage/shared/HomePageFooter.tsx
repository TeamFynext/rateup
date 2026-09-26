import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandPinterestFilled,
  IconBrandThreads,
  IconBrandX,
  IconBrandYoutube,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import type { ReactNode } from "react";

import { MetaLockup } from "@/components/integrations/logos";
import { imagesPath } from "@/utils/constants";

import RateupLockup from "./RateupLockup";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

/**
 * The marketing footer, as drawn in the design.
 *
 * The comp nests this inside the navy closing-CTA block; here it is a separate component
 * (it is `Layout`'s default footer for every marketing page), so it carries its own navy
 * ground and the hairline that separates it from whatever sits above.
 *
 * The comp's link columns are plain text; these are real links, and the four labels it lists
 * that have no page behind them (Careers, DPA, Security, plus a "Case studies" page) resolve
 * to the closest real destination rather than to a dead route.
 */

/** rgba(255,255,255,.08) in the comp — the hairline that divides the navy stack. */
const HAIRLINE = "border-white/8";

function FooterCol({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div className="min-w-0">
      <h3 className="mb-3.5 text-[12.5px] font-semibold tracking-widest text-white/42 uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

const LINK = "text-[15px] text-white/72 transition-colors hover:text-white";

/** Same chip as the Meta lockup pill above, sized to a 36px tap target. */
const SOCIAL =
  "flex size-9 items-center justify-center rounded-[9px] border border-white/14 bg-white/5 text-white/72 transition-colors hover:border-white/24 hover:bg-white/10 hover:text-white";

const SOCIALS = [
  { href: "https://x.com/rateup_app", label: "X", Icon: IconBrandX },
  {
    href: "https://www.instagram.com/rateupsoftware/",
    label: "Instagram",
    Icon: IconBrandInstagram,
  },
  { href: "https://www.facebook.com/rateupsapp/", label: "Facebook", Icon: IconBrandFacebook },
  { href: "https://www.linkedin.com/company/rateup", label: "LinkedIn", Icon: IconBrandLinkedin },
  { href: "https://www.threads.com/@rateupsoftware", label: "Threads", Icon: IconBrandThreads },
  { href: "https://www.youtube.com/@TeamRateup", label: "YouTube", Icon: IconBrandYoutube },
  {
    href: "https://www.pinterest.com/rateupapp/",
    label: "Pinterest",
    Icon: IconBrandPinterestFilled,
  },
] as const;

function FooterSocials() {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {SOCIALS.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          aria-label={label}
          target="_blank"
          rel="noopener noreferrer"
          className={SOCIAL}
        >
          <Icon className="size-5" stroke={1.6} />
        </a>
      ))}
    </div>
  );
}

export default function HomePageFooter() {
  return (
    <footer className={`relative border-t bg-ru-blue-950 ${HAIRLINE}`}>
      <div className="mx-auto max-w-280 px-5 pt-9 pb-6 sm:pt-14 sm:pb-8">
        {/* Six tracks at `lg`: the brand cell takes two and each of the four link columns takes
            one, so they share a single row. The comp's `auto-fit` only ever resolved to five
            tracks here — it was drawn with three link columns, not four — which pushed Legal
            onto a row of its own. */}
        <div
          className={`grid grid-cols-2 gap-8 border-b pb-8 md:grid-cols-4 lg:grid-cols-6 ${HAIRLINE}`}
        >
          <div className="col-span-2 min-w-0 md:col-span-4 lg:col-span-2">
            <p className="max-w-[34ch] text-[15px]/[1.6] text-white/62">
              Loyalty, feedback and referrals on the channel your customers already open.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/5 px-3 py-1.75">
              {/* Mono-white cut: the colour lockup's #1c2b33 wordmark is invisible on navy.
                  The label drops "Meta" — the lockup carries the wordmark already. */}
              <MetaLockup onDark className="h-2.5" />
              <span className="text-[13.5px] font-medium text-white/78">Business Partner</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center -ml-2.5">
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

          <FooterCol title="Platform">
            <Link to="/products/whatsapp-business-api" className={LINK}>
              WhatsApp Business API
            </Link>
            <Link to="/products/whatsapp-broadcast" className={LINK}>
              WhatsApp Broadcast
            </Link>
            <Link to="/products/whatsapp-loyalty" className={LINK}>
              WhatsApp Loyalty
            </Link>
            <Link to="/products/omnichannel-inbox" className={LINK}>
              Omnichannel Inbox
            </Link>
            <Link to="/products/whatsapp-feedback" className={LINK}>
              WhatsApp Feedback
            </Link>
            <Link to="/products/pipeline" className={LINK}>
              Pipeline
            </Link>
            <Link to="/products/meta-ai-agent" className={LINK}>
              Meta AI Agent
            </Link>
          </FooterCol>

          <FooterCol title="Company">
            <Link to="/about-us" className={LINK}>
              About
            </Link>
            <a href="/#results" className={LINK}>
              Case studies
            </a>
            <Link to="/pricing" className={LINK}>
              Pricing
            </Link>
            <Link to="/contact-us" className={LINK}>
              Contact
            </Link>
          </FooterCol>

          <FooterCol title="Resources">
            <Link to="/blog" className={LINK}>
              Blog
            </Link>
            <a
              href="https://docs.rateup.app"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              Help Center
            </a>
            <Link to="/tools" className={LINK}>
              Free tools
            </Link>
            <Link to="/integrations" className={LINK}>
              Integrations
            </Link>
          </FooterCol>

          <FooterCol title="Legal">
            <Link to="/privacy-policy" className={LINK}>
              Privacy
            </Link>
            <Link to="/terms-of-service" className={LINK}>
              Terms
            </Link>
          </FooterCol>
        </div>

        <div className="py-5 sm:py-7">
          <Link to="/" aria-label="RateUp home" className="mx-auto block max-w-192.5">
            <RateupLockup onDark className="opacity-90" />
          </Link>
        </div>

        <div
          className={`flex flex-wrap items-center justify-between gap-3.5 border-t pt-5.5 ${HAIRLINE}`}
        >
          <span className="text-[13.5px] text-white/42">
            © {new Date().getFullYear()} RateUp. All rights reserved.
          </span>
          <FooterSocials />
          <span className="text-[13px] tracking-[0.08em] text-white/42">www.rateup.app</span>
        </div>
      </div>
    </footer>
  );
}
