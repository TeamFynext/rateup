import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { IconBrandInstagram, IconBrandWhatsapp, IconUser } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import { getAvatarInitials, isEmojiName } from "./utils.ts";

type ContactAvatarSize = "2xs" | "xs" | "sm" | "md" | "lg" | "xl";

interface ContactAvatarProps {
  /** Name to take initials from; a phone number is fine when there is no name. */
  name: string | null | undefined;
  /** A profile picture URL. Initials show while it loads and if it fails. */
  src?: string | null;
  size?: ContactAvatarSize;
  className?: string;
  /** A channel badge in the bottom-right corner. */
  platform?: "whatsapp" | "instagram";
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  onClick?: () => void;
  /** `light-blue` is a shade stronger, for sitting on an already-tinted surface. */
  variant?: "blue" | "light-blue";
}

/** Navy initials on a light brand chip: 7.3:1 against `ru-blue-50`. */
const VARIANT_CLASSES = {
  blue: "bg-ru-blue-50 text-ru-blue-600 ring-ru-blue-100 dark:bg-ru-blue-900/40 dark:text-ru-blue-200 dark:ring-ru-blue-800",
  "light-blue":
    "bg-ru-blue-100 text-ru-blue-700 ring-ru-blue-200 dark:bg-ru-blue-900/60 dark:text-ru-blue-200 dark:ring-ru-blue-800",
} as const;

const SIZE_CLASSES: Record<
  ContactAvatarSize,
  {
    container: string;
    text: string;
    ring: string;
    online: string;
    badge: string;
    badgeIcon: string;
  }
> = {
  "2xs": {
    container: "size-5",
    text: "text-[8px]",
    ring: "ring-1",
    online: "size-1.5",
    badge: "size-2.5 -right-0.5 -bottom-0.5",
    badgeIcon: "size-1.5",
  },
  xs: {
    container: "size-6",
    text: "text-[9px]",
    ring: "ring-[1.5px]",
    online: "size-1.5",
    badge: "size-3 -right-0.5 -bottom-0.5",
    badgeIcon: "size-2",
  },
  sm: {
    container: "size-9",
    text: "text-xs",
    ring: "ring-2",
    online: "size-2",
    badge: "size-3.5 -right-0.5 -bottom-0.5",
    badgeIcon: "size-2.5",
  },
  md: {
    container: "size-11",
    text: "text-sm",
    ring: "ring-2",
    online: "size-2",
    badge: "size-4 -right-0.5 -bottom-0.5",
    badgeIcon: "size-3",
  },
  lg: {
    container: "size-14",
    text: "text-base",
    ring: "ring-[3px]",
    online: "size-2.5",
    badge: "size-5 -right-0.5 -bottom-0.5",
    badgeIcon: "size-3.5",
  },
  xl: {
    container: "size-20",
    text: "text-xl",
    ring: "ring-[3px]",
    online: "size-2.5",
    badge: "size-6 -right-1 -bottom-1",
    badgeIcon: "size-4",
  },
};

const PLATFORM_BADGE = {
  whatsapp: { className: "bg-wa-green", Icon: IconBrandWhatsapp },
  instagram: {
    className: "bg-linear-to-br from-[#E4405F] via-[#F77737] to-[#FCAF45]",
    Icon: IconBrandInstagram,
  },
} as const;

/** The avatar for a contact — a customer, lead or loyalty member — everywhere one is shown. */
export function ContactAvatar({
  name,
  src,
  size = "md",
  className,
  platform,
  showOnlineStatus = false,
  isOnline = false,
  onClick,
  variant = "blue",
}: Readonly<ContactAvatarProps>) {
  const initials = getAvatarInitials(name ?? "");
  const sizes = SIZE_CLASSES[size];
  const badge = platform ? PLATFORM_BADGE[platform] : undefined;

  return (
    <div className={cn("relative inline-block shrink-0", className)}>
      <AvatarPrimitive.Root
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? "button" : undefined}
        aria-label={onClick ? `View ${name ?? ""}` : undefined}
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full shadow-xs select-none",
          sizes.container,
          sizes.ring,
          VARIANT_CLASSES[variant],
          onClick &&
            "cursor-pointer transition-transform hover:scale-105 active:scale-95 focus-visible:ring-ring focus-visible:outline-none",
        )}
      >
        {src ? (
          <AvatarPrimitive.Image
            src={src}
            alt={name ?? ""}
            className="aspect-square size-full object-cover"
          />
        ) : null}
        <AvatarPrimitive.Fallback
          className={cn(
            "flex size-full items-center justify-center font-bold",
            sizes.text,
            isEmojiName(name ?? "") && "text-[1.35em] leading-none",
          )}
        >
          {initials || <IconUser className="size-1/2" />}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {showOnlineStatus && (
        <span
          className={cn(
            "absolute top-0 left-0 rounded-full ring-2 ring-background",
            sizes.online,
            isOnline ? "bg-ru-green-500" : "bg-muted-foreground",
          )}
        />
      )}

      {badge && (
        <span
          className={cn(
            "absolute flex items-center justify-center rounded-full text-white ring-2 ring-background",
            sizes.badge,
            badge.className,
          )}
        >
          <badge.Icon className={sizes.badgeIcon} />
        </span>
      )}
    </div>
  );
}
