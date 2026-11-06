import { MetaLockup } from "@/components/integrations/logos";
import HeroCanvas from "@/components/RateupHomePage/shared/hero-bg/HeroCanvas";
import { handoverMesh } from "@/components/RateupHomePage/shared/hero-bg/scenes/handoverMesh";
import {
  HERO_H1,
  HERO_SUB,
  HeroActions,
  NavyHero,
} from "@/components/RateupHomePage/shared/NavyHero";

export default function Hero() {
  return (
    <NavyHero background={<HeroCanvas scene={handoverMesh} className="-z-10" />}>
      <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/14 bg-white/5 py-1.5 pr-4 pl-3.5">
        <MetaLockup onDark priority className="h-3.5" />
        <span className="text-[13.5px] font-medium text-white/76">Business AI on WhatsApp</span>
      </div>
      <h1 className={HERO_H1}>
        An AI agent on WhatsApp, <span className="text-ru-blue-300">backed by your team.</span>
      </h1>
      <p className={`max-w-[42ch] ${HERO_SUB}`}>
        Meta's AI agent answers on your WhatsApp number, and hands over to a person the moment a
        customer needs one.
      </p>
      <HeroActions />
    </NavyHero>
  );
}
