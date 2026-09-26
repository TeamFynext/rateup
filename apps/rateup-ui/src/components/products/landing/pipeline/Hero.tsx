import HeroCanvas from "@/components/RateupHomePage/shared/hero-bg/HeroCanvas";
import { stageDrift } from "@/components/RateupHomePage/shared/hero-bg/scenes/stageDrift";
import {
  HERO_H1,
  HERO_SUB,
  HeroActions,
  NavyHero,
} from "@/components/RateupHomePage/shared/NavyHero";

export default function Hero() {
  return (
    <NavyHero background={<HeroCanvas scene={stageDrift} className="-z-10" />}>
      <h1 className={HERO_H1}>
        Turn conversations into <span className="text-ru-blue-300">a pipeline.</span>
      </h1>
      <p className={`max-w-[40ch] ${HERO_SUB}`}>
        Every WhatsApp, Instagram and Messenger enquiry becomes a lead with an owner, a next step
        and a stage.
      </p>
      <HeroActions />
    </NavyHero>
  );
}
