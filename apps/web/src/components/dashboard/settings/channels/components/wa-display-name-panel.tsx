import { zodResolver } from "@hookform/resolvers/zod";
import { IconRefresh } from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

import {
  useDisplayNameStatus,
  useReRegisterPhoneNumberMutation,
  useUpdateDisplayNameMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { getApiErrorMessage } from "@/utils/apiError";

interface DisplayNameFormValues {
  newDisplayName: string;
}

/** Meta's `name_status` / `new_name_status` values, mapped to how they should read. */
function statusVariant(status: string | null): "default" | "secondary" | "destructive" {
  if (status === "APPROVED") return "default";
  if (status === "DECLINED" || status === "REJECTED" || status === "EXPIRED") return "destructive";
  return "secondary";
}

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  PENDING_REVIEW: "In review",
  DECLINED: "Rejected",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  AVAILABLE_WITHOUT_REVIEW: "No review needed",
  NONE: "Not set",
};

function statusLabel(status: string, translations: (key: string) => string) {
  return translations(STATUS_LABELS[status] ?? status);
}

/**
 * The display name a WhatsApp number shows to its customers, as Meta holds it.
 *
 * This is not a local label: a new name is submitted for review against Meta's display name
 * guidelines, and only reaches WhatsApp once it is approved *and* the number is re-registered.
 * Used by both the connected-account dialog and the manual configuration card.
 */
export function WaDisplayNamePanel({
  phoneId,
  enabled = true,
}: Readonly<{
  phoneId: string;
  /** Skips the Meta lookup while false (e.g. a dialog that isn't open). */
  enabled?: boolean;
}>) {
  const { t: translations } = useTranslation();

  const {
    data: status,
    isPending: isStatusPending,
    isFetching: isStatusFetching,
    error: statusError,
    refetch: refetchStatus,
  } = useDisplayNameStatus(phoneId, enabled);
  const updateMutation = useUpdateDisplayNameMutation();
  const reRegisterMutation = useReRegisterPhoneNumberMutation();

  const schema = z.object({
    newDisplayName: z
      .string()
      .trim()
      .min(1, translations("Display name is required"))
      .max(200, translations("Display name is too long")),
  });

  // Deliberately not seeded from the channel's stored name: that is the org's internal
  // label, which has nothing to do with what Meta has approved for this number.
  const form = useForm<DisplayNameFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newDisplayName: "" },
  });

  function handleSubmit(values: DisplayNameFormValues) {
    if (!phoneId) return;
    updateMutation.mutate({ phoneId, newDisplayName: values.newDisplayName.trim() });
  }

  // A pending change has been submitted to Meta but not decided; an approved one still needs
  // the number re-registered before WhatsApp starts showing it.
  const pendingName = status?.newDisplayName ?? null;
  const pendingStatus = status?.newNameStatus ?? null;
  const isPendingApproved = pendingStatus === "APPROVED";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 p-3">
        <div className="min-w-0">
          <p className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
            {translations("Current display name")}
          </p>
          {isStatusPending ? (
            <Skeleton className="mt-2 h-5 w-40" />
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium break-all">
                {status?.verifiedName || translations("Not set")}
              </span>
              {status?.nameStatus && (
                <Badge variant={statusVariant(status.nameStatus)} className="text-[10px]">
                  {statusLabel(status.nameStatus, translations)}
                </Badge>
              )}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetchStatus()}
          disabled={isStatusFetching}
        >
          <IconRefresh size={16} className={isStatusFetching ? "animate-spin" : ""} />
          {isStatusFetching ? translations("Syncing...") : translations("Sync from Meta")}
        </Button>
      </div>

      {statusError && (
        <Alert variant="destructive">
          <AlertTitle>{translations("Couldn't read the display name from Meta")}</AlertTitle>
          <AlertDescription>
            {getApiErrorMessage(statusError, translations("Please try syncing again."))}
          </AlertDescription>
        </Alert>
      )}

      {pendingName && (
        <Alert>
          <AlertTitle className="flex flex-wrap items-center gap-2">
            {translations("Requested name")}: {pendingName}
            {pendingStatus && (
              <Badge variant={statusVariant(pendingStatus)} className="text-[10px]">
                {isPendingApproved
                  ? translations("Approved — not in use yet")
                  : statusLabel(pendingStatus, translations)}
              </Badge>
            )}
          </AlertTitle>
          <AlertDescription>
            {isPendingApproved
              ? translations(
                  "Meta has approved this name, but the number still shows the current one. Re-register it to switch over — you have 14 days from approval.",
                )
              : translations(
                  "Meta is reviewing this name. It replaces the current one once approved.",
                )}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <Controller
          name="newDisplayName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${phoneId}-newDisplayName`}>
                {translations("New display name")}
              </FieldLabel>
              <Input
                {...field}
                id={`${phoneId}-newDisplayName`}
                aria-invalid={fieldState.invalid}
                placeholder={translations("The name customers will see in WhatsApp")}
              />
              <FieldDescription>
                {translations(
                  "Meta reviews the name against its display name guidelines. You can change it 10 times per 30 days.",
                )}
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => reRegisterMutation.mutate(phoneId)}
            loading={reRegisterMutation.isPending}
          >
            {translations("Re-register number")}
          </Button>
          <Button type="submit" loading={updateMutation.isPending}>
            {translations("Submit for review")}
          </Button>
        </div>
      </form>
    </div>
  );
}
