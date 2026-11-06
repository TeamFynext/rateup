import type { ReactNode } from "react";

import HeroBackground from "@/components/RateupHomePage/shared/hero-bg/HeroBackground";
import { ClosingCta } from "@/components/RateupHomePage/shared/home-ui";

/** The one social-proof line the product landings carry. */
export const TRUSTED_BY = "Trusted by 100+ brands";

export default function ProductClosing({
  title,
  children,
}: Readonly<{ title: ReactNode; children: ReactNode }>) {
  return (
    <ClosingCta
      id="demo"
      eyebrow={TRUSTED_BY}
      title={title}
      decoration={<HeroBackground className="opacity-45" />}
    >
      {children}
    </ClosingCta>
  );
}
