import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, X } from "lucide-react-native";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { Colors } from "@/constants/colors";

export type PickerOption = { id: string; name: string; color?: string | null };

type Props = {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selectedIds: string[];
  /** Several at once (tags, labels) or exactly one, saved on tap (a stage). */
  multi?: boolean;
  loading?: boolean;
  saving?: boolean;
  emptyText?: string;
  onClose: () => void;
  onSave: (ids: string[]) => void;
  /** Extra content under the list, e.g. a destructive action. */
  footer?: React.ReactNode;
};

/**
 * A bottom sheet for choosing from a list: tags, labels, a lead stage. Its contents
 * mount fresh on each open, so the selection always starts from the saved one.
 */
export default function PickerSheet(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      {props.visible ? <PickerContent {...props} /> : null}
    </Modal>
  );
}

function PickerContent({
  title,
  options,
  selectedIds,
  multi = false,
  loading,
  saving,
  emptyText = "Nothing to choose from yet.",
  onClose,
  onSave,
  footer,
}: Props) {
  const isDark = useColorScheme() === "dark";
  const t = getInboxRowTheme(isDark);
  const insets = useSafeAreaInsets();
  const [chosen, setChosen] = useState<string[]>(selectedIds);

  const toggle = (id: string) => {
    if (!multi) {
      onSave([id]);
      return;
    }
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
        accessibilityLabel="Close"
      />
      <View
        style={{
          maxHeight: "75%",
          backgroundColor: t.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 14,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingBottom: 10,
          }}
        >
          <Text style={{ color: t.fg1, fontSize: 17, fontFamily: "Figtree_800ExtraBold" }}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <X size={22} color={t.fg3} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginVertical: 24 }} color={t.fg3} />
        ) : options.length === 0 ? (
          <Text style={{ color: t.fg3, fontSize: 14, paddingHorizontal: 16, paddingVertical: 20 }}>
            {emptyText}
          </Text>
        ) : (
          <ScrollView>
            {options.map((o) => {
              const on = chosen.includes(o.id);
              return (
                <Pressable
                  key={o.id}
                  onPress={() => toggle(o.id)}
                  disabled={saving}
                  accessibilityRole={multi ? "checkbox" : "radio"}
                  accessibilityState={{ checked: on }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    borderTopWidth: 1,
                    borderTopColor: t.border1,
                  }}
                >
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: o.color || t.fg4,
                    }}
                  />
                  <Text style={{ flex: 1, color: t.fg1, fontSize: 15 }}>{o.name}</Text>
                  {on ? <Check size={18} color={t.brand} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {footer}

        {multi && options.length > 0 ? (
          <Pressable
            onPress={() => onSave(chosen)}
            disabled={saving}
            accessibilityRole="button"
            style={{
              marginTop: 12,
              marginHorizontal: 16,
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
              <Text
                style={{ color: "#fff", fontSize: 15, fontFamily: "InstrumentSans_600SemiBold" }}
              >
                Save
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </>
  );
}
