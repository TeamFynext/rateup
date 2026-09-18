import { IconKey, IconReload, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppIntegration } from "@/backend/appsIntegration/integration.api";
import {
  useCreateIntegrationMutation,
  useDeleteIntegrationMutation,
  useDeleteZapierTriggerHook,
  useIntegrationByType,
  useUpdateIntegrationMutation,
} from "@/backend/appsIntegration/integration.query";
import { ActiveStatusBadge } from "@/components/app&services/Shopify.tsx";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { IntegrationFormCard } from "@/components/dashboard/settings/integrations/IntegrationFormCard.tsx";
import { INTEGRATIONS_CONFIG } from "@/components/dashboard/settings/integrations/integrations.config.ts";
import { IntegrationShell } from "@/components/dashboard/settings/integrations/IntegrationShell.tsx";
import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { IntegratedApps, ZapierTriggers } from "@/types/enums.ts";
import type { ZapierIntegration } from "@/types/global";
import { formatIsoDateStringWithTime } from "@/utils/dateTime.ts";

import { Card } from "../ui/card";
import { Field, FieldDescription, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";
import { Spinner } from "../ui/spinner";

export function Zapier() {
  const {
    data: integration,
    isLoading,
    refetch,
    isRefetching,
  } = useIntegrationByType(IntegratedApps.zapier);

  if (isLoading) return <RateupLoader />;

  const config = INTEGRATIONS_CONFIG.zapier;

  return (
    <IntegrationShell
      icon={config.icon}
      name={config.name}
      connected={Boolean(integration?.credential?.accessToken)}
    >
      <APIKeyGenerate integration={integration} />
      <ZapierTriggerList integration={integration} refetch={refetch} isLoading={isRefetching} />
    </IntegrationShell>
  );
}

function APIKeyGenerate({ integration }: { integration: AppIntegration }) {
  const [apiKey, setApiKey] = useState(undefined);
  const { t: translations } = useTranslation();
  const confirm = useConfirm();
  const user = useUser();
  const updateKey = useUpdateIntegrationMutation(IntegratedApps.zapier);
  const deleteMut = useDeleteIntegrationMutation(IntegratedApps.zapier);
  const createMut = useCreateIntegrationMutation(IntegratedApps.zapier);
  function handleRegenerate() {
    updateKey.mutate(
      { credential: integration.credential, updateKey: true },
      {
        onSuccess: (data) => {
          setApiKey(data?.apikey);
        },
      },
    );
  }
  async function handleDelete() {
    const shouldDelete = await confirm({
      title: translations("Delete API key"),
      description: translations("Any Zap using this key will stop working. This cannot be undone."),
      confirmText: translations("Delete"),
    });

    if (!shouldDelete) return;

    deleteMut.mutate();
  }
  function handleCreate() {
    createMut.mutate(
      { credential: {} },
      {
        onSuccess: (data) => {
          setApiKey(data?.apikey);
        },
      },
    );
  }
  return (
    <IntegrationFormCard
      title={translations("Credentials")}
      description={translations("Paste both into Zapier when it asks RateUp to sign you in.")}
    >
      <Field>
        <FieldLabel htmlFor="zapier-org-id">{translations("Organization ID")}</FieldLabel>
        <InputGroup>
          <InputGroupInput id="zapier-org-id" value={user.user?.orgId ?? ""} readOnly />
          <InputGroupAddon align="inline-end">
            <ApiCopyButton value={user.user?.orgId ?? ""} />
          </InputGroupAddon>
        </InputGroup>
      </Field>
      {integration && integration?.credential?.accessToken ? (
        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger render={<div className="w-full" />}>
              <Field>
                <FieldLabel htmlFor="zapier-api-key">{translations("Api Key")}</FieldLabel>
                <FieldDescription>
                  {translations("Use this key to set up your Zapier connection")}
                </FieldDescription>
                <InputGroup>
                  <InputGroupInput
                    id="zapier-api-key"
                    value={apiKey || "*".repeat(128)}
                    disabled={!apiKey}
                    readOnly
                  />
                  <InputGroupAddon align="inline-end">
                    {apiKey ? (
                      <ApiCopyButton value={apiKey} />
                    ) : (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              onClick={handleRegenerate}
                              disabled={updateKey.isPending}
                              aria-label={translations("Regenerate")}
                              variant="ghost"
                              size="icon"
                            />
                          }
                        >
                          {updateKey.isPending ? <Spinner /> : <IconReload />}
                        </TooltipTrigger>
                        <TooltipContent>{translations("Regenerate")}</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            onClick={handleDelete}
                            disabled={deleteMut.isPending}
                            aria-label={translations("Delete")}
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                          />
                        }
                      >
                        {deleteMut.isPending ? <Spinner /> : <IconTrash />}
                      </TooltipTrigger>
                      <TooltipContent>{translations("Delete")}</TooltipContent>
                    </Tooltip>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </TooltipTrigger>
            <TooltipContent>
              {apiKey
                ? translations("Api Access Key")
                : translations(
                    "You can only view access key at the time of creation. If you lost the key, you can regenerate it.",
                  )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Field>
          <FieldLabel htmlFor="zapier-generate-key">{translations("API key")}</FieldLabel>
          <FieldDescription>
            {translations("Use this key to set up your Zapier connection")}
          </FieldDescription>
          <Button
            id="zapier-generate-key"
            className="w-fit"
            onClick={handleCreate}
            disabled={createMut.isPending}
          >
            {createMut.isPending ? <Spinner /> : <IconKey data-icon="inline-start" />}
            {createMut.isPending ? translations("Generating...") : translations("Generate API key")}
          </Button>
        </Field>
      )}
    </IntegrationFormCard>
  );
}

function ZapierTriggerList({
  integration,
  refetch,
  isLoading,
}: {
  integration: ZapierIntegration;
  refetch: () => void;
  isLoading: boolean;
}) {
  const triggers = integration ? (integration.credential?.triggerSubscriptions ?? []) : [];
  const confirm = useConfirm();
  const deleteMut = useDeleteZapierTriggerHook();
  const groupedTrigger = useMemo(
    () =>
      Object.values(ZapierTriggers).map((t) => ({
        key: t,
        triggers: triggers.filter((tr) => tr.subscribed_field === t),
      })),
    [integration],
  );
  async function handleDeleteClick(tr: { id?: string; [key: string]: unknown }) {
    const shouldDelete = await confirm({
      title: "Delete trigger subscription",
      description: "Are you sure you want to delete this subscription?",
      warning: tr?.active ? "The zap with this subscription will get paused" : undefined,
      confirmText: "Delete",
    });

    if (!shouldDelete) return;

    deleteMut.mutate(tr);
  }
  if (!integration) return null;
  return (
    <Card className="p-(--card-spacing)">
      <div className="flex items-center gap-2">
        <h4 className="font-heading text-base font-medium">Trigger subscriptions</h4>
        <RefreshButton onClick={refetch} isLoading={isLoading} />
      </div>
      <div className="flex flex-col gap-4 py-6">
        {groupedTrigger.map((t) => (
          <div key={t.key} className="flex flex-col gap-4 rounded-xl bg-gray-100 p-8">
            <p className="text-sm font-medium">Trigger : {getTriggerLabel(t.key)}</p>
            {t.triggers.length > 0 ? (
              t.triggers.map((tr, index) => (
                <div key={tr.hookUrl} className="flex flex-col gap-3 rounded-sm bg-gray-200 p-3">
                  <div className="flex items-center justify-end gap-2 px-3">
                    <ActiveStatusBadge active={tr.active} />
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            disabled={deleteMut.isPending}
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteClick(tr)}
                          />
                        }
                      >
                        <IconTrash size={"1.2rem"} />
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                  <Field>
                    <FieldLabel htmlFor={`zap-id-${index}`}>Zap ID</FieldLabel>
                    <Input id={`zap-id-${index}`} value={tr.zapId || ""} readOnly />
                  </Field>
                  <Field>
                    <FieldLabel
                      htmlFor={`target-url-${index}`}
                    >{`Target Url ${index + 1}`}</FieldLabel>
                    <Input id={`target-url-${index}`} value={tr.hookUrl} readOnly />
                  </Field>
                  <div className="flex items-center justify-end gap-2">
                    <p className="text-sm font-medium">Subscribed At: </p>
                    <p className="text-sm text-muted-foreground">
                      {formatIsoDateStringWithTime(tr.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No trigger subscriptions found</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function getTriggerLabel(triggerKey: ZapierTriggers) {
  switch (triggerKey) {
    case ZapierTriggers.CONTACT_ASSIGN:
      return "New user assigned to contact";
    case ZapierTriggers.CONTACT_CREATE:
      return "New Contact created";
    case ZapierTriggers.CONTACT_DELETED:
      return "Contact Deleted";
    case ZapierTriggers.CONVERSATION_CLOSED:
      return "Conversation closed";
    case ZapierTriggers.CONTACT_LIFECYCLE_UPDATED:
      return "Contact life cycle updated";
    case ZapierTriggers.CONTACT_STAGE_UPDATED:
      return "Contact moved to another lead stage";
    case ZapierTriggers.CONTACT_UPDATED:
      return "Contact updated";
    case ZapierTriggers.NEW_MESSAGE:
      return "New Message received";
    case ZapierTriggers.NEW_TEAM_MEMBER_CREATED:
      return "Staff joined to a team";
    case ZapierTriggers.RESPONSE_SUBMITTED:
      return "Response submitted";
    case ZapierTriggers.CONTACT_ADDED_TO_GROUP:
      return "Contact added to group";
    default:
      return "not supported";
  }
}
