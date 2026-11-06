import { X } from "lucide-react-native";
import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FONT, useTheme } from "@/components/loyalty/cashier/ui";

/**
 * A native page sheet on iOS; Android ignores `pageSheet` and draws full screen under a
 * translucent status bar, hence the top inset there only. Anything that can fail inside
 * must report inline — `Notice` cannot render above a `Modal`.
 */
export default function ShopSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: Readonly<{
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}>) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: t.pageBg,
          paddingTop: Platform.OS === "android" ? insets.top : 0,
        }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: t.surface,
            borderBottomWidth: 1,
            borderBottomColor: t.border1,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: FONT.extrabold, fontSize: 18, color: t.fg1 }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3, marginTop: 2 }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.surface2,
            }}
          >
            <X size={18} color={t.fg2} />
          </Pressable>
        </View>

        <View style={{ flex: 1 }}>{children}</View>

        {footer ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12 + insets.bottom,
              gap: 10,
              backgroundColor: t.surface,
              borderTopWidth: 1,
              borderTopColor: t.border1,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}
