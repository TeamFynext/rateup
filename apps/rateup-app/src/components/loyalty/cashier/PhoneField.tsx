import { ChevronDown, Search } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";

import { countries } from "@/constants/countries";

import { FONT, PressableRow, useTheme } from "./ui";

/**
 * A phone number, entered as a dial code plus the national part.
 *
 * The web uses `react-phone-number-input`, which is a DOM component. `src/constants/countries.ts`
 * already holds the 242-entry dial-code list the previous cashier used, so this is that
 * picker rebuilt against the current tokens rather than a new dependency.
 *
 * The value handed out is always **digits only, dial code included** — the shape the API's
 * lookup takes and the shape the recents list dedups on.
 */
export function PhoneField({
  value,
  onChange,
  defaultCountry = "IN",
  invalid,
  autoFocus,
}: Readonly<{
  /** Digits only, dial code included. */
  value: string;
  onChange: (digits: string) => void;
  /** ISO country code from the programme, used until the operator picks another. */
  defaultCountry?: string;
  invalid?: boolean;
  autoFocus?: boolean;
}>) {
  const { t } = useTheme();
  const [picking, setPicking] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");

  // The dial code the value already carries wins over the programme default, so a number
  // arriving from a contact keeps its own country.
  const country = useMemo(() => {
    const fromValue = [...countries]
      .sort((a, b) => dialDigits(b).length - dialDigits(a).length)
      .find((entry) => value.startsWith(dialDigits(entry)));
    return fromValue ?? countries.find((entry) => entry.code === defaultCountry) ?? countries[0]!;
  }, [value, defaultCountry]);

  const dial = dialDigits(country);
  const national = value.startsWith(dial) ? value.slice(dial.length) : value;

  const filtered = useMemo(() => {
    const needle = countryQuery.trim().toLowerCase();
    if (!needle) return countries;
    return countries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(needle) ||
        entry.dial_code.includes(needle) ||
        entry.code.toLowerCase() === needle,
    );
  }, [countryQuery]);

  return (
    <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => setPicking(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            height: 48,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border1,
            backgroundColor: t.surface,
          }}
        >
          <Text style={{ fontSize: 17 }}>{country.flag}</Text>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}>
            {country.dial_code}
          </Text>
          <ChevronDown size={15} color={t.fg3} />
        </Pressable>

        <View
          style={{
            flex: 1,
            height: 48,
            justifyContent: "center",
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: invalid ? t.danger : t.border1,
            backgroundColor: t.surface,
          }}
        >
          <TextInput
            value={national}
            // Leading zeros are a national-dialling habit, not part of the number.
            onChangeText={(next) => onChange(dial + next.replace(/\D/g, "").replace(/^0+/, ""))}
            placeholder="98765 41207"
            placeholderTextColor={t.fg4}
            keyboardType="phone-pad"
            autoFocus={autoFocus}
            style={{ fontFamily: FONT.regular, fontSize: 15, color: t.fg1, padding: 0 }}
          />
        </View>
      </View>

      <Modal
        visible={picking}
        animationType="slide"
        onRequestClose={() => setPicking(false)}
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: t.pageBg, paddingTop: 16 }}>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontFamily: FONT.bold, fontSize: 17, color: t.fg1 }}>
                Country code
              </Text>
              <Pressable onPress={() => setPicking(false)} hitSlop={12}>
                <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.brand }}>
                  Done
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                height: 44,
                paddingHorizontal: 12,
                borderRadius: 11,
                backgroundColor: t.surface2,
              }}
            >
              <Search size={17} color={t.fg4} />
              <TextInput
                value={countryQuery}
                onChangeText={setCountryQuery}
                placeholder="Search countries"
                placeholderTextColor={t.fg4}
                autoCorrect={false}
                style={{
                  flex: 1,
                  fontFamily: FONT.regular,
                  fontSize: 14,
                  color: t.fg1,
                  padding: 0,
                }}
              />
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            style={{ marginTop: 12 }}
            renderItem={({ item }) => (
              <PressableRow
                onPress={() => {
                  onChange(dialDigits(item) + national);
                  setCountryQuery("");
                  setPicking(false);
                }}
                accessibilityLabel={`${item.name} ${item.dial_code}`}
              >
                <Text style={{ fontSize: 18 }}>{item.flag}</Text>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontFamily: FONT.regular, fontSize: 15, color: t.fg1 }}
                >
                  {item.name}
                </Text>
                <Text style={{ fontFamily: FONT.medium, fontSize: 14, color: t.fg3 }}>
                  {item.dial_code}
                </Text>
              </PressableRow>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

/**
 * `"+1-268"` → `"1268"`.
 *
 * Several entries in the list carry an area code after a hyphen (Antigua, Anguilla, …), so
 * stripping non-digits rather than just the `+` is what keeps those numbers dialable.
 */
function dialDigits(country: { dial_code: string }): string {
  return country.dial_code.replace(/\D/g, "");
}
