import HeroBackground from "./hero-bg/HeroBackground";
import { ClosingCta } from "./home-ui";

/**
 * The closing band. This is the one place on the homepage that goes navy, so the CTA reads
 * as the end of the page rather than another section — the shared footer picks up below it.
 *
 * The band itself is `ClosingCta` in `home-ui`, because `/about-us` and `/contact-us` end on
 * the same one; only the copy differs.
 */
export default function LoyaltySection() {
  return (
    <ClosingCta
      id="demo"
      decoration={<HeroBackground className="opacity-45" />}
      eyebrow="Set up on your own WhatsApp number in 20 minutes"
      title="Ready to turn one sale into a lifetime?"
    >
      Book a 20-minute demo, or message us on WhatsApp — the same channel your customers will be
      using.
    </ClosingCta>
  );
}
