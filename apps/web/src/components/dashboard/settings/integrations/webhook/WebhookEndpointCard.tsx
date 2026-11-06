import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@rateup/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@rateup/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@rateup/ui/components/collapsible";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@rateup/ui/components/input-group";
import {
  IconChevronDown,
  IconCircleCheck,
  IconPencil,
  IconTrash,
  IconWand,
} from "@tabler/icons-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

import type { WebhookEvent } from "@/backend/webhook/webhook.api";
import { useDeleteWebhookMutation, useSaveWebhookMutation } from "@/backend/webhook/webhook.query";
import { ApiCopyButton } from "@/components/ExternalApi/ApiCopyButton.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

const formSchema = z.object({
  url: z
    .url("Enter a full URL, e.g. https://example.com/webhooks/rateup")
    .refine((value) => value.startsWith("https://"), "The URL must start with https://"),
  verifyToken: z.string().trim().min(1, "Enter a verify token").max(256, "At most 256 characters"),
});

type FormValues = z.infer<typeof formSchema>;

/** 24 random bytes as hex: long enough to be unguessable, plain enough to paste anywhere. */
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Where deliveries go. Saving always re-runs the URL check, which is why changing the URL asks
 * for the verify token again: the API needs it to challenge the new address, and does not keep
 * one it could show back.
 */
export function WebhookEndpointCard({
  url,
  events,
  readOnly = false,
  onCancel,
}: Readonly<{
  /** The saved endpoint; absent while setting one up. */
  url?: string;
  /** Sent with the save: the stored list, or the picker's choice during setup. */
  events: readonly WebhookEvent[];
  readOnly?: boolean;
  /** Setup only: leave the form without saving. */
  onCancel?: () => void;
}>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const save = useSaveWebhookMutation();
  const remove = useDeleteWebhookMutation();
  const [editing, setEditing] = useState(!url);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: url ?? "", verifyToken: "" },
  });

  const onSubmit = (data: FormValues) => {
    save.mutate(
      { url: data.url, verifyToken: data.verifyToken, events: [...events] },
      {
        onSuccess: (saved) => {
          form.reset({ url: saved.url, verifyToken: "" });
          setEditing(false);
        },
      },
    );
  };

  const onRemove = async () => {
    const ok = await confirm({
      title: t("Remove the webhook?"),
      description: t(
        "RateUp stops sending events to this endpoint straight away, and the signing secret is deleted. Setting it up again issues a new secret.",
      ),
      confirmText: t("Remove webhook"),
    });
    if (ok) remove.mutate();
  };

  const cancel = () => {
    form.reset({ url: url ?? "", verifyToken: "" });
    if (url) setEditing(false);
    else onCancel?.();
  };

  const tokenValue = form.watch("verifyToken");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Endpoint")}</CardTitle>
        <CardDescription>
          {t("RateUp sends a POST request with a JSON body to this URL for every event you pick.")}
        </CardDescription>
        {url && !editing && !readOnly && (
          <CardAction className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <IconPencil data-icon="inline-start" />
              {t("Change")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={onRemove}
              loading={remove.isPending}
            >
              <IconTrash data-icon="inline-start" />
              {t("Remove")}
            </Button>
          </CardAction>
        )}
      </CardHeader>

      {url && !editing ? (
        <CardContent className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <code className="min-w-0 truncate rounded-md bg-muted px-2 py-1 font-mono text-sm">
              {url}
            </code>
            <ApiCopyButton value={url} />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconCircleCheck className="size-3.5 text-green-600 dark:text-green-500" />
            {t("Verified when it was saved")}
          </p>
        </CardContent>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="flex flex-col gap-5">
            <FieldGroup className="max-w-xl gap-5">
              <Controller
                name="url"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{t("Endpoint URL")}</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="url"
                      inputMode="url"
                      placeholder="https://example.com/webhooks/rateup"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      disabled={readOnly}
                    />
                    <FieldDescription>
                      {t("HTTPS only, on a public address. Redirects are not followed.")}
                    </FieldDescription>
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                name="verifyToken"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{t("Verify token")}</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        {...field}
                        id={field.name}
                        placeholder={t("Any string your server will echo back")}
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                        spellCheck={false}
                        className="font-mono"
                        disabled={readOnly}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          onClick={() =>
                            form.setValue("verifyToken", randomToken(), {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                          disabled={readOnly}
                        >
                          <IconWand />
                          {t("Generate")}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldDescription>
                      {url
                        ? t("Saving checks the URL again, so enter the token your server expects.")
                        : t("Your server has to answer the check below with exactly this value.")}
                    </FieldDescription>
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />
            </FieldGroup>

            <Collapsible className="max-w-xl rounded-lg border border-border">
              <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium">
                {t("How the URL check works")}
                <IconChevronDown className="size-4 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-2 border-t border-border px-3 py-3 text-sm text-muted-foreground">
                <p>
                  {t(
                    "When you save, RateUp sends one GET request to your URL with the verify token in the challenge query parameter. Your server must answer 200 with the token as the whole body, within 5 seconds.",
                  )}
                </p>
                <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
                  {`GET ${form.watch("url") || "https://example.com/webhooks/rateup"}?challenge=${tokenValue || "<verify token>"}\n\n200 OK\n${tokenValue || "<verify token>"}`}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>

          {!readOnly && (
            <CardFooter className="justify-between gap-3 border-t border-border">
              <div className="flex gap-2">
                <Button type="submit" loading={save.isPending} disabled={events.length === 0}>
                  {save.isPending ? t("Checking the URL…") : t("Verify and save")}
                </Button>
                {(url || onCancel) && (
                  <Button type="button" variant="ghost" onClick={cancel}>
                    {t("Cancel")}
                  </Button>
                )}
              </div>
              {!url && events.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("Pick at least one event")}</p>
              )}
            </CardFooter>
          )}
        </form>
      )}
    </Card>
  );
}
