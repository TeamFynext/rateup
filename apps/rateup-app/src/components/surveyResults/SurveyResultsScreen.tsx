import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { useQuestions } from "@/api/question/question.query";
import { useResponseAnalytics, useResponsesBySurvey } from "@/api/response/response.query";
import type { DbFlow } from "@/api/whatsapp/types";
import ScreenHeader from "@/components/common/ScreenHeader";
import SegmentedControl from "@/components/common/SegmentedControl";
import { ContactCard } from "@/components/flow/FlowResponseCard";
import SurveyQuestions from "@/components/flow/SurveyQuestions";
import { CenteredSpinner, EmptyState, FONT, useTheme } from "@/components/loyalty/cashier/ui";
import HappinessJourney from "@/components/webform/HappinessJourney";
import HappyIndex from "@/components/webform/HappyIndex";
import NpsOverview from "@/components/webform/NpsOverview";
import SurveyStatsWebForm from "@/components/webform/SurveyStats";
import { plural } from "./kit";

const VIEWS = [
  { value: "analytics", label: "Analytics" },
  { value: "responses", label: "Responses" },
] as const;

type ResultsView = (typeof VIEWS)[number]["value"];

/** The results of a WhatsApp flow or a web form: one analytics page and the respondent list. */
export default function SurveyResultsScreen({
  title,
  surveyId,
  version,
  flow,
  onOpenResponse,
}: Readonly<{
  title: string;
  surveyId: string;
  /** 1 for web forms and v1 flows, whose questions come from the survey, not the flow JSON. */
  version: number;
  flow: DbFlow | null;
  onOpenResponse: (response: any) => void;
}>) {
  const { t } = useTheme();
  const [view, setView] = useState<ResultsView>("analytics");

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <ScreenHeader
        title={title}
        onBack={() => router.back()}
        below={<SegmentedControl options={VIEWS} value={view} onChange={setView} />}
      />
      {view === "analytics" ? (
        <AnalyticsView surveyId={surveyId} version={version} flow={flow} />
      ) : (
        <ResponsesView surveyId={surveyId} onOpenResponse={onOpenResponse} />
      )}
    </View>
  );
}

function AnalyticsView({
  surveyId,
  version,
  flow,
}: Readonly<{ surveyId: string; version: number; flow: DbFlow | null }>) {
  const { t } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useResponseAnalytics(surveyId, {});
  const { data: questions } = useQuestions(surveyId);

  const [nps, choiceWise] = useMemo(
    () => (data ? [Object.entries(data.nps), Object.entries(data.choiceWise)] : [[], []]),
    [data],
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.brand} />
      }
    >
      <SurveyStatsWebForm surveyId={surveyId} />
      {isLoading ? (
        <CenteredSpinner />
      ) : isError || !data ? (
        <EmptyState
          title="Could not load analytics"
          body="Check your internet connection and pull to refresh."
        />
      ) : (
        <>
          <HappyIndex surveyId={surveyId} />
          <NpsOverview surveyId={surveyId} />
          <HappinessJourney surveyId={surveyId} />
          <SurveyQuestions
            choiceWise={choiceWise as any}
            NPS={nps as any}
            version={version}
            questions={questions}
            flow={flow}
          />
        </>
      )}
    </ScrollView>
  );
}

function ResponsesView({
  surveyId,
  onOpenResponse,
}: Readonly<{ surveyId: string; onOpenResponse: (response: any) => void }>) {
  const { t } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useResponsesBySurvey(surveyId, {});

  if (isLoading) return <CenteredSpinner />;

  const responses: any[] = data?.responses ?? [];

  return (
    <FlatList
      data={responses}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.brand} />
      }
      ListHeaderComponent={
        responses.length > 0 ? (
          <Text style={{ fontFamily: FONT.medium, fontSize: 13, color: t.fg3 }}>
            {plural(data?.totalCount ?? responses.length, "response")}
          </Text>
        ) : null
      }
      ListEmptyComponent={
        isError ? (
          <EmptyState
            title="Could not load responses"
            body="Check your internet connection and pull to refresh."
          />
        ) : (
          <EmptyState title="No responses yet" body="Answers will appear here as they come in." />
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onOpenResponse(item)}
          accessibilityRole="button"
          accessibilityLabel={`Response from ${item.phone || "anonymous respondent"}`}
        >
          <ContactCard item={item} />
        </Pressable>
      )}
    />
  );
}
