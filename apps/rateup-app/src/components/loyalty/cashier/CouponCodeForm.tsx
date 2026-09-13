import { Ticket } from "lucide-react-native";
import React, { useState } from "react";
import { Text, View } from "react-native";

import type { CouponLookup } from "./logic/cashier.coupon";
import {
  Card,
  CashierButton,
  CashierInput,
  Field,
  FONT,
  FormHeader,
  InlineError,
  StepScroll,
  useTheme,
} from "./ui";

interface CouponCodeFormProps {
  customerName?: string;
  isLooking: boolean;
  isApplying: boolean;
  lookup: CouponLookup | null;
  lookupError: string | null;
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
  onLookup,
  onApply,
}: Readonly<CouponCodeFormProps>) {
  const { t } = useTheme();
  const [code, setCode] = useState("");

  const check = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed) onLookup(trimmed);
  };

  return (
    <StepScroll>
      <FormHeader title="Coupon code" subtitle={customerName} />

      <Field label="Code" hint="The code on the customer's WhatsApp message.">
        <CashierInput
          value={code}
          onChangeText={(next) => setCode(next.toUpperCase())}
          placeholder="KC-4471"
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={check}
        />
      </Field>

      <CashierButton
        label={isLooking ? "Checking…" : "Check code"}
        variant="outline"
        disabled={!code.trim() || isLooking}
        loading={isLooking}
        onPress={check}
      />

      <InlineError message={lookupError} />

      {lookup ? (
        <Card gap={12}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <Ticket size={20} color={t.fg3} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}>
                {lookup.rewardName}
              </Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
                {lookup.customerName ? `For ${lookup.customerName}` : `Code ${lookup.code}`}
              </Text>
              {!lookup.usable && lookup.reason ? (
                <Text
                  style={{
                    fontFamily: FONT.medium,
                    fontSize: 12,
                    color: t.status.pending.fg,
                    marginTop: 2,
                  }}
                >
                  {lookup.reason}
                </Text>
              ) : null}
            </View>
          </View>
          <CashierButton
            label={isApplying ? "Marking…" : "Mark as used"}
            disabled={!lookup.usable || isApplying}
            loading={isApplying}
            onPress={() => onApply(lookup)}
          />
        </Card>
      ) : null}
    </StepScroll>
  );
}
