import {
  IconBuildingStore,
  IconCamera,
  IconChevronLeft,
  IconDotsVertical,
  IconMicrophone,
  IconMoodSmile,
  IconPaperclip,
  IconX,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useUser } from "@/context/UserContext.tsx";

export function WhatsAppChatHeader({
  contactName,
}: Readonly<{
  contactName?: string;
}>) {
  const { user } = useUser();
  const name = contactName || user?.orgName || "Business";

  return (
    <div className="flex shrink-0 items-center gap-2 bg-white px-2 py-2 dark:bg-[#091114]">
      <IconChevronLeft className="size-5 text-[#1f2937] dark:text-[#e9edef]" />
      <div className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-600 dark:bg-amber-900 dark:text-amber-300">
        {name.charAt(0).toUpperCase()}
      </div>
      <span className="flex-1 truncate text-[13px] font-medium text-[#1f2937] dark:text-[#e9edef]">
        {name}
      </span>
      <IconBuildingStore className="size-4.5 text-[#1f2937] dark:text-[#aebac1]" />
      <IconDotsVertical className="size-4.5 text-[#1f2937] dark:text-[#aebac1]" />
    </div>
  );
}

export function WhatsAppChatInputBar() {
  return (
    <div className="flex shrink-0 items-center gap-1.5 px-2 py-1.5 bg-[#f4f1ea] dark:bg-[#0b141a]">
      <div className="flex flex-1 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 dark:bg-[#2a3942]">
        <IconMoodSmile className="size-4 shrink-0 text-[#54656f] dark:text-[#8696a0]" />
        <span className="flex-1 truncate text-[11px] text-[#8696a0]">Message</span>
        <IconPaperclip className="size-4 shrink-0 text-[#54656f] dark:text-[#8696a0]" />
        <IconCamera className="size-4 shrink-0 text-[#54656f] dark:text-[#8696a0]" />
      </div>
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#00a884]">
        <IconMicrophone className="size-4 text-white" />
      </div>
    </div>
  );
}

export function WhatsAppChatShell({
  children,
  contactName,
}: Readonly<{
  children: ReactNode;
  contactName?: string;
}>) {
  return (
    <div className="flex h-full flex-col">
      <WhatsAppChatHeader contactName={contactName} />
      <div className="flex-1 overflow-y-auto bg-[#f4f1ea] dark:bg-[#0b141a]">{children}</div>
      <WhatsAppChatInputBar />
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
