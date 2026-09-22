import { zodResolver } from "@hookform/resolvers/zod";
import { IconInfoCircle } from "@tabler/icons-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import type { AgentSettings } from "@/backend/metaAgent/metaAgent.api";
import {
  useAgentSettings,
  useSyncAgentSettings,
  useUpdateAgentInboxSettings,
  useUpdateAgentSettings,
} from "@/backend/metaAgent/metaAgent.query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { TagsInput } from "@/components/ui/tags-input";
import { Textarea } from "@/components/ui/textarea";

import { settingsFormSchema, type SettingsFormValues } from "../metaAgent.schemas";
import { AllowlistPanel } from "./AllowlistPanel";
import { FormField } from "./shared/FormField";
import { PanelCard } from "./shared/PanelCard";

const INTERVAL_ITEMS = [
  { value: "0", label: "Off" },
  { value: "300", label: "5 minutes" },
  { value: "900", label: "15 minutes" },
  { value: "1800", label: "30 minutes" },
  { value: "3600", label: "1 hour" },
  { value: "7200", label: "2 hours" },
  { value: "28800", label: "8 hours" },
  { value: "86400", label: "24 hours" },
] as const;

const AUDIENCE_ITEMS = [
  { value: "EVERYONE", label: "Everyone" },
  { value: "ALLOWLISTED_ONLY", label: "Allowlisted numbers only" },
] as const;

const toForm = (data?: AgentSettings): SettingsFormValues => ({
  rolloutEnabled: data?.rollout?.enabled ?? false,
  handoffEnabled: data?.handoff?.enabled ?? false,
  handoffMessage: data?.handoff?.message ?? "",
  followupEnabled: data?.followup?.enabled ?? false,
  followupInterval: data?.followup?.followup_interval_in_seconds ?? 0,
  followupMessage: data?.followup?.message ?? "",
  aiAudience: data?.ai_audience ?? "EVERYONE",
  neverSayPhrases: data?.never_say_phrases ?? [],
});

export function SettingsSection({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data, isLoading } = useAgentSettings(waSettingsId);
  const update = useUpdateAgentSettings(waSettingsId);
  const sync = useSyncAgentSettings(waSettingsId);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: toForm(),
  });

  useEffect(() => {
    if (data) form.reset(toForm(data));
  }, [data, form]);

  const handoffEnabled = form.watch("handoffEnabled");
  const followupEnabled = form.watch("followupEnabled");
  const rolloutEnabled = form.watch("rolloutEnabled");

  const onSubmit = (values: SettingsFormValues) =>
    update.mutate({
      rollout: { enabled: values.rolloutEnabled },
      handoff: { enabled: values.handoffEnabled, message: values.handoffMessage },
      followup: {
        enabled: values.followupEnabled,
        followup_interval_in_seconds: values.followupInterval,
        message: values.followupMessage,
      },
      ai_audience: values.aiAudience,
      never_say_phrases: values.neverSayPhrases,
    });

  return (
    <div className="flex flex-col gap-4">
      <PanelCard
        title="Rollout & behaviour"
        description="How the agent behaves once it is live, and who it is allowed to answer."
        syncedAt={data?.settingsSyncedAt}
        onSync={() => sync.mutate()}
        isSyncing={sync.isPending}
      >
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-6">
              <FormField
                control={form.control}
                name="rolloutEnabled"
                label="Agent is on"
                orientation="horizontal"
                description="The master switch. With this off, the agent answers nobody, whatever else is configured."
              >
                {(field) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              </FormField>

              {!rolloutEnabled && (
                <Alert>
                  <IconInfoCircle />
                  <AlertDescription>
                    The agent is currently off. Everything below is saved, but nothing takes effect
                    until rollout is enabled.
                  </AlertDescription>
                </Alert>
              )}

              <FieldSeparator />

              <FormField
                control={form.control}
                name="handoffEnabled"
                label="Custom handoff message"
                orientation="horizontal"
                description="Off means Meta sends its own translated message when handing over to a human."
              >
                {(field) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              </FormField>

              {handoffEnabled && (
                <FormField
                  control={form.control}
                  name="handoffMessage"
                  label="Handoff message"
                  required
                  hint={`${form.watch("handoffMessage").length}/1024`}
                >
                  {(field, controlProps) => (
                    <Textarea
                      {...field}
                      {...controlProps}
                      rows={2}
                      placeholder="Let me get a colleague to help with that — one moment."
                    />
                  )}
                </FormField>
              )}

              <FieldSeparator />

              <FormField
                control={form.control}
                name="followupEnabled"
                label="Follow up when a customer goes quiet"
                orientation="horizontal"
              >
                {(field) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              </FormField>

              {followupEnabled && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                  <FormField
                    control={form.control}
                    name="followupInterval"
                    label="After"
                    required
                    description="Meta only supports these intervals."
                  >
                    {(field, controlProps) => (
                      <Select
                        name={field.name}
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value ?? 0))}
                        items={INTERVAL_ITEMS}
                      >
                        <SelectTrigger {...controlProps} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INTERVAL_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormField>
                  <FormField
                    control={form.control}
                    name="followupMessage"
                    label="Follow-up message"
                    required
                    hint={`${form.watch("followupMessage").length}/1024`}
                  >
                    {(field, controlProps) => (
                      <Input
                        {...field}
                        {...controlProps}
                        placeholder="Still there? Happy to keep helping."
                      />
                    )}
                  </FormField>
                </div>
              )}

              <FieldSeparator />

              <FormField
                control={form.control}
                name="aiAudience"
                label="AI audience"
                required
                description="Allowlisted-only is the safe way to pilot: only numbers on the allowlist below get the agent."
              >
                {(field, controlProps) => (
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ?? "EVERYONE")}
                    items={AUDIENCE_ITEMS}
                  >
                    <SelectTrigger {...controlProps} className="w-full sm:w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCE_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField
                control={form.control}
                name="neverSayPhrases"
                label="Never-say phrases"
                description="Exact phrases the agent must never produce. Press Enter after each one."
              >
                {(field, controlProps) => (
                  <TagsInput
                    id={controlProps.id}
                    aria-invalid={controlProps["aria-invalid"]}
                    value={field.value}
                    onValueChange={field.onChange}
                    maxTags={50}
                    placeholder="guaranteed refund"
                  />
                )}
              </FormField>

              <div className="flex justify-end border-t pt-4">
                <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
                  {update.isPending && <Spinner data-icon="inline-start" />}
                  Save &amp; push to Meta
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </PanelCard>
      <InboxHandoverPanel waSettingsId={waSettingsId} />
      <AllowlistPanel waSettingsId={waSettingsId} />
    </div>
  );
}

/**
 * How Rateup's inbox hands threads between staff and the agent. Saved on toggle
 * and never pushed to Meta, so it sits apart from the form above.
 */
function InboxHandoverPanel({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data, isLoading } = useAgentSettings(waSettingsId);
  const update = useUpdateAgentInboxSettings(waSettingsId);
  const checked = update.isPending
    ? !!update.variables?.releaseOnTicketClose
    : (data?.releaseOnTicketClose ?? true);

  return (
    <PanelCard
      title="Inbox handover"
      description="What happens to a conversation Meta AI handed over to your team. Saved straight away; not sent to Meta."
    >
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="release-on-ticket-close">
              Hand back to Meta AI when a ticket is closed
            </FieldLabel>
            <FieldDescription>
              Meta AI stays silent for a customer after a handover until the conversation is handed
              back. With this on, closing or resolving their ticket does that. Spam is never handed
              back.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="release-on-ticket-close"
            checked={checked}
            disabled={update.isPending}
            onCheckedChange={(value) => update.mutate({ releaseOnTicketClose: value })}
          />
        </Field>
      )}
    </PanelCard>
  );
}
