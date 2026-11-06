import {
  IconAlertTriangle,
  IconPencil,
  IconPlug,
  IconPlus,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

import type { Connector, ConnectionStatus } from "@/backend/metaAgent/metaAgent.api";
import {
  useConnectors,
  useDeleteConnector,
  useSyncConnectors,
} from "@/backend/metaAgent/metaAgent.query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ConnectorCredentials } from "./connectors/ConnectorCredentials";
import { ConnectorDialog } from "./connectors/ConnectorDialog";
import { ConnectorLogsPanel } from "./connectors/ConnectorLogsPanel";
import { ConnectorToolsPanel } from "./connectors/ConnectorToolsPanel";
import { RateupConnectorPanel } from "./connectors/RateupConnectorPanel";
import { PanelCard } from "./shared/PanelCard";

const STATUS: Record<
  ConnectionStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  ACTIVE: { label: "Connected", variant: "default" },
  PENDING_OAUTH: { label: "Awaiting credentials", variant: "secondary" },
  EXPIRED: { label: "Credentials expired", variant: "destructive" },
  ERROR: { label: "Error", variant: "destructive" },
};

export function ConnectorsSection({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  return (
    <div className="flex flex-col gap-4">
      <RateupConnectorPanel waSettingsId={waSettingsId} />
      <ConnectorList waSettingsId={waSettingsId} />
    </div>
  );
}

function ConnectorList({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data: connectors, isLoading } = useConnectors(waSettingsId);
  const deleteConnector = useDeleteConnector(waSettingsId);
  const sync = useSyncConnectors(waSettingsId);
  const [editing, setEditing] = useState<Connector | null>(null);
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState<Connector | null>(null);
  const [tab, setTab] = useState("tools");

  // The dialog holds a snapshot; re-reading from the list keeps credentials and
  // tool counts current while it is open.
  const managed = managing ? (connectors?.find((c) => c.id === managing.id) ?? managing) : null;
  // RateUp owns the built-in connector's key and tools; only its logs are yours to read.
  const managedBuiltIn = !!managed?.builtIn;

  return (
    <PanelCard
      title="Connectors"
      description="Each connector is an external API. Register credentials once, then define the operations the agent may call."
      count={connectors?.length ?? 0}
      onSync={() => sync.mutate()}
      isSyncing={sync.isPending}
      actions={
        <Button size="sm" onClick={() => setCreating(true)}>
          <IconPlus data-icon="inline-start" />
          Add connector
        </Button>
      }
    >
      {isLoading && <Skeleton className="h-24 w-full" />}

      {!isLoading && !connectors?.length && (
        <Empty className="border-none py-8">
          <EmptyTitle>No connectors configured</EmptyTitle>
          <EmptyDescription>
            Connect an order-tracking, CRM or booking API and the agent can answer from live data
            instead of guessing.
          </EmptyDescription>
        </Empty>
      )}

      <div className="space-y-3">
        {connectors?.map((connector) => {
          const status = STATUS[connector.connectionStatus] ?? STATUS.PENDING_OAUTH;
          return (
            <div key={connector.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <IconPlug className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{connector.name}</span>
                      {connector.builtIn && <Badge variant="secondary">Built in</Badge>}
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {!!connector._count?.tools && (
                        <Badge variant="outline">
                          {connector._count.tools} tool{connector._count.tools === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{connector.description}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {connector.baseUrl}
                    </p>
                    {connector.connectionError && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-destructive">
                        <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        {connector.connectionError}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTab(connector.builtIn ? "logs" : "tools");
                      setManaging(connector);
                    }}
                  >
                    <IconSettings data-icon="inline-start" />
                    Manage
                  </Button>
                  {!connector.builtIn && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${connector.name}`}
                      onClick={() => setEditing(connector)}
                    >
                      <IconPencil />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${connector.name}`}
                          loading={deleteConnector.isPending}
                        >
                          <IconTrash className="text-destructive" />
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {connector.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Removes the connector, its stored credentials and every tool defined on
                          it. Any skill that told the agent to call those tools will stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteConnector.mutate(connector.id)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConnectorDialog
        waSettingsId={waSettingsId}
        connector={editing}
        open={creating || !!editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />

      <Dialog open={!!managed} onOpenChange={(open) => !open && setManaging(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{managed?.name}</DialogTitle>
            <DialogDescription>{managed?.baseUrl}</DialogDescription>
          </DialogHeader>
          {managed && (
            <Tabs value={tab} onValueChange={(value) => setTab(String(value ?? "tools"))}>
              <TabsList>
                {!managedBuiltIn && <TabsTrigger value="tools">Tools</TabsTrigger>}
                {!managedBuiltIn && <TabsTrigger value="credentials">Credentials</TabsTrigger>}
                <TabsTrigger value="logs">Error logs</TabsTrigger>
              </TabsList>
              {!managedBuiltIn && (
                <>
                  <TabsContent value="tools">
                    <ConnectorToolsPanel waSettingsId={waSettingsId} connectorId={managed.id} />
                  </TabsContent>
                  <TabsContent value="credentials">
                    <ConnectorCredentials waSettingsId={waSettingsId} connector={managed} />
                  </TabsContent>
                </>
              )}
              <TabsContent value="logs">
                {/* Tab panels stay mounted, so the logs tab has to ask for its
                    own visibility — this is the one panel here that reads
                    straight through to Meta. */}
                <ConnectorLogsPanel
                  waSettingsId={waSettingsId}
                  connectorId={managed.id}
                  active={tab === "logs"}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </PanelCard>
  );
}
