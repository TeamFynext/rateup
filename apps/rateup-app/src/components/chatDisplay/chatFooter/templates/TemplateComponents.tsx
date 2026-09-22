import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  useColorScheme,
} from "react-native";
import Image from "@/components/common/Image";
import { ReplyIcon, ChevronDown, Check } from "lucide-react-native";
import {
  WaTemplateComponent,
  WaTemplateFetchBody,
  WaTemplateFetchBodyComponent,
} from "@/context/type";
import { useWaSettings } from "@/api/whatsapp/template/whatsapp.query";
import { Colors } from "@/constants/colors";

// Helper for divider
const Divider = () => {
  const isDark = useColorScheme() === "dark";
  return (
    <View
      style={{
        height: 1,
        backgroundColor: isDark ? Colors.dark.border : Colors.light.border,
        marginVertical: 8,
      }}
    />
  );
};

// ---------- Wrapper Component ----------
interface Props_ {
  templateBody: WaTemplateFetchBody;
  parameters: WaTemplateComponent[];
}

export function WaInboxTemplate({ templateBody, parameters }: Props_) {
  const isDark = useColorScheme() === "dark";
  if (!templateBody) return null;

  return (
    <View
      style={{
        backgroundColor: isDark ? Colors.dark.surface : "#fff",
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
        marginTop: 14,
        marginBottom: 10,
      }}
    >
      {templateBody?.components?.map((component, i) => (
        <WaInboxTemplateComponents
          key={i}
          parameterData={parameters?.find((param) => param?.type === component?.type.toLowerCase())}
          templateComponent={component}
        />
      ))}
    </View>
  );
}

// ---------- Component Resolver ----------
interface Props {
  templateComponent: WaTemplateFetchBodyComponent;
  parameterData: WaTemplateComponent | undefined;
}

export default function WaInboxTemplateComponents({ templateComponent, parameterData }: Props) {
  switch (templateComponent?.type) {
    case "HEADER":
      return (
        <WaInboxTemplateHeader
          parameterData={parameterData}
          templateComponent={templateComponent}
        />
      );
    case "BODY":
      return (
        <WaInboxTemplateBody parameterData={parameterData} templateComponent={templateComponent} />
      );
    case "FOOTER":
      return <WaInboxTemplateFooter {...templateComponent} />;
    case "BUTTONS":
      return <WaInboxTemplateButtons {...templateComponent} />;
    default:
      return null;
  }
}

// ---------- Header ----------
const WaInboxTemplateHeader = ({ parameterData, templateComponent }: Props) => {
  const isDark = useColorScheme() === "dark";
  const getUrlIfParameterIsPresent = (): string => {
    if (parameterData) {
      const formatKey = templateComponent?.format?.toLowerCase();
      const file = formatKey
        ? (parameterData.parameters?.[0] as any)?.[formatKey]?.link
        : undefined;
      if (file instanceof File) {
        return URL.createObjectURL(file);
      } else {
        return file;
      }
    } else {
      return templateComponent?.example?.header_handle?.[0];
    }
  };

  switch (templateComponent?.format) {
    case "TEXT":
      return (
        <Text
          style={{
            fontFamily: "InstrumentSans_700Bold",
            fontSize: 15,
            color: isDark ? "#fff" : Colors.light.textPrimary,
            marginBottom: 6,
          }}
        >
          {templateComponent?.text}
        </Text>
      );
    case "IMAGE":
      return (
        <Image
          source={{ uri: getUrlIfParameterIsPresent() }}
          contentFit="cover"
          style={{
            width: "100%",
            height: 160,
            borderRadius: 12,
            marginBottom: 10,
          }}
        />
      );
    case "DOCUMENT":
      return (
        <TouchableOpacity
          onPress={() => Linking.openURL(getUrlIfParameterIsPresent())}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 8,
            borderRadius: 8,
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontFamily: "InstrumentSans_600SemiBold",
              color: isDark ? Colors.accent.cyan : Colors.brand.blue,
              textDecorationLine: "underline",
              fontSize: 13,
            }}
          >
            View Document
          </Text>
        </TouchableOpacity>
      );
    default:
      return null;
  }
};

// ---------- Body ----------
const WaInboxTemplateBody = ({ templateComponent }: Props) => {
  const isDark = useColorScheme() === "dark";
  // Fallback text formatting helper placeholder
  const text = templateComponent?.text || "";

  return (
    <Text
      style={{
        fontFamily: "InstrumentSans_400Regular",
        fontSize: 14,
        color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
        lineHeight: 20,
      }}
    >
      {text}
    </Text>
  );
};

// ---------- Footer ----------
const WaInboxTemplateFooter = (props: WaTemplateFetchBodyComponent) => {
  const isDark = useColorScheme() === "dark";
  return (
    <Text
      style={{
        fontFamily: "InstrumentSans_400Regular",
        fontSize: 12,
        color: isDark ? Colors.dark.textMuted : Colors.light.textMuted,
        marginTop: 6,
      }}
    >
      {props?.text}
    </Text>
  );
};

// ---------- Buttons ----------
const WaInboxTemplateButtons = (props: WaTemplateFetchBodyComponent) => {
  const isDark = useColorScheme() === "dark";
  return (
    <View style={{ marginTop: 8 }}>
      {props?.buttons?.map((button, i) => (
        <View key={i}>
          {i === 0 && <Divider />}
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              paddingHorizontal: 12,
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              borderRadius: 8,
              marginBottom: 4,
            }}
          >
            <ReplyIcon size={15} color={isDark ? Colors.accent.cyan : Colors.brand.blue} />
            <Text
              style={{
                fontFamily: "InstrumentSans_600SemiBold",
                fontSize: 13,
                color: isDark ? Colors.accent.cyan : Colors.brand.blue,
                marginLeft: 8,
              }}
            >
              {button?.text}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

interface AccountSelectorProps {
  value?: string;
  onChange?: (teamId: string) => void;
  label?: string;
}

export function AccountSelector({ value, onChange, label = "Account" }: AccountSelectorProps) {
  const { data, isPending, isError } = useWaSettings();
  const [modalVisible, setModalVisible] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Memoised so the effect below doesn't re-run on every render: the mapped array
  // was a fresh identity each time, which made `[accountOptions, value]` useless.
  const accountOptions = useMemo(
    () =>
      data
        ? data.map((account) => ({
            label: account.phone,
            value: account.phoneId,
          }))
        : [],
    [data],
  );

  // Just the selected option's text — derived, so it can never disagree with `value`.
  const selectedLabel = accountOptions.find((opt) => opt.value === value)?.label ?? "";

  // Defaulting to the first account stays an effect: it is a real side effect, telling the
  // parent what was picked rather than describing what is on screen.
  useEffect(() => {
    if (!value && accountOptions.length > 0) onChange?.(accountOptions[0].value);
  }, [accountOptions, value, onChange]);

  if (isError)
    return (
      <Text style={{ color: "red", fontFamily: "InstrumentSans_600SemiBold" }}>
        Something went wrong!
      </Text>
    );

  if (isPending) {
    return (
      <View
        style={{
          height: 42,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
          backgroundColor: isDark ? Colors.dark.surface : "#fff",
        }}
      >
        <ActivityIndicator size="small" color={Colors.brand.blue} />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontFamily: "InstrumentSans_600SemiBold",
          color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary,
          fontSize: 14,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>

      <TouchableOpacity
        style={{
          height: 42,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
          backgroundColor: isDark ? Colors.dark.surface : "#fff",
          paddingHorizontal: 12,
        }}
        onPress={() => setModalVisible(true)}
      >
        <Text
          style={{
            fontFamily: "InstrumentSans_600SemiBold",
            fontSize: 14,
            color: selectedLabel
              ? isDark
                ? "#fff"
                : Colors.light.textPrimary
              : isDark
                ? Colors.dark.textPlaceholder
                : Colors.light.textPlaceholder,
          }}
        >
          {selectedLabel || "Select Account"}
        </Text>
        <ChevronDown size={16} color={isDark ? Colors.dark.inactive : Colors.light.inactive} />
      </TouchableOpacity>

      <Modal
        transparent
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.4)",
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{
                backgroundColor: isDark ? Colors.dark.surface : "#fff",
                borderRadius: 16,
                paddingVertical: 8,
                maxHeight: "60%",
                borderWidth: 1,
                borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
              }}
            >
              <FlatList
                data={accountOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => {
                  const isSelected = item.value === value;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        // No label to set — it follows from `value`.
                        onChange?.(item.value);
                        setModalVisible(false);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: isSelected
                            ? "InstrumentSans_700Bold"
                            : "InstrumentSans_600SemiBold",
                          fontSize: 15,
                          color: isSelected
                            ? isDark
                              ? Colors.accent.cyan
                              : Colors.brand.blue
                            : isDark
                              ? "#fff"
                              : Colors.light.textPrimary,
                        }}
                      >
                        {item.label}
                      </Text>
                      {isSelected && (
                        <Check size={16} color={isDark ? Colors.accent.cyan : Colors.brand.blue} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text
                    style={{
                      fontFamily: "InstrumentSans_600SemiBold",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      color: isDark ? Colors.dark.textMuted : Colors.light.textMuted,
                      textAlign: "center",
                    }}
                  >
                    No accounts found!
                  </Text>
                }
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
