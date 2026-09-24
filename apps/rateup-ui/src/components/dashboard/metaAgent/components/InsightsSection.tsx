import {
  IconAlertTriangle,
  IconChartBar,
  IconCircleCheck,
  IconClockHour4,
  IconMessages,
  IconRoute,
} from "@tabler/icons-react";
import { useState } from "react";

import type {
  ConversationTurn,
  ConversationTurnStep,
  InsightsRange,
} from "@/backend/metaAgent/metaAgent.api";
import { useConversationTurns, useLoadInsights } from "@/backend/metaAgent/metaAgent.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Meta caps tool-call and event ranges at 30 days, counting both ends. */
const MAX_RANGE_DAYS = 30;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

function defaultRange(): InsightsRange {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return { start_date: isoDay(start), end_date: isoDay(end) };
}

function rangeError(range: InsightsRange): string | null {
  if (!range.start_date || !range.end_date) return "Choose both dates";
  if (range.start_date > range.end_date) return "The end date must be on or after the start date";
  const days = (Date.parse(range.end_date) - Date.parse(range.start_date)) / 86_400_000 + 1;
  if (days > MAX_RANGE_DAYS) return `Choose ${MAX_RANGE_DAYS} days or fewer`;
  return null;
}

const percent = (value?: number | null) =>
  typeof value === "number" ? `${Math.round(value * 100)}%` : "—";

const milliseconds = (value?: number | null) => {
  if (typeof value !== "number") return "—";
  return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
};

const count = (value?: number | null) => (typeof value === "number" ? value.toLocaleString() : "—");

/**
 * Meta's insights for the agent. Everything here is read from Meta when asked
 * for — never on page load — like the rest of the agent's pages.
 */
export function InsightsSection({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  return (
    <div className="flex flex-col gap-4">
      <SummaryPanel waSettingsId={waSettingsId} />
      <TurnsPanel waSettingsId={waSettingsId} />
    </div>
  );
}

function SummaryPanel({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const [range, setRange] = useState<InsightsRange>(defaultRange);
  const load = useLoadInsights(waSettingsId);
  const error = rangeError(range);
  const result = load.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IconChartBar className="size-4 text-primary" />
          Activity
        </CardTitle>
        <CardDescription>
          Conversations the agent handled, and how your connector tools and events performed. Meta
          totals figures once a day, so the latest day may be incomplete.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!error) load.mutate(range);
          }}
        >
          <Field className="w-44">
            <FieldLabel htmlFor="insights-start">From</FieldLabel>
            <Input
              id="insights-start"
              type="date"
              value={range.start_date}
              max={range.end_date}
              onChange={(event) => setRange((r) => ({ ...r, start_date: event.target.value }))}
            />
          </Field>
          <Field className="w-44">
            <FieldLabel htmlFor="insights-end">To</FieldLabel>
            <Input
              id="insights-end"
              type="date"
              value={range.end_date}
              min={range.start_date}
              max={isoDay(new Date())}
              onChange={(event) => setRange((r) => ({ ...r, end_date: event.target.value }))}
            />
          </Field>
          <Button type="submit" disabled={!!error} loading={load.isPending}>
            {result ? "Refresh" : "Load insights"}
          </Button>
          {error && <p className="w-full text-sm text-destructive">{error}</p>}
        </form>

        {!result && !load.isPending && (
          <Empty className="border-none py-6">
            <EmptyTitle>Nothing loaded yet</EmptyTitle>
            <EmptyDescription>
              Choose up to {MAX_RANGE_DAYS} days and load insights from Meta.
            </EmptyDescription>
          </Empty>
        )}

        {result && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                icon={IconMessages}
                label="Conversations the agent replied in"
                value={count(result.conversations.ai_threads?.count)}
                note="In the chosen dates"
              />
              <StatTile
                icon={IconAlertTriangle}
                label="Handed to your team, awaiting a reply"
                value={count(result.conversations.ai_handoffs?.count)}
                note="Right now, whatever the dates"
              />
              <StatTile
                icon={IconClockHour4}
                label="Average event handling time"
                value={milliseconds(result.events.avg_e2e_latency_ms)}
                note="From receiving an event to replying"
              />
            </div>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Connector tools</h3>
              {result.toolCalls.data.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tool</TableHead>
                      <TableHead className="text-right">Conversations</TableHead>
                      <TableHead className="text-right">Avg. response</TableHead>
                      <TableHead className="text-right">Succeeded</TableHead>
                      <TableHead className="text-right">Errors</TableHead>
                      <TableHead className="text-right">Timed out</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.toolCalls.data.map((tool) => (
                      <TableRow key={tool.tool_name}>
                        <TableCell className="font-mono text-xs">{tool.tool_name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {count(tool.thread_count)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {milliseconds(tool.avg_latency_ms)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {percent(tool.success_rate)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {percent(tool.error_rate)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {percent(tool.timeout_rate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No connector tool was called in these dates.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                A conversation that called a tool on several days counts once per day. Timeouts
                count as errors too.
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Events</h3>
              {result.events.data.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event type</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Handled</TableHead>
                      <TableHead className="text-right">Avg. time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.events.data.map((event) => (
                      <TableRow key={event.event_type}>
                        <TableCell className="font-mono text-xs">{event.event_type}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {count(event.received)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {count(event.successfully_processed)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {milliseconds(event.avg_e2e_latency_ms)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No events were sent in these dates.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Handled means the agent sent its message, not that it was delivered. Event dates are
                in Pacific Time.
              </p>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  note,
}: Readonly<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note: string;
}>) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
  );
}

/**
 * One customer's most recent conversation with the agent, turn by turn: what
 * the model did and which tools it called. The debugging view for "why did the
 * agent say that".
 */
function TurnsPanel({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const [user, setUser] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [after, setAfter] = useState<string>();
  const load = useConversationTurns(waSettingsId);

  const fetchTurns = (cursor?: string) =>
    load.mutate(
      { user: user.trim(), after: cursor },
      {
        onSuccess: (data) => {
          setTurns((previous) => (cursor ? [...previous, ...data.data] : data.data));
          setAfter(data.paging?.next ? data.paging.cursors?.after : undefined);
        },
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IconRoute className="size-4 text-primary" />
          Conversation turns
        </CardTitle>
        <CardDescription>
          Step through what the agent did in one customer&apos;s latest conversation: each model
          call and tool call, how long it took and whether it worked.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (user.trim()) fetchTurns();
          }}
        >
          <Field className="w-full max-w-sm">
            <FieldLabel htmlFor="turns-user">Customer</FieldLabel>
            <Input
              id="turns-user"
              value={user}
              onChange={(event) => setUser(event.target.value)}
              placeholder="+15551234567 or US.2788620304833812"
            />
            <FieldDescription>
              A phone number with its country code, a WhatsApp user ID, or a conversation ID from
              the test console. Use the user ID for customers with a WhatsApp username.
            </FieldDescription>
          </Field>
          <Button type="submit" disabled={!user.trim()} loading={load.isPending && !after}>
            Load turns
          </Button>
        </form>

        {load.isSuccess && !turns.length && (
          <p className="text-sm text-muted-foreground">No turns found for this customer.</p>
        )}

        {!!turns.length && (
          <ol className="flex flex-col gap-3">
            {turns.map((turn) => (
              <TurnRow key={turn.turn_id} turn={turn} />
            ))}
          </ol>
        )}

        {after && (
          <Button
            variant="outline"
            className="self-start"
            loading={load.isPending}
            onClick={() => fetchTurns(after)}
          >
            Load more
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TurnRow({ turn }: Readonly<{ turn: ConversationTurn }>) {
  return (
    <li className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{turn.timestamp ? new Date(turn.timestamp).toLocaleString() : "Time unknown"}</span>
        {typeof turn.e2e_latency_ms === "number" && (
          <Badge variant="outline">{milliseconds(turn.e2e_latency_ms)} end to end</Badge>
        )}
        <span className="font-mono">{turn.turn_id}</span>
      </div>
      <ol className="mt-2 flex flex-col gap-2">
        {turn.steps.map((step, index) => (
          <StepRow key={`${turn.turn_id}-${index}`} step={step} />
        ))}
      </ol>
    </li>
  );
}

function StepRow({ step }: Readonly<{ step: ConversationTurnStep }>) {
  const failed = step.status === "ERROR" || step.status === "TIMEOUT";
  return (
    <li className="flex flex-col gap-1 rounded-md bg-muted/50 p-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {step.type === "TOOL_CALL" ? `Tool: ${step.tool_name ?? "unknown"}` : "Model"}
        </Badge>
        {step.status && (
          <Badge variant={failed ? "destructive" : "outline"} className="gap-1">
            {failed ? (
              <IconAlertTriangle className="size-3" />
            ) : (
              <IconCircleCheck className="size-3" />
            )}
            {step.status === "SUCCESS"
              ? "Worked"
              : step.status === "TIMEOUT"
                ? "Timed out"
                : "Error"}
          </Badge>
        )}
        {typeof step.latency_ms === "number" && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {milliseconds(step.latency_ms)}
          </span>
        )}
      </div>
      {step.llm_output_preview && (
        <p className="text-xs whitespace-pre-wrap text-muted-foreground">
          {step.llm_output_preview}
        </p>
      )}
      {(step.tool_input || step.tool_output) && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {step.tool_input && <CodeBlock label="Input" value={step.tool_input} />}
          {step.tool_output && <CodeBlock label="Output" value={step.tool_output} />}
        </div>
      )}
    </li>
  );
}

function CodeBlock({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <pre className="max-h-40 overflow-auto rounded bg-background p-2 font-mono text-xs whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
}
