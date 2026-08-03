import { IconPlug, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import {
  useConnectors,
  useCreateConnector,
  useDeleteConnector,
  useSyncConnectors,
  useUpsertConnectorApiKey,
} from "@/backend/metaAgent/metaAgent.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  ACTIVE: "default",
  PENDING_OAUTH: "secondary",
  EXPIRED: "destructive",
  ERROR: "destructive",
};

export function ConnectorsSection({ waSettingsId }: { waSettingsId: string }) {
  const { data: connectors, isLoading } = useConnectors(waSettingsId);
  const createConnector = useCreateConnector(waSettingsId);
  const deleteConnector = useDeleteConnector(waSettingsId);
  const sync = useSyncConnectors(waSettingsId);
  const upsertApiKey = useUpsertConnectorApiKey(waSettingsId);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authType, setAuthType] = useState<"OAUTH2_CLIENT_CREDENTIALS" | "API_KEY" | "NONE">(
    "API_KEY",
  );
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  const reset = () => {
    setName("");
    setDescription("");
    setBaseUrl("");
    setAuthType("API_KEY");
    setAdding(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Connectors ({connectors?.length ?? 0})</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
          >
            <IconRefresh
              data-icon="inline-start"
              className={sync.isPending ? "animate-spin" : ""}
            />
            Sync
          </Button>
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            <IconPlus data-icon="inline-start" />
            Add connector
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <FieldGroup className="rounded-lg border p-3">
            <Field>
              <FieldLabel htmlFor="connector-name">Name</FieldLabel>
              <Input id="connector-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="connector-description">Description</FieldLabel>
              <Textarea
                id="connector-description"
                placeholder="What this connector provides"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="connector-base-url">Base URL</FieldLabel>
              <Input
                id="connector-base-url"
                placeholder="https://api.example.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="connector-auth">Auth type</FieldLabel>
              <Select
                value={authType}
                onValueChange={(v) => setAuthType(v as typeof authType)}
                items={[
                  { value: "NONE", label: "None" },
                  { value: "API_KEY", label: "API key" },
                  { value: "OAUTH2_CLIENT_CREDENTIALS", label: "OAuth2 client credentials" },
                ]}
              >
                <SelectTrigger id="connector-auth" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="API_KEY">API key</SelectItem>
                  <SelectItem value="OAUTH2_CLIENT_CREDENTIALS">
                    OAuth2 client credentials
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!name || !description || !baseUrl || createConnector.isPending}
                onClick={() =>
                  createConnector.mutate(
                    { name, description, base_url: baseUrl, auth_type: authType },
                    { onSuccess: reset },
                  )
                }
              >
                Save
              </Button>
            </div>
          </FieldGroup>
        )}

        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!isLoading && !connectors?.length && (
          <Empty className="border-none py-8">
            <EmptyTitle>No connectors configured</EmptyTitle>
            <EmptyDescription>
              Connect an external API (order tracking, CRM, etc.) the agent can call.
            </EmptyDescription>
          </Empty>
        )}

        <div className="space-y-3">
          {connectors?.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <IconPlug className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.name}</span>
                      <Badge variant={STATUS_VARIANT[c.connectionStatus ?? "PENDING_OAUTH"]}>
                        {c.connectionStatus ?? "PENDING_OAUTH"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{c.baseUrl}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  disabled={deleteConnector.isPending}
                  onClick={() => deleteConnector.mutate(c.id)}
                >
                  <IconTrash className="text-destructive" />
                </Button>
              </div>
              {c.authType === "API_KEY" && (
                <FieldGroup className="mt-3">
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor={`api-key-${c.id}`} className="sr-only">
                      API key
                    </FieldLabel>
                    <Input
                      id={`api-key-${c.id}`}
                      placeholder="API key"
                      type="password"
                      value={apiKeys[c.id] ?? ""}
                      onChange={(e) => setApiKeys((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!apiKeys[c.id] || upsertApiKey.isPending}
                      onClick={() =>
                        upsertApiKey.mutate({ connectorId: c.id, apiKey: apiKeys[c.id] })
                      }
                    >
                      Save key
                    </Button>
                  </Field>
                </FieldGroup>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
