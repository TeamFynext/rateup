import HeroCanvas from "@/components/RateupHomePage/shared/hero-bg/HeroCanvas";
import {
  HERO_H1,
  HERO_SUB,
  HeroActions,
  NavyHero,
} from "@/components/RateupHomePage/shared/NavyHero";

import { checkoutRings } from "./checkoutRings";

export default function Hero() {
  return (
    <NavyHero background={<HeroCanvas scene={checkoutRings} className="-z-10" />}>
      <h1 className={HERO_H1}>
        The simplest way to sell on{" "}
        <span className="text-ru-blue-300">WhatsApp and Instagram.</span>
      </h1>
      <p className={`max-w-[44ch] ${HERO_SUB}`}>
        Product cards and carts inside WhatsApp, Instagram and Messenger, with a payment link that
        pays into your own Stripe or Razorpay account.
      </p>
      <HeroActions />
    </NavyHero>
  );
}
