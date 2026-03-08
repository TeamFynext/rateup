"use client";

import { useContext, useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Flex,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconBrandOpenai,
  IconCheck,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { QuestionType } from "@/types/enums";
import { useGenerateLargeTextResponseSummaryByAI } from "@/backend/surveys/response/response.query";
import { RateupButtonSecondary } from "@/components/Button/RateupButtons";
import styles from "@/components/Graph/graph.module.css";
import Heading from "@/components/styled/Heading/Heading";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { FormElement } from "@/components/whatsapp/flow-v2/utils/store";
import SelectedLanguageContext from "@/context/SelectedLanguage";
import SurveyContext from "@/context/SurveyContext";

import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util";

interface LargeTextResponseSummaryProp {
  surveyId: string;
  questions: Question[] | FormElement[];
  subscription: Subscription;
  currentSummary: ResponseSummary[];
  version?: number;
}

enum ResponseSummaryType {
  All = "all",
  Team = "team",
}

const LargeTextResponseSummary = ({
  surveyId,
  questions,
  subscription,
  currentSummary,
  version = 1,
}: LargeTextResponseSummaryProp) => {
  const getSummary = useGenerateLargeTextResponseSummaryByAI(surveyId);
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );
  const [summaryTab, setSummaryTab] = useState(ResponseSummaryType.All);
  const [selectedQuestion, setSelectedQuestion] = useState<Question>(null);
  const { teams } = useContext(SurveyContext);
  const ref = useRef(null);
  const [height, setHeight] = useState(null);
  const translations = useTranslations();
  const getResponseSummary = (questionId, teamId?) => {
    if (getSummary.isPending) return;
    toast.loading("loading", {
      id: "summary",
    });
    getSummary.mutate(
      {
        surveyId,
        data: { type: summaryTab, questionId, teamId: teamId ?? undefined },
      },
      {
        onSuccess: () => {
          toast.success(translations("Summary generated successfully"), {
            id: "summary",
          });
        },
        onError(error) {
          console.log(error);
          toast.error(
            error?.message || ` ${translations("Summary generation failed:")}`,
            {
              id: "summary",
            },
          );
        },
      },
    );
  };

  useEffect(() => {
    if (ref.current) {
      setHeight(ref.current.clientHeight);
    }
  }, [ref]);

  if (!questions?.length || !subscription.features?.ai?.active) return null;

  const LargeTextTeamwiseSummary = () => {
    if (!selectedQuestion) setSummaryTab(ResponseSummaryType.Team);
    const questionSummary = currentSummary.find(
      (q) => q.questionId === selectedQuestion.id,
    );
    const teamWiseSummary = questionSummary?.team;

    return (
      <Stack h={height} style={{ minHeight: "50vh" }}>
        <Group gap={"sm"}>
          <ActionIcon
            onClick={() => setSummaryTab(ResponseSummaryType.All)}
            variant="subtle"
            color="dark.3"
          >
            <IconArrowLeft />
          </ActionIcon>
          <Text fw={800} c={"dark.3"}>
            {translations("Back")}
          </Text>
        </Group>
        <Stack p={"xl"}>
          <Text fw={600}>
            {version === 1
              ? getReplacedTitleFromVariable({
                  title: selectedQuestion?.title[defaultLanguage],
                  surveyId,
                })
              : selectedQuestion?.label}
          </Text>
          {teams?.map((team, index) => {
            const currentTeamSummary = teamWiseSummary?.find(
              (t) => t.teamId === team.value,
            );
            return (
              <Stack key={team.value} pl={"xl"} mt={"md"}>
                <Flex justify={"flex-end"} gap={"sm"}>
                  <Badge variant="light">{team.label}</Badge>
                  <Tooltip
                    label={`${translations("Generate")} ${team.label} ${translations("Summary by AI")}`}
                  >
                    <Button
                      rightSection={
                        <IconBrandOpenai
                          className={
                            getSummary.isPending
                              ? styles.rotateInfinitely
                              : null
                          }
                        />
                      }
                      size="sm"
                      onClick={() =>
                        getResponseSummary(selectedQuestion.id, team.value)
                      }
                    >
                      {translations("Generate")}
                    </Button>
                  </Tooltip>
                  <Tooltip
                    label={translations(
                      "Summary will updated only if there are responses after summary generation",
                    )}
                  >
                    <IconInfoCircle size={"1rem"} color="gray" />
                  </Tooltip>
                </Flex>
                <Flex gap={"xs"}>
                  <Text fw={600}>Summary:</Text>
                  <Text fw={600} c={"dark.3"}>
                    {currentTeamSummary?.summary ?? "---------"}
                  </Text>
                </Flex>
                {index + 1 !== teams.length && <Divider my={"sm"} />}
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    );
  };

  return (
    <Stack>
      <Heading subtitle={translations("Large Text Summary")} />
      <PaperLayout>
        {summaryTab === ResponseSummaryType.Team ? (
          <LargeTextTeamwiseSummary />
        ) : (
          questions?.map((question, index) => {
            const summary = currentSummary.find(
              (summary) => summary.questionId === question.id,
            );
            return (
              <Stack key={question?.id} mt={"sm"} ref={ref}>
                <Flex gap={"xs"}>
                  <Text fw={600}>{index + 1}.</Text>
                  <Text fw={600}>
                    {version === 1
                      ? getReplacedTitleFromVariable({
                          title: question?.title?.[defaultLanguage],
                          surveyId,
                        })
                      : question?.label}
                  </Text>
                  <Tooltip label={translations("Generate Summary by AI")}>
                    <Button
                      rightSection={
                        <IconBrandOpenai
                          className={
                            getSummary.isPending
                              ? styles.rotateInfinitely
                              : null
                          }
                        />
                      }
                      size="sm"
                      onClick={() => getResponseSummary(question.id)}
                    >
                      {translations("Generate")}
                    </Button>
                  </Tooltip>
                  <Tooltip
                    label={translations(
                      "Summary will updated only if there are responses after summary generation",
                    )}
                  >
                    <IconInfoCircle size={"1rem"} color="gray" />
                  </Tooltip>
                </Flex>
                {summary && (
                  <Stack px={"xl"}>
                    <Flex gap={"xs"}>
                      <Text fw={600}>Summary:</Text>
                      <Text fw={600} c={"dark.3"}>
                        {summary.all.summary}
                      </Text>
                    </Flex>
                    <RateupButtonSecondary
                      title={translations("Generate Team wise summary")}
                      onClick={() => {
                        setSelectedQuestion(question);
                        setSummaryTab(ResponseSummaryType.Team);
                      }}
                      w={"fit-content"}
                    />
                  </Stack>
                )}
              </Stack>
            );
          })
        )}
      </PaperLayout>
    </Stack>
  );
};

export default LargeTextResponseSummary;
