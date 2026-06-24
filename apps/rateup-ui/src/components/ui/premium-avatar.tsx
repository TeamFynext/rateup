import { IconBrandInstagram } from "@tabler/icons-react";
import React from "react";

interface PremiumAvatarProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  showWhatsApp?: boolean;
  showInstagram?: boolean;
  onClick?: () => void;
  variant?: "blue" | "light-blue";
}

// WhatsApp Icon Component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// Extract initials from name (first letter of first name + first letter of last name)
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase();

  // First letter of first name + first letter of last name
  return (parts[0][0] + parts[parts.length - 1][0])?.toUpperCase();
};

// Size configurations
const sizeClasses = {
  xs: {
    container: "w-7 h-7",
    text: "text-[10px]",
    online: "w-1.5 h-1.5 top-0 left-0",
    source: "w-2.5 h-2.5 -bottom-0.5 -right-0.5",
    sourceIcon: "w-1.5 h-1.5",
    ring: "ring-[1.5px]",
  },
  sm: {
    container: "w-9 h-9",
    text: "text-xs",
    online: "w-2 h-2 top-0 left-0",
    source: "w-3 h-3 -bottom-0.5 -right-0.5",
    sourceIcon: "w-1.5 h-1.5",
    ring: "ring-2",
  },
  md: {
    container: "w-11 h-11",
    text: "text-sm",
    online: "w-2 h-2 top-0 left-0",
    source: "w-4 h-4 -bottom-0.5 -right-0.5",
    sourceIcon: "w-2 h-2",
    ring: "ring-2",
  },
  lg: {
    container: "w-14 h-14",
    text: "text-base",
    online: "w-2.5 h-2.5 top-0 left-0",
    source: "w-5 h-5 -bottom-0.5 -right-0.5",
    sourceIcon: "w-2.5 h-2.5",
    ring: "ring-[3px]",
  },
  xl: {
    container: "w-20 h-20",
    text: "text-xl",
    online: "w-2.5 h-2.5 top-0 left-0",
    source: "w-6 h-6 -bottom-1 -right-1",
    sourceIcon: "w-3.5 h-3.5",
    ring: "ring-[3px]",
  },
};

export function PremiumAvatar({
  name,
  size = "md",
  className = "",
  showOnlineStatus = false,
  isOnline = false,
  showWhatsApp = false,
  showInstagram = false,
  onClick,
  variant = "blue",
}: PremiumAvatarProps) {
  const initials = getInitials(name);
  const sizes = sizeClasses[size];
  const [isRippling, setIsRippling] = React.useState(false);

  const handleClick = (_e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      setIsRippling(true);
      setTimeout(() => setIsRippling(false), 600);
      onClick();
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Main Avatar Container - Blue Only */}
      <div
        onClick={handleClick}
        className={`
          ${sizes.container}
          rounded-full
          flex items-center justify-center
          relative
          overflow-hidden
          ${variant === "blue" ? "bg-linear-to-br from-[#2E5BFF] to-[#1E4FDF]" : "bg-linear-to-br from-[#60A5FA] to-[#3B82F6]"}
          ${sizes.ring} ring-white
          shadow-lg shadow-blue-500/30
          transition-all duration-300 ease-out
          ${onClick ? "cursor-pointer" : "cursor-default"}
          hover:shadow-xl hover:shadow-blue-500/40
          hover:scale-105
          active:scale-95
          focus:outline-none focus:ring-4 focus:ring-blue-500/20
          will-change-transform
          group/avatar
        `}
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? "button" : undefined}
        aria-label={onClick ? `View ${name}'s profile` : undefined}
      >
        {/* Subtle Top Highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none opacity-60" />

        {/* Bottom Shadow Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />

        {/* Shimmer Effect on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/avatar:translate-x-full transition-transform duration-1000 ease-out" />
        </div>

        {/* Ripple Effect */}
        {isRippling && <span className="absolute inset-0 animate-ping bg-white/30 rounded-full" />}

        {/* Initials */}
        <span
          className={`
            ${sizes.text} 
            font-bold 
            text-white
            relative
            z-10
            drop-shadow-sm
            transition-transform duration-300
            group-hover/avatar:scale-110
          `}
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
        >
          {initials}
        </span>
      </div>

      {/* Online Status Indicator - Top Right */}
      {showOnlineStatus && (
        <div className={`absolute ${sizes.online} z-20`}>
          <div className="relative w-full h-full">
            {/* Main Status Dot with enhanced styling */}
            <span
              className={`
                block
                w-full h-full
                rounded-full 
                ${isOnline ? "bg-linear-to-br from-green-400 to-green-600" : "bg-linear-to-br from-gray-400 to-gray-500"} 
                ring-2 ring-white
                shadow-lg
                ${isOnline ? "shadow-green-500/40" : "shadow-gray-400/30"}
                transition-all
                duration-300
                group-hover/avatar:scale-110
              `}
            />

            {/* Inner Highlight */}
            <div className="absolute inset-0 rounded-full bg-linear-to-br from-white/40 to-transparent opacity-60" />

            {/* Pulse Ring for Online */}
            {isOnline && (
              <>
                <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
                <span className="absolute inset-[-2px] rounded-full bg-green-400/30 blur-[2px] animate-pulse" />
              </>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Icon - Bottom Right */}
      {showWhatsApp && (
        <div
          className={`
            absolute ${sizes.source} z-20
            rounded-full
            bg-linear-to-br from-[#25D366] to-[#1DA851]
            ring-2 ring-white
            flex items-center justify-center
            shadow-lg shadow-green-500/30
            transition-all duration-300
            group-hover/avatar:scale-110 group-hover/avatar:rotate-6
            group-hover/avatar:shadow-xl group-hover/avatar:shadow-green-500/50
          `}
        >
          {/* Inner Highlight */}
          <div className="absolute inset-0 rounded-full bg-linear-to-br from-white/30 to-transparent opacity-60" />

          <WhatsAppIcon
            className={`
              ${sizes.sourceIcon} 
              text-white 
              relative z-10
              drop-shadow-sm
              transition-transform duration-300 
              group-hover/avatar:scale-110
            `}
          />

          {/* WhatsApp badge glow on hover */}
          <div className="absolute inset-[-2px] rounded-full bg-green-400/30 blur-[2px] opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300" />
        </div>
      )}

      {/* Instagram Icon - Bottom Right */}
      {showInstagram && (
        <div
          className={`
            absolute ${sizes.source} z-20
            rounded-full
            bg-linear-to-br from-[#E4405F] via-[#F77737] to-[#FCAF45]
            ring-2 ring-white
            flex items-center justify-center
            shadow-lg shadow-pink-500/30
            transition-all duration-300
            group-hover/avatar:scale-110 group-hover/avatar:rotate-6
            group-hover/avatar:shadow-xl group-hover/avatar:shadow-pink-500/50
          `}
        >
          {/* Inner Highlight */}
          <div className="absolute inset-0 rounded-full bg-linear-to-br from-white/30 to-transparent opacity-60" />

          <IconBrandInstagram
            className={`
              ${sizes.sourceIcon} 
              text-white 
              relative z-10
              drop-shadow-sm
              transition-transform duration-300 
              group-hover/avatar:scale-110
            `}
          />

          {/* Instagram badge glow on hover */}
          <div className="absolute inset-[-2px] rounded-full bg-pink-400/30 blur-[2px] opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300" />
        </div>
      )}
    </div>
  );
}
