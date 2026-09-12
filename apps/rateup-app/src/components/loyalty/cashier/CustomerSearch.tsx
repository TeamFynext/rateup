import { BookUser, Search, Ticket, UserPlus } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { useSearchCustomers } from "@/api/loyalty/loyalty.query";
import type { CustomerSearchResult } from "@/api/loyalty/loyalty.type";

import { hapticSelect } from "./haptics";
import { formatNumber } from "./logic/format";
import { maskPhone } from "./logic/maskPhone";
import type { RecentCustomer } from "./logic/recentCustomers";
import { RecentCustomers } from "./RecentCustomers";
import { CashierButton, Card, Divider, EmptyState, FONT, useTheme } from "./ui";
import { useDebounced } from "./useDebounced";

interface CustomerSearchProps {
  pointsName: string;
  recent: RecentCustomer[];
  onPick: (customer: CustomerSearchResult) => void;
  /** "Register {query}" — digits prefill the phone, anything else the name. */
  onRegister: (prefill: { phone?: string; name?: string }) => void;
  onPickRecent: (customer: RecentCustomer) => void;
  /** Points queued for a recent customer, so the strip does not quote a stale balance alone. */
  pendingFor?: (customer: RecentCustomer) => number;
  onFromContacts: () => void;
  onCoupon: () => void;
}

/**
 * The counter's first screen: find whoever is standing there.
 *
 * On the web this is a 300px rail that stays beside the customer from `md` up; the layout
 * is a pure-CSS state machine (`md:grid-cols-[300px_1fr]` plus `hidden md:block` on both
 * panes). There are no media queries here, so the rail becomes this screen and the
 * customer becomes the next one — which also means the web's
 * "Search a customer, or register one on the spot" placeholder does not port: it is
 * `hidden … md:block`, so it never appears on a phone in the first place.
 */
export function CustomerSearch({
  pointsName,
  recent,
  onPick,
  onRegister,
  onPickRecent,
  pendingFor,
  onFromContacts,
  onCoupon,
}: Readonly<CustomerSearchProps>) {
  const { t } = useTheme();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 300);
  const { data: results, isLoading } = useSearchCustomers(debounced);
  const searching = debounced.length >= 2;
  const isDigits = /^\+?[\d\s-]{6,}$/.test(debounced);

  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          height: 48,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: t.surface2,
        }}
      >
        {isLoading && searching ? (
          <ActivityIndicator size="small" color={t.fg4} />
        ) : (
          <Search size={18} color={t.fg4} />
        )}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Name or phone number"
          placeholderTextColor={t.fg4}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          // A single hit is almost always the person at the counter, so Enter opens it.
          onSubmitEditing={() => {
            const only = results?.length === 1 ? results[0] : undefined;
            if (only) onPick(only);
          }}
          style={{ flex: 1, fontFamily: FONT.regular, fontSize: 15, color: t.fg1, padding: 0 }}
        />
      </View>

      {searching && !isLoading && (results?.length ?? 0) > 0 ? (
        <Card padding={0}>
          {results?.map((result, index) => (
            <React.Fragment key={result.id}>
              {index > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => {
                  hapticSelect();
                  onPick(result);
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: pressed ? t.surface2 : "transparent",
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}
                  >
                    {result.contact.name || "No name"}
                  </Text>
                  <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
                    {maskPhone(result.contact.phone)}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: FONT.medium,
                    fontSize: 12,
                    color: t.fg3,
                    textAlign: "right",
                  }}
                >
                  {result.currentTier?.name ? `${result.currentTier.name} · ` : ""}
                  {formatNumber(result.currentPoints)} {pointsName}
                </Text>
              </Pressable>
            </React.Fragment>
          ))}
        </Card>
      ) : null}

      {searching && !isLoading && results?.length === 0 ? (
        <EmptyState
          title={isDigits ? "Nobody on that number yet" : `Nobody matches “${debounced}” yet`}
          body="Register them now — it takes one field and the join bonus is automatic."
        >
          <CashierButton
            label={`Register ${debounced}`}
            icon={<UserPlus size={17} color="#FFFFFF" />}
            onPress={() => onRegister(isDigits ? { phone: debounced } : { name: debounced })}
            compact
          />
        </EmptyState>
      ) : null}

      <Card gap={10}>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: t.fg3 }}>Add customer</Text>
        <CashierButton
          label="New customer"
          variant="outline"
          align="left"
          icon={<UserPlus size={18} color={t.fg2} />}
          onPress={() => onRegister({})}
        />
        <CashierButton
          label="From contacts"
          variant="outline"
          align="left"
          icon={<BookUser size={18} color={t.fg2} />}
          onPress={onFromContacts}
        />
      </Card>

      <CashierButton
        label="Coupon code"
        variant="ghost"
        align="left"
        icon={<Ticket size={18} color={t.fg3} />}
        onPress={onCoupon}
      />

      <RecentCustomers
        recent={recent}
        pointsName={pointsName}
        onPick={onPickRecent}
        pendingFor={pendingFor}
      />
    </View>
  );
}
