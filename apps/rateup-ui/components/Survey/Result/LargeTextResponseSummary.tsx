import { useContext, useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Badge,
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
import styles from "components/Graph/graph.module.css";

import { QuestionType } from "@/types/enums";
import { useGetLargeTextResponseSummaryByAI } from "@/backend/surveys/response/response.query";
import { RateupButtonSecondary } from "@/components/Button/RateupButtons";
import Heading from "@/components/styled/Heading/Heading";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import SelectedLanguageContext from "@/context/SelectedLanguage";
import SurveyContext from "@/context/SurveyContext";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "@/utils/notifications";

import { getReplacedTitleFromVariable } from "../TakeSurvey/TakeSurveyComponent/util";

interface LargeTextResponseSummaryProp {
  surveyId: string;
  questions: Question[];
  subscription: Subscription;
}

enum ResponseSummaryType {
  All = "all",
  Team = "team",
}

const LargeTextResponseSummary = ({
  surveyId,
  questions,
  subscription,
}: LargeTextResponseSummaryProp) => {
  const getSummary = useGetLargeTextResponseSummaryByAI(surveyId);
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );
  const [summaryTab, setSummaryTab] = useState(ResponseSummaryType.All);
  const [selectedQuestion, setSelectedQuestion] = useState<Question>(null);
  const { teams } = useContext(SurveyContext);
  const [largeTextQuestions, setLargeTextQuestions] = useState([]);
  const ref = useRef(null);
  const [height, setHeight] = useState(null);

  const getResponseSummary = (questionId, teamId?) => {
    if (getSummary.isPending) return;
    showLoadingToast("loading", "summary", true, "", "", false);
    getSummary.mutate(
      {
        surveyId,
        data: { type: summaryTab, questionId, teamId: teamId ?? undefined },
      },
      {
        onSuccess: () => {
          showSuccessToast(
            "Summary generated successfully",
            "summary",
            <IconCheck />,
            true,
          );
        },
        onError(error: any, variables, context) {
          console.log(error);
          showErrorToast(
            `Summary generation failed: ${error?.response?.data ?? ""}`,
            "summary",
            <IconX />,
            true,
          );
        },
      },
    );
  };

  useEffect(() => {
    setLargeTextQuestions(
      questions.filter((question) => question.type === QuestionType.TextArea),
    );
  }, [questions]);

  useEffect(() => {
    if (ref.current) {
      setHeight(ref.current.clientHeight);
    }
  }, [ref]);

  if (!largeTextQuestions.length || !subscription.features?.ai?.active)
    return null;

  const LargeTextTeamwiseSummary = () => {
    if (!selectedQuestion) setSummaryTab(ResponseSummaryType.Team);
    return (
      <Stack h={height}>
        <Group gap={"sm"}>
          <ActionIcon
            onClick={() => setSummaryTab(ResponseSummaryType.All)}
            variant="subtle"
            color="dark.3"
          >
            <IconArrowLeft />
          </ActionIcon>
          <Text fw={800} c={"dark.3"}>
            Back
          </Text>
        </Group>
        <Stack p={"xl"}>
          <Text fw={800}>
            {getReplacedTitleFromVariable({
              title: selectedQuestion?.title[defaultLanguage],
              surveyId,
            })}
          </Text>
          {teams?.map((team, index) => {
            const summary = selectedQuestion?.responseSummary?.team?.find(
              (t) => t.teamId === team.value,
            )?.summary;
            return (
              <Stack key={team.value} pl={"xl"} mt={"md"}>
                <Flex justify={"flex-end"} gap={"sm"}>
                  <Badge variant="light">{team.label}</Badge>
                  <Tooltip label={`Generate ${team.label} Summary by AI`}>
                    <ActionIcon
                      onClick={() =>
                        getResponseSummary(selectedQuestion.id, team.value)
                      }
                      variant="subtle"
                      size={"sm"}
                      color="black"
                    >
                      <IconBrandOpenai
                        className={
                          getSummary.isPending ? styles.rotateInfinitely : null
                        }
                      />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip
                    label={
                      "Summary will updated only if there are responses after summary generation"
                    }
                  >
                    <IconInfoCircle size={"1rem"} color="gray" />
                  </Tooltip>
                </Flex>
                <Flex gap={"xs"}>
                  <Text fw={800}>Summary:</Text>
                  <Text fw={800} c={"dark.3"}>
                    {summary ?? "---------"}
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
      <Heading subtitle="Large Text Summary" />
      <PaperLayout>
        {summaryTab === ResponseSummaryType.Team ? (
          <LargeTextTeamwiseSummary />
        ) : (
          largeTextQuestions?.map((question, index) => (
            <Stack key={index} mt={"sm"} ref={ref}>
              <Flex gap={"xs"}>
                <Text fw={800}>{index + 1}.</Text>
                <Text fw={800}>
                  {getReplacedTitleFromVariable({
                    title: question?.title[defaultLanguage],
                    surveyId,
                  })}
                </Text>
                <Tooltip label={"Generate Summary by AI"}>
                  <ActionIcon
                    onClick={() => getResponseSummary(question.id)}
                    variant="subtle"
                    size={"sm"}
                    color="black"
                  >
                    <IconBrandOpenai
                      className={
                        getSummary.isPending ? styles.rotateInfinitely : null
                      }
                    />
                  </ActionIcon>
                </Tooltip>
                <Tooltip
                  label={
                    "Summary will updated only if there are responses after summary generation"
                  }
                >
                  <IconInfoCircle size={"1rem"} color="gray" />
                </Tooltip>
              </Flex>
              {question?.responseSummary?.all?.summary && (
                <Stack px={"xl"}>
                  <Flex gap={"xs"}>
                    <Text fw={800}>Summary:</Text>
                    <Text fw={800} c={"dark.3"}>
                      {question?.responseSummary?.all?.summary}
                    </Text>
                  </Flex>
                  <RateupButtonSecondary
                    title="Generate Team wise summary"
                    onClick={() => {
                      setSelectedQuestion(question);
                      setSummaryTab(ResponseSummaryType.Team);
                    }}
                  />
                </Stack>
              )}
            </Stack>
          ))
        )}
      </PaperLayout>
    </Stack>
  );
};

export default LargeTextResponseSummary;
