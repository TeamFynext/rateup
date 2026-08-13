import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconPlus,
  IconRefresh,
  IconShieldCheck,
  IconTrash,
} from "@tabler/icons-react";
import { useForm } from "react-hook-form";

import {
  useAddAllowlistEntry,
  useAllowlist,
  useCheckAgentEligibility,
  useDeleteAgent,
  useMetaBusinessAgent,
  useOnboardAgent,
  useRemoveAllowlistEntry,
  useSyncAllowlist,
} from "@/backend/metaAgent/metaAgent.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { allowlistFormSchema, type AllowlistFormValues } from "../metaAgent.schemas";
import { FormField } from "./shared/FormField";
import { PanelCard } from "./shared/PanelCard";

export function OverviewSection({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  return (
    <div className="space-y-4">
      <OnboardingSteps waSettingsId={waSettingsId} />
      <AllowlistPanel waSettingsId={waSettingsId} />
      <DangerZone waSettingsId={waSettingsId} />
    </div>
  );
}

/**
 * Meta's onboarding is strictly ordered — a number has to be eligible before it
 * can be onboarded — so it reads as a checklist rather than three equal buttons.
 */
function OnboardingSteps({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data: agent, isLoading } = useMetaBusinessAgent(waSettingsId);
  const checkEligibility = useCheckAgentEligibility(waSettingsId);
  const onboard = useOnboardAgent(waSettingsId);

  const onboarded = agent?.status === "ONBOARDED";
  const eligible = agent?.isEligible === true;
  const ineligible = agent?.isEligible === false;

  if (isLoading) return <Skeleton className="h-52 w-full rounded-xl" />;

  return (
    <Card className="border-primary/20 bg-linear-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle>Getting the agent live</CardTitle>
        <CardDescription>
          Each step calls Meta once, when you press it. Nothing runs automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Step
          index={1}
          title="Check eligibility"
          state={eligible ? "done" : ineligible ? "blocked" : "todo"}
          description={
            ineligible
              ? "Meta says this number is not eligible for the Business Agent yet."
              : eligible
                ? "Meta confirmed this number is eligible."
                : "Ask Meta whether this WhatsApp number can run a Business Agent."
          }
          action={
            <Button
              size="sm"
              variant={eligible ? "outline" : "default"}
              disabled={checkEligibility.isPending}
              onClick={() => checkEligibility.mutate()}
            >
              {checkEligibility.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <IconRefresh data-icon="inline-start" />
              )}
              {eligible || ineligible ? "Re-check" : "Check with Meta"}
            </Button>
          }
        />

        <Step
          index={2}
          title="Onboard the agent"
          state={onboarded ? "done" : eligible ? "todo" : "waiting"}
          description={
            onboarded
              ? `Onboarded on the ${agent?.channel} channel. Agent id ${agent?.agentId ?? "—"}.`
              : eligible
                ? "Creates the agent at Meta and returns the agent id every other call is scoped to."
                : "Available once Meta confirms the number is eligible."
          }
          action={
            <Button
              size="sm"
              variant={onboarded ? "outline" : "default"}
              disabled={onboard.isPending || !eligible}
              onClick={() => onboard.mutate("whatsapp")}
            >
              {onboard.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <IconShieldCheck data-icon="inline-start" />
              )}
              {onboarded ? "Re-onboard" : "Onboard agent"}
            </Button>
          }
        />

        <Step
          index={3}
          title="Configure and turn it on"
          state={onboarded ? "todo" : "waiting"}
          description="Add knowledge and skills, then enable rollout under Settings."
        />

        {ineligible && (
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertTitle>This number is not eligible</AlertTitle>
            <AlertDescription>
              Eligibility depends on your business vertical and country, and on the Meta Business
              Agent terms being accepted in WhatsApp Manager. Re-check after those are in place.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

type StepState = "done" | "todo" | "waiting" | "blocked";

function Step({
  index,
  title,
  description,
  state,
  action,
}: Readonly<{
  index: number;
  title: string;
  description: string;
  state: StepState;
  action?: React.ReactNode;
}>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-background p-3",
        state === "waiting" && "opacity-60",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            state === "done" && "bg-green-600/10 text-green-600",
            state === "blocked" && "bg-destructive/10 text-destructive",
            (state === "todo" || state === "waiting") && "bg-muted text-muted-foreground",
          )}
        >
          {state === "done" ? (
            <IconCircleCheck className="size-4" />
          ) : state === "blocked" ? (
            <IconCircleX className="size-4" />
          ) : (
            index
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function AllowlistPanel({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data: allowlist, isLoading } = useAllowlist(waSettingsId);
  const addEntry = useAddAllowlistEntry(waSettingsId);
  const removeEntry = useRemoveAllowlistEntry(waSettingsId);
  const sync = useSyncAllowlist(waSettingsId);

  const form = useForm<AllowlistFormValues>({
    resolver: zodResolver(allowlistFormSchema),
    defaultValues: { phone: "" },
  });

  const onSubmit = (values: AllowlistFormValues) =>
    addEntry.mutate(values.phone, { onSuccess: () => form.reset() });

  return (
    <PanelCard
      title="Allowlist"
      description="Only consulted when the AI audience is set to allowlisted numbers only, under Settings."
      count={allowlist?.length ?? 0}
      onSync={() => sync.mutate()}
      isSyncing={sync.isPending}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FieldGroup>
          <FormField
            control={form.control}
            name="phone"
            label="Consumer phone number"
            required
            description="E.164 format, including the country code."
          >
            {(field, controlProps) => (
              <div className="flex flex-wrap items-start gap-2">
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
                  className="w-full max-w-72"
                />
                <Button type="submit" variant="outline" disabled={addEntry.isPending}>
                  <IconPlus data-icon="inline-start" />
                  Add
                </Button>
              </div>
            )}
          </FormField>
        </FieldGroup>
      </form>

      {isLoading && <Skeleton className="mt-4 h-8 w-full" />}

      {!isLoading && !allowlist?.length && (
        <p className="mt-4 text-sm text-muted-foreground">
          No numbers allowlisted. With the allowlisted-only audience, the agent will not answer
          anyone.
        </p>
      )}

      {!!allowlist?.length && (
        <div className="mt-4 flex flex-wrap gap-2">
          {allowlist.map((entry) => (
            <Badge key={entry.id} variant="secondary" className="gap-1.5 pr-1 text-sm">
              {entry.consumerPhoneNumber}
              <button
                type="button"
                aria-label={`Remove ${entry.consumerPhoneNumber}`}
                className="rounded-full p-0.5 hover:bg-background/60"
                disabled={removeEntry.isPending}
                onClick={() => removeEntry.mutate(entry.id)}
              >
                <IconCircleX className="size-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

function DangerZone({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data: agent } = useMetaBusinessAgent(waSettingsId);
  const deleteAgent = useDeleteAgent(waSettingsId);

  if (agent?.status !== "ONBOARDED") return null;

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Delete the agent</CardTitle>
        <CardDescription>
          Removes the agent at Meta and clears every knowledge item, skill and connector mirrored
          here. Eligibility is kept so you can onboard again later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" size="sm" disabled={deleteAgent.isPending}>
                {deleteAgent.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <IconTrash data-icon="inline-start" />
                )}
                Delete agent
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this Business Agent?</AlertDialogTitle>
              <AlertDialogDescription>
                Meta will drop the agent and everything configured on it — business info, FAQs,
                files, websites, skills, UI skills and connectors. This cannot be undone; you would
                have to onboard and configure it again from scratch.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAgent.mutate()}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete agent
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
