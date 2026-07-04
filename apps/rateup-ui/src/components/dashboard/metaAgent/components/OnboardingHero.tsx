import { CheckCircle2, ChevronDown, CircleDashed, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";

import {
  useAddAllowlistEntry,
  useAllowlist,
  useCheckAgentEligibility,
  useMetaBusinessAgent,
  useOnboardAgent,
  useRemoveAllowlistEntry,
  useSyncAllowlist,
} from "@/backend/metaAgent/metaAgent.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export function OnboardingHero({ waSettingsId }: { waSettingsId: string }) {
  const { data: agent, isLoading } = useMetaBusinessAgent(waSettingsId);
  const checkEligibility = useCheckAgentEligibility(waSettingsId);
  const onboard = useOnboardAgent(waSettingsId);

  const onboarded = agent?.status === "ONBOARDED";

  return (
    <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/5 to-transparent py-0">
      {isLoading ? (
        <CardContent className="py-6">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      ) : (
        <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <StatusCell
            label="Agent status"
            value={
              <Badge variant={onboarded ? "default" : "secondary"} className="text-sm">
                {onboarded ? (
                  <CheckCircle2 data-icon="inline-start" />
                ) : (
                  <CircleDashed data-icon="inline-start" />
                )}
                {agent?.status ?? "NOT_ONBOARDED"}
              </Badge>
            }
            footer={agent?.agentId ? `ID ${agent.agentId}` : "Not yet onboarded"}
          />

          <StatusCell
            label="Eligibility"
            value={
              checkEligibility.isPending ? (
                <Spinner />
              ) : agent?.isEligible === undefined || agent?.isEligible === null ? (
                <span className="text-sm text-muted-foreground">Unknown</span>
              ) : agent.isEligible ? (
                <Badge className="text-sm">
                  <CheckCircle2 data-icon="inline-start" /> Eligible
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-sm">
                  <XCircle data-icon="inline-start" /> Not eligible
                </Badge>
              )
            }
            footer={
              <Button
                size="sm"
                variant="link"
                className="h-auto p-0 text-xs"
                disabled={checkEligibility.isPending}
                onClick={() => checkEligibility.mutate()}
              >
                Check with Meta
              </Button>
            }
          />

          <StatusCell
            label="Action"
            value={
              <Button
                size="sm"
                disabled={onboard.isPending || agent?.isEligible === false}
                onClick={() => onboard.mutate("whatsapp")}
              >
                {onboard.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <ShieldCheck data-icon="inline-start" />
                )}
                {onboarded ? "Re-onboard" : "Onboard agent"}
              </Button>
            }
            footer="Calls Meta once, on click"
          />
        </div>
      )}

      <Separator />
      <AllowlistDrawer waSettingsId={waSettingsId} />
    </Card>
  );
}

function StatusCell({
  label,
  value,
  footer,
}: {
  label: string;
  value: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <CardContent className="flex flex-col gap-1.5 py-5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {value}
      <span className="text-xs text-muted-foreground">{footer}</span>
    </CardContent>
  );
}

function AllowlistDrawer({ waSettingsId }: { waSettingsId: string }) {
  const [open, setOpen] = useState(false);
  const { data: allowlist } = useAllowlist(waSettingsId);
  const addEntry = useAddAllowlistEntry(waSettingsId);
  const removeEntry = useRemoveAllowlistEntry(waSettingsId);
  const sync = useSyncAllowlist(waSettingsId);
  const [phone, setPhone] = useState("");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center justify-between px-6 py-3 text-sm text-muted-foreground hover:bg-muted/50"
          />
        }
      >
        <span>
          Allowlist <span className="text-foreground">({allowlist?.length ?? 0} numbers)</span>
        </span>
        <ChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <CardContent className="space-y-3 pb-5">
          <p className="text-xs text-muted-foreground">
            Only used when audience is set to allowlisted-only in Settings.
          </p>
          <FieldGroup>
            <Field orientation="horizontal" className="flex-wrap">
              <FieldLabel htmlFor="allowlist-phone" className="sr-only">
                Phone number
              </FieldLabel>
              <Input
                id="allowlist-phone"
                placeholder="+15551234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="max-w-56"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!phone || addEntry.isPending}
                onClick={() => addEntry.mutate(phone, { onSuccess: () => setPhone("") })}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={sync.isPending}
                onClick={() => sync.mutate()}
              >
                Sync from Meta
              </Button>
            </Field>
          </FieldGroup>
          {!!allowlist?.length && (
            <div className="flex flex-wrap gap-2">
              {allowlist.map((entry) => (
                <Badge key={entry.id} variant="secondary" className="gap-1.5 pr-1 text-sm">
                  {entry.consumerPhoneNumber}
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-background/60"
                    disabled={removeEntry.isPending}
                    onClick={() => removeEntry.mutate(entry.id)}
                  >
                    <XCircle className="size-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </CollapsibleContent>
    </Collapsible>
  );
}
