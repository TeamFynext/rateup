import type { ReactNode } from "react";

import { WooCommerceLogo } from "@/components/integrations/logos";
import {
  InstagramMark,
  MessengerMark,
  WhatsAppMark,
} from "@/components/RateupHomePage/shared/channel-marks";
import { imagesPath } from "@/utils/constants";

/* Payment and shipping partners have no mark in the repo, so they are set as plain names. */
const PARTNERS: readonly { name: string; mark?: ReactNode }[] = [
  { name: "WhatsApp", mark: <WhatsAppMark className="size-5 text-wa-green" /> },
  { name: "Instagram", mark: <InstagramMark className="size-5 text-[#D62976]" /> },
  { name: "Messenger", mark: <MessengerMark className="size-5 text-[#0068FF]" /> },
  {
    name: "Shopify",
    mark: <img src={`${imagesPath}/shopifyicon.png`} alt="" loading="lazy" className="size-5" />,
  },
  { name: "WooCommerce", mark: <WooCommerceLogo className="size-5.5" /> },
  { name: "Stripe" },
  { name: "Razorpay" },
  { name: "EasyPost" },
];

export default function WorksWith() {
  return (
    <section className="border-b border-ru-n-100 bg-white">
      <div className="mx-auto max-w-280 px-5 py-9 sm:py-12">
        <p className="mb-5 text-center text-[12.5px] font-semibold tracking-[0.1em] text-ru-n-400 uppercase">
          Works with
        </p>
        <ul className="flex list-none flex-wrap justify-center gap-2.5 p-0">
          {PARTNERS.map((partner) => (
            <li
              key={partner.name}
              className="flex h-11 items-center gap-2 rounded-full border border-ru-n-200 bg-ru-n-50 px-4 text-[15px] font-semibold text-ru-n-600"
            >
              {partner.mark && (
                <span aria-hidden="true" className="flex">
                  {partner.mark}
                </span>
              )}
              {partner.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
