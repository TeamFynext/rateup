import { IconSpeakerphone } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import {
  useContactAdReferrals,
  type ContactAdReferral,
} from "@/backend/whatsapp/inbox/adReferral/adReferral.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { safeHref } from "@/utils/safeHref.ts";

/** Meta's free entry-point window after a click-to-WhatsApp ad. */
const FREE_WINDOW_HOURS = 72;

/**
 * The click-to-WhatsApp ad that opened this ticket, and any other ads the contact came from,
 * in the inbox's details panel.
 */
export function AdReferralPanel({
  contactId,
  conversationId,
}: Readonly<{ contactId: string; conversationId?: string | null }>) {
  const { t } = useTranslation();
  const { data } = useContactAdReferrals(contactId);
  if (!data?.length) return null;

  const current = data.find((r) => conversationId && r.conversationId === conversationId);
  const lead = current ?? data[0];
  const others = [
    ...new Map(
      data.filter((r) => r.sourceId !== lead.sourceId).map((r) => [r.sourceId, r]),
    ).values(),
  ];

  return (
    <div className="border-b border-border px-4 py-3.5">
      <div className="mb-2.5 flex min-h-5 items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {current ? t("Came from an ad") : t("Earlier ad click")}
        </span>
        {data.length > 1 && (
          <span className="text-xs text-muted-foreground">
            {t("{count, plural, one {# click} other {# clicks}}", { count: data.length })}
          </span>
        )}
      </div>
      <AdCard referral={lead} />
      {others.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1">
          {others.map((r) => (
            <li key={r.id} className="truncate text-[13px] text-muted-foreground">
              {t("Also clicked {ad} · {date}", {
                ad: r.headline || t("an ad"),
                date: dayjs(r.createdAt).format("MMM D"),
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdCard({ referral }: Readonly<{ referral: ContactAdReferral }>) {
  const { t } = useTranslation();
  const freeUntil = dayjs(referral.createdAt).add(FREE_WINDOW_HOURS, "hour");
  const title =
    referral.headline || (referral.sourceType === "post" ? t("A boosted post") : t("An ad"));

  return (
    <div className="flex gap-2.5 rounded-lg border border-border p-2.5">
      {referral.mediaUrl ? (
        <img
          src={referral.mediaUrl}
          alt=""
          className="size-11 shrink-0 rounded-md border border-border object-cover"
        />
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted">
          <IconSpeakerphone className="size-5 text-muted-foreground" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {safeHref(referral.sourceUrl) ? (
          <a
            href={safeHref(referral.sourceUrl)}
            target="_blank"
            rel="noreferrer"
            className="truncate text-[13px] font-semibold hover:underline"
          >
            {title}
          </a>
        ) : (
          <span className="truncate text-[13px] font-semibold">{title}</span>
        )}
        {referral.body && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{referral.body}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t("Clicked {when}", { when: dayjs(referral.createdAt).format("MMM D, h:mm A") })}
          </span>
          {referral.sourceType === "ad" && freeUntil.isAfter(dayjs()) && (
            <Badge variant="secondary">
              {t("Free replies until {when}", { when: freeUntil.format("MMM D, h:mm A") })}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
