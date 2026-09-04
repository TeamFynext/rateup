import { zodResolver } from "@hookform/resolvers/zod";
import { IconCircleCheck, IconLoader2, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";

import {
  useConnectGetLeadMutation,
  useGetLeadMeta,
  useGetLeadStatus,
  useGetLeadWebhook,
} from "@/backend/appsIntegration/getlead/getlead.query";
import { useDeleteIntegrationMutation } from "@/backend/appsIntegration/integration.query";
import { LinkCopyElement } from "@/components/input/LinkCopyElement.tsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { IntegratedApps } from "@/types/enums.ts";

import { GetLeadMapping } from "./GetLeadMapping.tsx";
import { GetLeadWebhook } from "./GetLeadWebhook.tsx";

const schema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, "An API key is required")
    .startsWith("ik_", "A GetLead API key starts with ik_"),
});

export function GetLead() {
  const { t } = useTranslation();
  const { data: status, isPending } = useGetLeadStatus();
  const connected = status?.connected === true;
  const { data: meta } = useGetLeadMeta(connected);

  const { data: webhook, isPending: webhookPending } = useGetLeadWebhook(connected);
  const connectMutation = useConnectGetLeadMutation();
  const deleteMutation = useDeleteIntegrationMutation(IntegratedApps.getlead);

  // A connected org sees the stored key as a mask, not an empty password box —
  // an empty box reads as "no key saved". Editing is opt-in from there, so a
  // working connection cannot be replaced by a stray paste.
  const [editing, setEditing] = useState(false);
  const showForm = !connected || editing;

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { apiKey: "" },
  });

  // The key itself is never sent back to the browser — only `keyPreview`, which
  // is masked — so the field starts empty and a rotation is a re-paste rather
  // than an edit of the existing value.
  const onSubmit = form.handleSubmit(({ apiKey }) => {
    connectMutation.mutate(apiKey, {
      onSuccess: () => {
        form.reset({ apiKey: "" });
        setEditing(false);
      },
    });
  });

  const cancelEdit = () => {
    form.reset({ apiKey: "" });
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-4 p-8">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-semibold">{t("GetLead CRM")}</h3>
        {connected && (
          <Badge variant="secondary" className="gap-1">
            <IconCircleCheck className="h-3.5 w-3.5" />
            {t("Connected")}
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground max-w-125">
        {t(
          "Leads on your pipeline board are pushed to GetLead. Generate an API key in GetLead under Integrations → API Keys, then paste it here.",
        )}
      </p>

      {/* Stated before connecting, not discovered afterwards: GetLead requires a
          phone number on every lead, and Instagram/Messenger contacts are created
          from a DM id with no phone at all. An org whose leads arrive by DM would
          otherwise connect this and see nothing sync. */}
      <div className="text-sm text-muted-foreground max-w-125 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p className="font-medium text-foreground mb-1">{t("Leads need a phone number")}</p>
        <p>
          {t(
            "GetLead requires a valid phone number on every lead. Leads that reach you as Instagram or Messenger DMs have no phone number, so they are skipped. WhatsApp leads always sync.",
          )}
        </p>
      </div>

      <Card className="p-4">
        {isPending ? (
          <Skeleton className="h-8 w-125" />
        ) : (
          /* One layout for both modes rather than a read view and an edit view.
             Swapping whole blocks moved the buttons and resized the card on every
             click of the pencil; here only the contents of two fixed rows change,
             so nothing below the card shifts. Both rows are h-9, and the mask and
             the input occupy the same slot. */
          <form onSubmit={onSubmit}>
            <FieldGroup className="w-125 gap-4">
              <Controller
                name="apiKey"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={editing && fieldState.invalid}>
                    {showForm ? (
                      <FieldLabel htmlFor={field.name}>
                        {connected ? t("Replace API key") : t("API key")}
                      </FieldLabel>
                    ) : (
                      /* FieldTitle, not FieldLabel: the mask is not a form control,
                         and a label with a dangling `for` is worse for a screen
                         reader than a plain heading. */
                      <FieldTitle id="getlead-api-key-label">{t("API key")}</FieldTitle>
                    )}

                    <div className="flex items-center gap-2">
                      {showForm ? (
                        <Input
                          {...field}
                          id={field.name}
                          type="password"
                          autoComplete="off"
                          aria-invalid={fieldState.invalid}
                          placeholder="ik_..."
                          autoFocus={editing}
                        />
                      ) : (
                        /* Text, not a disabled input: there is nothing here to type
                           into, and a greyed-out box invites a click that does nothing. */
                        <code
                          aria-labelledby="getlead-api-key-label"
                          className="flex h-9 flex-1 items-center truncate rounded-md border bg-muted/40 px-2.5 font-mono text-sm text-foreground"
                        >
                          {status?.keyPreview ?? "ik_••••••••"}
                        </code>
                      )}

                      {/* Reserved in both modes so the row keeps its width: the
                          pencil opens the field, the cross closes it again. */}
                      {connected && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={connectMutation.isPending}
                          aria-label={editing ? t("Cancel") : t("Replace API key")}
                          onClick={() => (editing ? cancelEdit() : setEditing(true))}
                        >
                          {editing ? (
                            <IconX className="h-4 w-4" />
                          ) : (
                            <IconPencil className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>

                    {editing && fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div className="flex items-center gap-2">
                {showForm && (
                  <Button type="submit" disabled={connectMutation.isPending}>
                    {connectMutation.isPending
                      ? t("Checking key...")
                      : connected
                        ? t("Update key")
                        : t("Connect")}
                  </Button>
                )}

                {connected && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                  >
                    <IconTrash className="h-4 w-4 mr-2" />
                    {t("Disconnect")}
                  </Button>
                )}
              </div>
            </FieldGroup>
          </form>
        )}

        {/* Right below the key, because saving one is what creates this and the
            two are pasted into GetLead in the same sitting. Connecting seeds the
            URL, so there is nothing further to press. */}
        {connected && (
          <div className="mt-4 border-t pt-4">
            {webhookPending ? (
              <div className="flex items-center gap-2">
                <IconLoader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                <span className="text-muted-foreground text-sm">
                  {t("Loading your webhook URL...")}
                </span>
              </div>
            ) : webhook?.url ? (
              <div className="w-125">
                <LinkCopyElement link={webhook.url} label={t("Your webhook URL")} />
                <p className="text-muted-foreground mt-1.5 text-xs">
                  {t(
                    "Paste this into a GetLead workflow to have status changes there reach Rateup. The secret and payload to go with it are below.",
                  )}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {/* Only once connected: the mapping needs GetLead's statuses, which arrive
          with the key. */}
      {connected && <GetLeadMapping meta={meta} />}

      {/* The inbound half. Below the mapping because it reads the same stage
          mapping in reverse, so mapping the board first is the sensible order. */}
      {connected && <GetLeadWebhook />}

      {connected && meta && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-2">{t("Available in GetLead")}</h4>
          {/* Confirms the key reached the right business, which is the only
              signal available — GetLead exposes no business name. */}
          <dl className="text-sm text-muted-foreground grid grid-cols-2 gap-y-1 max-w-125">
            <dt>{t("Statuses")}</dt>
            <dd>{meta.statuses.map((s) => s.name).join(", ") || "—"}</dd>
            <dt>{t("Sources")}</dt>
            <dd>{meta.sources.length}</dd>
            <dt>{t("Purposes")}</dt>
            <dd>{meta.purposes.length}</dd>
          </dl>
        </Card>
      )}
    </div>
  );
}
