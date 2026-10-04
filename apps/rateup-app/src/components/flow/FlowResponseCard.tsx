import dayjs from "dayjs";
import { ChevronRight, UserRound } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

import { FONT, useTheme } from "@/components/loyalty/cashier/ui";
import { plural } from "@/components/surveyResults/kit";
import { scaleColor } from "@/components/surveyResults/scaleColor";
import { getSentiment } from "@/constants/sentimentScale";

/** Answers short enough to read as a chip; the rest are counted, not shown. */
const SCALE_TYPES = ["Yes or No", "Like or Dislike", "Smiley", "Rating", "Opinion Scale"];

const formatResponse = (response: unknown) => {
  if (!response) return "—";
  if (typeof response !== "object") return String(response);
  return Object.values(response)
    .map((val) => (typeof val === "object" ? JSON.stringify(val) : String(val)))
    .join(", ");
};

/** One respondent in a results list. The caller owns the press. */
export const ContactCard = ({ item }: { item: any }) => {
  const { t, isDark } = useTheme();
  const s = getSentiment(isDark);

  const created = dayjs(item.createdAt);
  const time = created.isSame(dayjs(), "day")
    ? created.format("h:mm A")
    : created.format("D MMM YYYY");
  const answers: any[] = item.responses ?? [];
  const chips = answers.filter((r) => SCALE_TYPES.includes(r.type)).slice(0, 3);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.border1,
        backgroundColor: t.surface,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: t.brandSoft,
        }}
      >
        <UserRound size={20} color={t.brand} />
      </View>

      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 15, color: t.fg1 }}
          >
            {item.phone || "Anonymous respondent"}
          </Text>
          <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>{time}</Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {chips.length > 0 ? (
            chips.map((r, index) => {
              const label = formatResponse(r.response);
              return (
                <View
                  key={r.questionId || index}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 999,
                    backgroundColor: t.surface2,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: scaleColor(r.type, label, s) ?? t.fg4,
                    }}
                  />
                  <Text
                    numberOfLines={1}
                    style={{ maxWidth: 140, fontFamily: FONT.medium, fontSize: 12, color: t.fg2 }}
                  >
                    {label}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
              {plural(answers.length, "answer")}
            </Text>
          )}
        </View>
      </View>

      <ChevronRight size={18} color={t.fg4} />
    </View>
  );
};
