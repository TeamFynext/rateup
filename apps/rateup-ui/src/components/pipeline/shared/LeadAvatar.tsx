import { useTranslation } from "react-i18next";

import type { LeadChannel } from "@/backend/pipeline/pipeline.types.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { CHANNEL_META } from "../pipeline.constants.tsx";
import { channelLabel } from "../pipeline.labels.ts";
import { initials } from "../pipeline.utils.ts";
import { personColor } from "./personColor.ts";

// `text` rides on the monogram itself: AvatarFallback sets its own font size,
// so a class on the avatar root would never win.
const SIZES = {
  sm: { avatar: "size-5", text: "text-[7px]", pip: "size-3", icon: "size-2" },
  md: { avatar: "size-7", text: "text-[9px]", pip: "size-3.5", icon: "size-2.5" },
  lg: { avatar: "size-8", text: "text-[10px]", pip: "size-4", icon: "size-2.5" },
  xl: { avatar: "size-11", text: "text-sm", pip: "size-5", icon: "size-3" },
} as const;

interface LeadAvatarProps {
  name: string | null;
  photo?: string | null;
  /** Draws the originating channel as a pip on the avatar's corner. */
  channel?: LeadChannel;
  /** `contact` is the lead itself, in brand blue; `person` is a teammate. */
  tone?: "contact" | "person";
  /** What a `person`'s colour is derived from; pass the user id so the colour
   *  survives a rename. Falls back to the name. */
  colorKey?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/** A lead or teammate's monogram, optionally badged with the channel they came in on. */
export function LeadAvatar({
  name,
  photo,
  channel = "NONE",
  tone = "contact",
  colorKey,
  size = "md",
  className,
}: Readonly<LeadAvatarProps>) {
  const { t } = useTranslation();
  const dimensions = SIZES[size];
  const channelMeta = channel === "NONE" ? null : CHANNEL_META[channel];
  const ChannelIcon = channelMeta?.icon;

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Avatar className={dimensions.avatar}>
        {photo ? <AvatarImage src={photo} alt={name ?? ""} /> : null}
        <AvatarFallback
          className={cn(
            "font-semibold",
            tone === "person" ? "text-white" : "bg-primary text-primary-foreground",
          )}
          // A teammate's colour is picked from the brand accents at runtime, so
          // there is no class that names it.
          style={
            tone === "person" ? { backgroundColor: personColor(colorKey ?? name ?? "") } : undefined
          }
        >
          <span className={dimensions.text}>{initials(name)}</span>
        </AvatarFallback>
      </Avatar>
      {channelMeta && ChannelIcon ? (
        <span
          title={channelLabel(t, channel)}
          className={cn(
            "border-background absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full border-2 text-white",
            dimensions.pip,
            channelMeta.className,
          )}
        >
          <ChannelIcon className={dimensions.icon} stroke={2.5} />
        </span>
      ) : null}
    </span>
  );
}
