import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, useColorScheme } from "react-native";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import TemplatePreview from "./TemplatePreview";
import type { TemplateVariable } from "./templateVariables";

type Props = {
  components: any[] | undefined;
  variables: TemplateVariable[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Contact details offered as one-tap fills, e.g. { Name: "Sam" }. */
  suggestions: { label: string; value: string }[];
  /** Keys the user tried to continue without; shown in red. */
  showMissing: string[];
};

export default function FillVariablesStep(props: Props) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  const [activeKey, setActiveKey] = useState<string | null>(null);

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 16 }}
    >
      <TemplatePreview
        components={props.components}
        variables={props.variables}
        values={props.values}
        activeKey={activeKey}
      />

      <Text
        style={{
          color: t.fg3,
          fontSize: 12.5,
          lineHeight: 17,
          fontFamily: "InstrumentSans_400Regular",
        }}
      >
        Fill in the highlighted parts. Anything left blank uses the template's example.
      </Text>

      {props.variables.map((v) => {
        const missing = props.showMissing.includes(v.key);
        const focused = activeKey === v.key;
        const current = props.values[v.key] ?? "";
        return (
          <View key={v.key} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: t.brandSoft,
                }}
              >
                <Text
                  style={{ color: t.brand, fontSize: 12, fontFamily: "InstrumentSans_700Bold" }}
                >
                  {`{{${v.key}}}`}
                </Text>
              </View>
              <Text style={{ color: missing ? t.danger : t.fg3, fontSize: 12 }}>
                {v.example ? "Optional" : "Required"}
              </Text>
            </View>

            <TextInput
              value={current}
              onChangeText={(text) => props.onChange(v.key, text)}
              onFocus={() => setActiveKey(v.key)}
              onBlur={() => setActiveKey((k) => (k === v.key ? null : k))}
              placeholder={v.example ? `e.g. ${v.example}` : "Type a value"}
              placeholderTextColor={t.fg4}
              style={{
                minHeight: 44,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 15,
                color: t.fg1,
                backgroundColor: t.surface2,
                borderWidth: 1.5,
                borderColor: missing ? t.danger : focused ? t.brand : t.border1,
                fontFamily: "InstrumentSans_400Regular",
              }}
            />

            {props.suggestions.length > 0 && (
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {props.suggestions.map((s) => {
                  const used = current === s.value;
                  return (
                    <Pressable
                      key={s.label}
                      onPress={() => props.onChange(v.key, used ? "" : s.value)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: used ? t.brand : t.border1,
                        backgroundColor: used ? t.brandSoft : "transparent",
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 12,
                          color: used ? t.brand : t.fg2,
                          fontFamily: "InstrumentSans_600SemiBold",
                        }}
                      >
                        {s.label}: {s.value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
