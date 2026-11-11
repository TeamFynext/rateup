import { ScrollView, Text, View, useColorScheme } from "react-native";
import { FileText, Phone, User, Users } from "lucide-react-native";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import TemplatePreview from "./TemplatePreview";
import type { TemplateVariable } from "./templateVariables";

type Props = {
  templateName: string;
  components: any[] | undefined;
  variables: TemplateVariable[];
  values: Record<string, string>;
  to: string;
  from: string;
  team: string;
};

export default function ReviewStep(props: Props) {
  const t = getInboxRowTheme(useColorScheme() === "dark");
  const rows = [
    { icon: User, label: "To", value: props.to },
    { icon: Phone, label: "From", value: props.from },
    { icon: Users, label: "Team", value: props.team },
    { icon: FileText, label: "Template", value: props.templateName },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 16 }}>
      <View
        style={{
          borderRadius: 14,
          backgroundColor: t.surface2,
          borderWidth: 1,
          borderColor: t.border1,
          paddingHorizontal: 14,
        }}
      >
        {rows.map(({ icon: Icon, label, value }, i) => (
          <View
            key={label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 11,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: t.border1,
            }}
          >
            <Icon size={16} color={t.fg3} />
            <Text style={{ width: 70, color: t.fg3, fontSize: 13 }}>{label}</Text>
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                textAlign: "right",
                color: t.fg1,
                fontSize: 14,
                fontFamily: "InstrumentSans_600SemiBold",
              }}
            >
              {value || "—"}
            </Text>
          </View>
        ))}
      </View>

      <TemplatePreview
        components={props.components}
        variables={props.variables}
        values={props.values}
      />
    </ScrollView>
  );
}
