import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Text,
  TextInput,
  View,
  useColorScheme,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ChevronDown, Search, X } from "lucide-react-native";

import Tap from "@/components/common/Tap";
import { countries } from "@/constants/countries";
import { getInboxRowTheme, type InboxRowTheme } from "@/constants/inboxDesign";
import { dialCode } from "@/utils/phoneField";

export { dialCode, splitPhone, toInternationalDigits } from "@/utils/phoneField";

type Country = (typeof countries)[number];

/**
 * A phone number field: a country button (flag and dialling code, opening a searchable
 * list) joined to the number itself. The value is kept as country + national number;
 * use {@link toInternationalDigits} to check and save it.
 */
export default function PhoneField({
  country,
  national,
  onChangeCountry,
  onChangeNational,
  invalid,
  autoFocus,
  onSubmitEditing,
  returnKeyType,
}: Readonly<{
  country: string;
  national: string;
  onChangeCountry: (country: string) => void;
  onChangeNational: (national: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps["returnKeyType"];
}>) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  const [picking, setPicking] = useState(false);
  const [focused, setFocused] = useState(false);
  const flag = countries.find((c) => c.code === country)?.flag ?? "🌐";

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "stretch",
          minHeight: 50,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: invalid ? t.danger : focused ? t.brand : t.border1,
          backgroundColor: t.surface2,
          overflow: "hidden",
        }}
      >
        <Tap
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={`Country code ${dialCode(country)}, change`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            borderRightWidth: 1,
            borderRightColor: t.border1,
          }}
          pressedStyle={{ backgroundColor: t.rowDivider }}
        >
          <Text style={{ fontSize: 18 }}>{flag}</Text>
          <Text style={{ fontSize: 15, fontFamily: "InstrumentSans_600SemiBold", color: t.fg1 }}>
            {dialCode(country)}
          </Text>
          <ChevronDown size={15} color={t.fg3} />
        </Tap>
        <TextInput
          value={national}
          onChangeText={onChangeNational}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder="Phone number"
          placeholderTextColor={t.fg4}
          accessibilityLabel="Phone number"
          style={{
            flex: 1,
            paddingHorizontal: 14,
            fontSize: 16,
            fontFamily: "InstrumentSans_400Regular",
            color: t.fg1,
          }}
        />
      </View>
      {picking ? (
        <CountryPicker
          t={t}
          selected={country}
          onClose={() => setPicking(false)}
          onPick={(code) => {
            onChangeCountry(code);
            setPicking(false);
          }}
        />
      ) : null}
    </>
  );
}

function CountryPicker({
  t,
  selected,
  onPick,
  onClose,
}: Readonly<{
  t: InboxRowTheme;
  selected: string;
  onPick: (code: string) => void;
  onClose: () => void;
}>) {
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return countries;
    return countries.filter(
      (c: Country) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q ||
        dialCode(c.code).replace("+", "").startsWith(q),
    );
  }, [query]);

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: t.pageBg }} edges={["top", "bottom"]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Text style={{ fontSize: 17, fontFamily: "Figtree_800ExtraBold", color: t.fg1 }}>
            Country
          </Text>
          <Tap
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ padding: 4 }}
          >
            <X size={22} color={t.fg2} />
          </Tap>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginHorizontal: 16,
            marginBottom: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: t.border1,
            backgroundColor: t.surface2,
          }}
        >
          <Search size={16} color={t.fg4} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search country or code"
            placeholderTextColor={t.fg4}
            autoCorrect={false}
            style={{
              flex: 1,
              paddingVertical: 10,
              fontSize: 15,
              fontFamily: "InstrumentSans_400Regular",
              color: t.fg1,
            }}
          />
        </View>
        <FlatList
          data={list}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          renderItem={({ item }) => {
            const isSelected = item.code === selected;
            return (
              <Tap
                onPress={() => onPick(item.code)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  borderBottomWidth: 1,
                  borderBottomColor: t.rowDivider,
                }}
                pressedStyle={{ backgroundColor: t.surface2 }}
              >
                <Text style={{ fontSize: 20 }}>{item.flag}</Text>
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontFamily: "InstrumentSans_400Regular",
                    color: t.fg1,
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{ fontSize: 14, fontFamily: "InstrumentSans_600SemiBold", color: t.fg3 }}
                >
                  {dialCode(item.code)}
                </Text>
                {isSelected ? <Check size={16} color={t.brand} /> : null}
              </Tap>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
