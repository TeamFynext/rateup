import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
} from "react-native";

import { ReplyIcon,Divide } from "lucide-react-native"; // replace with your icon lib

import {
  WaTemplateComponent,
  WaTemplateFetchBody,
  WaTemplateFetchBodyComponent,
} from "@/src/context/type";
import { useWaSettings } from "@/src/api/whatsapp/template/whatsapp.query";

// Placeholder for your utility function
const TextWithFormatting = (text: string, params: string[]) => {
  // implement as needed
  return text;
};

// ---------- Wrapper Component ----------
interface Props_ {
  templateBody: WaTemplateFetchBody;
  parameters: WaTemplateComponent[];
}

export function WaInboxTemplate({ templateBody, parameters }: Props_) {
  return (
    <View>
      {templateBody?.components?.map((component, i) => (
        <WaInboxTemplateComponents
          key={i}
          parameterData={parameters?.find(
            (param) => param?.type === component?.type.toLowerCase()
          )}
          templateComponent={component}
        />
      ))}
    </View>
  );
}

// ---------- Component Resolver ----------
interface Props {
  templateComponent: WaTemplateFetchBodyComponent;
  parameterData: WaTemplateComponent;
}

export default function WaInboxTemplateComponents({
  templateComponent,
  parameterData,
}: Props) {
  switch (templateComponent?.type) {
    case "HEADER":
      return (
        <WaInboxTemplateHeader
          parameterData={parameterData}
          templateComponent={templateComponent}
        />
      );
    case "BODY":
      return <WaInboxTemplateBody parameterData={parameterData} templateComponent={templateComponent} />;
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
  const getUrlIfParameterIsPresent = (): string => {
    if (parameterData) {
      const file = parameterData.parameters?.[0]?.[
        templateComponent?.format?.toLowerCase()
      ]?.link;
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
      return <Text style={{ fontWeight: "bold", fontSize: 16 }}>{templateComponent?.text}</Text>;
    case "IMAGE":
      return (
        <Image
          source={{ uri: getUrlIfParameterIsPresent() }}
          style={{ width: "100%", height: 300, resizeMode: "contain" }}
        />
      );
    case "DOCUMENT":
      return (
        <TouchableOpacity onPress={() => Linking.openURL(getUrlIfParameterIsPresent())}>
          <Text style={{ color: "blue", textDecorationLine: "underline" }}>
            View Document
          </Text>
        </TouchableOpacity>
      );
    default:
      return null;
  }
};

// ---------- Body ----------
const WaInboxTemplateBody = ({ parameterData, templateComponent }: Props) => {
  const text = TextWithFormatting(
    templateComponent?.text,
    parameterData?.parameters?.map((data) => data?.text) ??
      templateComponent?.example?.body_text?.[0] ??
      []
  );

  return <Text>{text}</Text>;
};

// ---------- Footer ----------
const WaInboxTemplateFooter = (props: WaTemplateFetchBodyComponent) => {
  return (
    <Text style={{ fontSize: 12, color: "gray", marginTop: 10 }}>{props?.text}</Text>
  );
};

// ---------- Buttons ----------
const WaInboxTemplateButtons = (props: WaTemplateFetchBodyComponent) => {
  return (
    <View>
      {props?.buttons?.map((button, i) => (
        <View key={i}>
          {i === 0 && <Divide />}
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: "transparent",
            }}
          >
            <ReplyIcon size={18} color="black" />
            <Text style={{ marginLeft: 8 }}>{button?.text}</Text>
          </TouchableOpacity>
          {i !== props?.buttons?.length - 1 && <Divide />}
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

export function AccountSelector({
  value,
  onChange,
  label = "Account",
}: AccountSelectorProps) {
  const { data, isPending, isError } = useWaSettings();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");

  const accountOptions = data
    ? data.map((account) => ({
        label: account.phone,
        value: account.phoneId,
      }))
    : [];

  useEffect(() => {
    if (!value && accountOptions.length > 0) {
      onChange?.(accountOptions[0].value);
      setSelectedLabel(accountOptions[0].label);
    } else {
      const match = accountOptions.find((opt) => opt.value === value);
      if (match) setSelectedLabel(match.label);
    }
  }, [accountOptions, value]);

  if (isError) return <Text className="text-red-500">Something went wrong!</Text>;

  if (isPending) {
    return (
      <View className="w-60 h-10 justify-center items-center rounded-md border border-gray-300">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <View className="my-2">
      <Text className="mb-1 font-semibold">{label}</Text>

      <TouchableOpacity
        className="border border-gray-300 rounded-md px-3 py-2"
        onPress={() => setModalVisible(true)}
      >
        <Text className={selectedLabel ? "text-black" : "text-gray-400"}>
          {selectedLabel || "Select Account"}
        </Text>
      </TouchableOpacity>

      <Modal
        transparent
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View className="flex-1 justify-center bg-black/40 px-5">
            <View className="bg-white rounded-lg py-3 max-h-[60%]">
              <FlatList
                data={accountOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      onChange?.(item.value);
                      setSelectedLabel(item.label);
                      setModalVisible(false);
                    }}
                    className="px-4 py-3 border-b border-gray-100"
                  >
                    <Text className="text-base">{item.label}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text className="px-4 py-3 text-gray-500">
                    No account found!
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
