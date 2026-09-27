import HeroCanvas from "@/components/RateupHomePage/shared/hero-bg/HeroCanvas";
import { confluence } from "@/components/RateupHomePage/shared/hero-bg/scenes/confluence";
import {
  HERO_H1,
  HERO_SUB,
  HeroActions,
  NavyHero,
} from "@/components/RateupHomePage/shared/NavyHero";

export default function Hero() {
  return (
    <NavyHero background={<HeroCanvas scene={confluence} className="-z-10" />}>
      <h1 className={HERO_H1}>
        Every customer conversation, <span className="text-ru-blue-300">in one place.</span>
      </h1>
      <p className={`max-w-[38ch] ${HERO_SUB}`}>
        WhatsApp, Instagram and Messenger in one inbox — every conversation gets an owner, a stage
        and a result.
      </p>
      <HeroActions />
    </NavyHero>
  );
}
