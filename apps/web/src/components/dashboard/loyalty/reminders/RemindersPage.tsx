import { IconClock, IconExternalLink, IconMessage } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEventTriggers } from "@/backend/loyalty/eventTriggers.query";
import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import { useSaveReminderMutation } from "@/backend/loyalty/reminders.query.tsx";
import { useLoyaltyRewards } from "@/backend/loyalty/reward.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { TemplateType } from "@/types/enums.ts";

import { loyaltyEventCatalog } from "../messages/loyaltyMessageCatalog.ts";
import { LOYALTY_PATHS } from "../paths.ts";
import { ReminderCard } from "./ReminderCard.tsx";
import { reminderCatalog } from "./reminderCatalog.ts";

/**
 * When each scheduled loyalty message goes out.
 *
 * The split with Messages is deliberate and worth stating: **Messages is what a message
 * says, Reminders is when it goes.** Every message the programme can send stays in one
 * list on Messages › Automatic, including these; this page owns the schedule — whether it
 * sends, how far ahead, and at what hour in the venue's own timezone.
 *
 * Before this existed, two of these settings were buried in Messages and the rest were not
 * settable at all: the expiry warning was fixed at a fortnight, and everything went out at
 * the worker's midnight rather than the venue's morning.
 */
export function RemindersPage() {
  const { t } = useTranslation();
  const { data: program, isPending: programPending } = useLoyaltyProgram();
  const { data: triggers = [], isPending: triggersPending } = useEventTriggers(program?.id ?? "");
  const { data: templates = [] } = useWaTemplates(TemplateType.LOYALTY);
  const { data: rewards = [] } = useLoyaltyRewards();
  const save = useSaveReminderMutation(program?.id);

  const occasions = useMemo(() => reminderCatalog(t), [t]);
  // The wording, so each card can show what the customer will actually read.
  const messages = useMemo(() => loyaltyEventCatalog(t), [t]);

  const giftable = useMemo(
    () =>
      rewards.filter((reward) => reward.rewardType === "assigned" && reward.status === "ACTIVE"),
    [rewards],
  );

  if (programPending || triggersPending) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const zone = program?.timezone;

  return (
    <div className="flex flex-col gap-6 px-6 pb-14 pt-6">
      <PageHeading
        title={t("Reminders")}
        description={t(
          "The messages your programme sends on a schedule rather than on a purchase. Each one goes out at the hour you choose, in your own time.",
        )}
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<Link to={LOYALTY_PATHS.messages} search={{ tab: "automatic" }} />}
          >
            <IconMessage size={16} />
            {t("Edit the wording")}
          </Button>
        }
      />

      {/* Without a timezone every reminder falls back to UTC, which is rarely what the
          venue means by "10am" — worth saying once, at the top, rather than on every card. */}
      {!zone && (
        <Alert>
          <IconClock />
          <AlertTitle>{t("No timezone set for this programme")}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {t(
                "Reminders will go out in UTC until you set one, so an hour you pick here may not be the hour your customers see.",
              )}
            </span>
            <Button
              size="sm"
              variant="outline"
              render={<Link to={LOYALTY_PATHS.program} search={{ section: "profile" }} />}
            >
              <IconExternalLink size={16} />
              {t("Set the timezone")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        {occasions.map((occasion) => {
          const trigger = triggers.find((row) => row.eventType === occasion.eventType);
          const message = messages.find((entry) => entry.eventType === occasion.eventType);
          const template = templates.find((row) => row.id === trigger?.waTemplateId);

          return (
            <ReminderCard
              key={occasion.eventType}
              occasion={occasion}
              trigger={trigger}
              message={message}
              template={template}
              gifts={giftable}
              timezone={zone}
              isSaving={save.isPending}
              onSave={(patch) => save.mutate({ eventType: occasion.eventType, ...patch })}
            />
          );
        })}
      </div>
    </div>
  );
}
