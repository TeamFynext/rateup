import {
  CalendarClock,
  MessageSquareText,
  PhoneForwarded,
  PhoneOff,
  FlaskConical,
  Gauge,
} from "lucide-react";
import { useState } from "react";

import {
  useSetThreadControl,
  useSubmitAgentEvent,
  useSubmitEvalRun,
  useTestAgent,
} from "@/backend/metaAgent/metaAgent.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

export function OperateSection({ waSettingsId }: { waSettingsId: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <FieldGroup>{children}</FieldGroup>
      </CardContent>
    </Card>
  );
}

function TestAgentCard({ waSettingsId }: { waSettingsId: string }) {
  const testAgent = useTestAgent(waSettingsId);
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string>();

  return (
    <OperateCard
      icon={FlaskConical}
      title="Test the agent"
      description="Send a message and see how the AI agent would respond, without notifying a real consumer."
    >
      <Field>
        <FieldLabel htmlFor="test-message" className="sr-only">
          Test message
        </FieldLabel>
        <Textarea
          id="test-message"
          placeholder="Type a test message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>
      <Button
        disabled={!message || testAgent.isPending}
        onClick={() =>
          testAgent.mutate(
            { message, conversationId },
            { onSuccess: (data) => setConversationId(data.conversation_id) },
          )
        }
      >
        {testAgent.isPending && <Spinner data-icon="inline-start" />}
        Send test message
      </Button>
      {testAgent.data && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <p>{testAgent.data.agent_response}</p>
          {testAgent.data.handoff_reason && (
            <Badge variant="secondary">Handoff: {testAgent.data.handoff_reason}</Badge>
          )}
          {testAgent.data.no_response_reason && (
            <Badge variant="secondary">No response: {testAgent.data.no_response_reason}</Badge>
          )}
        </div>
      )}
    </OperateCard>
  );
}

function ThreadControlCard({ waSettingsId }: { waSettingsId: string }) {
  const setThreadControl = useSetThreadControl(waSettingsId);
  const [to, setTo] = useState("");

  return (
    <OperateCard
      icon={PhoneForwarded}
      title="Thread control"
      description="Pass a live conversation to the AI agent, or release it back to standby."
    >
      <Field>
        <FieldLabel htmlFor="thread-control-phone">Consumer phone number</FieldLabel>
        <Input
          id="thread-control-phone"
          placeholder="+15551234567"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </Field>
      <div className="flex gap-2">
        <Button
          disabled={!to || setThreadControl.isPending}
          onClick={() => setThreadControl.mutate({ action: "pass", to })}
        >
          <PhoneForwarded data-icon="inline-start" />
          Pass to agent
        </Button>
        <Button
          variant="outline"
          disabled={!to || setThreadControl.isPending}
          onClick={() => setThreadControl.mutate({ action: "release", to })}
        >
          <PhoneOff data-icon="inline-start" />
          Release control
        </Button>
      </div>
    </OperateCard>
  );
}

function AgentEventCard({ waSettingsId }: { waSettingsId: string }) {
  const submitEvent = useSubmitAgentEvent(waSettingsId);
  const [to, setTo] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [payload, setPayload] = useState("{}");

  return (
    <OperateCard
      icon={CalendarClock}
      title="Send a business event"
      description="Notify the agent of a business event (e.g. order shipped) so it can proactively update the consumer."
    >
      <Field>
        <FieldLabel htmlFor="event-phone">Phone number</FieldLabel>
        <Input id="event-phone" value={to} onChange={(e) => setTo(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="event-type">Event type</FieldLabel>
        <Input
          id="event-type"
          placeholder="e.g. order_shipped"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="event-description">Description</FieldLabel>
        <Input
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="event-payload">Payload (JSON)</FieldLabel>
        <Textarea id="event-payload" value={payload} onChange={(e) => setPayload(e.target.value)} />
      </Field>
      <Button
        disabled={!to || !type || !description || submitEvent.isPending}
        onClick={() => submitEvent.mutate({ to, event: { type, description, payload } })}
      >
        <MessageSquareText data-icon="inline-start" />
        Submit event
      </Button>
      {submitEvent.data && (
        <Badge variant="secondary">
          {submitEvent.data.status}
          {submitEvent.data.agent_event_id ? ` · ${submitEvent.data.agent_event_id}` : ""}
        </Badge>
      )}
    </OperateCard>
  );
}

function EvalRunCard({ waSettingsId }: { waSettingsId: string }) {
  const submitEval = useSubmitEvalRun(waSettingsId);
  const [caseIds, setCaseIds] = useState("");

  return (
    <OperateCard
      icon={Gauge}
      title="Run an evaluation"
      description="Run the agent against a set of evaluation cases to measure quality."
    >
      <Field>
        <FieldLabel htmlFor="eval-case-ids">Eval case IDs</FieldLabel>
        <Input
          id="eval-case-ids"
          placeholder="Comma-separated"
          value={caseIds}
          onChange={(e) => setCaseIds(e.target.value)}
        />
      </Field>
      <Button
        disabled={!caseIds || submitEval.isPending}
        onClick={() =>
          submitEval.mutate(
            caseIds
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      >
        Submit eval run
      </Button>
      {submitEval.data && (
        <Badge variant="secondary">
          {submitEval.data.status} · {submitEval.data.job_id}
        </Badge>
      )}
    </OperateCard>
  );
}
