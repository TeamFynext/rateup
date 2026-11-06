// An editor with what the customer sees beside it: the phone sits next to the form while the
// workspace is wide enough, and collapses to the Preview button (the side panel) when it is not.
// Both draw the same `preview`, so it follows the form as it changes.

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  PhonePreviewButton,
  PhoneScreen,
  type PhonePlatform,
} from "@/components/ui/phone-preview.tsx";

/** Wraps the editor; `preview` is one app screen (e.g. `IceBreakersPhone`). */
export function WithChannelPreview({
  platform,
  preview,
  children,
}: Readonly<{ platform: PhonePlatform; preview: ReactNode; children: ReactNode }>) {
  const { t } = useTranslation();
  return (
    <div className="@container/preview">
      <div className="grid items-start gap-5 @3xl/preview:grid-cols-[minmax(0,1fr)_16.5rem]">
        <div className="min-w-0">{children}</div>
        <aside aria-label={t("Live preview")} className="sticky top-4 hidden @3xl/preview:block">
          <p className="mb-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-green-600 dark:bg-green-500" aria-hidden />
            {t("Live preview")}
          </p>
          <PhoneScreen platform={platform} className="w-66">
            {preview}
          </PhoneScreen>
        </aside>
      </div>
    </div>
  );
}

/** The Preview button, for a section header; only shown while the phone does not fit beside it. */
export function ChannelPreviewButton({
  platform,
  children,
}: Readonly<{ platform: PhonePlatform; children: ReactNode }>) {
  return (
    <span className="@3xl/preview:hidden">
      <PhonePreviewButton platform={platform}>{children}</PhonePreviewButton>
    </span>
  );
}
