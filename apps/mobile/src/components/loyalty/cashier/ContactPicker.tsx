import { Search } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import { useEnrolmentContacts } from "@/api/loyalty/loyalty.query";
import type { EnrolmentContact } from "@/api/loyalty/loyalty.type";

import { hapticSelect } from "./haptics";
import { maskPhone } from "./logic/maskPhone";
import {
  Badge,
  Card,
  Divider,
  EmptyState,
  FONT,
  FormHeader,
  PressableRow,
  StepScroll,
  useTheme,
} from "./ui";
import { useDebounced } from "./useDebounced";

interface ContactPickerProps {
  /** A contact who is not a member yet — carry their details into the register form. */
  onPick: (contact: EnrolmentContact) => void;
  /** A contact who already is one — open them at the counter instead. */
  onOpenMember: (phone: string) => void;
}

/**
 * Enrol someone the org already knows — from a WhatsApp chat, an import, a survey —
 * without retyping their number. Members are labelled and open instead of re-registering.
 */
export function ContactPicker({ onPick, onOpenMember }: Readonly<ContactPickerProps>) {
  const { t } = useTheme();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 300);
  const { data: contacts, isLoading, isFetching } = useEnrolmentContacts(debounced);

  return (
    <StepScroll>
      <FormHeader title="Add from contacts" />

      <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3, lineHeight: 19 }}>
        Pick someone you already have a number for. Members are marked.
      </Text>

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
        {isFetching ? (
          <ActivityIndicator size="small" color={t.fg4} />
        ) : (
          <Search size={18} color={t.fg4} />
        )}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, phone or email"
          placeholderTextColor={t.fg4}
          autoCorrect={false}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={{ flex: 1, fontFamily: FONT.regular, fontSize: 15, color: t.fg1, padding: 0 }}
        />
      </View>

      {isLoading ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3 }}>
          Loading contacts…
        </Text>
      ) : null}

      {!isLoading && contacts?.length === 0 ? (
        <EmptyState
          title={
            debounced ? `No contact matches “${debounced}”.` : "No contacts with a number yet."
          }
        />
      ) : null}

      {(contacts?.length ?? 0) > 0 ? (
        <Card padding={0}>
          {contacts?.map((contact, index) => {
            const member = contact.memberStatus === "active";
            return (
              <React.Fragment key={contact.id}>
                {index > 0 ? <Divider /> : null}
                <PressableRow
                  onPress={() => {
                    hapticSelect();
                    if (member) onOpenMember(contact.phone);
                    else onPick(contact);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}
                    >
                      {contact.name || "No name"}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}
                    >
                      {maskPhone(contact.phone)}
                      {contact.email ? ` · ${contact.email}` : ""}
                    </Text>
                  </View>
                  {member ? (
                    <Badge label="Member" tone="good" />
                  ) : (
                    <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: t.brand }}>
                      Add
                    </Text>
                  )}
                </PressableRow>
              </React.Fragment>
            );
          })}
        </Card>
      ) : null}
    </StepScroll>
  );
}
