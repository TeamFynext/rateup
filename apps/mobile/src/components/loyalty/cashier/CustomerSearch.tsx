import { BookUser, QrCode, ScanLine, Search, Ticket, UserPlus } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import { useSearchCustomers } from "@/api/loyalty/loyalty.query";
import type { CustomerSearchResult } from "@/api/loyalty/loyalty.type";

import { hapticSelect } from "./haptics";
import { formatCardCode, parseCardCode } from "./logic/cardCode";
import { formatNumber } from "./logic/format";
import { maskPhone } from "./logic/maskPhone";
import type { RecentCustomer } from "./logic/recentCustomers";
import { RecentCustomers } from "./RecentCustomers";
import {
  ActionRow,
  CashierButton,
  Card,
  Divider,
  EmptyState,
  FONT,
  PressableRow,
  NUM,
  StepScroll,
  useTheme,
} from "./ui";
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
  /** Opens the camera. */
  onScan: () => void;
  /** A card code typed or pasted into the search field. */
  onCardCode: (code: string) => void;
}

/**
 * The counter's first screen: find whoever is standing there.
 *
 * Ordered by what actually happens at a till. Most traffic is regulars, so the recent list
 * is the body of the screen rather than its footnote — it used to sit below the scan
 * button, the search field, an "Add customer" card and a coupon button, which meant the
 * commonest path was the one you had to scroll for. Registering someone, picking them out
 * of contacts and redeeming a loose coupon are the rare paths, so they drop into the
 * footer, where they are one thumb-reach away without taking the reading order.
 *
 * On the web this is a 300px rail that stays beside the customer from `md` up; the layout
 * is a pure-CSS state machine (`md:grid-cols-[300px_1fr]` plus `hidden md:block` on both
 * panes). There are no media queries here, so the rail becomes this screen and the
 * customer becomes the next one.
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
  onScan,
  onCardCode,
}: Readonly<CustomerSearchProps>) {
  const { t } = useTheme();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 300);
  // A card code typed into the field is a lookup, not a search — letters mean it can
  // never be mistaken for a number, and searching for it would just find nobody.
  const cardCode = parseCardCode(debounced);
  const { data: results, isLoading } = useSearchCustomers(cardCode ? "" : debounced);
  const searching = !cardCode && debounced.length >= 2;
  const isDigits = /^\+?[\d\s-]{6,}$/.test(debounced);
  const idle = !searching && !cardCode;

  return (
    <StepScroll
      footer={
        <>
          {/* The fast path stays the emphatic one: the customer shows the card from their
              WhatsApp chat, one tap here, one scan, and they are open. */}
          <CashierButton
            label="Scan card"
            icon={<ScanLine size={20} color="#FFFFFF" />}
            onPress={() => {
              hapticSelect();
              onScan();
            }}
          />
          <ActionRow>
            <CashierButton
              label="New"
              variant="outline"
              compact
              icon={<UserPlus size={16} color={t.fg2} />}
              onPress={() => onRegister({})}
            />
            <CashierButton
              label="Contacts"
              variant="outline"
              compact
              icon={<BookUser size={16} color={t.fg2} />}
              onPress={onFromContacts}
            />
            <CashierButton
              label="Coupon"
              variant="outline"
              compact
              icon={<Ticket size={16} color={t.fg2} />}
              onPress={onCoupon}
            />
          </ActionRow>
        </>
      }
    >
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
          accessibilityLabel="Search customers by name or phone number"
          // A single hit is almost always the person at the counter, so Enter opens it.
          onSubmitEditing={() => {
            if (cardCode) {
              onCardCode(cardCode);
              return;
            }
            const only = results?.length === 1 ? results[0] : undefined;
            if (only) onPick(only);
          }}
          style={{ flex: 1, fontFamily: FONT.regular, fontSize: 15, color: t.fg1, padding: 0 }}
        />
      </View>

      {cardCode ? (
        <Card padding={0}>
          <PressableRow
            onPress={() => {
              hapticSelect();
              onCardCode(cardCode);
            }}
            accessibilityLabel={`Open card ${formatCardCode(cardCode)}`}
          >
            <QrCode size={18} color={t.fg3} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}>
                Open card {formatCardCode(cardCode)}
              </Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
                Looks like a member card code
              </Text>
            </View>
          </PressableRow>
        </Card>
      ) : null}

      {searching && !isLoading && (results?.length ?? 0) > 0 ? (
        <Card padding={0}>
          {results?.map((result, index) => (
            <React.Fragment key={result.id}>
              {index > 0 ? <Divider /> : null}
              <PressableRow
                onPress={() => {
                  hapticSelect();
                  onPick(result);
                }}
                accessibilityLabel={`${result.contact.name || "No name"}, ${formatNumber(
                  result.currentPoints,
                )} ${pointsName}`}
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
                    ...NUM,
                    fontFamily: FONT.medium,
                    fontSize: 12,
                    color: t.fg3,
                    textAlign: "right",
                  }}
                >
                  {result.currentTier?.name ? `${result.currentTier.name} · ` : ""}
                  {formatNumber(result.currentPoints)} {pointsName}
                </Text>
              </PressableRow>
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

      {idle ? (
        <RecentCustomers
          recent={recent}
          pointsName={pointsName}
          onPick={onPickRecent}
          pendingFor={pendingFor}
        />
      ) : null}

      {/* Nothing typed and nobody served yet — the counter's first ever use. */}
      {idle && recent.length === 0 ? (
        <EmptyState
          title="Nobody served yet"
          body="Scan a member card, or search for someone by name or number. Whoever you serve shows up here for next time."
        />
      ) : null}
    </StepScroll>
  );
}
