import { zodResolver } from "@hookform/resolvers/zod";
import { IconInfoCircle, IconLoader2, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

import type { WebhookEvent } from "@/backend/webhook/webhook.api";
import {
  useDeleteWebhookMutation,
  useSaveWebhookMutation,
  useWebhook,
} from "@/backend/webhook/webhook.query";
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

import { INTEGRATIONS_CONFIG } from "./integrations.config.ts";
import { IntegrationShell } from "./IntegrationShell.tsx";

const EVENT_OPTIONS: Readonly<{ value: WebhookEvent; label: string; description: string }[]> = [
  {
    value: "message_status",
    label: "Message Status",
    description:
      "Receive updates when a message is sent, delivered, read, or failed — including message details.",
  },
];

const formSchema = z.object({
  url: z.url("Please enter a valid URL (e.g. https://example.com/webhook)"),
  events: z.array(z.enum(["message_status"] as const)),
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
      {EVENT_OPTIONS.map((opt) => (
        <Field key={opt.value} orientation="horizontal" data-invalid={invalid}>
          <FieldContent>
            <FieldLabel
              htmlFor={`event-${opt.value}`}
              className={disabled ? "text-muted-foreground" : ""}
            >
              {opt.label}
            </FieldLabel>
            <FieldDescription>{opt.description}</FieldDescription>
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
      {invalid ? <FieldError errors={[error]} /> : null}
    </Field>
  );
}

export default function WebhookIntegration() {
  const { t } = useTranslation();
  const { data: webhook, isLoading } = useWebhook();
  const saveMutation = useSaveWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();

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

  const handleEventImmediateSave = (nextEvents: WebhookEvent[]) => {
    if (!webhook) return;
    setEventsSaving(true);
    saveMutation.mutate(
      {
        url: webhook.url,
        events: nextEvents,
        verifyToken: webhook.verifyToken,
      },
      { onSettled: () => setEventsSaving(false) },
    );
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
                    disabled={deleteMutation.isPending}
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
              disabled={deleteMutation.isPending}
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
