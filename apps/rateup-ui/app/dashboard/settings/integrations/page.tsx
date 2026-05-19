"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2, Trash2, Webhook } from "lucide-react";
import { useExtracted } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

import { useIntegrationStatuses } from "@/backend/appsIntegration/integration.query";
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
  ZohoLogo,
} from "@/components/integrations/logos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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

type IntegrationConfig = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const INTEGRATIONS_CONFIG: Record<string, IntegrationConfig> = {
  shopify: {
    id: "shopify",
    name: "Shopify",
    icon: ShopifyLogo,
    description: "Sync products and orders from your Shopify store",
  },
  googlesheet: {
    id: "googlesheet",
    name: "Google Sheets",
    icon: GoogleSheetsLogo,
    description: "Export and sync data with Google Sheets",
  },
  amelia: {
    id: "amelia",
    name: "Amelia",
    icon: AmeliaLogo,
    description: "Appointment booking and scheduling integration",
  },
  waPayment: {
    id: "waPayment",
    name: "WhatsApp Payment",
    icon: WhatsAppPaymentLogo,
    description: "Enable payment collection via WhatsApp",
  },
  petpooja: {
    id: "petpooja",
    name: "Petpooja",
    icon: PetpoojaLogo,
    description: "Restaurant POS integration for order management",
  },
  zapier: {
    id: "zapier",
    name: "Zapier",
    icon: ZapierLogo,
    description: "Connect with 5000+ apps and automate workflows",
  },
  zoho: {
    id: "zoho",
    name: "Zoho CRM",
    icon: ZohoLogo,
    description: "Sync contacts and leads seamlessly with your Zoho CRM",
  },
};

export default function IntegrationsPage() {
  const t = useExtracted();
  const router = useRouter();
  const { data: webhook, isLoading } = useWebhook();
  const saveMutation = useSaveWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();
  const { data: integrationStatuses = [], isLoading: statusesLoading } =
    useIntegrationStatuses();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [tokenRevealed, setTokenRevealed] = useState(false);

  const getIntegrationStatus = (integrationId: string): IntegrationStatus => {
    const status = integrationStatuses.find((s) => s.name === integrationId);
    return status?.isConnected ? "connected" : "disconnected";
  };

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
    !!webhook &&
    !tokenRevealed &&
    (!!webhook.verifyToken || webhook.verifyToken === undefined);

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
        {statusesLoading ? (
          <div className="flex items-center justify-center py-8 col-span-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          Object.entries(INTEGRATIONS_CONFIG).map(([id, config]) => {
            const status = getIntegrationStatus(id);
            return (
              <Card
                key={id}
                className="hover:ring-1 hover:ring-primary group cursor-pointer"
                onClick={() =>
                  router.push(`/dashboard/settings/integrations/${id}`)
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 transition-all group-hover:scale-105">
                      <config.icon className="w-full h-full" />
                    </div>
                    <Badge
                      variant={status === "connected" ? "default" : "secondary"}
                      className={
                        status === "connected"
                          ? "bg-green-600 text-background"
                          : "bg-gray-200 dark:bg-gray-800 text-foreground"
                      }
                    >
                      {status}
                    </Badge>
                  </div>
                  <CardTitle>{config.name}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t("Last sync")}:
                    </span>
                    <span className="text-foreground">Never</span>
                  </div>
                  <Button
                    variant={status === "connected" ? "outline" : "default"}
                    size="sm"
                    className={`w-full mt-2 ${
                      status === "connected"
                        ? "bg-gray-200 hover:bg-gray-300 text-foreground dark:bg-gray-800 dark:hover:bg-gray-700"
                        : ""
                    } transition-all`}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/settings/integrations/${id}`);
                    }}
                  >
                    {status === "connected" ? t("Manage") : t("Connect")}
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
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
                          setTokenRevealed(true);
                          field.onChange("");
                        }
                      }}
                      onChange={(e) => {
                        setTokenRevealed(true);
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
                    setTokenRevealed(false);
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
