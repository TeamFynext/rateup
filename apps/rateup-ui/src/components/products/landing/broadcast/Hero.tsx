import HeroCanvas from "@/components/RateupHomePage/shared/hero-bg/HeroCanvas";
import { deliveryWave } from "@/components/RateupHomePage/shared/hero-bg/scenes/deliveryWave";
import {
  HERO_H1,
  HERO_SUB,
  HeroActions,
  NavyHero,
} from "@/components/RateupHomePage/shared/NavyHero";

export default function Hero() {
  return (
    <NavyHero background={<HeroCanvas scene={deliveryWave} className="-z-10" />}>
      <h1 className={HERO_H1}>
        Broadcast on WhatsApp — <span className="text-ru-blue-300">from your own number.</span>
      </h1>
      <p className={`max-w-[40ch] ${HERO_SUB}`}>
        Approved templates to your whole list on the official API, with a report on every message.
      </p>
      <HeroActions />
    </NavyHero>
  );
}
