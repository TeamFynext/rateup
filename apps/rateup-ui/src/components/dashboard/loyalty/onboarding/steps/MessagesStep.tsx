import { zodResolver } from "@hookform/resolvers/zod";
import { IconAlertTriangle, IconCheck, IconClock, IconRefresh } from "@tabler/icons-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type {
  EventTemplateResult,
  SavedOnboardingData,
  SkippedCommand,
} from "@/backend/loyalty/onboarding.api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

import {
  loyaltyEventDefinition,
  loyaltyKeywordCatalog,
  messageVariables,
  variableHint,
  type LoyaltyKeywordDefinition,
  type LoyaltyMessageVariable,
} from "../../messages/loyaltyMessageCatalog.ts";
import { LoyaltyTemplateStatusBadge } from "../../messages/LoyaltyTemplateStatusBadge.tsx";
import { MessageBodyEditor } from "../../messages/MessageBodyEditor.tsx";
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
  /**
   * The welcome as it reads off the current earning rules and rewards. `defaultValues`
   * froze at mount, so this is what "write it from my program again" restores.
   */
  suggestedJoinText?: string;
  /**
   * Per event type, what the dispatcher puts in `{{1}}`, `{{2}}` … in that order. The
   * preset's own `params`, so the labels always describe the body sitting beside them.
   */
  eventParams?: Record<string, readonly string[]>;
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
  suggestedJoinText,
  eventParams = {},
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

  const keywordByType = new Map(loyaltyKeywordCatalog(t).map((kind) => [kind.type, kind]));
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
          const type = String(form.watch(`commands.${index}.type`));
          const kind = keywordByType.get(type);
          const keyword = form.watch(`commands.${index}.requestMessage`) ?? "";
          const wasSkipped = skippedKeywords.has(String(keyword).toLowerCase());
          // Only the welcome is written from the rest of the programme, so only it can be
          // put back to what the programme now says.
          const rewritable = type === JOIN_COMMAND_TYPE && Boolean(suggestedJoinText);

          return (
            <Card key={item.id} className="border-border">
              <CardContent className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {kind ? kind.label : type}
                    </p>
                    {kind && <p className="text-xs text-muted-foreground">{kind.description}</p>}
                  </div>
                  {rewritable && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground"
                      onClick={() =>
                        form.setValue(`commands.${index}.text`, suggestedJoinText ?? "", {
                          shouldDirty: true,
                        })
                      }
                    >
                      <IconRefresh size={13} />
                      {t("Write it from my program")}
                    </Button>
                  )}
                </div>

                <div className="grid items-start gap-4 sm:grid-cols-[1fr_2fr]">
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
                        <MessageBodyEditor
                          id={field.name}
                          name={field.name}
                          value={String(field.value ?? "")}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          invalid={fieldState.invalid}
                          variables={kind ? messageVariables(kind.params) : undefined}
                        />
                        <CommandVariableHint kind={kind} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>
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
                      {loyaltyEventDefinition(t, eventType)?.label ?? eventType}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {form.watch(`eventTemplates.${index}.body`)}
                    </p>
                    <EventVariableHint
                      variables={eventVariables(eventParams[eventType], eventType, t)}
                    />
                  </div>
                  <LoyaltyTemplateStatusBadge
                    status={trigger?.templateStatus}
                    hasTemplate={Boolean(trigger?.waTemplateId)}
                    enabled={trigger?.enabled}
                  />
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
            const variables = eventVariables(eventParams[String(eventType)], String(eventType), t);

            return (
              <Card key={item.id} className="border-border">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {loyaltyEventDefinition(t, String(eventType))?.label ?? String(eventType)}
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
                        <MessageBodyEditor
                          id={field.name}
                          name={field.name}
                          rows={2}
                          value={String(field.value ?? "")}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          invalid={fieldState.invalid}
                          variables={variables}
                        />
                        <EventVariableHint variables={variables} />
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

/** The welcome reply — the one command the wizard can rewrite from the programme. */
const JOIN_COMMAND_TYPE = "CustomerRegistration";

/** What the inbound handler substitutes into this reply, for a reply that takes anything. */
function CommandVariableHint({ kind }: Readonly<{ kind: LoyaltyKeywordDefinition | undefined }>) {
  const { t } = useTranslation();
  if (!kind || kind.params.length === 0) return null;
  return (
    <FieldDescription className="text-xs">
      {t("Filled in when it sends:")} <span className="font-mono">{variableHint(kind.params)}</span>
    </FieldDescription>
  );
}

/**
 * `["customer name", "points earned"]` -> insertable `{{1}}`, `{{2}}` with those labels.
 * The preset's own `params` when it has them, else the shared catalog's.
 */
function eventVariables(
  params: readonly string[] | undefined,
  eventType: string,
  t: ReturnType<typeof useTranslation>["t"],
): LoyaltyMessageVariable[] {
  return messageVariables(params ?? loyaltyEventDefinition(t, eventType)?.params ?? []);
}

/** What the notification's own variables stand for, in the order Meta fills them. */
function EventVariableHint({ variables }: Readonly<{ variables: LoyaltyMessageVariable[] }>) {
  const { t } = useTranslation();
  if (variables.length === 0) return null;
  return (
    <FieldDescription className="text-xs">
      {t("Filled in when it sends:")}{" "}
      <span className="font-mono">
        {variables.map((variable) => `${variable.token} ${variable.label}`).join(" · ")}
      </span>
    </FieldDescription>
  );
}
