import { IconChevronRight, IconSend } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  DM,
  DmBubble,
  DmComposer,
  DmHeader,
  DmIncomingGroup,
  DmNote,
  DmProfileCard,
  DmThread,
  DmTimestamp,
} from "@/components/common/dm-preview-shell.tsx";
import { cn } from "@/lib/utils.ts";

/** A new thread: the profile card, then Instagram's ice-breaker questions to tap. */
export function IceBreakersPhone({
  items,
  businessName,
}: Readonly<{
  items: { question: string }[];
  businessName: string;
}>) {
  const { t } = useTranslation();
  const name = businessName || "Your Business";
  const questions = items.map((i) => i.question).filter((q) => q.trim());
  const shown = questions.length > 0 ? questions : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DmHeader name={name} />
      <DmThread className="justify-end gap-1.5" footer={<DmComposer />}>
        <DmProfileCard name={name} />
        <div className="mt-auto flex flex-col gap-1.5 pb-1">
          {shown
            ? shown.map((question, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-[13.5px]",
                    DM.field,
                  )}
                >
                  <span className="line-clamp-2">{question}</span>
                  <IconChevronRight className={cn("size-4 shrink-0", DM.muted)} aria-hidden />
                </div>
              ))
            : [t("Your question here..."), t("Another question...")].map((question) => (
                <div
                  key={question}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-2xl border border-dashed px-3.5 py-2.5 text-[13.5px]",
                    DM.divider,
                    DM.muted,
                  )}
                >
                  <span>{question}</span>
                  <IconChevronRight className="size-4 shrink-0" aria-hidden />
                </div>
              ))}
        </div>
      </DmThread>
    </div>
  );
}

/** A live chat with the persistent menu opened over it as Instagram's bottom sheet. */
export function PersistentMenuPhone({
  items,
  businessName,
}: Readonly<{
  items: { title: string; type: string; url?: string }[];
  businessName: string;
}>) {
  const { t } = useTranslation();
  const name = businessName || "Your Business";
  const suggestions = items.filter((i) => i.type !== "web_url" && i.title.trim());
  const websiteItem = items.find((i) => i.type === "web_url" && i.title.trim());

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <DmHeader name={name} />

      {/* The chat behind the sheet */}
      <DmThread footer={<DmComposer />}>
        <DmTimestamp>10:32 AM</DmTimestamp>
        <DmBubble outgoing>{t("Live chat with a person")}</DmBubble>
        <DmNote>{t("Shane joined the chat")}</DmNote>
        <DmIncomingGroup>
          <DmBubble>
            {t(
              "Hi! My name is Shane! I'm a customer support rep with {name}, how can I help you?",
              { name },
            )}
          </DmBubble>
        </DmIncomingGroup>
      </DmThread>

      {/* Dim overlay + bottom sheet */}
      <div className="absolute inset-0 bg-black/40">
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 rounded-t-2xl pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.12)]",
            DM.screen,
            "dark:bg-[#262626]",
          )}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1 w-9 rounded-full bg-[#dbdbdb] dark:bg-[#555]" />
          </div>
          <p className="px-3 text-center text-[14px] font-semibold">{t("More options")}</p>
          <p className={cn("px-3 pb-3 text-center text-[12px]", DM.muted)}>
            {t("Tap to send a suggestion from {name}", { name })}
          </p>
          <div className="flex flex-col gap-1.5 px-4 pb-2">
            {(suggestions.length > 0
              ? suggestions
              : [{ title: t("Nearby locations") }, { title: t("Refund policy") }]
            ).map((item, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full px-3 py-2 text-center text-[13.5px] font-semibold",
                  DM.field,
                  "dark:bg-[#363636]",
                  DM.link,
                )}
              >
                {item.title}
              </div>
            ))}
          </div>
          {websiteItem && (
            <div className={cn("mx-4 border-t pt-2 text-center", DM.divider)}>
              <p className="text-[13.5px] font-semibold">{t("Visit the website")}</p>
              <p className={cn("truncate text-[12px]", DM.muted)}>{websiteItem.url}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** A thread opened from an ig.me link: the notice Instagram shows, and what the bot receives. */
export function IgMeLinkPhone({
  link,
  businessName,
}: Readonly<{
  link: string;
  businessName: string;
}>) {
  const { t } = useTranslation();
  const name = businessName || "Your Business";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DmHeader name={name} />
      <DmThread className="gap-2" footer={<DmComposer />}>
        <DmProfileCard name={name} />
        <p className={cn("text-center font-mono text-[11px] break-all", DM.link)}>
          {link || "ig.me/m/username?ref=..."}
        </p>
        {/* The notice Instagram itself shows in a thread opened from a link. */}
        <DmNote>
          {t(
            "You opened this conversation from a link. {name} will see that you used their link once you send a message.",
            { name },
          )}
        </DmNote>
        <div className="mt-auto flex items-center gap-1.5 rounded-lg bg-amber-50 p-2 dark:bg-amber-950/30">
          <IconSend className="size-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            {t("ref parameter is sent to your bot as a hidden payload")}
          </p>
        </div>
      </DmThread>
    </div>
  );
}
