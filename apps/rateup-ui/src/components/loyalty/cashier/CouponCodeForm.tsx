import { IconArrowLeft, IconTicket } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { VerifyRedemptionResponse } from "@/backend/loyalty/redemption/redemption.api";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

export interface CouponLookup {
  /** A redemption code (coupon / point reward) or an issued gift's short code. */
  kind: "redemption" | "assigned";
  code: string;
  rewardName: string;
  customerName: string | null;
  usable: boolean;
  reason: string | null;
  pointsCost: number;
}

interface CouponCodeFormProps {
  customerName?: string;
  isLooking: boolean;
  isApplying: boolean;
  lookup: CouponLookup | null;
  lookupError: string | null;
  onBack: () => void;
  onLookup: (code: string) => void;
  onApply: (lookup: CouponLookup) => void;
}

/**
 * Two phases: type the code and see what it is — reward, whose, still good — then confirm.
 * Nothing is marked used on a typo.
 */
export function CouponCodeForm({
  customerName,
  isLooking,
  isApplying,
  lookup,
  lookupError,
  onBack,
  onLookup,
  onApply,
}: Readonly<CouponCodeFormProps>) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label={t("Back")}>
          <IconArrowLeft size={18} />
        </Button>
        <div>
          {customerName && <p className="text-xs text-muted-foreground">{customerName}</p>}
          <h2 className="text-base font-semibold text-foreground">{t("Coupon code")}</h2>
        </div>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (code.trim()) onLookup(code.trim().toUpperCase());
        }}
      >
        <Field>
          <FieldLabel htmlFor="coupon-code">{t("Code")}</FieldLabel>
          <Input
            id="coupon-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="KC-4471"
            className="h-12 font-mono text-lg uppercase tracking-wider"
            autoFocus
            autoComplete="off"
          />
          <FieldDescription>{t("The code on the customer's WhatsApp message.")}</FieldDescription>
        </Field>
        <Button
          type="submit"
          variant="outline"
          className="h-12"
          disabled={!code.trim() || isLooking}
        >
          {isLooking ? t("Checking…") : t("Check code")}
        </Button>
      </form>

      {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}

      {lookup && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <IconTicket className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{lookup.rewardName}</p>
              <p className="text-xs text-muted-foreground">
                {lookup.customerName
                  ? t("For {name}", { name: lookup.customerName })
                  : t("Code {code}", { code: lookup.code })}
              </p>
              {!lookup.usable && lookup.reason && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">{lookup.reason}</p>
              )}
            </div>
          </div>
          <Button
            className="h-12"
            disabled={!lookup.usable || isApplying}
            onClick={() => onApply(lookup)}
          >
            {isApplying ? t("Marking…") : t("Mark as used")}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Reads the verify endpoint's answer into what the form shows. */
export function lookupFromVerify(
  code: string,
  response: VerifyRedemptionResponse,
  t: (key: string) => string,
): CouponLookup {
  const redemption = response.redemption;
  const status = redemption?.status ?? "";
  let reason: string | null = null;
  if (!redemption) reason = t("No redemption with that code.");
  else if (redemption.usedAt) reason = t("Already used.");
  else if (status === "PENDING") reason = t("Waiting for approval in Activity.");
  else if (status !== "APPROVED") reason = t("Not usable in its current state.");
  return {
    kind: "redemption",
    code,
    rewardName: response.reward?.name ?? t("Reward"),
    customerName: response.account?.contact?.name ?? null,
    usable: Boolean(redemption) && response.valid !== false && reason === null,
    reason,
    pointsCost: response.reward?.pointsCost ?? 0,
  };
}
