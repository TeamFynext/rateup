import { IconArrowLeft, IconDeviceFloppy, IconSend, IconTrash } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  AUDIENCE_PLANS,
  AUDIENCE_SEGMENTS,
  broadcastPreviewQueryOptions,
  broadcastQueryOptions,
  senderTemplatesQueryOptions,
  useAudiencePreview,
  useDeleteBroadcast,
  useScheduleBroadcast,
  useTestBroadcast,
  useUnscheduleBroadcast,
  useUpdateBroadcast,
  type AudiencePlan,
  type AudienceSegment,
  type Broadcast,
  type BroadcastInput,
  type CustomerChannel,
} from "@/api/engage.api";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";
import { FilterChips } from "@/components/ds/filter-chips";
import { PageHeading, SectionHeading } from "@/components/ds/page-heading";
import { Panel } from "@/components/ds/panel";
import { ErrorState, PanelSkeleton } from "@/components/ds/query-states";
import { StatFigure } from "@/components/ds/stat-figure";
import { BroadcastStatusPill } from "@/components/engage/broadcast-status";
import { TestSendDialog } from "@/components/engage/engage-dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/apiError";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/engage/broadcasts/$broadcastId")({
  component: BroadcastPage,
});

const CREATED_WITHIN = {
  any: "Any age",
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
};

function toInput(b: Broadcast): BroadcastInput {
  return {
    name: b.name,
    channels: b.channels,
    audience: {
      plan: b.audience.plan ?? "any",
      createdWithinDays: b.audience.createdWithinDays,
      segments: b.audience.segments ?? [],
    },
    emailSubject: b.emailSubject,
    emailBody: b.emailBody,
    ctaLabel: b.ctaLabel,
    ctaUrl: b.ctaUrl,
    waTemplateName: b.waTemplateName,
    waParams: b.waParams,
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Several can be on at once, unlike FilterChips. */
function ToggleChips<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Record<T, string>;
  value: T[];
  onChange: (value: T[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(options) as T[]).map((key) => {
        const on = value.includes(key);
        return (
          <button
            key={key}
            type="button"
            role="checkbox"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(on ? value.filter((v) => v !== key) : [...value, key])}
            className={cn(
              "h-8 rounded-full border px-3.5 text-[13px] font-medium transition-colors disabled:opacity-60",
              on
                ? "border-primary/30 bg-accent text-accent-foreground"
                : "bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground",
            )}
          >
            {options[key]}
          </button>
        );
      })}
    </div>
  );
}

function BroadcastPage() {
  const { broadcastId } = Route.useParams();
  const query = useQuery(broadcastQueryOptions(broadcastId));

  if (query.isPending) return <PanelSkeleton panels={3} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  // Keyed so a refetch after saving resets the draft to what the server now holds.
  return <Composer key={`${query.data.id}:${query.dataUpdatedAt}`} broadcast={query.data} />;
}

function Composer({ broadcast }: { broadcast: Broadcast }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<BroadcastInput>(() => toInput(broadcast));
  const saved = JSON.stringify(toInput(broadcast));
  const dirty = JSON.stringify(draft) !== saved;
  const editable = broadcast.status === "DRAFT";
  const set = (patch: Partial<BroadcastInput>) => setDraft((d) => ({ ...d, ...patch }));

  const update = useUpdateBroadcast(broadcast.id);
  const remove = useDeleteBroadcast(broadcast.id);
  const unschedule = useUnscheduleBroadcast(broadcast.id);
  const test = useTestBroadcast(broadcast.id);
  const templates = useQuery(senderTemplatesQueryOptions);
  const audience = useAudiencePreview();
  const preview = useQuery({
    ...broadcastPreviewQueryOptions(broadcast.id, saved),
    enabled: draft.channels.includes("EMAIL"),
  });
  const [dialog, setDialog] = useState<"test" | "schedule" | "delete" | null>(null);

  const audienceKey = JSON.stringify(draft.audience);
  useEffect(() => {
    const timer = setTimeout(() => audience.mutate(draft.audience), 300);
    return () => clearTimeout(timer);
    // `audience.mutate` is stable; the serialised filter is what should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceKey]);

  const save = (onSaved?: () => void) =>
    update.mutate(draft, {
      onSuccess: () => {
        toast.success("Draft saved.");
        onSaved?.();
      },
      onError: (error) => toast.error(getApiErrorMessage(error, "Couldn't save the draft.")),
    });

  const template = templates.data?.data.find((t) => t.name === draft.waTemplateName);
  const counts = broadcast.counts;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          to="/engage/broadcasts"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="size-4" />
          Broadcasts
        </Link>
        <PageHeading
          title={broadcast.name}
          description={<BroadcastStatusPill broadcast={broadcast} />}
          actions={
            editable ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-9 rounded-lg px-3"
                  aria-label="Delete draft"
                  onClick={() => setDialog("delete")}
                >
                  <IconTrash />
                </Button>
                <Button
                  variant="outline"
                  className="h-9 rounded-lg px-4"
                  disabled={dirty}
                  title={dirty ? "Save first" : undefined}
                  onClick={() => {
                    test.reset();
                    setDialog("test");
                  }}
                >
                  Send test
                </Button>
                <Button
                  variant="outline"
                  className="h-9 rounded-lg px-4"
                  disabled={!dirty || update.isPending}
                  onClick={() => save()}
                >
                  {update.isPending ? <Spinner /> : <IconDeviceFloppy />}
                  Save
                </Button>
                <Button
                  className="h-9 rounded-lg px-4"
                  disabled={update.isPending}
                  onClick={() =>
                    dirty ? save(() => setDialog("schedule")) : setDialog("schedule")
                  }
                >
                  <IconSend />
                  Schedule
                </Button>
              </div>
            ) : broadcast.status === "SCHEDULED" ? (
              <Button
                variant="outline"
                className="h-9 rounded-lg px-4"
                disabled={unschedule.isPending}
                onClick={() =>
                  unschedule.mutate(undefined, {
                    onSuccess: () => toast.success("Back to draft. Nothing was sent."),
                    onError: (error) =>
                      toast.error(getApiErrorMessage(error, "Couldn't unschedule.")),
                  })
                }
              >
                {unschedule.isPending && <Spinner />}
                Unschedule
              </Button>
            ) : null
          }
        />
      </div>

      {(broadcast.status === "SENDING" || broadcast.status === "SENT") && counts && (
        <Panel className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          <StatFigure label="Emails sent" value={formatNumber(counts.email.SENT)} />
          <StatFigure label="WhatsApp sent" value={formatNumber(counts.whatsapp.SENT)} />
          <StatFigure
            label="Still queued"
            value={formatNumber(counts.email.QUEUED + counts.whatsapp.QUEUED)}
          />
          <StatFigure
            label="Failed or skipped"
            value={formatNumber(
              counts.email.FAILED +
                counts.whatsapp.FAILED +
                counts.email.SKIPPED +
                counts.whatsapp.SKIPPED,
            )}
          />
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-3">
          <Panel className="flex flex-col gap-5">
            <SectionHeading>Basics</SectionHeading>
            <Field label="Name" hint="Only staff see this.">
              {(id) => (
                <Input
                  id={id}
                  value={draft.name}
                  disabled={!editable}
                  maxLength={120}
                  onChange={(e) => set({ name: e.target.value })}
                  className="h-9 rounded-lg"
                />
              )}
            </Field>
            <div className="flex flex-col gap-2">
              <Label>Channels</Label>
              <ToggleChips<CustomerChannel>
                options={{ EMAIL: "Email", WHATSAPP: "WhatsApp" }}
                value={draft.channels}
                disabled={!editable}
                onChange={(channels) => set({ channels })}
              />
            </div>
          </Panel>

          <Panel className="flex flex-col gap-5">
            <SectionHeading>Audience</SectionHeading>
            <p className="-mt-2 text-sm text-muted-foreground">
              Owners and admins of the organisations that match. Suspended and paused orgs are never
              included.
            </p>
            <div className="flex flex-col gap-2">
              <Label>Plan</Label>
              <FilterChips<AudiencePlan>
                chips={(Object.keys(AUDIENCE_PLANS) as AudiencePlan[]).map((value) => ({
                  value,
                  label: AUDIENCE_PLANS[value],
                }))}
                value={draft.audience.plan}
                onChange={(plan) => editable && set({ audience: { ...draft.audience, plan } })}
              />
            </div>
            <Field label="Signed up">
              {(id) => (
                <Select
                  value={
                    draft.audience.createdWithinDays
                      ? String(draft.audience.createdWithinDays)
                      : "any"
                  }
                  disabled={!editable}
                  onValueChange={(value) =>
                    set({
                      audience: {
                        ...draft.audience,
                        createdWithinDays: !value || value === "any" ? undefined : Number(value),
                      },
                    })
                  }
                >
                  <SelectTrigger id={id} className="h-9 w-full rounded-lg sm:w-60">
                    <SelectValue>
                      {(value: keyof typeof CREATED_WITHIN) => CREATED_WITHIN[value] ?? "Any age"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CREATED_WITHIN).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <div className="flex flex-col gap-2">
              <Label>Only those who have…</Label>
              <ToggleChips<AudienceSegment>
                options={AUDIENCE_SEGMENTS}
                value={draft.audience.segments}
                disabled={!editable}
                onChange={(segments) => set({ audience: { ...draft.audience, segments } })}
              />
            </div>
          </Panel>

          {draft.channels.includes("EMAIL") && (
            <Panel className="flex flex-col gap-5">
              <SectionHeading>Email</SectionHeading>
              <Field label="Subject" hint="{name} and {org} are filled in per person.">
                {(id) => (
                  <Input
                    id={id}
                    value={draft.emailSubject ?? ""}
                    disabled={!editable}
                    maxLength={200}
                    onChange={(e) => set({ emailSubject: e.target.value || null })}
                    className="h-9 rounded-lg"
                  />
                )}
              </Field>
              <Field
                label="Body"
                hint="Blank line between paragraphs. ## Heading, - bullet, **bold**, [link](https://…)."
              >
                {(id) => (
                  <Textarea
                    id={id}
                    value={draft.emailBody ?? ""}
                    disabled={!editable}
                    onChange={(e) => set({ emailBody: e.target.value || null })}
                    placeholder={"Hi {name},\n\n## What's new\n\n- …"}
                    className="min-h-72 rounded-xl font-mono text-[13px]"
                  />
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Button label">
                  {(id) => (
                    <Input
                      id={id}
                      value={draft.ctaLabel ?? ""}
                      disabled={!editable}
                      maxLength={40}
                      onChange={(e) => set({ ctaLabel: e.target.value || null })}
                      className="h-9 rounded-lg"
                    />
                  )}
                </Field>
                <Field label="Button link">
                  {(id) => (
                    <Input
                      id={id}
                      type="url"
                      value={draft.ctaUrl ?? ""}
                      disabled={!editable}
                      placeholder="https://rateup.app/…"
                      onChange={(e) => set({ ctaUrl: e.target.value || null })}
                      className="h-9 rounded-lg"
                    />
                  )}
                </Field>
              </div>
            </Panel>
          )}

          {draft.channels.includes("WHATSAPP") && (
            <Panel className="flex flex-col gap-5">
              <SectionHeading>WhatsApp</SectionHeading>
              {templates.data && !templates.data.configured ? (
                <Notice>ROOT_ORG is not set on the API, so there is no number to send from.</Notice>
              ) : (
                <>
                  <p className="-mt-2 text-sm text-muted-foreground">
                    Only people who opted in to WhatsApp tips get this. Meta bills marketing
                    templates per message, so keep WhatsApp for what is worth it.
                  </p>
                  <Field
                    label="Template"
                    hint="Approved templates in RateUp's own WhatsApp account."
                  >
                    {(id) => (
                      <Select
                        value={draft.waTemplateName ?? ""}
                        disabled={!editable || templates.isPending}
                        onValueChange={(value) =>
                          set({ waTemplateName: value || null, waParams: [] })
                        }
                      >
                        <SelectTrigger id={id} className="h-9 w-full rounded-lg">
                          <SelectValue>
                            {(value: string) => value || "Choose a template"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {templates.data?.data.map((t) => (
                            <SelectItem key={t.id} value={t.name}>
                              {t.name}
                              <span className="text-xs text-muted-foreground">
                                {" "}
                                · {t.language} · {t.status?.toLowerCase() ?? "unknown"}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </Field>
                  {template && (
                    <>
                      <p className="rounded-lg bg-muted px-4 py-3 text-sm whitespace-pre-wrap">
                        {template.body}
                      </p>
                      {Array.from({ length: template.variables }, (_, i) => (
                        <Field
                          key={i}
                          label={`{{${i + 1}}}`}
                          hint={i === 0 ? "Use {name} or {org} to fill it per person." : undefined}
                        >
                          {(id) => (
                            <Input
                              id={id}
                              value={draft.waParams[i] ?? ""}
                              disabled={!editable}
                              placeholder={i === 0 ? "{name}" : i === 1 ? "{org}" : ""}
                              onChange={(e) => {
                                const waParams = [...draft.waParams];
                                waParams[i] = e.target.value;
                                set({ waParams });
                              }}
                              className="h-9 rounded-lg"
                            />
                          )}
                        </Field>
                      ))}
                    </>
                  )}
                </>
              )}
            </Panel>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <Panel className="flex flex-col gap-4">
            <SectionHeading>Reaches right now</SectionHeading>
            {audience.data ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <StatFigure label="Organisations" value={formatNumber(audience.data.orgs)} />
                  <StatFigure label="People" value={formatNumber(audience.data.people)} />
                  <StatFigure label="By email" value={formatNumber(audience.data.email)} />
                  <StatFigure label="By WhatsApp" value={formatNumber(audience.data.whatsapp)} />
                </div>
                {audience.data.sample.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Including{" "}
                    {audience.data.sample
                      .slice(0, 6)
                      .map((o) => o.name)
                      .join(", ")}
                    {audience.data.orgs > 6 ? "…" : ""}
                  </p>
                )}
              </>
            ) : audience.isError ? (
              <ErrorState error={audience.error} onRetry={() => audience.mutate(draft.audience)} />
            ) : (
              <Skeleton className="h-24" />
            )}
          </Panel>

          {draft.channels.includes("EMAIL") && (
            <Panel className="flex flex-col gap-4 p-0 md:p-0">
              <div className="px-5 pt-5 md:px-6 md:pt-6">
                <SectionHeading>Email preview{dirty ? " (last saved)" : ""}</SectionHeading>
              </div>
              {preview.data?.html ? (
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={preview.data.html}
                  className="h-[640px] w-full rounded-b-xl"
                />
              ) : preview.isPending ? (
                <Skeleton className="mx-6 mb-6 h-96" />
              ) : (
                <p className="px-6 pb-6 text-sm text-muted-foreground">
                  Write a subject and body, then save to see it.
                </p>
              )}
            </Panel>
          )}
        </div>
      </div>

      {dialog === "test" && (
        <TestSendDialog
          title="Send a test"
          channels={draft.channels}
          pending={test.isPending}
          error={test.error}
          onSend={(input, onSuccess) => test.mutate(input, { onSuccess })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "schedule" && (
        <ScheduleDialog
          broadcast={broadcast}
          reach={
            audience.data ? { email: audience.data.email, whatsapp: audience.data.whatsapp } : null
          }
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "delete" && (
        <ActionDialog
          open
          onOpenChange={() => setDialog(null)}
          destructive
          title="Delete this draft?"
          description="Nothing has been sent, so nothing is lost but the copy."
          submitLabel="Delete"
          requireReason={false}
          pending={remove.isPending}
          error={remove.error}
          onSubmit={() =>
            remove.mutate(undefined, {
              onSuccess: () =>
                done("Draft deleted.", () => void navigate({ to: "/engage/broadcasts" })),
            })
          }
        />
      )}
    </div>
  );
}

/** Real sends to real customers. */
function ScheduleDialog({
  broadcast,
  reach,
  onClose,
}: {
  broadcast: Broadcast;
  reach: { email: number; whatsapp: number } | null;
  onClose: () => void;
}) {
  const schedule = useScheduleBroadcast(broadcast.id);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [at, setAt] = useState("");
  const atId = useId();
  const total = reach ? reach.email + reach.whatsapp : null;

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title={`Schedule “${broadcast.name}”`}
      description={
        total === null
          ? "Who it reaches is worked out again when it goes out."
          : `About ${formatNumber(total)} messages (${formatNumber(reach!.email)} email, ${formatNumber(reach!.whatsapp)} WhatsApp). Who it reaches is worked out again when it goes out.`
      }
      submitLabel={when === "now" ? "Send now" : "Schedule"}
      requireReason={false}
      blocked={when === "later" && !at && "Pick a date and time"}
      pending={schedule.isPending}
      error={schedule.error}
      onSubmit={() =>
        schedule.mutate(
          { at: when === "later" ? new Date(at).toISOString() : undefined },
          { onSuccess: () => done(when === "now" ? "Sending now." : "Scheduled.", onClose) },
        )
      }
    >
      <>
        <FilterChips
          chips={[
            { value: "now", label: "Send now" },
            { value: "later", label: "Pick a time" },
          ]}
          value={when}
          onChange={setWhen}
        />
        {when === "later" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={atId}>Send at (your time)</Label>
            <Input
              id={atId}
              type="datetime-local"
              value={at}
              onChange={(e) => setAt(e.target.value)}
              className="h-9 rounded-lg"
            />
          </div>
        )}
        <Notice>Once it starts sending it cannot be stopped.</Notice>
      </>
    </ActionDialog>
  );
}
