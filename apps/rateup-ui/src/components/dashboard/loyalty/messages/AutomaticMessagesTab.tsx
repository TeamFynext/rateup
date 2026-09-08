import { IconMessageCircle, IconSparkles } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSaveEventMessageMutation } from "@/backend/loyalty/eventMessages.query";
import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";
import type { EventTemplateResult } from "@/backend/loyalty/onboarding.api";
import { useApplyMessagesStepMutation } from "@/backend/loyalty/onboarding.query";
import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import { useLoyaltyRewards } from "@/backend/loyalty/reward.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { SectionHeading } from "@/components/common/page-heading.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SyncTemplatesButton } from "@/components/whatsapp/templates/SyncTemplates.tsx";
import { TemplateType } from "@/types/enums.ts";

import { useProgramEditorData } from "../onboarding/useProgramEditorData.ts";
import { EventMessageCard } from "./EventMessageCard.tsx";
import { loyaltyEventCatalog, type LoyaltyEventDefinition } from "./loyaltyMessageCatalog.ts";
import { templateStatusTone } from "./LoyaltyTemplateStatusBadge.tsx";
import { NewTemplateDialog } from "./NewTemplateDialog.tsx";
import { useEventTriggerEditor } from "./useEventTriggerEditor.ts";

/**
 * Everything the programme sends on its own — after a transaction, or on a schedule —
 * edited the way the setup wizard edits it: write the words, save, and the Meta template
 * behind them is created or updated in the same step.
 */
export function AutomaticMessagesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: program } = useLoyaltyProgram();
  const { data: templates = [] } = useWaTemplates(TemplateType.LOYALTY);
  const { data: rewards = [] } = useLoyaltyRewards();
  const { data: editorData } = useProgramEditorData();
  const editor = useEventTriggerEditor(program?.id);
  const catalog = useMemo(() => loyaltyEventCatalog(t), [t]);
  /** The event whose template is being designed in the full editor, from its starter. */
  const [designing, setDesigning] = useState<LoyaltyEventDefinition | null>(null);

  const saveText = useSaveEventMessageMutation(program?.id, (result) =>
    toast[result.status === "failed" ? "error" : "success"](describe(t, result)),
  );

  const seed = useApplyMessagesStepMutation((result) => {
    const failed = result.eventTemplates.filter((r) => r.status === "failed");
    if (failed.length > 0) {
      toast.error(t("{count} messages could not be submitted", { count: failed.length }));
      return;
    }
    toast.success(t("Submitted to Meta — usually approved within a few hours."));
  });

  const templateById = useMemo(
    () => new Map(templates.map((entry) => [entry.id, entry])),
    [templates],
  );
  const templateItems = useMemo(
    () => templates.map((entry) => ({ value: entry.id, label: entry.data?.name ?? entry.id })),
    [templates],
  );
  const gifts = rewards.filter(
    (reward) => reward.rewardType === "assigned" && reward.status === "ACTIVE",
  );

  const summary = useMemo(() => {
    const counts = { live: 0, pending: 0, missing: 0 };
    for (const definition of catalog) {
      const trigger = editor.byEvent.get(definition.eventType);
      const template = trigger?.waTemplateId ? templateById.get(trigger.waTemplateId) : undefined;
      const tone = templateStatusTone({
        status: template?.data?.status,
        hasTemplate: Boolean(trigger?.waTemplateId),
        enabled: trigger?.enabled,
      });
      if (tone === "live") counts.live += 1;
      else if (tone === "pending") counts.pending += 1;
      else if (tone === "missing") counts.missing += 1;
    }
    return counts;
  }, [catalog, editor.byEvent, templateById]);

  const refreshCounts = () =>
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.onboardingState() });

  const card = (definition: LoyaltyEventDefinition, extra?: React.ReactNode) => {
    const trigger = editor.byEvent.get(definition.eventType);
    return (
      <EventMessageCard
        key={definition.eventType}
        definition={definition}
        trigger={trigger}
        template={trigger?.waTemplateId ? templateById.get(trigger.waTemplateId) : undefined}
        templateItems={templateItems}
        isSaving={editor.isSaving && editor.savingEvent === definition.eventType}
        isSavingText={saveText.isPending && saveText.variables?.eventType === definition.eventType}
        onToggle={(enabled) =>
          editor.save.mutate({ eventType: definition.eventType, patch: { enabled } })
        }
        onTemplateChange={(waTemplateId) =>
          editor.save.mutate({
            eventType: definition.eventType,
            patch: { waTemplateId: waTemplateId ?? undefined },
          })
        }
        onSaveText={(body) => saveText.mutateAsync({ eventType: definition.eventType, body })}
        onDesign={() => setDesigning(definition)}
        extra={extra}
      />
    );
  };

  const reminderExtra = (definition: LoyaltyEventDefinition) => {
    const trigger = editor.byEvent.get(definition.eventType);
    if (definition.eventType === LoyaltyEventType.INACTIVITY_REMINDER) {
      return (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t("After")}
          <Input
            type="number"
            min={1}
            className="h-9 w-20"
            defaultValue={trigger?.triggerDays ?? 30}
            onBlur={(event) => {
              const days = Number(event.target.value);
              if (days > 0 && days !== trigger?.triggerDays) {
                editor.save.mutate({
                  eventType: definition.eventType,
                  patch: { triggerDays: days },
                });
              }
            }}
          />
          {t("quiet days")}
        </label>
      );
    }
    if (definition.eventType === LoyaltyEventType.BIRTHDAY) {
      return (
        <div className="min-w-48">
          <p className="mb-1 text-xs text-muted-foreground">{t("Gift")}</p>
          <Select
            value={trigger?.rewardId ?? null}
            items={gifts.map((gift) => ({ value: gift.id, label: gift.name }))}
            onValueChange={(value) =>
              editor.save.mutate({
                eventType: definition.eventType,
                patch: { rewardId: value ?? undefined },
              })
            }
            disabled={gifts.length === 0}
          >
            <SelectTrigger className="h-9">
              <SelectValue
                placeholder={gifts.length === 0 ? t("No free gifts yet") : t("Pick a gift")}
              />
            </SelectTrigger>
            <SelectContent>
              {gifts.map((gift) => (
                <SelectItem key={gift.id} value={gift.id}>
                  {gift.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    return undefined;
  };

  if (editor.isPending) return <Skeleton className="h-40 rounded-xl" />;

  const nothingSetUp = editor.byEvent.size === 0;
  const textInWindow = program?.sendTextInSession ?? true;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-foreground">
            {t("{live} live · {pending} awaiting Meta · {missing} not written", summary)}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconMessageCircle size={13} />
            {textInWindow
              ? t(
                  "Inside a 24-hour chat the text goes out as a normal message — free, and before Meta approves it.",
                )
              : t("Every message goes out as its Meta template. Change that in Settings.")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(
              "Want an image or buttons on a message? Open it in the WhatsApp template editor — the same one as WhatsApp › Templates.",
            )}
          </p>
        </div>
        <SyncTemplatesButton label={t("Sync with Meta")} onSynced={refreshCounts} />
      </div>

      {nothingSetUp && editorData && (
        <Alert>
          <IconSparkles />
          <AlertTitle>{t("Start with the standard notifications")}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {t(
                "Points earned, reward redeemed, tier upgrade and birthday — written for your program and submitted to Meta in one go. Edit any of them afterwards.",
              )}
            </span>
            <Button
              size="sm"
              disabled={seed.isPending}
              onClick={() =>
                seed.mutate({
                  commands: [],
                  eventTemplates: editorData.defaults.messages.eventTemplates.map((template) => ({
                    eventType: String(template.eventType),
                    templateName: String(template.templateName),
                    body: String(template.body),
                  })),
                })
              }
            >
              {seed.isPending ? t("Submitting…") : t("Set up the standard notifications")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeading
          title={t("Sent by a transaction")}
          hint={t("Points, rewards and gifts — the moment they happen.")}
        />
        {catalog.filter((d) => d.group === "notification").map((d) => card(d))}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title={t("Reminders")}
          hint={t("Scheduled nudges, and the tier upgrade.")}
        />
        {catalog.filter((d) => d.group === "reminder").map((d) => card(d, reminderExtra(d)))}
      </section>

      <NewTemplateDialog
        open={designing !== null}
        starter={designing}
        onClose={() => setDesigning(null)}
        onCreated={(templateId) => {
          // The draft is this event's message now; the editor opens on it next.
          if (designing) {
            editor.save.mutate({
              eventType: designing.eventType,
              patch: { waTemplateId: templateId },
            });
          }
        }}
      />
    </div>
  );
}

/** One line on what saving did, in the merchant's terms. */
function describe(
  t: (key: string, options?: Record<string, unknown>) => string,
  result: EventTemplateResult,
) {
  if (result.status === "failed") {
    return result.error
      ? t("Could not submit: {error}", { error: result.error })
      : t("Could not submit the message");
  }
  if (result.reused) return t("Saved");
  if (result.edited) return t("Updated — Meta reviews the change, usually within a few hours.");
  if (result.versioned)
    return t("Saved as a new version. The previous one stays in Templates until you delete it.");
  return t("Submitted to Meta — usually approved within a few hours.");
}
