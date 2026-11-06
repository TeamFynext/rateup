import {
  IconArrowLeft,
  IconBuildingStore,
  IconCamera,
  IconCaretDownFilled,
  IconChecks,
  IconDotsVertical,
  IconMicrophoneFilled,
  IconPaperclip,
  IconPhone,
  IconSticker,
  IconX,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

/*
 * The WhatsApp chat as the customer sees it on Android — the one look every WhatsApp preview
 * uses (template editor, campaign wizard, automations, chatbot playground, flows, share
 * messages). WhatsApp's own colours, not the app palette: this is a picture of another
 * product. Light and dark follow WhatsApp's two themes.
 */

/** WhatsApp's colours as class strings, light then dark. */
export const WA = {
  /** Header and status bar. */
  bar: "bg-white text-[#111b21] dark:bg-[#0b141a] dark:text-[#e9edef]",
  wallpaper: "bg-[#efeae2] dark:bg-[#0b141a]",
  incoming: "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]",
  outgoing: "bg-[#d9fdd3] text-[#111b21] dark:bg-[#144d37] dark:text-[#e9edef]",
  /** Times, footers, subtitles. */
  muted: "text-[#667781] dark:text-[#8696a0]",
  /** Link and button text inside a bubble. */
  link: "text-[#027eb5] dark:text-[#53bdeb]",
  divider: "border-[#e9edef] dark:border-[#2a3942]",
  shadow: "shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]",
  icon: "text-[#54656f] dark:text-[#aebac1]",
} as const;

function nowClock() {
  return new Date()
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
}

/** The business's avatar: its logo, or its initials on WhatsApp green. */
function WaAvatar({ name }: Readonly<{ name: string }>) {
  const { user } = useUser();
  const logo = user?.orgLogo ? getFileUrlFromKey(user.orgLogo) : "";
  if (logo) {
    return <img src={logo} alt="" className="size-9 shrink-0 rounded-full bg-white object-cover" />;
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-[13px] font-semibold text-white">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function WhatsAppChatHeader({
  contactName,
  subtitle,
}: Readonly<{
  contactName?: string;
  /** Under the name; defaults to "Business account". */
  subtitle?: string;
}>) {
  const { user } = useUser();
  const { t } = useTranslation();
  const name = contactName || user?.orgName || "Business";

  return (
    <div className={cn("flex h-12 shrink-0 items-center gap-2 pr-2 pl-1.5", WA.bar)}>
      <IconArrowLeft className="size-5 shrink-0" aria-hidden />
      <WaAvatar name={name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] leading-5 font-medium">{name}</span>
        <span className={cn("truncate text-[11.5px] leading-4", WA.muted)}>
          {subtitle ?? t("Business account")}
        </span>
      </div>
      <IconBuildingStore className="size-5 shrink-0" aria-hidden />
      <span className="flex shrink-0 items-center">
        <IconPhone className="size-5" aria-hidden />
        <IconCaretDownFilled className="size-3" aria-hidden />
      </span>
      <IconDotsVertical className="size-5 shrink-0" aria-hidden />
    </div>
  );
}

/**
 * WhatsApp's doodle wallpaper: a tile of small line drawings, faint on the chat colour.
 * Drawn here rather than copied, so it reads as WhatsApp without being their artwork.
 */
export function WaWallpaper({
  children,
  className,
}: Readonly<{ children?: ReactNode; className?: string }>) {
  const id = useId();
  return (
    <div className={cn("relative isolate flex min-h-0 flex-1 flex-col", WA.wallpaper, className)}>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 size-full text-[#ded6ca] dark:text-[#18232a]"
      >
        <defs>
          <pattern id={id} width="168" height="168" patternUnits="userSpaceOnUse">
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="16" cy="18" r="6" />
              <path
                d="M58 6l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"
                transform="rotate(14 58 14)"
              />
              <path
                d="M104 14h18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-10l-5 4v-4h-3a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z"
                transform="rotate(-8 112 22)"
              />
              <path d="M150 40c-3-4-9-1-6 4l6 6 6-6c3-5-3-8-6-4z" />
              <g transform="rotate(-12 36 62)">
                <rect x="26" y="54" width="20" height="15" rx="3" />
                <circle cx="36" cy="61.5" r="4" />
              </g>
              <path d="M84 52v12M78 58h12" />
              <path d="M118 76c4-5 9-5 13 0s9 5 13 0" />
              <path d="M10 96l7 12H3z" transform="rotate(10 10 102)" />
              <path d="M52 92a10 10 0 1 0 10 10" />
              <path d="M62 92v10h-10" />
              <circle cx="98" cy="104" r="2" />
              <circle cx="106" cy="98" r="1.5" />
              <path d="M140 110l14 4-10 10z" />
              <path d="M24 140h16l-2 14H26z" />
              <path d="M28 140c0-4 8-4 8 0" />
              <path d="M70 136c0 6 5 10 10 10s10-4 10-10" transform="rotate(20 80 140)" />
              <path d="M112 146l3 3 6-7" />
              <circle cx="116" cy="146" r="8" />
              <path d="M150 156l8-8M150 148l8 8" />
              <path d="M2 54h6M5 51v6" />
              <path d="M88 20c3 0 5 2 5 5" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      {children}
    </div>
  );
}

/** The day chip in the middle of the chat ("Today", "Wednesday"). */
export function WaDateChip({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span
      className={cn(
        "self-center rounded-lg bg-white px-2.5 py-1 text-center text-[11.5px] font-medium text-[#54656f] dark:bg-[#182229] dark:text-[#8696a0]",
        WA.shadow,
      )}
    >
      {children}
    </span>
  );
}

/** WhatsApp's bubble tail; mirrored for outgoing messages. */
export function WaTail({ outgoing = false }: Readonly<{ outgoing?: boolean }>) {
  return (
    <svg
      viewBox="0 0 8 13"
      aria-hidden
      className={cn(
        "absolute top-0 h-3.25 w-2",
        outgoing
          ? "-right-2 -scale-x-100 text-[#d9fdd3] dark:text-[#144d37]"
          : "-left-2 text-white dark:text-[#202c33]",
      )}
    >
      <path fill="currentColor" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z" />
    </svg>
  );
}

/** The time in a bubble's corner, with room kept for it on the last line, and ticks when sent. */
export function WaTime({ time, ticks = false }: Readonly<{ time?: string; ticks?: boolean }>) {
  return (
    <>
      <span aria-hidden className={cn("inline-block", ticks ? "w-17" : "w-13")} />
      <span
        className={cn(
          "absolute right-2 bottom-1 flex items-center gap-0.5 text-[11px] leading-none not-italic",
          WA.muted,
        )}
      >
        {time ?? nowClock()}
        {ticks && <IconChecks className="size-4 text-[#53bdeb]" aria-hidden />}
      </span>
    </>
  );
}

/**
 * A plain text message. `outgoing` is the customer's own (green, right, blue ticks); otherwise
 * it is the business's (white, left). The tail shows on the first message of a run.
 */
export function WaBubble({
  outgoing = false,
  tail = true,
  time,
  children,
  className,
}: Readonly<{
  outgoing?: boolean;
  tail?: boolean;
  time?: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "relative max-w-[85%] rounded-lg px-2 pt-1.5 pb-2 text-[14.2px] leading-4.75 whitespace-pre-wrap [overflow-wrap:anywhere]",
        WA.shadow,
        outgoing ? cn("mr-2 self-end", WA.outgoing) : cn("ml-2 self-start", WA.incoming),
        tail && (outgoing ? "rounded-tr-none" : "rounded-tl-none"),
        className,
      )}
    >
      {tail && <WaTail outgoing={outgoing} />}
      {children}
      <WaTime time={time} ticks={outgoing} />
    </div>
  );
}

/** The message thread: wallpaper, scrolling, WhatsApp's spacing. */
export function WaThread({
  children,
  className,
  footer,
}: Readonly<{
  children: ReactNode;
  className?: string;
  /** Drawn under the messages, on the wallpaper (the composer, a note). */
  footer?: ReactNode;
}>) {
  return (
    <WaWallpaper>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto px-2 py-3",
          className,
        )}
      >
        {children}
      </div>
      {footer}
    </WaWallpaper>
  );
}

/**
 * The composer: a pill with sticker, "Message", attach and camera, and the green mic. It sits
 * on the wallpaper, as WhatsApp's does. Pass `children` to put a working control in the pill.
 */
export function WhatsAppChatInputBar({
  children,
  action,
}: Readonly<{
  children?: ReactNode;
  /** Replaces the mic button, e.g. with a send button. */
  action?: ReactNode;
}>) {
  const { t } = useTranslation();
  return (
    // Transparent: it sits on the wallpaper, so the doodles run behind it.
    <div className="flex shrink-0 items-end gap-1.5 px-1.5 pt-1 pb-5">
      <div
        className={cn(
          "flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 dark:bg-[#1f272a]",
          WA.shadow,
        )}
      >
        <IconSticker className={cn("size-5 shrink-0", WA.icon)} aria-hidden />
        {children ?? (
          <span className={cn("flex-1 truncate text-[14px]", WA.muted)}>{t("Message")}</span>
        )}
        {!children && (
          <>
            <IconPaperclip className={cn("size-5 shrink-0 -rotate-45", WA.icon)} aria-hidden />
            <IconCamera className={cn("size-5 shrink-0", WA.icon)} aria-hidden />
          </>
        )}
      </div>
      {action ?? (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1daa61] dark:bg-[#21c063]">
          <IconMicrophoneFilled className="size-5 text-white dark:text-[#0b141a]" aria-hidden />
        </span>
      )}
    </div>
  );
}

/** Header, thread and composer: a whole WhatsApp chat screen around `children`. */
export function WhatsAppChatShell({
  children,
  contactName,
  subtitle,
  footer,
  threadClassName,
}: Readonly<{
  children: ReactNode;
  contactName?: string;
  subtitle?: string;
  /** Replaces the composer (e.g. with a playground's controls). */
  footer?: ReactNode;
  threadClassName?: string;
}>) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <WhatsAppChatHeader contactName={contactName} subtitle={subtitle} />
      <WaThread className={threadClassName} footer={footer ?? <WhatsAppChatInputBar />}>
        {children}
      </WaThread>
    </div>
  );
}

/**
 * Shared chrome for the WhatsApp Flow bottom-sheet preview: drag handle, ×/title/⋮ header,
 * scrollable content area, and the "Continue" footer. Used by both the v1 and v2 flow editors
 * so the sheet looks identical regardless of which flow JSON shape is rendering the content.
 */
export function FlowSheetShell({
  children,
  title,
  footerLabel,
}: Readonly<{
  children: ReactNode;
  title?: string;
  footerLabel?: string;
}>) {
  const { t: translations } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      {/* Drag handle */}
      <div className="flex shrink-0 justify-center pt-2 pb-1">
        <div className="h-1 w-8 rounded-full bg-border" />
      </div>

      {/* Header: × | Title | ⋮ */}
      <div className="flex shrink-0 items-center justify-between px-2">
        <IconX className="size-4.5 text-muted-foreground" />
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-center text-[13px] font-semibold text-foreground">
          {title || translations("Screen")}
        </span>
        <IconDotsVertical className="size-4.5 text-muted-foreground" />
      </div>
      <div className="h-px shrink-0 bg-border" />

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&:hover::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
        <div className="space-y-0">{children}</div>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 flex-col items-center gap-1.5 bg-background px-3 pb-2.5 pt-2">
        <button
          type="button"
          className="bg-wa-green hover:bg-[#1da851] h-auto w-full rounded-3xl py-2.5 text-[13px] font-semibold text-white"
        >
          {footerLabel || translations("Continue")}
        </button>
        <p className="m-0 text-center text-[9px] text-muted-foreground">
          {translations("Managed by the business.")}{" "}
          <span className="text-wa-green cursor-pointer">{translations("Learn more")}</span>
        </p>
      </div>
    </div>
  );
}
