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
        Customers ask to buy in your DMs.{" "}
        <span className="text-ru-blue-300">Let them pay right there.</span>
      </h1>
      <p className={`max-w-[44ch] ${HERO_SUB}`}>
        Product cards, carts and checkout inside WhatsApp, Instagram and Messenger — paid into your
        own Stripe or Razorpay account.
      </p>
      <HeroActions />
    </NavyHero>
  );
}
