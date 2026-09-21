import { IconShoppingBag } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useId } from "react";

import type { AppIntegration } from "@/backend/appsIntegration/integration.api.ts";
import { useIntegrationByType } from "@/backend/appsIntegration/integration.query.ts";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { IntegratedApps } from "@/types/enums.ts";
import { numberInputValue } from "@/utils/form.ts";

interface ShopifyDiscountCardProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  /**
   * `z.coerce.number()` hands its value back unnarrowed; `numberInputValue` renders it.
   * Both are unused — and omitted by the caller — when `inheritsExpiryFrom` is set.
   */
  validForDays?: unknown;
  onValidForDaysChange?: (days: number | undefined) => void;
  /**
   * False when the reward pays out something Shopify's discount codes cannot express — a
   * free item or service. Those need a BXGY discount, which is defined against a Shopify
   * product id the reward does not have, so the code stays cashier-only.
   */
  supported: boolean;
  /**
   * Names the field this form already has for the code's end date — the coupon form's
   * "Valid To". Set it and the card stops asking for an expiry of its own: two inputs for one
   * deadline is how a merchant ends up with codes outliving the promotion they belong to.
   */
  inheritsExpiryFrom?: string;
}

/**
 * Turns this reward's redemption codes into real Shopify discount codes.
 *
 * The redemption code *is* the discount code, so the code the customer already receives over
 * WhatsApp is the one that works at checkout — nothing extra is generated, and nothing has to
 * be reconciled. Each code is created with a usage limit of one, so forwarding the message
 * does not hand the discount to everybody.
 */
export function ShopifyDiscountCard({
  enabled,
  onEnabledChange,
  validForDays,
  onValidForDaysChange,
  supported,
  inheritsExpiryFrom,
}: Readonly<ShopifyDiscountCardProps>) {
  const uid = useId();
  const { data, isPending } = useIntegrationByType(IntegratedApps.shopify);
  const integration = data as AppIntegration | null | undefined;
  const shop = integration?.credential?.session?.shop;
  const connected = !!shop && integration?.active !== false;

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm flex items-center gap-1.5">
            <IconShoppingBag className="w-4 h-4 text-[#5E8E3E]" />
            Use at Shopify checkout
          </p>
          <p className="text-xs text-muted-foreground">
            {connected
              ? `Each redemption code becomes a one-use discount code in ${shop}`
              : "Connect your Shopify store to turn redemption codes into discount codes"}
          </p>
        </div>
        <Switch
          id={`${uid}-shopify`}
          checked={enabled && connected && supported}
          disabled={!connected || !supported || isPending}
          onCheckedChange={(checked) => {
            onEnabledChange(checked);
            if (!checked) onValidForDaysChange?.(undefined);
          }}
          className="data-[state=checked]:bg-[#1873E8]"
        />
      </div>

      {!connected && !isPending && (
        <p className="text-xs text-muted-foreground pt-2 border-t">
          <Link to="/dashboard/settings/integrations" className="text-[#1873E8] hover:underline">
            Connect Shopify
          </Link>{" "}
          first — the store's discounts are created through that connection.
        </p>
      )}

      {connected &&
        !supported && (
          // Said plainly rather than hidden: a merchant who turns this on for a free-item
          // reward and sees nothing at checkout has no way to work out why.
          <p className="text-xs text-muted-foreground pt-2 border-t">
            A free item or service cannot be a Shopify discount code — it needs a product to give
            away. Use a fixed or percentage discount to sync this reward.
          </p>
        )}

      {enabled && connected && supported && (
        <div className="pt-2 border-t space-y-3">
          {/*
            Worth saying outright: a synced reward has no one code to configure. Each customer
            gets their own when they redeem, which is what makes the usage limit of one hold.
          */}
          <FieldDescription className="text-xs">
            Each customer gets their own one-use code when they redeem — there is no code to set
            here.
          </FieldDescription>
          {inheritsExpiryFrom ? (
            <FieldDescription className="text-xs">
              Codes stop working on {inheritsExpiryFrom}, so the discount never outlives the offer.
            </FieldDescription>
          ) : (
            <Field>
              <FieldLabel htmlFor={`${uid}-days`} className="text-xs">
                Code expires after
              </FieldLabel>
              <Input
                id={`${uid}-days`}
                type="number"
                min="1"
                placeholder="No expiry"
                value={numberInputValue(validForDays)}
                onChange={(e) => {
                  const days = Number.parseInt(e.target.value, 10);
                  onValidForDaysChange?.(Number.isFinite(days) && days > 0 ? days : undefined);
                }}
              />
              <FieldDescription>
                Days from the moment the customer redeems. Leave blank for no expiry.
              </FieldDescription>
            </Field>
          )}
          {/*
            The two limits sitting right below this card govern *issuing*, which happens in the
            loyalty programme, not in the shop — worth saying so rather than leaving the merchant
            to wonder which system is counting.
          */}
          <FieldDescription className="text-xs">
            Total redemptions and the per-customer limit stay with the loyalty programme: they
            decide how many codes get issued, not how many times each one works. Every code is
            single-use.
          </FieldDescription>
          <FieldDescription className="text-xs">
            The customer can also open{" "}
            <code className="text-[11px]">https://{shop}/discount/THEIR-CODE</code> to apply it to
            their cart without typing anything.
          </FieldDescription>
        </div>
      )}
    </div>
  );
}
