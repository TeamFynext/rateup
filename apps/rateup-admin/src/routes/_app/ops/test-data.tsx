import { IconAlertTriangle, IconMessageCircle, IconSparkles } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";

import { surveyTargetsQueryOptions, useFakeInbox, useFakeResponses } from "@/api/ops.api";
import type { SearchOrg } from "@/api/search.api";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";
import { OrgPicker } from "@/components/ds/org-picker";
import { PageHeading } from "@/components/ds/page-heading";
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
import { formatNumber } from "@/lib/format";

const IS_PRODUCTION = (import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE) === "production";

export const Route = createFileRoute("/_app/ops/test-data")({
  component: TestDataPage,
});

function TestDataPage() {
  const [dialog, setDialog] = useState<"responses" | "inbox" | null>(null);
  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Test data"
        description="Fake survey responses and WhatsApp chats for a chosen organisation, on staging and local only."
      />
      {IS_PRODUCTION && (
        <p className="flex items-start gap-2 rounded-lg bg-negative/10 px-4 py-3 text-sm text-negative">
          <IconAlertTriangle className="mt-px size-4 shrink-0" stroke={1.75} />
          This is production. The API refuses to generate test data here.
        </p>
      )}
      <ul className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Tool
          icon={IconSparkles}
          title="Survey responses"
          description="Adds made-up answers to one survey on one team, so charts and exports have something to show. Nothing is sent to anyone."
          action="Generate responses"
          onClick={() => setDialog("responses")}
        />
        <Tool
          icon={IconMessageCircle}
          title="WhatsApp chats"
          description="Seeds inbox conversations for an organisation's existing contacts. These are real sends through the org's own number, which is why production is off."
          action="Generate chats"
          tone="warning"
          onClick={() => setDialog("inbox")}
        />
      </ul>
      {dialog === "responses" && <ResponsesDialog onClose={() => setDialog(null)} />}
      {dialog === "inbox" && <InboxDialog onClose={() => setDialog(null)} />}
    </div>
  );
}

function Tool({
  icon: Icon,
  title,
  description,
  action,
  tone,
  onClick,
}: {
  icon: typeof IconSparkles;
  title: string;
  description: string;
  action: string;
  tone?: "warning";
  onClick: () => void;
}) {
  return (
    <li className="flex flex-col gap-5 rounded-xl border p-6">
      <div className="flex items-start gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted">
          <Icon className="size-5" stroke={1.75} />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[15px] font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button
        variant={tone === "warning" ? "outline" : "default"}
        className="h-9 w-fit rounded-lg px-4"
        disabled={IS_PRODUCTION}
        onClick={onClick}
      >
        {action}
      </Button>
    </li>
  );
}

function clampInt(value: string, min: number, max: number) {
  const n = Math.floor(Number(value) || 0);
  return Math.min(max, Math.max(min, n));
}

function ResponsesDialog({ onClose }: { onClose: () => void }) {
  const mutation = useFakeResponses();
  const [org, setOrg] = useState<SearchOrg | null>(null);
  const [target, setTarget] = useState("");
  const [batch, setBatch] = useState("25");
  const batchId = useId();
  const targets = useQuery(surveyTargetsQueryOptions(org?.id ?? ""));
  const size = clampInt(batch, 1, 500);

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      title="Generate survey responses"
      description="Answers are random but valid for the survey's questions."
      submitLabel={`Generate ${formatNumber(size)}`}
      canSubmit={!!org && target.length > 0}
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { surveyTeamMapId: target, batchSize: size, reason },
          {
            onSuccess: ({ generated }) =>
              done(`${formatNumber(generated)} responses added.`, onClose),
          },
        )
      }
    >
      <OrgPicker
        value={org}
        onChange={(next) => {
          setOrg(next);
          setTarget("");
        }}
      />
      {org && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="survey-target">Survey and team</Label>
          <Select value={target} onValueChange={(value) => setTarget(value ?? "")}>
            <SelectTrigger id="survey-target" className="h-9 w-full rounded-lg">
              <SelectValue
                placeholder={
                  targets.isPending
                    ? "Loading…"
                    : (targets.data?.length ?? 0) === 0
                      ? "This organisation has no surveys"
                      : "Choose a survey"
                }
              >
                {(value: string) => {
                  const row = targets.data?.find((item) => item.id === value);
                  return row ? `${row.survey.title} · ${row.team.name}` : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(targets.data ?? []).map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.survey.title} · {row.team.name}{" "}
                  <span className="text-muted-foreground">
                    ({formatNumber(row.responses)} so far)
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor={batchId}>How many</Label>
        <Input
          id={batchId}
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          value={batch}
          onChange={(event) => setBatch(event.target.value)}
          className="h-9 w-40 rounded-lg tabular"
        />
        <p className="text-xs text-muted-foreground">Up to 500 in one go.</p>
      </div>
    </ActionDialog>
  );
}

function InboxDialog({ onClose }: { onClose: () => void }) {
  const mutation = useFakeInbox();
  const [org, setOrg] = useState<SearchOrg | null>(null);
  const [contacts, setContacts] = useState("5");
  const [perContact, setPerContact] = useState("3");
  const contactsId = useId();
  const perContactId = useId();
  const nContacts = clampInt(contacts, 1, 50);
  const nPer = clampInt(perContact, 1, 20);

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      destructive
      title="Generate WhatsApp chats"
      description="Random messages to and from the organisation's existing contacts, queued through its own WhatsApp number."
      submitLabel={`Queue ${formatNumber(nContacts * nPer)} messages`}
      canSubmit={!!org}
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) =>
        mutation.mutate(
          { orgId: org!.id, numberOfContacts: nContacts, messagesPerContact: nPer, reason },
          { onSuccess: ({ queued }) => done(`${formatNumber(queued)} messages queued.`, onClose) },
        )
      }
    >
      <Notice>
        The outbound half really goes out. Only use an organisation whose contacts are test numbers.
      </Notice>
      <OrgPicker value={org} onChange={setOrg} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={contactsId}>Contacts</Label>
          <Input
            id={contactsId}
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            value={contacts}
            onChange={(event) => setContacts(event.target.value)}
            className="h-9 rounded-lg tabular"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={perContactId}>Messages each</Label>
          <Input
            id={perContactId}
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            value={perContact}
            onChange={(event) => setPerContact(event.target.value)}
            className="h-9 rounded-lg tabular"
          />
        </div>
      </div>
    </ActionDialog>
  );
}
