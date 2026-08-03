import { MessagePlatform } from "@/types/enums.ts";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar.tsx";
import { getAvatarInitials, isEmojiName } from "./utils.ts";

interface CreativeAvatarProps {
  name: string | undefined;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  onlineStatusPosition?: "topLeft" | "bottomRight";
  src?: string | null;
  showRing?: boolean;
  platform?: string;
  variant?: "light-blue";
  ringClassName?: string;
}

// Generate a consistent color based on the name
const getAvatarColor = (name: string) => {
  if (!name)
    return {
      bg: "bg-linear-to-br from-blue-500 to-blue-600",
      ring: "ring-blue-200",
      text: "text-white",
    };
  const colors = [
    {
      bg: "bg-linear-to-br from-blue-500 to-blue-600",
      ring: "ring-blue-200",
      text: "text-white",
    },
    {
      bg: "bg-linear-to-br from-purple-500 to-purple-600",
      ring: "ring-purple-200",
      text: "text-white",
    },
    {
      bg: "bg-linear-to-br from-pink-500 to-pink-600",
      ring: "ring-pink-200",
      text: "text-white",
    },
    {
      bg: "bg-linear-to-br from-orange-500 to-orange-600",
      ring: "ring-orange-200",
      text: "text-white",
    },
    {
      bg: "bg-linear-to-br from-green-500 to-green-600",
      ring: "ring-green-200",
      text: "text-white",
    },
    {
      bg: "bg-linear-to-br from-teal-500 to-teal-600",
      ring: "ring-teal-200",
      text: "text-white",
    },
    {
      bg: "bg-linear-to-br from-indigo-500 to-indigo-600",
      ring: "ring-indigo-200",
      text: "text-white",
    },
    {
      bg: "bg-linear-to-br from-red-500 to-red-600",
      ring: "ring-red-200",
      text: "text-white",
    },
    {
      bg: "bg-linear-to-br from-cyan-500 to-cyan-600",
      ring: "ring-cyan-200",
      text: "text-white",
    },
    {
      bg: "bg-linear-to-br from-emerald-500 to-emerald-600",
      ring: "ring-emerald-200",
      text: "text-white",
    },
    {
      bg: "bg-linear-to-br from-violet-500 to-violet-600",
      ring: "ring-violet-200",
      text: "text-white",
    },
    {
      bg: "bg-linear-to-br from-fuchsia-500 to-fuchsia-600",
      ring: "ring-fuchsia-200",
      text: "text-white",
    },
  ];

  // Generate a hash from the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (name.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Size configurations
const sizeClasses = {
  xs: {
    container: "w-6 h-6",
    text: "text-[9px]",
    ring: "ring-1",
    online: {
      bottomRight: "w-1.5 h-1.5 -bottom-0 -right-0 border",
      topLeft: "w-1.5 h-1.5 -top-0 -left-0 border",
    },
  },
  sm: {
    container: "w-8 h-8",
    text: "text-[11px]",
    ring: "ring-2",
    online: {
      bottomRight: "w-2 h-2 -bottom-0.5 -right-0.5 border",
      topLeft: "w-2 h-2 -top-0.5 -left-0.5 border",
    },
  },
  md: {
    container: "w-10 h-10",
    text: "text-sm",
    ring: "ring-2",
    online: {
      bottomRight: "w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-2",
      topLeft: "w-2.5 h-2.5 -top-0.5 -left-0.5 border-2",
    },
  },
  lg: {
    container: "w-12 h-12",
    text: "text-base",
    ring: "ring-3",
    online: {
      bottomRight: "w-3 h-3 -bottom-1 -right-1 border-2",
      topLeft: "w-3 h-3 -top-1 -left-1 border-2",
    },
  },
  xl: {
    container: "w-16 h-16",
    text: "text-lg",
    ring: "ring-3",
    online: {
      topLeft: "w-3.5 h-3.5 -top-1 -left-1 border-2",
      bottomRight: "w-3.5 h-3.5 -bottom-1 -right-1 border-2",
    },
  },
};

function getAvatarColorFromPlatform(platform: string) {
  switch (platform) {
    case MessagePlatform.WHATSAPP:
      return {
        bg: "bg-linear-to-br from-emerald-500 to-emerald-600",
        ring: "ring-green-200",
        text: "text-white",
      };
    case MessagePlatform.INSTAGRAM:
      return {
        bg: "bg-linear-to-br from-pink-500 to-pink-600",
        ring: "ring-pink-200",
        text: "text-white",
      };
    case MessagePlatform.WEBCHAT:
      return {
        bg: "bg-linear-to-br from-blue-500 to-blue-600",
        ring: "ring-blue-200",
        text: "text-white",
      };
    default:
      return getAvatarColor("default");
  }
}

export function CreativeAvatar({
  name,
  size = "md",
  className = "",
  showOnlineStatus = false,
  isOnline = false,
  onlineStatusPosition = "bottomRight",
  src = null,
  showRing = false,
  platform,
  variant,
  ringClassName,
}: Readonly<CreativeAvatarProps>) {
  const initials = getAvatarInitials(name ?? "");
  // An emoji is the whole identity, not an abbreviation of one: it gets no drop
  // shadow (which muddies a colour glyph) and a size step up so it reads at xs.
  const showsEmoji = isEmojiName(name ?? "");
  const colors =
    variant || ringClassName
      ? {
          bg: "bg-primary/10",
          ring: ringClassName ?? "ring-1 ring-slate-100 dark:ring-slate-800",
          text: "text-primary",
        }
      : platform
        ? getAvatarColorFromPlatform(platform)
        : getAvatarColor(name ?? "");

  const sizes = sizeClasses[size];

  return (
    <div className={`relative ${className}`}>
      <Avatar
        className={`${sizes.container} ${showRing ? sizes.ring : ""} ${showRing ? colors.ring : ""} shadow-sm`}
      >
        <AvatarImage src={src || undefined} alt={name} />
        <AvatarFallback
          className={`${colors.bg} ${colors.text} ${sizes.text} font-semibold tracking-tight`}
        >
          <span className={showsEmoji ? "text-[1.35em] leading-none" : "drop-shadow-sm"}>
            {initials}
          </span>
        </AvatarFallback>
      </Avatar>
      {showOnlineStatus && (
        <span
          className={`absolute ${sizes.online[onlineStatusPosition]} rounded-full ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          } border-white`}
        />
      )}
    </div>
  );
}
