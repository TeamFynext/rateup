import type { ReactNode } from "react";

import {
  InstagramMark,
  MessengerMark,
  WhatsAppMark,
} from "@/components/RateupHomePage/shared/channel-marks";
import { IntegrationTiles } from "@/components/RateupHomePage/shared/Integrations";

import { BAND, SectionHead } from "../shared/section";

const CHANNELS: ReadonlyArray<{ name: string; body: string; tile: string; mark: ReactNode }> = [
  {
    name: "WhatsApp Business API",
    body: "Official API, on your own number, with templates and Flows.",
    tile: "bg-wa-green",
    mark: <WhatsAppMark className="size-5.5" />,
  },
  {
    name: "Instagram",
    body: "Direct messages and comments, threaded per contact.",
    tile: "bg-[linear-gradient(45deg,#FEDA75_0%,#FA7E1E_26%,#D62976_58%,#962FBF_82%,#4F5BD5_100%)]",
    mark: <InstagramMark className="size-5.5" />,
  },
  {
    name: "Messenger",
    body: "Your Facebook Page's inbox, in the same queue.",
    tile: "bg-[linear-gradient(135deg,#00C6FF_0%,#0068FF_100%)]",
    mark: <MessengerMark className="size-5.5" />,
  },
];

export default function Integrations() {
  return (
    <section id="integrations" className="bg-white">
      <div className={BAND}>
        <SectionHead
          eyebrow="Channels & integrations"
          icon={
            <>
              <path d="M9 3v5M15 3v5M12 17v4" />
              <path d="M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z" />
            </>
          }
          title="Connects to the stack you already run."
        >
          Channels on your own accounts, orders from your store, and an API for everything else.
        </SectionHead>

        <div className="mb-3 grid gap-3 md:grid-cols-3">
          {CHANNELS.map((channel) => (
            <div
              key={channel.name}
              className="flex items-start gap-3.5 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-5"
            >
              <span
                className={`flex size-11 flex-none items-center justify-center rounded-xl text-white ${channel.tile}`}
              >
                {channel.mark}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-ru-n-700">{channel.name}</h3>
                <p className="mt-0.5 text-[14px]/[1.5] text-ru-n-500">{channel.body}</p>
              </div>
            </div>
          ))}
        </div>

        <IntegrationTiles />
      </div>
    </section>
  );
}
