import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconCalendarClock,
  IconFlask,
  IconGauge,
  IconMessage2,
  IconPhoneOff,
  IconPhoneOutgoing,
  IconSend,
} from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { EvalCase } from "@/backend/metaAgent/metaAgent.api";
import {
  useAgentEventStatus,
  useEvalRunStatus,
  useListEvalCases,
  useSetThreadControl,
  useSubmitAgentEvent,
  useSubmitEvalRun,
  useTestAgent,
} from "@/backend/metaAgent/metaAgent.query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import {
  agentEventFormSchema,
  type AgentEventFormValues,
  testAgentFormSchema,
  type TestAgentFormValues,
  threadControlFormSchema,
  type ThreadControlFormValues,
} from "../metaAgent.schemas";
import { FormField } from "./shared/FormField";

export function OperateSection({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <TestAgentCard waSettingsId={waSettingsId} />
      <ThreadControlCard waSettingsId={waSettingsId} />
      <AgentEventCard waSettingsId={waSettingsId} />
      <EvalRunCard waSettingsId={waSettingsId} />
    </div>
  );
}

function OperateCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: Readonly<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TestAgentCard({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const testAgent = useTestAgent(waSettingsId);
  const [conversationId, setConversationId] = useState<string>();

  const form = useForm<TestAgentFormValues>({
    resolver: zodResolver(testAgentFormSchema),
    defaultValues: { user_msg: "" },
  });

  return (
    <OperateCard
      icon={IconFlask}
      title="Test the agent"
      description="Sends a message to the agent and shows the reply. No real customer is notified."
    >
      <form
        onSubmit={form.handleSubmit((values) =>
          testAgent.mutate(
            { message: values.user_msg, conversationId },
            {
              onSuccess: (data) => {
                // Threading the id back keeps the next message in the same
                // conversation, so multi-turn behaviour is actually testable.
                setConversationId(data.conversation_id);
                form.reset();
              },
            },
          ),
        )}
      >
        <FieldGroup className="gap-3">
          <FormField control={form.control} name="user_msg" label="Test message" required>
            {(field, controlProps) => (
              <Textarea
                {...field}
                {...controlProps}
                rows={3}
                placeholder="Where is my order #12345?"
              />
            )}
          </FormField>
          <div className="flex items-center justify-between gap-2">
            {conversationId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConversationId(undefined);
                  testAgent.reset();
                }}
              >
                Start a new conversation
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={testAgent.isPending}>
              {testAgent.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <IconSend data-icon="inline-start" />
              )}
              Send
            </Button>
          </div>
        </FieldGroup>
      </form>

      {testAgent.data && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="whitespace-pre-wrap">{testAgent.data.agent_response}</p>
          {!!testAgent.data.quick_replies?.length && (
            <div className="flex flex-wrap gap-1.5">
              {testAgent.data.quick_replies.map((reply) => (
                <Badge key={reply} variant="outline">
                  {reply}
                </Badge>
              ))}
            </div>
          )}
          {testAgent.data.handoff_reason && (
            <Badge variant="secondary">Handoff: {testAgent.data.handoff_reason}</Badge>
          )}
          {testAgent.data.no_response_reason && (
            <Badge variant="destructive">No response: {testAgent.data.no_response_reason}</Badge>
          )}
        </div>
      )}
    </OperateCard>
  );
}

function ThreadControlCard({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const setThreadControl = useSetThreadControl(waSettingsId);
  const form = useForm<ThreadControlFormValues>({
    resolver: zodResolver(threadControlFormSchema),
    defaultValues: { to: "" },
  });

  const submit = (action: "pass" | "release") =>
    form.handleSubmit((values) => setThreadControl.mutate({ action, to: values.to }))();

  return (
    <OperateCard
      icon={IconPhoneOutgoing}
      title="Thread control"
      description="Hand a live conversation between the AI agent and your inbox."
    >
      <FieldGroup className="gap-3">
        <FormField
          control={form.control}
          name="to"
          label="Consumer phone number"
          required
          description="E.164 format, including the country code."
        >
          {(field, controlProps) => (
            <PhoneInput
              {...controlProps}
              name={field.name}
              defaultCountry="IN"
              international
              countryCallingCodeEditable={false}
              placeholder="Enter phone number"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              className="w-full"
            />
          )}
        </FormField>

        <Alert>
          <AlertDescription>
            Meta currently acts on <strong>release</strong> only — handing the thread back to your
            app. Passing to the agent is reserved for a future version of their API.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={setThreadControl.isPending}
            onClick={() => submit("pass")}
          >
            <IconPhoneOutgoing data-icon="inline-start" />
            Pass to agent
          </Button>
          <Button
            type="button"
            disabled={setThreadControl.isPending}
            onClick={() => submit("release")}
          >
            {setThreadControl.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <IconPhoneOff data-icon="inline-start" />
            )}
            Release control
          </Button>
        </div>
      </FieldGroup>
    </OperateCard>
  );
}

function AgentEventCard({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const submitEvent = useSubmitAgentEvent(waSettingsId);
  const [eventId, setEventId] = useState<string>();
  const { data: status } = useAgentEventStatus(waSettingsId, eventId);

  const form = useForm<AgentEventFormValues>({
    resolver: zodResolver(agentEventFormSchema),
    defaultValues: { to: "", type: "", description: "", payload: "{}" },
  });

  return (
    <OperateCard
      icon={IconCalendarClock}
      title="Send a business event"
      description="Tell the agent something happened — an order shipped, a booking moved — so it can reach out first."
    >
      <form
        onSubmit={form.handleSubmit((values) =>
          submitEvent.mutate(
            {
              to: values.to,
              event: {
                type: values.type,
                description: values.description,
                payload: values.payload,
              },
            },
            { onSuccess: (data) => setEventId(data.agent_event_id) },
          ),
        )}
      >
        <FieldGroup className="gap-3">
          <FormField control={form.control} name="to" label="Consumer phone number" required>
            {(field, controlProps) => (
              <PhoneInput
                {...controlProps}
                name={field.name}
                defaultCountry="IN"
                international
                countryCallingCodeEditable={false}
                placeholder="Enter phone number"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                className="w-full"
              />
            )}
          </FormField>
          <FormField
            control={form.control}
            name="type"
            label="Event type"
            required
            description="A stable key you choose, reused for every event of this kind."
          >
            {(field, controlProps) => (
              <Input
                {...field}
                {...controlProps}
                placeholder="order_shipped"
                className="font-mono"
              />
            )}
          </FormField>
          <FormField
            control={form.control}
            name="description"
            label="Description"
            required
            description="What this event means, in words the agent can act on."
          >
            {(field, controlProps) => (
              <Input
                {...field}
                {...controlProps}
                placeholder="The customer's order has left the warehouse."
              />
            )}
          </FormField>
          <FormField
            control={form.control}
            name="payload"
            label="Payload"
            required
            description="JSON the agent may quote from — order numbers, dates, links."
            hint={`${form.watch("payload").length}/4096`}
          >
            {(field, controlProps) => (
              <Textarea {...field} {...controlProps} rows={4} className="font-mono text-xs" />
            )}
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitEvent.isPending}>
              {submitEvent.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <IconMessage2 data-icon="inline-start" />
              )}
              Submit event
            </Button>
          </div>
        </FieldGroup>
      </form>

      {status && (
        <div className="mt-4 space-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
          <Badge
            variant={
              status.status === "failed"
                ? "destructive"
                : status.status === "sent" || status.status === "success"
                  ? "default"
                  : "secondary"
            }
          >
            {status.status.replaceAll("_", " ")}
          </Badge>
          {status.error_message && (
            <p className="text-xs text-destructive">{status.error_message}</p>
          )}
          {status.skipped_reason && (
            <p className="text-xs text-muted-foreground">Skipped: {status.skipped_reason}</p>
          )}
        </div>
      )}
    </OperateCard>
  );
}

function EvalRunCard({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const loadCases = useListEvalCases(waSettingsId);
  const submitEval = useSubmitEvalRun(waSettingsId);
  const [selected, setSelected] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string>();
  const { data: run } = useEvalRunStatus(waSettingsId, jobId);

  const cases: EvalCase[] = loadCases.data?.eval_cases ?? [];
  const isRunning = run?.status === "QUEUED" || run?.status === "RUNNING";

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <OperateCard
      icon={IconGauge}
      title="Run an evaluation"
      description="Meta simulates conversations against your scenarios and scores how the agent handled them."
      className="xl:col-span-2"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loadCases.isPending}
            onClick={() => loadCases.mutate()}
          >
            {loadCases.isPending && <Spinner data-icon="inline-start" />}
            {cases.length ? "Reload cases" : "Load eval cases"}
          </Button>
          {!!cases.length && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelected(cases.map((c) => c.id))}
              >
                Select all
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear
              </Button>
            </>
          )}
        </div>

        {!cases.length && !loadCases.isPending && (
          <p className="text-sm text-muted-foreground">
            Load the evaluation scenarios configured for this number, then choose which to run.
          </p>
        )}

        {!!cases.length && (
          <div className="max-h-64 divide-y overflow-y-auto overscroll-contain rounded-lg border">
            {cases.map((evalCase) => (
              <label
                key={evalCase.id}
                className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.includes(evalCase.id)}
                  onCheckedChange={() => toggle(evalCase.id)}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-sm">{evalCase.scenario}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {evalCase.categories?.map((category) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                    {!!evalCase.max_turns && (
                      <span className="text-xs text-muted-foreground">
                        up to {evalCase.max_turns} turns
                      </span>
                    )}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        {!!cases.length && (
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!selected.length || submitEval.isPending || isRunning}
              onClick={() =>
                submitEval.mutate(selected, { onSuccess: (data) => setJobId(data.job_id) })
              }
            >
              {(submitEval.isPending || isRunning) && <Spinner data-icon="inline-start" />}
              Run {selected.length || ""} evaluation{selected.length === 1 ? "" : "s"}
            </Button>
          </div>
        )}

        {run && (
          <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={run.status === "FAILED" ? "destructive" : "secondary"}>
                {run.status}
              </Badge>
              {run.progress && (
                <span className="text-xs text-muted-foreground">
                  {run.progress.current_stage} — {run.progress.completed}/{run.progress.total}
                </span>
              )}
            </div>

            {run.progress && run.progress.total > 0 && (
              <Progress value={(run.progress.completed / run.progress.total) * 100} />
            )}

            {run.error && (
              <p className="text-sm text-destructive">
                {run.error.code}: {run.error.message}
              </p>
            )}

            {run.result && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-4 text-sm">
                  {run.result.avg_conversation_score !== undefined && (
                    <span>
                      <span className="text-muted-foreground">Conversation score</span>{" "}
                      <strong className="tabular-nums">
                        {run.result.avg_conversation_score.toFixed(2)}
                      </strong>
                    </span>
                  )}
                  {run.result.avg_turn_score !== undefined && (
                    <span>
                      <span className="text-muted-foreground">Turn score</span>{" "}
                      <strong className="tabular-nums">
                        {run.result.avg_turn_score.toFixed(2)}
                      </strong>
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{run.result.summary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </OperateCard>
  );
}
