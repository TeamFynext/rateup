import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import KeyboardAvoider from "@/components/common/KeyboardAvoider";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { Colors } from "@/constants/colors";

export type TextField = { key: string; label: string; value: string; multiline?: boolean };

/** A bottom sheet with a few text fields and Save: e.g. a ticket's title and description. */
export default function TextEditSheet(props: {
  visible: boolean;
  title: string;
  fields: TextField[];
  saving?: boolean;
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      {props.visible ? <Content {...props} /> : null}
    </Modal>
  );
}

function Content({
  title,
  fields,
  saving,
  onClose,
  onSave,
}: {
  title: string;
  fields: TextField[];
  saving?: boolean;
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.value])),
  );

  return (
    <KeyboardAvoider style={{ flex: 1 }}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
        accessibilityLabel="Close"
      />
      <View
        style={{
          backgroundColor: t.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: insets.bottom + 16,
          gap: 12,
        }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={{ color: t.fg1, fontSize: 17, fontFamily: "Figtree_800ExtraBold" }}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <X size={22} color={t.fg3} />
          </Pressable>
        </View>
        {fields.map((f) => (
          <View key={f.key} style={{ gap: 6 }}>
            <Text style={{ color: t.fg3, fontSize: 12, fontFamily: "InstrumentSans_600SemiBold" }}>
              {f.label}
            </Text>
            <TextInput
              value={values[f.key]}
              onChangeText={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
              multiline={f.multiline}
              placeholder={f.label}
              placeholderTextColor={t.fg4}
              accessibilityLabel={f.label}
              style={{
                color: t.fg1,
                fontSize: 15,
                borderWidth: 1,
                borderColor: t.border1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                minHeight: f.multiline ? 88 : undefined,
                textAlignVertical: f.multiline ? "top" : "center",
              }}
            />
          </View>
        ))}
        <Pressable
          onPress={() => onSave(values)}
          disabled={saving}
          accessibilityRole="button"
          style={{
            backgroundColor: Colors.brand.blue,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 15, fontFamily: "InstrumentSans_600SemiBold" }}>
              Save
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoider>
  );
}
