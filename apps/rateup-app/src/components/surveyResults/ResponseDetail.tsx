import dayjs from "dayjs";
import { router } from "expo-router";
import { UserRound } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";

import ScreenHeader from "@/components/common/ScreenHeader";
import {
  CenteredSpinner,
  Divider,
  EmptyState,
  FONT,
  NUM,
  useTheme,
} from "@/components/loyalty/cashier/ui";
import { getSentiment } from "@/constants/sentimentScale";
import { plural } from "./kit";
import { scaleColor } from "./scaleColor";

export type DetailAnswer = {
  key: string;
  question: string;
  /** The question type as the API names it; picks the scale colour and the caption. */
  type?: string;
  /** Text answers get a scale dot when `type` has a scale; anything else renders as given. */
  answer: string | number | React.ReactNode;
};

/** One respondent's submission: who and when, then every question with its answer. */
export default function ResponseDetail({
  respondent,
  submittedAt,
  answers,
  loading = false,
}: Readonly<{
  respondent?: string;
  submittedAt?: string;
  answers: DetailAnswer[];
  loading?: boolean;
}>) {
  const { t } = useTheme();

  let body: React.ReactNode;
  if (loading) {
    body = <CenteredSpinner />;
  } else if (answers.length === 0) {
    body = <EmptyState title="No answers to show" body="This response has no recorded answers." />;
  } else {
    body = (
      <View
        style={{
          backgroundColor: t.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: t.border1,
        }}
      >
        {answers.map((a, index) => (
          <View key={a.key}>
            {index > 0 ? <Divider /> : null}
            <AnswerRow index={index} answer={a} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <ScreenHeader title="Response" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.brandSoft,
            }}
          >
            <UserRound size={24} color={t.brand} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: FONT.semibold, fontSize: 17, color: t.fg1 }}
            >
              {respondent || "Anonymous respondent"}
            </Text>
            <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3, ...NUM }}>
              {[
                submittedAt ? dayjs(submittedAt).format("D MMM YYYY, h:mm A") : null,
                loading ? null : plural(answers.length, "answer"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        </View>
        {body}
      </ScrollView>
    </View>
  );
}

function AnswerRow({ index, answer }: Readonly<{ index: number; answer: DetailAnswer }>) {
  const { t, isDark } = useTheme();
  const isText = typeof answer.answer === "string" || typeof answer.answer === "number";
  const text = isText ? String(answer.answer) : "";
  const dot = isText && text ? scaleColor(answer.type, text, getSentiment(isDark)) : null;

  return (
    <View style={{ flexDirection: "row", gap: 12, padding: 14 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: t.brandSoft,
        }}
      >
        <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: t.brand, ...NUM }}>
          {index + 1}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1, lineHeight: 20 }}>
            {answer.question || "Untitled question"}
          </Text>
          {answer.type ? (
            <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
              {answer.type}
            </Text>
          ) : null}
        </View>
        {isText ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {dot ? (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
            ) : null}
            <Text
              style={{
                flex: 1,
                fontFamily: text ? FONT.regular : FONT.medium,
                fontSize: 14,
                lineHeight: 21,
                color: text ? t.fg2 : t.fg4,
              }}
            >
              {text || "No answer"}
            </Text>
          </View>
        ) : (
          answer.answer
        )}
      </View>
    </View>
  );
}
