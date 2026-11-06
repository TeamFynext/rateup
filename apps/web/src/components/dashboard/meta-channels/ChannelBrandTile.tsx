import { cn } from "@/lib/utils";

import { CHANNELS, type MetaChannel } from "./channels.ts";

/** The channel's logo on its brand fill. */
export function ChannelBrandTile({
  channel,
  className,
}: Readonly<{ channel: MetaChannel; className?: string }>) {
  const { icon: Icon, tile } = CHANNELS[channel];
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
        tile,
        className,
      )}
    >
      <Icon className="size-6" />
    </div>
  );
}
