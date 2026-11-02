import { IconChevronRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  DM,
  DmComposer,
  DmHeader,
  DmProfileCard,
  DmThread,
} from "@/components/common/dm-preview-shell.tsx";
import { cn } from "@/lib/utils.ts";

/** Meta's placeholder for the person's first name, shown as a name in the preview. */
const FIRST_NAME = /\{\{user_first_name\}\}/g;

/**
 * A new Messenger chat with a Page, before the person types: the Page's card with its
 * greeting, the ice breakers to tap and the Get Started button. Drawn on the thread the
 * Instagram previews use (see common/dm-preview-shell.tsx).
 */
export function MessengerWelcomePhone({
  name,
  greeting,
  getStarted,
  iceBreakers,
}: Readonly<{
  name: string;
  greeting: string | null;
  /** Whether a Get Started button is set. */
  getStarted: boolean;
  iceBreakers: readonly string[];
}>) {
  const { t } = useTranslation();
  const title = name || "Your Page";
  const questions = iceBreakers.filter((q) => q.trim());

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DmHeader name={title} subtitle={t("Typically replies instantly")} />
      <DmThread
        className="gap-1.5"
        footer={
          getStarted ? (
            <div className="shrink-0 px-3 pt-2 pb-6">
              <div
                className={cn(
                  "rounded-xl py-2.5 text-center text-[14px] font-semibold",
                  DM.field,
                  DM.link,
                )}
              >
                {t("Get Started")}
              </div>
            </div>
          ) : (
            <DmComposer />
          )
        }
      >
        <DmProfileCard name={title} label="Messenger">
          {greeting ? (
            <p className="mt-2 max-w-[90%] text-[13px] leading-4.5 whitespace-pre-wrap [overflow-wrap:anywhere]">
              {greeting.replace(FIRST_NAME, "Alex")}
            </p>
          ) : (
            <p className={cn("mt-2 text-[12px] italic", DM.muted)}>{t("No greeting set")}</p>
          )}
        </DmProfileCard>
        {questions.length > 0 && (
          <div className="mt-auto flex flex-col gap-1.5 pb-1">
            {questions.map((question, i) => (
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
            ))}
          </div>
        )}
      </DmThread>
    </div>
  );
}
