import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { Check, ChevronDown, ChevronRight, Phone, Search, Users, X } from "lucide-react-native";
import type { WaTemplate } from "@/api/whatsapp/types";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { bodySnippet, getBodyVariables } from "./templateVariables";

export type Option = { value: string; label: string };

type Props = {
  templates: WaTemplate[];
  loading: boolean;
  selectedId: string;
  onSelect: (template: WaTemplate) => void;
  search: string;
  onSearch: (s: string) => void;
  category: string;
  onCategory: (c: string) => void;
  teams: Option[];
  teamId: string;
  onTeam: (id: string) => void;
  accounts: Option[];
  accountId: string;
  onAccount: (id: string) => void;
};

const CATEGORY_LABEL: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utility",
  AUTHENTICATION: "Auth",
};

export default function PickTemplateStep(props: Props) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  const [picker, setPicker] = useState<"team" | "account" | null>(null);

  const categories = useMemo(
    () => [...new Set(props.templates.map((tpl) => tpl.data.category).filter(Boolean))],
    [props.templates],
  );

  const query = props.search.trim().toLowerCase();
  const visible = props.templates.filter(
    (tpl) =>
      (!props.category || tpl.data.category === props.category) &&
      (!query ||
        tpl.data.name.toLowerCase().includes(query) ||
        bodySnippet(tpl.data.components).toLowerCase().includes(query)),
  );

  const teamLabel = props.teams.find((o) => o.value === props.teamId)?.label;
  const accountLabel = props.accounts.find((o) => o.value === props.accountId)?.label;

  return (
    <View style={{ flex: 1 }}>
      {/* Sending context: who it goes out as. Small, because it is usually right already. */}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        <ContextChip
          icon={<Users size={14} color={t.fg3} />}
          label={teamLabel ?? "Pick team"}
          missing={!teamLabel}
          onPress={() => setPicker("team")}
          single={props.teams.length <= 1}
        />
        <ContextChip
          icon={<Phone size={14} color={t.fg3} />}
          label={accountLabel ?? "Pick number"}
          missing={!accountLabel}
          onPress={() => setPicker("account")}
          single={props.accounts.length <= 1}
        />
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <View
          style={{
            height: 42,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderRadius: 12,
            backgroundColor: t.surface2,
            borderWidth: 1,
            borderColor: t.border1,
            paddingHorizontal: 12,
          }}
        >
          <Search size={16} color={t.fg3} />
          <TextInput
            placeholder="Search templates"
            placeholderTextColor={t.fg4}
            value={props.search}
            onChangeText={props.onSearch}
            style={{
              flex: 1,
              fontSize: 14,
              padding: 0,
              color: t.fg1,
              fontFamily: "InstrumentSans_400Regular",
            }}
          />
          {props.search ? (
            <Pressable onPress={() => props.onSearch("")} hitSlop={10}>
              <X size={16} color={t.fg3} />
            </Pressable>
          ) : null}
        </View>

        {categories.length > 1 && (
          <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
            {["", ...categories].map((c) => {
              const active = props.category === c;
              return (
                <Pressable
                  key={c || "all"}
                  onPress={() => props.onCategory(c)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: active ? t.brandInk : t.surface2,
                    borderWidth: 1,
                    borderColor: active ? t.brandInk : t.border1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      color: active ? "#fff" : t.fg2,
                      fontFamily: "InstrumentSans_600SemiBold",
                    }}
                  >
                    {c ? (CATEGORY_LABEL[c] ?? c) : "All"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {props.loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={t.brand} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          renderItem={({ item }) => (
            <TemplateCard
              template={item}
              selected={item.id === props.selectedId}
              onPress={() => props.onSelect(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={query || props.category ? "No templates match" : "No approved templates"}
              hint={
                query || props.category
                  ? "Try another search or category."
                  : "Only templates Meta has approved can be sent. Templates that open a form only show for teams linked to that form."
              }
            />
          }
        />
      )}

      <OptionPicker
        visible={picker === "team"}
        title="Send as team"
        options={props.teams}
        value={props.teamId}
        onChange={props.onTeam}
        onClose={() => setPicker(null)}
      />
      <OptionPicker
        visible={picker === "account"}
        title="Send from number"
        options={props.accounts}
        value={props.accountId}
        onChange={props.onAccount}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

function TemplateCard({
  template,
  selected,
  onPress,
}: {
  template: WaTemplate;
  selected: boolean;
  onPress: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  const snippet = bodySnippet(template.data.components);
  const varCount = getBodyVariables(template.data.components).length;
  const category = template.data.category;

  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          padding: 14,
          borderRadius: 14,
          backgroundColor: selected ? t.brandSoft : t.surface2,
          borderWidth: 1.5,
          borderColor: selected ? t.brand : t.border1,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, color: t.fg1, fontSize: 15, fontFamily: "InstrumentSans_700Bold" }}
          >
            {template.data.name}
          </Text>
          {selected ? (
            <Check size={18} color={t.brand} />
          ) : (
            <ChevronRight size={18} color={t.fg4} />
          )}
        </View>

        {snippet ? (
          <Text
            numberOfLines={2}
            style={{
              color: t.fg3,
              fontSize: 13,
              lineHeight: 18,
              marginTop: 4,
              fontFamily: "InstrumentSans_400Regular",
            }}
          >
            {snippet}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {category ? (
            <Badge
              text={CATEGORY_LABEL[category] ?? category}
              tone={category === "MARKETING" ? t.status.new : t.status.assigned}
            />
          ) : null}
          <Badge text={template.data.language?.toUpperCase()} />
          {varCount > 0 && (
            <Badge text={`${varCount} variable${varCount > 1 ? "s" : ""}`} tone={t.status.closed} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function Badge({ text, tone }: { text: string; tone?: { soft: string; fg: string } }) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  if (!text) return null;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: tone?.soft ?? t.surface,
        borderWidth: tone ? 0 : 1,
        borderColor: t.border1,
      }}
    >
      <Text
        style={{ fontSize: 11, color: tone?.fg ?? t.fg3, fontFamily: "InstrumentSans_600SemiBold" }}
      >
        {text}
      </Text>
    </View>
  );
}

function ContextChip({
  icon,
  label,
  missing,
  single,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  missing: boolean;
  single: boolean;
  onPress: () => void;
}) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  return (
    <Pressable
      onPress={onPress}
      disabled={single && !missing}
      style={{
        flexShrink: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 32,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: missing ? t.warmSoft : t.surface2,
        borderWidth: 1,
        borderColor: missing ? t.warm : t.border1,
      }}
    >
      {icon}
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontSize: 13,
          color: missing ? t.warmStrong : t.fg1,
          fontFamily: "InstrumentSans_600SemiBold",
        }}
      >
        {label}
      </Text>
      {!single && <ChevronDown size={14} color={t.fg3} />}
    </Pressable>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }}>
      <Text style={{ color: t.fg1, fontSize: 15, fontFamily: "InstrumentSans_700Bold" }}>
        {title}
      </Text>
      <Text
        style={{
          color: t.fg3,
          fontSize: 13,
          textAlign: "center",
          marginTop: 6,
          lineHeight: 18,
          fontFamily: "InstrumentSans_400Regular",
        }}
      >
        {hint}
      </Text>
    </View>
  );
}

function OptionPicker({
  visible,
  title,
  options,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            backgroundColor: t.surface,
            borderRadius: 16,
            paddingVertical: 8,
            maxHeight: "60%",
            borderWidth: 1,
            borderColor: t.border1,
          }}
        >
          <Text
            style={{
              color: t.fg3,
              fontSize: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
              fontFamily: "InstrumentSans_600SemiBold",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {title}
          </Text>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    onClose();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      color: active ? t.brand : t.fg1,
                      fontFamily: active ? "InstrumentSans_700Bold" : "InstrumentSans_600SemiBold",
                    }}
                  >
                    {item.label}
                  </Text>
                  {active && <Check size={16} color={t.brand} />}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: t.fg3, padding: 16, textAlign: "center" }}>Nothing here</Text>
            }
          />
        </View>
      </Pressable>
    </Modal>
  );
}
