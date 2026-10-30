import {
  IconArrowLeft,
  IconCameraFilled,
  IconCirclePlus,
  IconMenu2,
  IconMicrophone,
  IconPhone,
  IconPhoto,
  IconSticker,
  IconUserFilled,
  IconVideo,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

/*
 * An Instagram direct-message thread as the customer sees it — the one look the Instagram and
 * Messenger previews share (ice breakers, persistent menu, ig.me links, automations, chatbot
 * playground). Instagram's own colours, not the app palette: this is a picture of another
 * product. Light and dark follow Instagram's two themes.
 */

/** Instagram's colours as class strings, light then dark. */
export const DM = {
  screen: "bg-white text-black dark:bg-black dark:text-white",
  incoming: "bg-[#efefef] text-black dark:bg-[#262626] dark:text-white",
  /**
   * The sender's bubbles: Instagram's purple-to-blue, fixed to the screen so a bubble's colour
   * depends on where it sits — purple at the top, blue at the bottom, as in the app.
   */
  outgoing: "bg-linear-to-b from-[#a033ff] via-[#6f43f2] to-[#4b5cf5] bg-fixed text-white",
  muted: "text-[#737373] dark:text-[#a8a8a8]",
  link: "text-[#4a5df9] dark:text-[#7c8bff]",
  /** Pills, chips and the composer. */
  field: "bg-[#efefef] dark:bg-[#262626]",
  divider: "border-[#dbdbdb] dark:border-[#262626]",
} as const;

/** The business's picture: its logo, or Instagram's grey placeholder. */
export function DmAvatar({ className }: Readonly<{ className?: string }>) {
  const { user } = useUser();
  const logo = user?.orgLogo ? getFileUrlFromKey(user.orgLogo) : "";
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        className={cn("size-7 shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-end justify-center overflow-hidden rounded-full bg-[#dbdbdb]",
        className,
      )}
    >
      <IconUserFilled className="size-[85%] translate-y-[12%] text-white" />
    </span>
  );
}

export function DmHeader({
  name,
  subtitle,
}: Readonly<{
  name?: string;
  /** Under the name; defaults to "Business chat". */
  subtitle?: string;
}>) {
  const { user } = useUser();
  const { t } = useTranslation();
  const title = name || user?.orgName || "Your business";
  return (
    <div className={cn("flex h-12 shrink-0 items-center gap-2.5 pr-3 pl-2", DM.screen)}>
      <IconArrowLeft className="size-5 shrink-0" aria-hidden />
      <DmAvatar className="size-8" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] leading-4.5 font-semibold">{title}</span>
        <span className={cn("truncate text-[11.5px] leading-4", DM.muted)}>
          {subtitle ?? t("Business chat")}
        </span>
      </div>
      <IconPhone className="size-5 shrink-0" aria-hidden />
      <IconVideo className="size-5 shrink-0" aria-hidden />
      <IconMenu2 className="size-5 shrink-0" aria-hidden />
    </div>
  );
}

/** Profile card at the top of a new thread: picture, name, and what the account is. */
export function DmProfileCard({ name }: Readonly<{ name?: string }>) {
  const { user } = useUser();
  const title = name || user?.orgName || "Your business";
  return (
    <div className="flex flex-col items-center gap-1 px-3 pt-4 pb-3 text-center">
      <DmAvatar className="size-18" />
      <p className="mt-1 text-[15px] font-semibold">{title}</p>
      <p className={cn("text-[12px]", DM.muted)}>Instagram</p>
    </div>
  );
}

/** A plain text message: grey for the business, the gradient for the customer. */
export function DmBubble({
  outgoing = false,
  children,
  className,
}: Readonly<{ outgoing?: boolean; children: ReactNode; className?: string }>) {
  return (
    <div
      className={cn(
        "w-fit max-w-[78%] rounded-[22px] px-3.5 py-2 text-[14px] leading-5 whitespace-pre-wrap [overflow-wrap:anywhere]",
        outgoing ? cn("self-end", DM.outgoing) : cn("self-start", DM.incoming),
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A run of the business's messages: stacked tight, with its picture beside the last one,
 * as Instagram groups them.
 */
export function DmIncomingGroup({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex items-end gap-2 self-stretch">
      <DmAvatar />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 [&>*]:max-w-[88%]">
        {children}
      </div>
    </div>
  );
}

/** The centred time between runs ("20 OCT, 5:23 PM"). */
export function DmTimestamp({ children }: Readonly<{ children?: ReactNode }>) {
  const clock = new Date()
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .toUpperCase();
  return (
    <p className={cn("py-2 text-center text-[11.5px] font-medium", DM.muted)}>
      {children ?? clock}
    </p>
  );
}

/** A centred system line ("… messaged you about a comment …"). */
export function DmNote({ children }: Readonly<{ children: ReactNode }>) {
  return <p className={cn("px-4 py-1 text-center text-[12px] leading-4", DM.muted)}>{children}</p>;
}

/** "Seen" under the customer's last message. */
export function DmSeen() {
  const { t } = useTranslation();
  return <p className={cn("-mt-0.5 self-end pr-1 text-[11.5px]", DM.muted)}>{t("Seen")}</p>;
}

/**
 * The composer: a pill with the blue camera, "Message…", and the mic, photo, sticker and plus
 * icons. Pass `children` to put a working control in the pill, and `action` to replace the
 * trailing icons (e.g. with a Send button).
 */
export function DmComposer({
  children,
  action,
}: Readonly<{ children?: ReactNode; action?: ReactNode }>) {
  const { t } = useTranslation();
  return (
    <div className="shrink-0 px-2 pt-1 pb-5">
      <div className={cn("flex h-11 items-center gap-2 rounded-full pr-3 pl-1.5", DM.field)}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#4a5df9]">
          <IconCameraFilled className="size-4.5 text-white" aria-hidden />
        </span>
        {children ?? (
          <span className={cn("min-w-0 flex-1 truncate text-[14px]", DM.muted)}>
            {t("Message...")}
          </span>
        )}
        {action ?? (
          <span className="flex shrink-0 items-center gap-2.5" aria-hidden>
            <IconMicrophone className="size-5" />
            <IconPhoto className="size-5" />
            <IconSticker className="size-5" />
            <IconCirclePlus className="size-5" />
          </span>
        )}
      </div>
    </div>
  );
}

/** The thread itself: plain background, scrolling, with an optional footer under it. */
export function DmThread({
  children,
  className,
  footer,
}: Readonly<{ children: ReactNode; className?: string; footer?: ReactNode }>) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", DM.screen)}>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-3 py-2",
          className,
        )}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}

/** Header, thread and composer: a whole Instagram chat screen around `children`. */
export function DmChatShell({
  children,
  name,
  subtitle,
  footer,
  threadClassName,
}: Readonly<{
  children: ReactNode;
  name?: string;
  subtitle?: string;
  /** Replaces the composer. */
  footer?: ReactNode;
  threadClassName?: string;
}>) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <DmHeader name={name} subtitle={subtitle} />
      <DmThread className={threadClassName} footer={footer ?? <DmComposer />}>
        {children}
      </DmThread>
    </div>
  );
}
