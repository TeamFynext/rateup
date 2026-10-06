import { zodResolver } from "@hookform/resolvers/zod";
import { IconEye, IconInfoCircle, IconLoader2, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

import { WEBHOOK_EVENTS, type WebhookEvent } from "@/backend/webhook/webhook.api";
import {
  useDeleteWebhookMutation,
  useRotateWebhookSecretMutation,
  useSaveWebhookMutation,
  useUpdateWebhookEventsMutation,
  useWebhook,
  useWebhookSecret,
} from "@/backend/webhook/webhook.query";
import { LinkCopyElement } from "@/components/input/LinkCopyElement.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useCan } from "@/hooks/usePermission.ts";

import { INTEGRATIONS_CONFIG } from "./integrations.config.ts";
import { IntegrationShell } from "./IntegrationShell.tsx";

type EventOption = Readonly<{ value: WebhookEvent; label: string; description: string }>;

// Labels are translation keys, passed to `t` where they render.
const EVENT_GROUPS: Readonly<{ title: string; events: readonly EventOption[] }[]> = [
  {
    title: "Messages",
    events: [
      {
        value: "message_status",
        label: "Message Status",
        description:
          "Receive updates when a message is sent, delivered, read, or failed — including message details.",
      },
      {
        value: "message.received",
        label: "Message received",
        description: "Every inbound message, on any channel, with its content.",
      },
    ],
  },
  {
    title: "Contacts",
    events: [
      {
        value: "contact.created",
        label: "Contact created",
        description: "A contact was added, by hand, by import or from a conversation.",
      },
      {
        value: "contact.updated",
        label: "Contact updated",
        description: "A contact's details or inbox status changed.",
      },
      {
        value: "contact.deleted",
        label: "Contact deleted",
        description: "A contact was removed.",
      },
      {
        value: "contact.assigned",
        label: "Contact assigned",
        description: "Someone was newly assigned to a contact's conversation.",
      },
      {
        value: "contact.lifecycle_changed",
        label: "Lifecycle changed",
        description: "A contact was moved to a different lifecycle stage.",
      },
      {
        value: "contact_group.members_added",
        label: "Added to group",
        description: "Contacts joined a contact group.",
      },
    ],
  },
  {
    title: "Conversations",
    events: [
      {
        value: "conversation.closed",
        label: "Conversation closed",
        description: "A conversation in the inbox was closed.",
      },
    ],
  },
  {
    title: "Leads",
    events: [
      {
        value: "lead.created",
        label: "Lead created",
        description: "A lead was added to a pipeline.",
      },
      {
        value: "lead.stage_changed",
        label: "Lead stage changed",
        description: "A lead moved to another stage, including from a connected CRM.",
      },
    ],
  },
  {
    title: "Surveys and team",
    events: [
      {
        value: "survey.response_submitted",
        label: "Survey response submitted",
        description:
          "A survey was answered. Carries the response's ids; the answers stay in RateUp.",
      },
      {
        value: "team.member_joined",
        label: "Team member joined",
        description: "Someone accepted an invitation and joined the organisation.",
      },
    ],
  },
];

const formSchema = z.object({
  url: z.url("Please enter a valid URL (e.g. https://example.com/webhook)"),
  events: z.array(z.enum(WEBHOOK_EVENTS)),
  verifyToken: z.string().min(1, "Verify token cannot be empty"),
});

type FormValues = z.infer<typeof formSchema>;

type EventsFieldProps = Readonly<{
  value: WebhookEvent[];
  invalid: boolean;
  error: { message?: string } | undefined;
  onChange: (next: WebhookEvent[]) => void;
  name: string;
  disabled?: boolean;
  onImmediateSave?: (next: WebhookEvent[]) => void;
  isSaving?: boolean;
}>;

function EventsField({
  value,
  invalid,
  error,
  onChange,
  name,
  disabled,
  onImmediateSave,
  isSaving,
}: EventsFieldProps) {
  const { t } = useTranslation();

  const toggle = (event: WebhookEvent, checked: boolean) => {
    if (disabled || isSaving) return;
    let next: WebhookEvent[] = value.filter((e) => e !== event);
    if (checked) {
      next = [...value, event];
    }
    onChange(next);
    onImmediateSave?.(next);
  };

  return (
    <Field data-invalid={invalid}>
      <FieldTitle className={disabled ? "text-muted-foreground" : ""}>
        {t("Events")}
        {disabled ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {t("(save webhook first to configure events)")}
          </span>
        ) : null}
      </FieldTitle>
      {EVENT_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">{t(group.title)}</p>
          {group.events.map((opt) => (
            <Field key={opt.value} orientation="horizontal" data-invalid={invalid}>
              <FieldContent>
                <FieldLabel
                  htmlFor={`event-${opt.value}`}
                  className={disabled ? "text-muted-foreground" : ""}
                >
                  {t(opt.label)}
                </FieldLabel>
                <FieldDescription>{t(opt.description)}</FieldDescription>
              </FieldContent>
              <Switch
                id={`event-${opt.value}`}
                name={name}
                aria-invalid={invalid}
                checked={value.includes(opt.value)}
                onCheckedChange={(checked) => toggle(opt.value, checked)}
                disabled={disabled || isSaving}
              />
            </Field>
          ))}
        </div>
      ))}
      {invalid ? <FieldError errors={[error]} /> : null}
    </Field>
  );
}

/**
 * The secret every delivery is signed with. Fetched only when someone asks to
 * see it, and only for those who may change the webhook.
 */
function SigningSecretCard() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [revealed, setRevealed] = useState(false);
  const secret = useWebhookSecret(revealed);
  const rotate = useRotateWebhookSecretMutation();

  const onRotate = async () => {
    const ok = await confirm({
      title: t("Replace the signing secret?"),
      description: t(
        "Deliveries are signed with the new secret straight away. Your endpoint will reject them until it is updated.",
      ),
      confirmText: t("Replace secret"),
    });
    if (ok) rotate.mutate(undefined, { onSuccess: () => setRevealed(true) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Signing secret")}</CardTitle>
        <CardDescription>
          {t(
            "Every delivery carries an X-Rateup-Signature header: the base64 HMAC-SHA256 of the raw request body, keyed with this secret. Compute it on your side and compare before trusting the request.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex max-w-lg flex-col gap-3">
        {revealed && secret.data ? (
          <LinkCopyElement link={secret.data.secret} label={t("Secret")} />
        ) : (
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevealed(true)}
              loading={revealed && secret.isFetching}
            >
              <IconEye data-icon="inline-start" />
              {t("Show secret")}
            </Button>
          </div>
        )}
        <div>
          <Button type="button" variant="ghost" onClick={onRotate} loading={rotate.isPending}>
            <IconRefresh data-icon="inline-start" />
            {t("Replace secret")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WebhookIntegration() {
  const { t } = useTranslation();
  const { data: webhook, isLoading } = useWebhook();
  const saveMutation = useSaveWebhookMutation();
  const updateEvents = useUpdateWebhookEventsMutation();
  const deleteMutation = useDeleteWebhookMutation();
  const canManage = useCan("webhooks.manage");

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [tokenRevealed, setTokenRevealed] = useState(false);
  const [eventsSaving, setEventsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "", events: ["message_status"], verifyToken: "" },
  });

  useEffect(() => {
    if (webhook) {
      form.reset({
        url: webhook.url,
        events: webhook.events,
        verifyToken: "",
      });
    }
  }, [webhook, form]);

  const tokenMasked =
    !!webhook && !tokenRevealed && (!!webhook.verifyToken || webhook.verifyToken === undefined);

  // Only the event list changes, so the URL is not challenged again.
  const handleEventImmediateSave = (nextEvents: WebhookEvent[]) => {
    if (!webhook || !nextEvents.length) return;
    setEventsSaving(true);
    updateEvents.mutate(nextEvents, { onSettled: () => setEventsSaving(false) });
  };

  const onSubmit = (data: FormValues) => {
    saveMutation.mutate(data, {
      onSuccess: (saved) => {
        form.reset({ url: saved.url, events: saved.events, verifyToken: "" });
      },
    });
  };

  const config = INTEGRATIONS_CONFIG.webhook;

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      own
      connected={Boolean(webhook?.url)}
      detail={webhook?.url}
    >
      <Card id="webhook-settings">
        <CardHeader>
          <CardTitle>{t("Endpoint")}</CardTitle>
          <CardDescription>{t("Send event data to your endpoint in real time.")}</CardDescription>
        </CardHeader>

        {isLoading ? (
          <CardContent className="flex items-center justify-center py-8">
            <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <CardContent className="flex flex-col gap-4">
              <Alert className="max-w-lg">
                <IconInfoCircle />
                <AlertTitle>{t("URL verification")}</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  {t(
                    "Your server must respond to a GET request at the webhook URL with the challenge query parameter value as plain text.",
                  )}
                  <br />
                  <code className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                    GET https://your-url.com?challenge=abc123&amp;verify_token=your_token → abc123
                  </code>
                </AlertDescription>
              </Alert>

              <div className="flex max-w-lg flex-col gap-4">
                <Controller
                  name="url"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>{t("Endpoint URL")}</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        placeholder={t("https://example.com/webhook")}
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Controller
                  name="verifyToken"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>{t("Verify Token")}</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type={tokenMasked ? "password" : "text"}
                        value={tokenMasked ? "••••••••" : field.value}
                        placeholder={tokenMasked ? "" : t("secret token")}
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                        onFocus={() => {
                          if (tokenMasked) {
                            setTokenRevealed(true);
                            field.onChange("");
                          }
                        }}
                        onChange={(e) => {
                          setTokenRevealed(true);
                          field.onChange(e);
                        }}
                      />
                      {tokenMasked ? (
                        <FieldDescription>
                          {t("A verify token is saved. Click the field to replace it.")}
                        </FieldDescription>
                      ) : (
                        <FieldDescription>
                          {t(
                            "If provided, the server will send this token as a verify_token query parameter during the challenge. Your endpoint can use it to confirm the request is from RateUp.",
                          )}
                        </FieldDescription>
                      )}
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="events"
                control={form.control}
                render={({ field, fieldState }) => (
                  <EventsField
                    value={field.value}
                    invalid={fieldState.invalid}
                    error={fieldState.error}
                    onChange={field.onChange}
                    name={field.name}
                    disabled={!webhook}
                    onImmediateSave={webhook ? handleEventImmediateSave : undefined}
                    isSaving={eventsSaving}
                  />
                )}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending || (!!webhook && !form.formState.isDirty)}
                >
                  {saveMutation.isPending ? (
                    <IconLoader2 className="animate-spin" data-icon="inline-start" />
                  ) : null}
                  {saveMutation.isPending ? t("Verifying URL…") : t("Verify and save")}
                </Button>

                {webhook && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmDeleteOpen(true)}
                    loading={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <IconLoader2 className="animate-spin" data-icon="inline-start" />
                    ) : (
                      <IconTrash data-icon="inline-start" />
                    )}
                    {t("Remove webhook")}
                  </Button>
                )}
              </div>
            </CardContent>
          </form>
        )}
      </Card>

      {webhook && canManage ? <SigningSecretCard /> : null}

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Delete Webhook")}</DialogTitle>
            <DialogDescription>
              {t(
                "This will permanently remove the webhook endpoint. This action cannot be undone.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMutation.mutate(undefined, {
                  onSuccess: () => {
                    form.reset({
                      url: "",
                      events: ["message_status"],
                      verifyToken: "",
                    });
                    setTokenRevealed(false);
                    setConfirmDeleteOpen(false);
                  },
                });
              }}
              loading={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IntegrationShell>
  );
}
