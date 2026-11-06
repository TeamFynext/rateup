import HeroCanvas from "@/components/RateupHomePage/shared/hero-bg/HeroCanvas";
import { tierOrbits } from "@/components/RateupHomePage/shared/hero-bg/scenes/tierOrbits";
import {
  HERO_H1,
  HERO_SUB,
  HeroActions,
  NavyHero,
} from "@/components/RateupHomePage/shared/NavyHero";

export default function Hero() {
  return (
    <NavyHero background={<HeroCanvas scene={tierOrbits} className="-z-10" />}>
      <h1 className={HERO_H1}>
        A loyalty programme that <span className="text-ru-blue-300">lives in WhatsApp.</span>
      </h1>
      <p className={`max-w-[40ch] ${HERO_SUB}`}>
        Customers scan a QR at the counter to join. Points, tiers, rewards and reminders arrive in
        the chat — no app to download.
      </p>
      <HeroActions />
    </NavyHero>
  );
}
