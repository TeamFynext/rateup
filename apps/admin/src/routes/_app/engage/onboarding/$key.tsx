import { Button } from "@rateup/ui/components/button";
import { Input } from "@rateup/ui/components/input";
import { Label } from "@rateup/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { Spinner } from "@rateup/ui/components/spinner";
import { Textarea } from "@rateup/ui/components/textarea";
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconDeviceFloppy,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  dripDraftPreviewQueryOptions,
  dripStepQueryOptions,
  senderTemplatesQueryOptions,
  useResetDripContent,
  useSaveDripContent,
  useTestDripStep,
  type DripEmail,
  type DripStepDetail,
  type SenderTemplate,
} from "@/api/engage.api";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";
import { FilterChips } from "@/components/ds/filter-chips";
import { PageHeading, SectionHeading } from "@/components/ds/page-heading";
import { Panel } from "@/components/ds/panel";
import { Pill } from "@/components/ds/pill";
import { ErrorState, PanelSkeleton } from "@/components/ds/query-states";
import { TestSendDialog } from "@/components/engage/engage-dialogs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getApiErrorMessage } from "@/lib/apiError";
import { formatRelative } from "@/lib/format";

export const Route = createFileRoute("/_app/engage/onboarding/$key")({
  component: DripStepPage,
});

const MAX_HIGHLIGHTS = 6;

interface Draft {
  subject: string;
  preview: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaPath: string;
  highlights: { title: string; description: string; path: string }[];
  plain: boolean;
}

function toDraft(email: DripEmail): Draft {
  return {
    subject: email.subject,
    preview: email.preview,
    title: email.title,
    body: email.body,
    ctaLabel: email.cta?.label ?? "",
    ctaPath: email.cta?.path ?? "",
    highlights: (email.highlights ?? []).map((h) => ({ ...h, path: h.path ?? "" })),
    plain: Boolean(email.plain),
  };
}

/** What the API stores. A plain note has no layout, so its button and highlights are dropped. */
function toEmail(draft: Draft): DripEmail {
  const trim = (v: string) => v.trim();
  const email: DripEmail = {
    subject: trim(draft.subject),
    preview: trim(draft.preview),
    title: trim(draft.title),
    body: trim(draft.body),
  };
  if (draft.plain) return { ...email, plain: true };
  if (trim(draft.ctaLabel) || trim(draft.ctaPath)) {
    email.cta = { label: trim(draft.ctaLabel), path: trim(draft.ctaPath) };
  }
  const highlights = draft.highlights.map((h) => ({
    title: trim(h.title),
    description: trim(h.description),
    ...(trim(h.path) ? { path: trim(h.path) } : {}),
  }));
  if (highlights.length) email.highlights = highlights;
  return email;
}

// Mirrors dripEmailSchema in rateup-api (customerComms/dripContent.ts), so mistakes show on
// the field instead of as a failed save.
const badPlaceholder = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].some((m) => m[1] !== "name" && m[1] !== "org");
const badLink = (value: string) =>
  !((value.startsWith("/") && !value.startsWith("//")) || /^https:\/\/\S+$/.test(value));

type Problems = Partial<Record<string, string>>;

function findProblems(email: DripEmail): Problems {
  const problems: Problems = {};
  const placeholders = (field: string, value: string | undefined) => {
    if (value && badPlaceholder(value)) problems[field] = "Only {name} and {org} can be filled in.";
  };
  if (!email.subject) problems.subject = "Needed.";
  if (!email.body) problems.body = "Needed.";
  if (!email.plain && !email.title) problems.title = "A designed email needs a title.";
  placeholders("subject", email.subject);
  placeholders("preview", email.preview);
  placeholders("title", email.title);
  placeholders("body", email.body);
  if (email.cta) {
    if (!email.cta.label) problems.ctaLabel = "Give the button a label, or clear the link.";
    placeholders("ctaLabel", email.cta.label);
    if (!email.cta.path) problems.ctaPath = "Add a link, or clear the label.";
    else if (badLink(email.cta.path))
      problems.ctaPath = "Use a path like /dashboard/setup or a full https:// link.";
  }
  email.highlights?.forEach((h, i) => {
    if (!h.title || !h.description) problems[`highlight${i}`] = "Needs a title and a description.";
    else if (h.path && badLink(h.path))
      problems[`highlight${i}`] = "Use a path like /dashboard/setup or a full https:// link.";
    else if (badPlaceholder(h.title) || badPlaceholder(h.description))
      problems[`highlight${i}`] = "Only {name} and {org} can be filled in.";
  });
  return problems;
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
      {error ? (
        <p className="text-xs text-negative">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function DripStepPage() {
  const { key } = Route.useParams();
  const query = useQuery(dripStepQueryOptions(key));

  if (query.isPending) return <PanelSkeleton panels={2} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  // Keyed so a save or reset starts the draft again from what the server now holds.
  return <Editor key={`${query.data.key}:${query.dataUpdatedAt}`} step={query.data} />;
}

function Editor({ step }: { step: DripStepDetail }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(step.email));
  const [whatsappTemplate, setWhatsappTemplate] = useState(step.whatsappTemplate);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const [dialog, setDialog] = useState<"test" | "reset" | null>(null);

  const email = toEmail(draft);
  const serialised = JSON.stringify(email);
  const dirty =
    serialised !== JSON.stringify(toEmail(toDraft(step.email))) ||
    whatsappTemplate !== step.whatsappTemplate;
  const problems = findProblems(email);
  const valid = Object.keys(problems).length === 0;

  const save = useSaveDripContent(step.key);
  const reset = useResetDripContent(step.key);
  const test = useTestDripStep();

  const previewDraft = useDebouncedValue(valid ? serialised : null, 400);
  const preview = useQuery({
    ...dripDraftPreviewQueryOptions(step.key, previewDraft ?? ""),
    enabled: previewDraft !== null,
    placeholderData: keepPreviousData,
  });

  const updateHighlight = (index: number, patch: Partial<Draft["highlights"][number]>) =>
    set({ highlights: draft.highlights.map((h, i) => (i === index ? { ...h, ...patch } : h)) });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          to="/engage/onboarding"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="size-4" />
          Onboarding
        </Link>
        <PageHeading
          title={step.label}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <span>Day {step.day} after sign-up.</span>
              {step.customized ? (
                <Pill tone="brand">
                  Edited
                  {step.editedBy && ` by ${step.editedBy}`}
                  {step.editedAt && `, ${formatRelative(step.editedAt)}`}
                </Pill>
              ) : (
                <Pill>Original wording</Pill>
              )}
              {!step.enabled && <Pill tone="warning">Turned off</Pill>}
            </span>
          }
          actions={
            <div className="flex flex-wrap gap-2">
              {step.customized && (
                <Button
                  variant="outline"
                  className="h-9 rounded-lg px-4"
                  onClick={() => setDialog("reset")}
                >
                  <IconArrowBackUp />
                  Reset
                </Button>
              )}
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
                className="h-9 rounded-lg px-4"
                disabled={!dirty || !valid || save.isPending}
                title={!valid ? "Fix the fields marked in red" : undefined}
                onClick={() =>
                  save.mutate(
                    { email, whatsappTemplate },
                    {
                      onSuccess: () => toast.success("Saved. The next messages use it."),
                      onError: (error) => toast.error(getApiErrorMessage(error, "Couldn't save.")),
                    },
                  )
                }
              >
                {save.isPending ? <Spinner /> : <IconDeviceFloppy />}
                Save
              </Button>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-3">
          <Panel className="flex flex-col gap-5">
            <SectionHeading>Email</SectionHeading>
            <div className="flex flex-col gap-2">
              <Label>Format</Label>
              <FilterChips
                chips={[
                  { value: "designed", label: "Designed" },
                  { value: "plain", label: "Plain note" },
                ]}
                value={draft.plain ? "plain" : "designed"}
                onChange={(value) => set({ plain: value === "plain" })}
              />
              <p className="text-xs text-muted-foreground">
                {draft.plain
                  ? "Plain text from a person, no logo or button. Replies come to RateUp's inbox."
                  : "RateUp's email layout with a title, optional highlights and a button."}
              </p>
            </div>
            <Field
              label="Subject"
              hint="{name} and {org} are filled in per person."
              error={problems.subject}
            >
              {(id) => (
                <Input
                  id={id}
                  value={draft.subject}
                  maxLength={200}
                  onChange={(e) => set({ subject: e.target.value })}
                  className="h-9 rounded-lg"
                />
              )}
            </Field>
            {!draft.plain && (
              <>
                <Field
                  label="Inbox preview line"
                  hint="The grey line after the subject in most inboxes."
                  error={problems.preview}
                >
                  {(id) => (
                    <Input
                      id={id}
                      value={draft.preview}
                      maxLength={200}
                      onChange={(e) => set({ preview: e.target.value })}
                      className="h-9 rounded-lg"
                    />
                  )}
                </Field>
                <Field label="Title" error={problems.title}>
                  {(id) => (
                    <Input
                      id={id}
                      value={draft.title}
                      maxLength={120}
                      onChange={(e) => set({ title: e.target.value })}
                      className="h-9 rounded-lg"
                    />
                  )}
                </Field>
              </>
            )}
            <Field
              label="Body"
              hint={
                draft.plain
                  ? "Blank line between paragraphs."
                  : "Blank line between paragraphs. ## Heading, - bullet, **bold**, [link](https://…)."
              }
              error={problems.body}
            >
              {(id) => (
                <Textarea
                  id={id}
                  value={draft.body}
                  maxLength={20_000}
                  onChange={(e) => set({ body: e.target.value })}
                  className="min-h-72 rounded-xl font-mono text-[13px]"
                />
              )}
            </Field>
          </Panel>

          {!draft.plain && (
            <>
              <Panel className="flex flex-col gap-5">
                <SectionHeading>Highlights</SectionHeading>
                <p className="-mt-2 text-sm text-muted-foreground">
                  Optional cards under the body, each with a short title and a line of detail.
                </p>
                {draft.highlights.map((highlight, index) => (
                  <div key={index} className="flex flex-col gap-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Highlight {index + 1}</span>
                      <button
                        type="button"
                        aria-label={`Remove highlight ${index + 1}`}
                        onClick={() =>
                          set({ highlights: draft.highlights.filter((_, i) => i !== index) })
                        }
                        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <IconX className="size-4" />
                      </button>
                    </div>
                    <Input
                      aria-label="Title"
                      placeholder="Title"
                      value={highlight.title}
                      maxLength={80}
                      onChange={(e) => updateHighlight(index, { title: e.target.value })}
                      className="h-9 rounded-lg"
                    />
                    <Input
                      aria-label="Description"
                      placeholder="One line of detail"
                      value={highlight.description}
                      maxLength={300}
                      onChange={(e) => updateHighlight(index, { description: e.target.value })}
                      className="h-9 rounded-lg"
                    />
                    <Input
                      aria-label="Link (optional)"
                      placeholder="Link (optional), e.g. /dashboard/automation/rules"
                      value={highlight.path}
                      onChange={(e) => updateHighlight(index, { path: e.target.value })}
                      className="h-9 rounded-lg"
                    />
                    {problems[`highlight${index}`] && (
                      <p className="text-xs text-negative">{problems[`highlight${index}`]}</p>
                    )}
                  </div>
                ))}
                {draft.highlights.length < MAX_HIGHLIGHTS && (
                  <Button
                    variant="outline"
                    className="h-9 w-fit rounded-lg px-4"
                    onClick={() =>
                      set({
                        highlights: [...draft.highlights, { title: "", description: "", path: "" }],
                      })
                    }
                  >
                    <IconPlus />
                    Add highlight
                  </Button>
                )}
              </Panel>

              <Panel className="flex flex-col gap-5">
                <SectionHeading>Button</SectionHeading>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Label" error={problems.ctaLabel}>
                    {(id) => (
                      <Input
                        id={id}
                        value={draft.ctaLabel}
                        maxLength={40}
                        placeholder="Connect WhatsApp"
                        onChange={(e) => set({ ctaLabel: e.target.value })}
                        className="h-9 rounded-lg"
                      />
                    )}
                  </Field>
                  <Field
                    label="Link"
                    hint="A path in the app, or a full https:// link."
                    error={problems.ctaPath}
                  >
                    {(id) => (
                      <Input
                        id={id}
                        value={draft.ctaPath}
                        placeholder="/dashboard/setup"
                        onChange={(e) => set({ ctaPath: e.target.value })}
                        className="h-9 rounded-lg"
                      />
                    )}
                  </Field>
                </div>
              </Panel>
            </>
          )}

          <WhatsappPanel
            value={whatsappTemplate}
            saved={step.whatsappTemplate}
            onChange={setWhatsappTemplate}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <Panel className="flex flex-col gap-4 p-0 md:p-0 xl:sticky xl:top-6">
            <div className="flex items-center justify-between gap-2 px-5 pt-5 md:px-6 md:pt-6">
              <SectionHeading>Preview</SectionHeading>
              {preview.isFetching && <Spinner className="size-4 text-muted-foreground" />}
            </div>
            {!valid && (
              <div className="px-5 md:px-6">
                <Notice>Fix the fields marked in red to update the preview.</Notice>
              </div>
            )}
            {preview.isError ? (
              <ErrorState
                error={preview.error}
                onRetry={() => void preview.refetch()}
                className="mx-6 mb-6"
              />
            ) : preview.data ? (
              <>
                <p className="px-5 text-sm md:px-6">
                  <span className="text-muted-foreground">Subject: </span>
                  {preview.data.subject}
                </p>
                {preview.data.html ? (
                  // Sandboxed with nothing allowed: links in the email must not navigate here.
                  <iframe
                    title="Email preview"
                    sandbox=""
                    srcDoc={preview.data.html}
                    className="h-[640px] w-full rounded-b-xl"
                  />
                ) : (
                  <pre className="max-h-[640px] overflow-auto px-6 pb-6 font-sans text-sm whitespace-pre-wrap">
                    {preview.data.text}
                  </pre>
                )}
              </>
            ) : (
              <Skeleton className="mx-6 mb-6 h-96" />
            )}
          </Panel>
          <p className="text-xs text-muted-foreground">
            Filled in with your name and “Your business”. Saved wording applies to the next emails
            sent; ones already sent are not changed.
          </p>
        </div>
      </div>

      {dialog === "test" && (
        <TestSendDialog
          title={`Test “${step.label}”`}
          channels={step.whatsappTemplate ? ["EMAIL", "WHATSAPP"] : ["EMAIL"]}
          pending={test.isPending}
          error={test.error}
          onSend={(input, onSuccess) => test.mutate({ key: step.key, ...input }, { onSuccess })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "reset" && (
        <ActionDialog
          open
          onOpenChange={() => setDialog(null)}
          title="Go back to the original?"
          description="This step's email edits and WhatsApp choice are discarded; the next messages use what it shipped with."
          submitLabel="Reset"
          requireReason={false}
          pending={reset.isPending}
          error={reset.error}
          onSubmit={() =>
            reset.mutate(undefined, {
              onSuccess: () => done("Back to the original wording.", () => setDialog(null)),
            })
          }
        />
      )}
    </div>
  );
}

const OFF = "off";
/** The drip fills {{1}} with the first name and {{2}} with the business name. */
const DRIP_VARIABLES = 2;

const usable = (t: SenderTemplate) =>
  t.status?.toUpperCase() === "APPROVED" && t.variables <= DRIP_VARIABLES;

const withSampleValues = (body: string) =>
  body.replaceAll("{{1}}", "‹first name›").replaceAll("{{2}}", "‹business name›");

/** Off, or one approved template from RateUp's own WhatsApp account. */
function WhatsappPanel({
  value,
  saved,
  onChange,
}: {
  value: string | null;
  saved: string | null;
  onChange: (template: string | null) => void;
}) {
  const templates = useQuery(senderTemplatesQueryOptions);
  const all = templates.data?.data ?? [];
  const options = all.filter(usable);
  const chosen = value ? all.find((t) => t.name === value) : undefined;
  // A saved template that has since been paused or deleted stays selectable, with a warning.
  const keepSaved = saved && !options.some((t) => t.name === saved);

  return (
    <Panel className="flex flex-col gap-5">
      <SectionHeading>WhatsApp</SectionHeading>
      {templates.data && !templates.data.configured ? (
        <Notice>ROOT_ORG_ID is not set on the API, so there is no number to send from.</Notice>
      ) : (
        <>
          <p className="-mt-2 text-sm text-muted-foreground">
            Sent alongside the email to people who opted in to WhatsApp tips. Meta bills each
            marketing template, so keep it for the steps where it matters.
          </p>
          <Field
            label="Template"
            hint="Approved templates in RateUp's own WhatsApp account. The wording is changed in WhatsApp Manager."
          >
            {(id) => (
              <Select
                value={value ?? OFF}
                disabled={templates.isPending}
                onValueChange={(next) => onChange(!next || next === OFF ? null : next)}
              >
                <SelectTrigger id={id} className="h-9 w-full rounded-lg">
                  <SelectValue>
                    {(selected: string) => (selected === OFF ? "Off: email only" : selected)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OFF}>Off: email only</SelectItem>
                  {keepSaved && <SelectItem value={saved}>{saved}</SelectItem>}
                  {options.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.name}
                      <span className="text-xs text-muted-foreground"> · {t.language}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          {value && templates.data && !chosen && (
            <Notice>
              “{value}” is not in RateUp's WhatsApp account any more, so this step's WhatsApp
              messages will fail. Pick another template or turn it off.
            </Notice>
          )}
          {chosen && !usable(chosen) && (
            <Notice>
              {chosen.variables > DRIP_VARIABLES
                ? `“${chosen.name}” has ${chosen.variables} variables; onboarding can only fill two.`
                : `“${chosen.name}” is ${chosen.status?.toLowerCase() ?? "not approved"}, so Meta won't deliver it.`}{" "}
              Pick another template or turn it off.
            </Notice>
          )}
          {chosen && (
            <>
              <p className="rounded-lg bg-muted px-4 py-3 text-sm whitespace-pre-wrap">
                {withSampleValues(chosen.body)}
              </p>
              {chosen.variables > 0 && (
                <p className="-mt-2 text-xs text-muted-foreground">
                  {"{{1}}"} is the person's first name
                  {chosen.variables > 1 && <>, {"{{2}}"} their business name</>}.
                </p>
              )}
              {!chosen.stopButton && (
                <Notice tone="info">
                  This template has no “Stop updates” quick reply, so people can only opt out by
                  typing STOP.
                </Notice>
              )}
            </>
          )}
          {templates.isError && (
            <ErrorState error={templates.error} onRetry={() => void templates.refetch()} />
          )}
          {templates.isPending && <Skeleton className="h-16" />}
        </>
      )}
    </Panel>
  );
}
