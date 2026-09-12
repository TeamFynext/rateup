import { Gift } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { CustomerReward } from "@/api/loyalty/loyalty.type";

import { hapticSelect } from "./haptics";
import { CashierButton, CashierInput, Field, FONT, FormHeader, InlineError, useTheme } from "./ui";

interface GrantGiftFormProps {
  customerName: string;
  gifts: CustomerReward[];
  isSaving: boolean;
  error: string | null;
  onBack: () => void;
  onGrant: (reward: CustomerReward, note: string) => void;
}

/** A free gift is handed to a named customer with a code; the catalogue entry lives on the web. */
export function GrantGiftForm({
  customerName,
  gifts,
  isSaving,
  error,
  onBack,
  onGrant,
}: Readonly<GrantGiftFormProps>) {
  const { t } = useTheme();
  const [selected, setSelected] = useState<CustomerReward | null>(null);
  const [note, setNote] = useState("");

  return (
    <View style={{ gap: 16 }}>
      <FormHeader title="Grant a gift" subtitle={customerName} onBack={onBack} />

      <InlineError message={error} />

      {gifts.length === 0 ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3, lineHeight: 19 }}>
          No free gifts are set up. Add one under Program › Rewards on the web dashboard.
        </Text>
      ) : (
        <View style={{ gap: 8 }}>
          {gifts.map((gift) => {
            const picked = selected?.id === gift.id;
            return (
              <Pressable
                key={gift.id}
                onPress={() => {
                  hapticSelect();
                  setSelected(gift);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: picked ? 2 : 1,
                  borderColor: picked ? t.brand : t.border1,
                  backgroundColor: picked ? t.brandSoft : t.surface,
                }}
              >
                <Gift size={18} color={picked ? t.brand : t.fg3} />
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}
                  >
                    {gift.name}
                  </Text>
                  {gift.description ? (
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}
                    >
                      {gift.description}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Field label="Note (optional)">
        <CashierInput
          value={note}
          onChangeText={setNote}
          placeholder="Service recovery, birthday…"
          maxLength={200}
        />
      </Field>

      <CashierButton
        label={isSaving ? "Granting…" : selected ? `Give ${selected.name}` : "Give a gift"}
        disabled={!selected || isSaving}
        loading={isSaving}
        onPress={() => selected && onGrant(selected, note)}
      />
    </View>
  );
}
