import { InstagramMark, MessengerMark } from "./channel-marks";
import { WhatsAppGlyph } from "./home-ui";
import { HERO_H1, HERO_SUB, HeroActions, NavyHero } from "./NavyHero";

/**
 * The channel word cycles under a fixed headline. The column holds four cells and
 * `animate-ru-rot` steps it -25% at a time, so the first entry has to repeat at the end
 * for the loop to close without a jump back through the list.
 */
const CHANNELS = [
  {
    name: "WhatsApp",
    textClass: "text-wa-green",
    glyph: (
      <span className="flex size-[0.86em] flex-none items-center justify-center rounded-[0.24em] ring-1 ring-white/15 bg-wa-green text-white">
        <WhatsAppGlyph className="size-[62%]" />
      </span>
    ),
  },
  {
    name: "Instagram",
    textClass: "text-[#F77BB5]",
    glyph: (
      <span className="flex size-[0.86em] flex-none items-center justify-center rounded-[0.24em] ring-1 ring-white/15 bg-[linear-gradient(45deg,#FEDA75_0%,#FA7E1E_26%,#D62976_58%,#962FBF_82%,#4F5BD5_100%)] text-white">
        <InstagramMark className="size-[58%]" />
      </span>
    ),
  },
  {
    name: "Messenger",
    textClass: "text-[#5CB3FF]",
    glyph: (
      <span className="flex size-[0.86em] flex-none items-center justify-center rounded-[0.24em] ring-1 ring-white/15 bg-[linear-gradient(135deg,#00C6FF_0%,#0068FF_100%)] text-white">
        <MessengerMark className="size-[64%]" />
      </span>
    ),
  },
];

/* The cycle closes by repeating the first channel, so -75% lands back on WhatsApp. */
const CHANNEL_CELLS = [...CHANNELS, CHANNELS[0]];

export default function HeroSectionNew() {
  return (
    <NavyHero>
      <h1 className={HERO_H1}>
        Engage with your Customers on
        <span className="mt-0.5 block h-[1.14em] overflow-hidden">
          <span className="flex animate-ru-rot flex-col motion-reduce:animate-none">
            {CHANNEL_CELLS.map((channel, i) => (
              <span
                key={`${channel.name}-${i}`}
                className={`flex h-[1.14em] items-center justify-center gap-[0.24em] leading-[1.14] ${channel.textClass}`}
              >
                {channel.glyph}
                {channel.name}
              </span>
            ))}
          </span>
        </span>
      </h1>

      <p className={`max-w-[30ch] ${HERO_SUB}`}>
        Most customers buy once and disappear. RateUp fixes that.
      </p>

      <HeroActions />
    </NavyHero>
  );
}
