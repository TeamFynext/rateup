import { Link } from "@tanstack/react-router";
import { useId } from "react";

import { useWooStatus } from "@/backend/appsIntegration/woocommerce/woocommerce.query.ts";
import { WooCommerceLogo } from "@/components/integrations/logos.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { numberInputValue } from "@/utils/form.ts";

interface WooDiscountCardProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  /** As on `ShopifyDiscountCard`: unused when `inheritsExpiryFrom` is set. */
  validForDays?: unknown;
  onValidForDaysChange?: (days: number | undefined) => void;
  /** False for a free item or service, which a WooCommerce coupon cannot express. */
  supported: boolean;
  /** Names the form's own end-date field, as on `ShopifyDiscountCard`. */
  inheritsExpiryFrom?: string;
}

/**
 * Turns this reward's redemption codes into one-use WooCommerce coupons — the
 * WooCommerce twin of `ShopifyDiscountCard`. Shown only once a store is connected (or the
 * reward already syncs), so a Shopify merchant is not offered a store they do not have.
 */
export function WooDiscountCard({
  enabled,
  onEnabledChange,
  validForDays,
  onValidForDaysChange,
  supported,
  inheritsExpiryFrom,
}: Readonly<WooDiscountCardProps>) {
  const uid = useId();
  const { data: status, isPending } = useWooStatus();
  const connected = status?.connected === true;
  const store = connected ? status.store.name || new URL(status.storeUrl).host : null;

  if (isPending || (!connected && !enabled)) return null;

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm flex items-center gap-1.5">
            <WooCommerceLogo className="w-4 h-4" />
            Use at WooCommerce checkout
          </p>
          <p className="text-xs text-muted-foreground">
            {connected
              ? `Each redemption code becomes a one-use coupon in ${store}`
              : "Reconnect your WooCommerce store to turn redemption codes into coupons"}
          </p>
        </div>
        <Switch
          id={`${uid}-woo`}
          checked={enabled && connected && supported}
          disabled={!connected || !supported}
          onCheckedChange={(checked) => {
            onEnabledChange(checked);
            if (!checked) onValidForDaysChange?.(undefined);
          }}
          className="data-[state=checked]:bg-[#1873E8]"
        />
      </div>

      {!connected && (
        <p className="text-xs text-muted-foreground pt-2 border-t">
          <Link
            to="/dashboard/settings/integrations/$id"
            params={{ id: "woocommerce" }}
            className="text-[#1873E8] hover:underline"
          >
            Reconnect WooCommerce
          </Link>{" "}
          first — the coupons are created through that connection.
        </p>
      )}

      {connected && !supported && (
        <p className="text-xs text-muted-foreground pt-2 border-t">
          A free item or service cannot be a WooCommerce coupon. Use a fixed or percentage discount
          to sync this reward.
        </p>
      )}

      {enabled && connected && supported && (
        <div className="pt-2 border-t space-y-3">
          <FieldDescription className="text-xs">
            Each customer gets their own one-use code when they redeem — there is no code to set
            here. It works typed in upper or lower case.
          </FieldDescription>
          {inheritsExpiryFrom ? (
            <FieldDescription className="text-xs">
              Codes stop working on {inheritsExpiryFrom}, so the coupon never outlives the offer.
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
            WooCommerce coupons have no start date. The API refuses to create one early, so a
            code for an offer that has not opened yet stays cashier-only — said here, not
            discovered later.
          */}
          <FieldDescription className="text-xs">
            WooCommerce coupons cannot start on a later date: a code redeemed before the offer opens
            works at the counter only.
          </FieldDescription>
          <FieldDescription className="text-xs">
            Total redemptions and the per-customer limit stay with the loyalty programme: they
            decide how many codes get issued, not how many times each one works. Every code is
            single-use.
          </FieldDescription>
        </div>
      )}
    </div>
  );
}
