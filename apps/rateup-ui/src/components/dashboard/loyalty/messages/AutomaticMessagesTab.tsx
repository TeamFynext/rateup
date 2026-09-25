import { IconClock, IconMessageCircle, IconSparkles } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSaveEventMessageMutation } from "@/backend/loyalty/eventMessages.query";
import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";
import type { EventTemplateResult } from "@/backend/loyalty/onboarding.api";
import { useApplyMessagesStepMutation } from "@/backend/loyalty/onboarding.query";
import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { SectionHeading } from "@/components/common/page-heading.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SyncTemplatesButton } from "@/components/whatsapp/templates/SyncTemplates.tsx";
import { TemplateType } from "@/types/enums.ts";

import { useProgramEditorData } from "../onboarding/useProgramEditorData.ts";
import { LOYALTY_PATHS } from "../paths.ts";
import { EventMessageCard } from "./EventMessageCard.tsx";
import { loyaltyEventCatalog, type LoyaltyEventDefinition } from "./loyaltyMessageCatalog.ts";
import { templateStatusTone } from "./LoyaltyTemplateStatusBadge.tsx";
import { findStarterTemplate } from "./templateUsage.ts";
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
  const { data: editorData } = useProgramEditorData();
  const editor = useEventTriggerEditor(program?.id);
  const catalog = useMemo(() => loyaltyEventCatalog(t), [t]);

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

  /**
   * The template behind a message. The trigger's own column first; failing that, the
   * template the starter's name already produced — a draft saved in the editor and never
   * submitted, or one made before anything wrote the link. `linked` says which, because an
   * unlinked template still has to be put on the trigger before the message can send.
   */
  const resolve = useCallback(
    (definition: LoyaltyEventDefinition) => {
      const trigger = editor.byEvent.get(definition.eventType);
      const onTrigger = trigger?.waTemplateId ? templateById.get(trigger.waTemplateId) : undefined;
      if (onTrigger) return { trigger, template: onTrigger, linked: true };
      return {
        trigger,
        template: findStarterTemplate(templates, definition.templateName),
        linked: false,
      };
    },
    [editor.byEvent, templateById, templates],
  );

  const summary = useMemo(() => {
    const counts = { live: 0, pending: 0, missing: 0 };
    for (const definition of catalog) {
      const { trigger, template } = resolve(definition);
      const tone = templateStatusTone({
        status: template?.data?.status,
        hasTemplate: Boolean(template),
        enabled: trigger?.enabled ?? definition.defaultOn,
      });
      if (tone === "live") counts.live += 1;
      else if (tone === "pending") counts.pending += 1;
      else if (tone === "missing") counts.missing += 1;
    }
    return counts;
  }, [catalog, resolve]);

  const refreshCounts = () =>
    queryClient.invalidateQueries({ queryKey: loyaltyKeys.onboardingState() });

  const card = (definition: LoyaltyEventDefinition, extra?: React.ReactNode) => {
    const { trigger, template, linked } = resolve(definition);
    return (
      <EventMessageCard
        key={definition.eventType}
        definition={definition}
        trigger={trigger}
        template={template}
        templateItems={templateItems}
        isSaving={editor.isSaving && editor.savingEvent === definition.eventType}
        isSavingText={saveText.isPending && saveText.variables?.eventType === definition.eventType}
        onToggle={(enabled) =>
          editor.save.mutate({
            eventType: definition.eventType,
            // The editor cannot write its new template back onto the trigger — neither
            // create nor save-as-draft answers with an id — so a template matched by name
            // is put on the trigger the moment the merchant switches the message on.
            patch: linked ? { enabled } : { enabled, waTemplateId: template?.id },
          })
        }
        onTemplateChange={(waTemplateId) =>
          editor.save.mutate({
            eventType: definition.eventType,
            patch: { waTemplateId: waTemplateId ?? undefined },
          })
        }
        onSaveText={async (body) => {
          // Same reason as the switch, and it matters more here: saving text against an
          // event with no template on its trigger makes the API submit a fresh one, so an
          // unlinked draft would be left behind and its words submitted as a new version.
          // Linked first, the draft itself is what gets submitted.
          if (!linked && template) {
            await editor.save.mutateAsync({
              eventType: definition.eventType,
              patch: { waTemplateId: template.id },
            });
          }
          return saveText.mutateAsync({ eventType: definition.eventType, body });
        }}
        extra={extra}
      />
    );
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
              loading={seed.isPending}
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
              {t("Set up the standard notifications")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeading
          title={t("New customers")}
          hint={t("What someone gets before they join, and the moment staff sign them up.")}
        />
        {catalog.filter((d) => d.group === "welcome").map((d) => card(d))}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title={t("Sent by a transaction")}
          hint={t("Points, rewards and gifts — the moment they happen.")}
        />
        {catalog.filter((d) => d.group === "notification").map((d) => card(d))}
      </section>

      <section className="flex flex-col gap-3">
        {/* The words live here; when each one goes out is set on Reminders. Two halves of
            one message, each in one place — the quiet-days count and the birthday gift
            used to sit on this page, away from every other timing control. */}
        <SectionHeading
          title={t("Reminders")}
          hint={t("Sent on a schedule rather than on a purchase.")}
          actions={
            <Button variant="ghost" size="xs" render={<Link to={LOYALTY_PATHS.reminders} />}>
              <IconClock size={13} />
              {t("Set when these send")}
            </Button>
          }
        />
        {catalog.filter((d) => d.group === "reminder").map((d) => card(d))}
      </section>
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
