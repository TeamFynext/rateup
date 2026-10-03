import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import { ChevronRight, FileText, Workflow } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { FONT, usePressed, useTheme } from "@/components/loyalty/cashier/ui";

dayjs.extend(isToday);

type Tone = "success" | "warm" | "danger" | "neutral";

export type FormStatus = { label: string; tone: Tone };

/** One row of the Forms tab, shared by the WA Flow and Web Forms lists. */
export default function FormCard({
  kind,
  title,
  status,
  createdAt,
  detail,
  onPress,
}: Readonly<{
  kind: "flow" | "webform";
  title: string;
  status: FormStatus;
  createdAt: string | Date;
  detail?: string;
  onPress: () => void;
}>) {
  const { t } = useTheme();
  const { pressed, pressHandlers } = usePressed();
  const tones: Record<Tone, { color: string; soft: string }> = {
    success: t.status.closed,
    warm: t.status.new,
    danger: t.dangerTone,
    neutral: { color: t.fg3, soft: t.surface2 },
  };
  const tone = tones[status.tone];
  const created = dayjs(createdAt);
  const when = created.isToday()
    ? `Today, ${created.format("h:mm A")}`
    : created.format("D MMM YYYY");
  const Icon = kind === "flow" ? Workflow : FileText;

  return (
    <Pressable
      onPress={onPress}
      {...pressHandlers}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${status.label}. Open responses`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        marginBottom: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.border1,
        backgroundColor: pressed ? t.surface2 : t.surface,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: t.brandSoft,
        }}
      >
        <Icon size={20} color={t.brand} />
      </View>

      <View style={{ flex: 1, gap: 6 }}>
        <Text
          numberOfLines={2}
          style={{ fontFamily: FONT.semibold, fontSize: 15, lineHeight: 20, color: t.fg1 }}
        >
          {title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: tone.soft,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone.color }} />
            <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: tone.color }}>
              {status.label}
            </Text>
          </View>
          <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
            {detail ? `${detail} · ${when}` : when}
          </Text>
        </View>
      </View>

      <ChevronRight size={18} color={t.fg4} />
    </Pressable>
  );
}
