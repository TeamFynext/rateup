"use client";

import { useEffect, useState } from "react";
import type React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2, Trash2, Webhook } from "lucide-react";
import { useExtracted } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import type { WebhookEvent } from "@/backend/webhook/webhook.api";
import {
  useDeleteWebhookMutation,
  useSaveWebhookMutation,
  useWebhook,
} from "@/backend/webhook/webhook.query";
import {
  AmeliaLogo,
  GoogleSheetsLogo,
  PetpoojaLogo,
  ShopifyLogo,
  WhatsAppPaymentLogo,
  ZapierLogo,
} from "@/components/integrations/logos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const EVENT_OPTIONS: Readonly<
  { value: WebhookEvent; label: string; description: string }[]
> = [
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
  const t = useExtracted();
  const toggle = (event: WebhookEvent, checked: boolean) => {
    if (disabled || isSaving) return;
    const next = checked ? [...value, event] : value.filter((e) => e !== event);
    onChange(next);
    onImmediateSave?.(next);
  };

  return (
    <Field data-invalid={invalid}>
      <FieldLabel className={disabled ? "text-muted-foreground" : ""}>
        {t("Events")}
        {disabled && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {t("(save webhook first to configure events)")}
          </span>
        )}
      </FieldLabel>
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
      {invalid && <FieldError errors={[error]} />}
    </Field>
  );
}

type IntegrationStatus = "connected" | "disconnected";

const integrations: {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: IntegrationStatus;
  description: string;
  lastSync: string;
}[] = [
  {
    name: "Shopify",
    icon: ShopifyLogo,
    status: "disconnected",
    description: "Sync products and orders from your Shopify store",
    lastSync: "Never",
  },
  {
    name: "Google Sheets",
    icon: GoogleSheetsLogo,
    status: "disconnected",
    description: "Export and sync data with Google Sheets",
    lastSync: "Never",
  },
  {
    name: "Amelia",
    icon: AmeliaLogo,
    status: "disconnected",
    description: "Appointment booking and scheduling integration",
    lastSync: "Never",
  },
  {
    name: "WhatsApp Payment",
    icon: WhatsAppPaymentLogo,
    status: "disconnected",
    description: "Enable payment collection via WhatsApp",
    lastSync: "Never",
  },
  {
    name: "Petpooja",
    icon: PetpoojaLogo,
    status: "disconnected",
    description: "Restaurant POS integration for order management",
    lastSync: "Never",
  },
  {
    name: "Zapier",
    icon: ZapierLogo,
    status: "disconnected",
    description: "Connect with 5000+ apps and automate workflows",
    lastSync: "Never",
  },
];

export default function IntegrationsPage() {
  const t = useExtracted();
  const { data: webhook, isLoading } = useWebhook();
  const saveMutation = useSaveWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // True when a saved webhook has a token but the backend didn't return its value
  const [tokenMasked, setTokenMasked] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "", events: ["message_status"], verifyToken: "" },
  });

  // Sync form when existing webhook loads
  useEffect(() => {
    if (webhook) {
      form.reset({
        url: webhook.url,
        events: webhook.events,
        verifyToken: "",
      });
      // Backend doesn't return the token value — show masked placeholder if one was set
      setTokenMasked(
        !!webhook.verifyToken || webhook.verifyToken === undefined,
      );
    }
  }, [webhook, form]);

  const [eventsSaving, setEventsSaving] = useState(false);

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

  return (
    <div className="space-y-6 pb-2">
      <div>
        <h2 className="text-2xl mb-1">{t("Integrations")}</h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "Connect with external platforms and services to enhance your workflow",
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/*integrations */}
        {[].map((integration) => (
          <Card
            key={integration.name}
            className="p-5 hover:shadow-lg transition-all group"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 transition-all group-hover:scale-105">
                  <integration.icon className="w-full h-full" />
                </div>
                <Badge
                  variant={
                    integration.status === "connected" ? "default" : "secondary"
                  }
                  className={
                    integration.status === "connected"
                      ? "bg-green-600 text-background"
                      : "bg-gray-200 dark:bg-gray-800 text-foreground"
                  }
                >
                  {integration.status}
                </Badge>
              </div>

              <h4 className="mb-2 group-hover:text-primary transition-colors">
                {integration.name}
              </h4>
              <p className="text-sm text-muted-foreground mb-4 flex-1 min-h-15">
                {integration.description}
              </p>

              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t("Last sync")}:
                  </span>
                  <span className="text-foreground">
                    {integration.lastSync}
                  </span>
                </div>
                <Button
                  variant={
                    integration.status === "connected" ? "outline" : "default"
                  }
                  size="sm"
                  className={`w-full ${
                    integration.status === "connected"
                      ? "bg-gray-200 hover:bg-gray-300 text-foreground dark:bg-gray-800 dark:hover:bg-gray-700"
                      : ""
                  } transition-all`}
                >
                  {integration.status === "connected"
                    ? t("Manage")
                    : t("Connect")}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Webhook className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("Webhook")}</CardTitle>
              <CardDescription>
                {t("Send event data to your endpoint in real time.")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {isLoading ? (
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <CardContent className="space-y-2">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>{t("URL Verification")}</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  {t(
                    "Your server must respond to a GET request at the webhook URL with the challenge query parameter value as plain text.",
                  )}
                  <br />
                  <code className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                    GET
                    https://your-url.com?challenge=abc123&amp;verify_token=your_token
                    → abc123
                  </code>
                </AlertDescription>
              </Alert>
              <Controller
                name="url"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("Endpoint URL")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder={t("https://example.com/webhook")}
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="verifyToken"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("Verify Token")}
                    </FieldLabel>
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
                          setTokenMasked(false);
                          field.onChange("");
                        }
                      }}
                      onChange={(e) => {
                        setTokenMasked(false);
                        field.onChange(e);
                      }}
                    />
                    {tokenMasked && (
                      <FieldDescription>
                        {t(
                          "A verify token is saved. Click the field to replace it.",
                        )}
                      </FieldDescription>
                    )}
                    {!tokenMasked && (
                      <FieldDescription>
                        {t(
                          "If provided, the server will send this token as a verify_token query parameter during the challenge. Your endpoint can use it to confirm the request is from RateUp.",
                        )}
                      </FieldDescription>
                    )}
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <div className="flex w-full gap-2 justify-end">
                {webhook ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {t("Remove Webhook")}
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  type="submit"
                  disabled={
                    saveMutation.isPending ||
                    (!!webhook && !form.formState.isDirty)
                  }
                >
                  {saveMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {saveMutation.isPending
                    ? t("Verifying URL...")
                    : t("Verify and Save")}
                </Button>
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
                    onImmediateSave={
                      webhook ? handleEventImmediateSave : undefined
                    }
                    isSaving={eventsSaving}
                  />
                )}
              />
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
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
            >
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
                    setTokenMasked(false);
                    setConfirmDeleteOpen(false);
                  },
                });
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
