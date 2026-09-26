import { IconBolt, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import {
  RATEUP_CONNECTOR_TOOLS,
  type RateupConnectorToolName,
} from "@/backend/metaAgent/metaAgent.api";
import {
  useInstallRateupConnector,
  useRateupConnector,
  useUninstallRateupConnector,
} from "@/backend/metaAgent/metaAgent.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/context/confirm-provider";
import { useCan } from "@/hooks/usePermission";

import { PanelCard } from "../shared/PanelCard";

const GROUPS = [
  { id: "loyalty", label: "Loyalty" },
  { id: "crm", label: "CRM" },
] as const;

/**
 * The options lookup is plumbing, not a choice: the CRM actions need it to know
 * your label, stage and team names, so it is installed with them — here and,
 * whatever this page sends, on the server — and never shown.
 */
const HIDDEN_TOOL: RateupConnectorToolName = "get_crm_options";
const VISIBLE_TOOLS = RATEUP_CONNECTOR_TOOLS.filter((tool) => tool.name !== HIDDEN_TOOL);
const ALL_TOOLS: RateupConnectorToolName[] = VISIBLE_TOOLS.map((tool) => tool.name);
const CRM_WRITES: RateupConnectorToolName[] = [
  "add_contact_label",
  "set_lead_stage",
  "assign_to_team",
];

const isToolName = (name: string): name is RateupConnectorToolName =>
  (ALL_TOOLS as readonly string[]).includes(name);

/**
 * One click gives the agent RateUp's own data: the customer's loyalty standing,
 * and your labels, lead stages and teams. RateUp creates the connector at Meta,
 * issues it a key and writes each tool; reinstalling issues a new key.
 */
export function RateupConnectorPanel({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data, isLoading } = useRateupConnector(waSettingsId);
  const install = useInstallRateupConnector(waSettingsId);
  const uninstall = useUninstallRateupConnector(waSettingsId);
  const canManage = useCan("meta_agent.manage");
  const confirm = useConfirm();
  const [selected, setSelected] = useState<RateupConnectorToolName[]>(ALL_TOOLS);

  // Start from what is installed, so a reinstall changes only what was ticked.
  useEffect(() => {
    if (data?.installed) setSelected(data.tools.filter(isToolName));
  }, [data]);

  const toggle = (name: RateupConnectorToolName, on: boolean) =>
    setSelected((current) =>
      on ? [...new Set([...current, name])] : current.filter((n) => n !== name),
    );
  const toInstall = selected.some((n) => CRM_WRITES.includes(n))
    ? [...selected, HIDDEN_TOOL]
    : selected;
  const installedCount = data?.installed
    ? data.tools.filter((tool) => tool !== HIDDEN_TOOL).length
    : 0;

  const onRemove = async () => {
    const ok = await confirm({
      title: "Remove the RateUp connector?",
      description:
        "The agent will no longer be able to look up loyalty or update labels, stages and teams. Any skill that tells it to will stop working.",
      confirmText: "Remove",
    });
    if (ok) uninstall.mutate();
  };

  return (
    <PanelCard
      title="RateUp connector"
      description="Let the agent use your RateUp data with one click: a customer's loyalty points and rewards, and your labels, lead stages and teams. It only ever acts on the customer it is talking to, and never sends messages itself."
    >
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="flex flex-col gap-4">
          {data?.installed && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge className="bg-green-600/10 text-green-700 dark:text-green-500">
                Installed
              </Badge>
              <span className="text-muted-foreground">
                {installedCount} tool{installedCount === 1 ? "" : "s"} available to the agent
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {GROUPS.map((group) => (
              <fieldset key={group.id} className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">{group.label}</legend>
                {VISIBLE_TOOLS.filter((tool) => tool.group === group.id).map((tool) => (
                  <label
                    key={tool.name}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 has-disabled:cursor-default"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={selected.includes(tool.name)}
                      disabled={!canManage}
                      onCheckedChange={(on) => toggle(tool.name, on === true)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm">{tool.label}</span>
                      <span className="block text-xs text-muted-foreground">{tool.blurb}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Loyalty tools need a loyalty programme on your plan. Redeeming rewards and sending
            messages are left to your team.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            {canManage ? (
              <span className="text-xs text-muted-foreground">
                {data?.installed
                  ? "Reinstalling applies the ticked tools and issues a new key."
                  : "Tell the agent when to use these in a skill, e.g. “Route billing questions to the Billing team before handing over.”"}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Only admins can install the RateUp connector.
              </span>
            )}
            <div className="flex gap-2">
              {data?.installed && (
                <Button
                  variant="ghost"
                  disabled={!canManage}
                  loading={uninstall.isPending}
                  onClick={onRemove}
                >
                  <IconTrash data-icon="inline-start" />
                  Remove
                </Button>
              )}
              <Button
                disabled={!canManage || !selected.length}
                loading={install.isPending}
                onClick={() => install.mutate(toInstall)}
              >
                {data?.installed ? (
                  <IconRefresh data-icon="inline-start" />
                ) : (
                  <IconBolt data-icon="inline-start" />
                )}
                {data?.installed ? "Reinstall" : "Install"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PanelCard>
  );
}
