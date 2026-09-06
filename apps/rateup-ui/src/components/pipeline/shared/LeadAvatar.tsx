import { useTranslation } from "react-i18next";

import type { LeadChannel, LeadSource } from "@/backend/pipeline/pipeline.types.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { CHANNEL_META, SOURCE_META } from "../pipeline.constants.tsx";
import { channelLabel, sourceLabel } from "../pipeline.labels.ts";
import { initials } from "../pipeline.utils.ts";
import { personColor } from "./personColor.ts";

// `text` rides on the monogram itself: AvatarFallback sets its own font size,
// so a class on the avatar root would never win.
const SIZES = {
  sm: { avatar: "size-5", text: "text-[8px]", pip: "size-3", icon: "size-1.75" },
  md: { avatar: "size-7", text: "text-[10px]", pip: "size-3.25", icon: "size-1.75" },
  lg: { avatar: "size-8", text: "text-[12px]", pip: "size-3.75", icon: "size-2" },
  xl: { avatar: "size-11", text: "text-base", pip: "size-4.5", icon: "size-2.5" },
} as const;

interface LeadAvatarProps {
  name: string | null;
  photo?: string | null;
  /** Draws the originating channel as a pip on the avatar's corner. */
  channel?: LeadChannel;
  /**
   * Draws where the lead came from as that pip instead. Takes precedence over
   * `channel`: a lead’s source is always set, where its channel is NONE unless it
   * arrived over messaging, so the two would otherwise fight over one corner.
   */
  source?: LeadSource;
  /** `contact` is the lead itself, in brand blue; `person` is a teammate. */
  tone?: "contact" | "person";
  /** What a `person`'s colour is derived from; pass the user id so the colour
   *  survives a rename. Falls back to the name. */
  colorKey?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/** A lead or teammate's monogram, optionally badged with where they came in from. */
export function LeadAvatar({
  name,
  photo,
  channel = "NONE",
  source,
  tone = "contact",
  colorKey,
  size = "md",
  className,
}: Readonly<LeadAvatarProps>) {
  const { t } = useTranslation();
  const dimensions = SIZES[size];
  const badge = source
    ? {
        className: SOURCE_META[source].fillClassName,
        icon: SOURCE_META[source].icon,
        label: sourceLabel(t, source),
      }
    : channel === "NONE"
      ? null
      : {
          className: CHANNEL_META[channel].className,
          icon: CHANNEL_META[channel].icon,
          label: channelLabel(t, channel),
        };
  const BadgeIcon = badge?.icon;

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Avatar className={dimensions.avatar}>
        {photo ? <AvatarImage src={photo} alt={name ?? ""} /> : null}
        <AvatarFallback
          className={cn(
            "font-nunito font-semibold tracking-[-0.01em]",
            tone === "person" ? "text-white" : "bg-primary/10 text-primary",
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
      {badge && BadgeIcon ? (
        <span
          title={badge.label}
          className={cn(
            "border-background absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full border-2 text-white",
            dimensions.pip,
            badge.className,
          )}
        >
          <BadgeIcon className={dimensions.icon} stroke={2.5} />
        </span>
      ) : null}
    </span>
  );
}
