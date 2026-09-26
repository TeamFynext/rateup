import HeroCanvas from "@/components/RateupHomePage/shared/hero-bg/HeroCanvas";
import { feedbackFork } from "@/components/RateupHomePage/shared/hero-bg/scenes/feedbackFork";
import {
  HERO_H1,
  HERO_SUB,
  HeroActions,
  NavyHero,
} from "@/components/RateupHomePage/shared/NavyHero";

export default function Hero() {
  return (
    <NavyHero background={<HeroCanvas scene={feedbackFork} className="-z-10" />}>
      <h1 className={HERO_H1}>
        Hear from every customer — <span className="text-ru-blue-300">right after the visit.</span>
      </h1>
      <p className={`max-w-[40ch] ${HERO_SUB}`}>
        A short form inside WhatsApp. Happy customers go on to Google; unhappy ones reach your team
        first.
      </p>
      <HeroActions />
    </NavyHero>
  );
}
