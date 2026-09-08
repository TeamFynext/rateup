import { zodResolver } from "@hookform/resolvers/zod";
import { IconAlertTriangle, IconCheck, IconClock } from "@tabler/icons-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type {
  EventTemplateResult,
  SavedOnboardingData,
  SkippedCommand,
} from "@/backend/loyalty/onboarding.api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

import { messagesFormSchema, type MessagesFormInput, type MessagesFormValues } from "../schemas.ts";
import { StepFooter, StepHeader, useStepFooterProps, type StepMode } from "../StepChrome.tsx";

interface MessagesStepProps {
  defaultValues: MessagesFormInput;
  isSaving: boolean;
  /** Keywords the last save could not take, so the user can pick different ones. */
  skipped: SkippedCommand[];
  /** Meta submission outcomes from the last save. */
  eventResults: EventTemplateResult[];
  hasWhatsappChannel: boolean;
  /**
   * "section" edits keyword replies only. Notifications are real Meta templates, so from
   * the Program page they are shown with their approval state and edited in Messages —
   * re-submitting them on every save would file duplicates.
   */
  mode?: StepMode;
  /** Section mode: the stored triggers, for each notification's Meta status. */
  savedTriggers?: SavedOnboardingData["triggers"];
  /** Section mode: the link to the Messages page. */
  notificationsHref?: React.ReactNode;
  onBack?: () => void;
  onCancel?: () => void;
  onSubmit: (values: MessagesFormValues) => void;
}

export function MessagesStep({
  defaultValues,
  isSaving,
  skipped,
  eventResults,
  hasWhatsappChannel,
  mode = "wizard",
  savedTriggers = [],
  notificationsHref,
  onBack,
  onCancel,
  onSubmit,
}: Readonly<MessagesStepProps>) {
  const { t } = useTranslation();

  const form = useForm<MessagesFormInput, unknown, MessagesFormValues>({
    resolver: zodResolver(messagesFormSchema),
    defaultValues,
  });

  const { fields: commandFields } = useFieldArray({ control: form.control, name: "commands" });
  const { fields: templateFields } = useFieldArray({
    control: form.control,
    name: "eventTemplates",
  });

  const resultByEvent = new Map(eventResults.map((r) => [r.eventType, r]));
  const skippedKeywords = new Set(skipped.map((s) => s.requestMessage.toLowerCase()));
  const triggerByEvent = new Map(savedTriggers.map((trigger) => [trigger.eventType, trigger]));
  const footer = useStepFooterProps({ mode, isDirty: form.formState.isDirty, onBack, onCancel });

  return (
    <form className="flex flex-col gap-8" onSubmit={form.handleSubmit(onSubmit)}>
      <StepHeader
        title={t("WhatsApp messages")}
        description={t(
          "Two kinds: replies to what customers text you, and notifications you send them.",
        )}
      />

      {!hasWhatsappChannel && (
        <Alert>
          <IconAlertTriangle />
          <AlertTitle>{t("No WhatsApp channel connected yet")}</AlertTitle>
          <AlertDescription>
            {t(
              "You can still set these up now — nothing sends until a channel is connected in Settings.",
            )}
          </AlertDescription>
        </Alert>
      )}

      {skipped.length > 0 && (
        <Alert variant="destructive">
          <IconAlertTriangle />
          <AlertTitle>{t("Some keywords were already taken")}</AlertTitle>
          <AlertDescription>
            {t(
              "These are already used by another automation or command, so they were not saved. Pick different words and save again:",
            )}{" "}
            <strong>{skipped.map((s) => s.requestMessage).join(", ")}</strong>
          </AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("When a customer texts you")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("These are plain replies — they work as soon as your program is live.")}
          </p>
        </div>

        {commandFields.map((item, index) => {
          const keyword = form.watch(`commands.${index}.requestMessage`) ?? "";
          const wasSkipped = skippedKeywords.has(String(keyword).toLowerCase());

          return (
            <Card key={item.id} className="border-border">
              <CardContent className="grid items-start gap-4 p-4 sm:grid-cols-[1fr_2fr]">
                <Controller
                  control={form.control}
                  name={`commands.${index}.requestMessage`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || wasSkipped}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("They text")}
                      </FieldLabel>
                      <Input id={field.name} className="h-9" {...field} />
                      {wasSkipped && (
                        <span className="text-xs text-destructive">{t("Already in use")}</span>
                      )}
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name={`commands.${index}.text`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("You reply")}
                      </FieldLabel>
                      <Textarea id={field.name} rows={3} {...field} />
                      <FieldDescription className="text-xs">
                        {t("{{1}}, {{2}} and {{3}} are filled in with the customer's own numbers.")}
                      </FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </CardContent>
            </Card>
          );
        })}
      </section>

      {mode === "section" ? (
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("Notifications you send")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("Each one is a WhatsApp template Meta has approved.")} {notificationsHref}
            </p>
          </div>
          {templateFields.map((item, index) => {
            const eventType = String(form.watch(`eventTemplates.${index}.eventType`));
            const trigger = triggerByEvent.get(eventType);
            return (
              <Card key={item.id} className="border-border">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {t(humanEventLabel(eventType))}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {form.watch(`eventTemplates.${index}.body`)}
                    </p>
                  </div>
                  <TriggerStatusBadge trigger={trigger} />
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("Notifications you send")}</h3>
            <p className="text-xs text-muted-foreground">
              {t(
                "WhatsApp requires Meta to approve these first, which usually takes a few hours. We'll submit them now — you don't have to wait.",
              )}
            </p>
          </div>

          {templateFields.map((item, index) => {
            const eventType = form.watch(`eventTemplates.${index}.eventType`);
            const result = resultByEvent.get(String(eventType));

            return (
              <Card key={item.id} className="border-border">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {t(humanEventLabel(String(eventType)))}
                    </span>
                    {result && (
                      <Badge
                        variant={
                          result.status === "failed" || result.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {result.status === "approved" ? (
                          <>
                            <IconCheck size={12} /> {t("Approved by Meta")}
                          </>
                        ) : result.status === "pending" ? (
                          <>
                            <IconClock size={12} /> {t("Awaiting Meta approval")}
                          </>
                        ) : result.status === "rejected" ? (
                          <>
                            <IconAlertTriangle size={12} /> {t("Rejected by Meta")}
                          </>
                        ) : (
                          <>
                            <IconAlertTriangle size={12} /> {t("Could not submit")}
                          </>
                        )}
                      </Badge>
                    )}
                  </div>

                  <Controller
                    control={form.control}
                    name={`eventTemplates.${index}.body`}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Textarea id={field.name} rows={2} {...field} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  {result?.status === "failed" && result.error && (
                    <p className="text-xs text-destructive">{result.error}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {eventResults.length > 0 &&
            eventResults.every((r) => r.status === "pending" || r.status === "approved") && (
              <p className="flex items-center gap-1.5 text-xs text-green-600">
                <IconCheck size={13} />
                {t("All notifications submitted for approval.")}
              </p>
            )}
        </section>
      )}

      <StepFooter isSaving={isSaving} {...footer} />
    </form>
  );
}

/** Meta's verdict on the template behind a trigger, or that there is none yet. */
function TriggerStatusBadge({
  trigger,
}: Readonly<{ trigger: SavedOnboardingData["triggers"][number] | undefined }>) {
  const { t } = useTranslation();
  if (!trigger?.waTemplateId) return <Badge variant="outline">{t("Not set up")}</Badge>;
  if (!trigger.enabled) return <Badge variant="outline">{t("Off")}</Badge>;
  switch (trigger.templateStatus) {
    case "APPROVED":
      return (
        <Badge variant="secondary" className="bg-green-600/10 text-green-700 dark:text-green-500">
          <IconCheck size={12} /> {t("Live")}
        </Badge>
      );
    case "REJECTED":
      return <Badge variant="destructive">{t("Rejected by Meta")}</Badge>;
    default:
      return (
        <Badge
          variant="secondary"
          className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
        >
          <IconClock size={12} /> {t("Awaiting Meta")}
        </Badge>
      );
  }
}

/** Turns the API's `POINTS_ISSUED` style event names into something readable. */
function humanEventLabel(eventType: string): string {
  switch (eventType) {
    case "POINTS_ISSUED":
      return "When points are earned";
    case "REWARD_REDEEMED":
      return "When a reward is redeemed";
    case "TIER_UPGRADED":
      return "When someone reaches a new tier";
    case "BIRTHDAY":
      return "On a customer's birthday";
    default:
      return eventType;
  }
}
