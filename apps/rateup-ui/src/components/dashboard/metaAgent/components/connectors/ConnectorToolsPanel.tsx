import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconPlayerPlay, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { ConnectorTool, RequestDefinition } from "@/backend/metaAgent/metaAgent.api";
import {
  useConnectorTools,
  useCreateConnectorTool,
  useDeleteConnectorTool,
  useRunConnectorTool,
  useSyncConnectorTools,
  useUpdateConnectorTool,
} from "@/backend/metaAgent/metaAgent.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { FieldDescription, FieldGroup } from "@/components/ui/field";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  connectorToolFormSchema,
  type ConnectorToolFormValues,
  toolRunFormSchema,
  type ToolRunFormValues,
} from "../../metaAgent.schemas";
import { FormField } from "../shared/FormField";

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
const METHOD_ITEMS = METHODS.map((value) => ({ value, label: value }));

const METHOD_COLOR: Record<(typeof METHODS)[number], string> = {
  GET: "text-green-600 dark:text-green-500",
  POST: "text-blue-600 dark:text-blue-400",
  PUT: "text-amber-700 dark:text-amber-500",
  PATCH: "text-amber-700 dark:text-amber-500",
  DELETE: "text-destructive",
};

const pretty = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

export function ConnectorToolsPanel({
  waSettingsId,
  connectorId,
}: Readonly<{ waSettingsId: string; connectorId: string }>) {
  const { data: tools, isLoading } = useConnectorTools(waSettingsId, connectorId);
  const deleteTool = useDeleteConnectorTool(waSettingsId, connectorId);
  const sync = useSyncConnectorTools(waSettingsId, connectorId);
  const [editing, setEditing] = useState<ConnectorTool | null>(null);
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState<ConnectorTool | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          One tool is one operation the agent may call on this API.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
          >
            <IconRefresh
              data-icon="inline-start"
              className={cn(sync.isPending && "animate-spin")}
            />
            Sync
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <IconPlus data-icon="inline-start" />
            Add tool
          </Button>
        </div>
      </div>

      {isLoading && <Skeleton className="h-24 w-full" />}

      {!isLoading && !tools?.length && (
        <Empty className="border-none py-8">
          <EmptyTitle>No tools yet</EmptyTitle>
          <EmptyDescription>
            Define the requests the agent may make — look up an order, create a booking, check
            stock.
          </EmptyDescription>
        </Empty>
      )}

      <div className="space-y-2">
        {tools?.map((tool) => (
          <div key={tool.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    {tool.name}
                  </code>
                  {tool.userAuthRequired && <Badge variant="outline">User auth</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
                <p className="mt-1 font-mono text-xs">
                  <span className={METHOD_COLOR[tool.requestDefinition.method] ?? ""}>
                    {tool.requestDefinition.method}
                  </span>{" "}
                  <span className="text-muted-foreground">{tool.requestDefinition.path}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Run ${tool.name}`}
                  onClick={() => setRunning(tool)}
                >
                  <IconPlayerPlay />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${tool.name}`}
                  onClick={() => setEditing(tool)}
                >
                  <IconPencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${tool.name}`}
                  disabled={deleteTool.isPending}
                  onClick={() => deleteTool.mutate(tool.id)}
                >
                  <IconTrash className="text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ToolDialog
        waSettingsId={waSettingsId}
        connectorId={connectorId}
        tool={editing}
        open={creating || !!editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />

      <RunToolDialog
        waSettingsId={waSettingsId}
        connectorId={connectorId}
        tool={running}
        onClose={() => setRunning(null)}
      />
    </div>
  );
}

function ToolDialog({
  waSettingsId,
  connectorId,
  tool,
  open,
  onOpenChange,
}: Readonly<{
  waSettingsId: string;
  connectorId: string;
  tool: ConnectorTool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const createTool = useCreateConnectorTool(waSettingsId, connectorId);
  const updateTool = useUpdateConnectorTool(waSettingsId, connectorId);

  const definition = tool?.requestDefinition;
  const form = useForm<ConnectorToolFormValues>({
    resolver: zodResolver(connectorToolFormSchema),
    values: {
      name: tool?.name ?? "",
      description: tool?.description ?? "",
      method: definition?.method ?? "GET",
      path: definition?.path ?? "/",
      pathParameters: pretty(definition?.path_parameters),
      queryParameters: pretty(definition?.query_parameters),
      headers: pretty(definition?.headers),
      body: definition?.body ? pretty(definition.body) : "",
      user_auth_required: tool?.userAuthRequired ?? false,
    },
  });

  const method = form.watch("method");
  const isPending = createTool.isPending || updateTool.isPending;

  const onSubmit = (values: ConnectorToolFormValues) => {
    // The zod resolver has already proved each blob parses; this is the second
    // half of the same check, turning them back into the nested shape Meta wants.
    const parse = (raw: string) => (raw.trim() ? JSON.parse(raw) : undefined);
    const request_definition: RequestDefinition = {
      method: values.method,
      path: values.path,
      path_parameters: parse(values.pathParameters),
      query_parameters: parse(values.queryParameters),
      headers: parse(values.headers),
      body: parse(values.body),
    };
    const payload = {
      name: values.name,
      description: values.description,
      request_definition,
      user_auth_required: values.user_auth_required,
    };
    const done = { onSuccess: () => onOpenChange(false) };
    if (tool) updateTool.mutate({ toolId: tool.id, data: payload }, done);
    else createTool.mutate(payload, done);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tool ? "Edit tool" : "Add tool"}</DialogTitle>
          <DialogDescription>
            The name and description are what the agent sees when deciding to call this; the request
            definition is what actually goes out.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <FormField
              control={form.control}
              name="name"
              label="Tool name"
              required
              description="A stable key: letters, numbers, underscores and hyphens."
            >
              {(field, controlProps) => (
                <Input {...field} {...controlProps} placeholder="get_order" className="font-mono" />
              )}
            </FormField>

            <FormField
              control={form.control}
              name="description"
              label="Description"
              required
              hint={`${form.watch("description").length}/1024`}
            >
              {(field, controlProps) => (
                <Textarea
                  {...field}
                  {...controlProps}
                  rows={2}
                  placeholder="Fetches a single order by its id, including line items and shipping status."
                />
              )}
            </FormField>

            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
              <FormField control={form.control} name="method" label="Method" required>
                {(field, controlProps) => (
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ?? "GET")}
                    items={METHOD_ITEMS}
                  >
                    <SelectTrigger {...controlProps} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHOD_ITEMS.map((item) => (
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
                name="path"
                label="Path"
                required
                description="Appended to the connector's base URL. Use {braces} for path parameters."
              >
                {(field, controlProps) => (
                  <Input
                    {...field}
                    {...controlProps}
                    placeholder="/orders/{orderId}"
                    className="font-mono text-sm"
                  />
                )}
              </FormField>
            </div>

            <FormField
              control={form.control}
              name="pathParameters"
              label="Path parameters"
              description='Each {placeholder} above needs an entry, e.g. {"orderId": {"type": "string", "required": true}}'
            >
              {(field, controlProps) => (
                <Textarea {...field} {...controlProps} rows={4} className="font-mono text-xs" />
              )}
            </FormField>

            <FormField
              control={form.control}
              name="queryParameters"
              label="Query parameters"
              description='Add "binding" to pin a value: {"kind":"macro","macro":"WHATSAPP_PHONE_NUMBER"}'
            >
              {(field, controlProps) => (
                <Textarea {...field} {...controlProps} rows={4} className="font-mono text-xs" />
              )}
            </FormField>

            <FormField control={form.control} name="headers" label="Headers">
              {(field, controlProps) => (
                <Textarea {...field} {...controlProps} rows={3} className="font-mono text-xs" />
              )}
            </FormField>

            {method !== "GET" && method !== "DELETE" && (
              <FormField
                control={form.control}
                name="body"
                label="Request body"
                description='JSON body definition, e.g. {"content_type":"application/json","params":{…},"required":["orderId"]}'
              >
                {(field, controlProps) => (
                  <Textarea
                    {...field}
                    {...controlProps}
                    rows={6}
                    className="font-mono text-xs"
                    placeholder='{"content_type": "application/json", "params": {}}'
                  />
                )}
              </FormField>
            )}

            <FormField
              control={form.control}
              name="user_auth_required"
              label="Requires the customer's own token"
              orientation="horizontal"
              description="Meta injects the stored user token using the connector's injection config."
            >
              {(field) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            </FormField>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Spinner data-icon="inline-start" />}
                {tool ? "Save changes" : "Create tool"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RunToolDialog({
  waSettingsId,
  connectorId,
  tool,
  onClose,
}: Readonly<{
  waSettingsId: string;
  connectorId: string;
  tool: ConnectorTool | null;
  onClose: () => void;
}>) {
  const run = useRunConnectorTool(waSettingsId, connectorId);
  const form = useForm<ToolRunFormValues>({
    resolver: zodResolver(toolRunFormSchema),
    defaultValues: { input: "{}" },
  });

  return (
    <Dialog
      open={!!tool}
      onOpenChange={(open) => {
        if (!open) {
          run.reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Run {tool?.name}</DialogTitle>
          <DialogDescription>
            Calls your API for real, with the credentials registered on this connector. Use it to
            confirm the definition works before letting the agent near it.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => {
            if (!tool) return;
            run.mutate({ toolId: tool.id, input: values.input });
          })}
        >
          <FieldGroup className="gap-4">
            <FormField control={form.control} name="input" label="Input">
              {(field, controlProps) => (
                <Textarea {...field} {...controlProps} rows={5} className="font-mono text-xs" />
              )}
            </FormField>

            {run.data && (
              <div className="space-y-2">
                <Badge variant={run.data.status === "success" ? "default" : "destructive"}>
                  {run.data.status}
                </Badge>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted/60 p-3 text-xs whitespace-pre-wrap">
                  {run.data.output}
                </pre>
                <FieldDescription>The raw response from your API, as Meta saw it.</FieldDescription>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button type="submit" disabled={run.isPending}>
                {run.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <IconPlayerPlay data-icon="inline-start" />
                )}
                Run
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
