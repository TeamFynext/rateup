import React, { useCallback, useContext, useEffect, useState } from "react";
import StyledTabs from "../../styled/StyledTabs/StyledTabs";
import {
  ActionIcon,
  Badge,
  Checkbox,
  Group,
  Loader,
  Radio,
  ScrollArea,
  ScrollAreaAutosize,
  Stack,
  Tabs,
  Text,
  Tooltip,
} from "@mantine/core";
import Responses from "../Response/Responses";
import SurveyStats from "./SurveyStats";
import SurveySummary from "./SurveySummary";
import ResultsOverview from "./ResultsOverview";
import {
  LDResponse,
  QuestionType,
  SmileyResponse,
  YNResponse,
} from "../../../types/enums";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { useQuestions } from "../../../backend/surveys/questions/questions.query";
import {
  IconMoodCry,
  IconMoodSad,
  IconMoodSmile,
  IconMoodHappy,
  IconMoodCrazyHappy,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useImmer } from "use-immer";
import { useAllResponses } from "../../../backend/surveys/response/response.query";
import {
  filterResponses,
  getResponseArrayByQuestionType,
  getfilteredResponseUsingLanguage,
} from "../../../utils/response";
import SurveyContext from "../../../context/SurveyContext";
import ResultComparison from "./ResultComparison";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import {
  getFilteredResponsesUsingTeam,
  mergeResponsesFromTeams,
} from "../../../utils/team/surveyTeam";
enum ResultTab {
  OverView = "overview",
  Analytics = "analytics",
  Responses = "responses",
  Comparison = "comparison",
}
const Result = ({ survey, setSelectedLanguage }) => {
  const { filterTeams } = useContext(SurveyContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  //fetching the responses associated with the survey
  const {
    data: teamWiseResponses,
    error: responseFetchError,
    isLoading: isLoading,
  } = useAllResponses(survey?.id);
  const [filteredResponses, setFilteredResponses] = useState(null);
  const { filteredResponsesByTeam } = getFilteredResponsesUsingTeam(
    filterTeams,
    teamWiseResponses,
  );
  const { mergedResponses, noofResponses } = mergeResponsesFromTeams(
    filteredResponsesByTeam,
  );
  const { filteredResponsesByLanguage } = getfilteredResponseUsingLanguage(
    mergedResponses,
    selectedLanguage,
  );
  const [resultTab, setActiveResultTab] = useState<
    | ResultTab.Analytics
    | ResultTab.OverView
    | ResultTab.Responses
    | ResultTab.Comparison
  >(ResultTab.OverView);

  //this useEffect is used to set the filtered responses to the responses when the responses are fetched
  useEffect(() => {
    setFilteredResponses(filteredResponsesByLanguage);
  }, [teamWiseResponses, filterTeams, selectedLanguage]);

  if (isLoading) return <Loader />;
  if (responseFetchError) return <Text>An error has occurred</Text>;
  return (
    <StyledTabs
      value={resultTab}
      onChange={(value) => setActiveResultTab(value as ResultTab)}
      defaultValue="overview"
      placement="left"
      orientation="vertical"
      styles={{
        root: {
          flexDirection: "row",
          flexWrap: "wrap",
        },
        list: {
          position: "sticky",
          display: "flex",
          flexDirection: "column",
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
          height: "fit-content",
          minWidth: 200,
          border: "1px solid var(--mantine-color-gray-3)",
          minHeight: "fit-content",
        },
        panel: {
          minWidth: "300px",
          padding: 2,
          height: "100%",
          overflow: "scroll",
        },
      }}
    >
      <Stack maw={200} p={2} h={"100%"}>
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="responses">Responses</Tabs.Tab>
          <Tabs.Tab value="comparison">Comparison</Tabs.Tab>
        </Tabs.List>
        <ResultFilter
          activeTab={resultTab}
          survey={survey}
          responses={filteredResponsesByLanguage}
          setFilteredResponses={setFilteredResponses}
          setSelectedLanguage={setSelectedLanguage}
        />
      </Stack>
      <Tabs.Panel value="overview">
        <SurveyStats survey={survey} />
        <SurveySummary />
      </Tabs.Panel>
      <Tabs.Panel value="analytics">
        <ResultsOverview />
      </Tabs.Panel>
      <Tabs.Panel value="responses">
        <Responses
          survey={survey}
          responses={filteredResponses}
          allResponses={teamWiseResponses}
        />
      </Tabs.Panel>
      <Tabs.Panel value="comparison">
        <ResultComparison />
      </Tabs.Panel>
    </StyledTabs>
  );
};

export default Result;

//filter component starts here
export const ResultFilter = ({
  survey,
  responses,
  setFilteredResponses,
  setSelectedLanguage,
  activeTab,
}: {
  survey: Survey;
  responses: Array<SurveyResponse>;
  setFilteredResponses: (data: Array<SurveyResponse>) => void;
  setSelectedLanguage: (language: string) => void;
  activeTab: string;
}) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const quantitativeQuestionTypes = [
    QuestionType.Rating,
    QuestionType.Smiley,
    QuestionType.LD,
    QuestionType.YN,
    QuestionType.Opinion,
  ];
  const languageSelectionOptions = survey?.languages?.map((language) => {
    return { value: language, label: language };
  });
  const {
    isLoading: isQLoading,
    error: QError,
    data: questions,
  } = useQuestions(survey?.id);

  const quantitativeQuestions = questions?.filter(
    (question) => quantitativeQuestionTypes?.includes(question?.type),
  );
  const [filters, setFilters] = useImmer<
    Array<{ question_id: string; responses: Array<string> }>
  >([]);

  const handleUpdate = useCallback(
    (question_id: string, responses: Array<string>) => {
      setFilters((draft) => {
        const question = draft?.find(
          (question) => question.question_id === question_id,
        );
        if (question) {
          question.responses = responses;
          if (question.responses?.length === 0) {
            draft.splice(draft.indexOf(question), 1);
          }
        } else {
          draft.push({
            question_id: question_id,
            responses: responses,
          });
        }
      });
    },
    [],
  );

  useEffect(() => {
    setFilteredResponses(filterResponses(responses, filters));
  }, [filters]);
  if (
    (languageSelectionOptions?.length > 1 &&
      activeTab !== ResultTab.Responses) ||
    (quantitativeQuestions?.length !== 0 && activeTab === ResultTab.Responses)
  ) {
    return (
      <PaperLayout p={"xs"} style={{ flex: 1 }}>
        <ScrollArea scrollbarSize={5} h={"100%"}>
          <Stack>
            <Text c={"dark"} fw={900}>
              Filter By
            </Text>
            {languageSelectionOptions?.length > 1 && (
              <>
                <Group justify="space-between">
                  <Text size="xs" c={"dark.3"} fw={"bold"} maw={130} truncate>
                    Languages
                  </Text>
                  <Tooltip
                    label="The question title will be displayed in the default language only when All options is selected"
                    position="bottom-start"
                  >
                    <ActionIcon variant="subtle">
                      <IconInfoCircle size={15} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                <Radio.Group
                  value={selectedLanguage}
                  onChange={(value) => setSelectedLanguage(value)}
                >
                  <Radio label="All" value={""} size="xs" />
                  {languageSelectionOptions?.map((option, i) => (
                    <Radio
                      mt={2}
                      key={i}
                      label={option.label}
                      value={option.value}
                      size="xs"
                    />
                  ))}
                </Radio.Group>
              </>
            )}
            {quantitativeQuestions?.length > 0 &&
              activeTab === ResultTab.Responses &&
              quantitativeQuestions?.map((question, i) => (
                <ReturnSingleFilterComponent
                  key={i}
                  question={question}
                  handleUpdate={handleUpdate}
                />
              ))}
          </Stack>
        </ScrollArea>
      </PaperLayout>
    );
  }
};

//simple component based on switch case for returning questions for filter component based on question type
const ReturnSingleFilterComponent = ({
  question,
  handleUpdate,
}: {
  question: Question;
  handleUpdate: (question_id: string, responses: Array<string>) => void;
}) => {
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );
  const Question = (
    <Text size="xs" c={"dark.3"} fw={"bold"} maw={130} truncate>
      {question.title[selectedLanguage ? selectedLanguage : defaultLanguage]}
    </Text>
  );
  switch (question.type) {
    case QuestionType.Rating:
      return (
        <>
          {Question}
          <Checkbox.Group
            onChange={(value) => handleUpdate(question.id, value)}
          >
            <Group>
              <Checkbox value={"1"} label="1" size="xs" />
              <Checkbox value={"2"} label="2" size="xs" />
              <Checkbox value={"3"} label="3" size="xs" />
              <Checkbox value={"4"} label="4" size="xs" />
              <Checkbox value={"5"} label="5" size="xs" />
            </Group>
          </Checkbox.Group>
        </>
      );
    case QuestionType.Smiley:
      return (
        <>
          {Question}
          <Checkbox.Group
            onChange={(value) => handleUpdate(question.id, value)}
          >
            <Group>
              <Checkbox
                value={SmileyResponse.VerySad}
                label={
                  <IconMoodCry
                    size={18}
                    color={
                      getResponseArrayByQuestionType(QuestionType.Smiley)?.find(
                        (res) => res.value === SmileyResponse.VerySad,
                      )?.color
                    }
                  />
                }
                size="xs"
              />
              <Checkbox
                value={SmileyResponse.Sad}
                label={
                  <IconMoodSad
                    size={18}
                    color={
                      getResponseArrayByQuestionType(QuestionType.Smiley)?.find(
                        (res) => res.value === SmileyResponse.Sad,
                      )?.color
                    }
                  />
                }
                size="xs"
              />
              <Checkbox
                value={SmileyResponse.Neutral}
                label={
                  <IconMoodSmile
                    size={18}
                    color={
                      getResponseArrayByQuestionType(QuestionType.Smiley)?.find(
                        (res) => res.value === SmileyResponse.Neutral,
                      )?.color
                    }
                  />
                }
                size="xs"
              />
              <Checkbox
                value={SmileyResponse.Happy}
                label={
                  <IconMoodHappy
                    size={18}
                    color={
                      getResponseArrayByQuestionType(QuestionType.Smiley)?.find(
                        (res) => res.value === SmileyResponse.Happy,
                      )?.color
                    }
                  />
                }
                size="xs"
              />
              <Checkbox
                value={SmileyResponse.VeryHappy}
                label={
                  <IconMoodCrazyHappy
                    size={18}
                    color={
                      getResponseArrayByQuestionType(QuestionType.Smiley)?.find(
                        (res) => res.value === SmileyResponse.VeryHappy,
                      )?.color
                    }
                  />
                }
                size="xs"
              />
            </Group>
          </Checkbox.Group>
        </>
      );
    case QuestionType.LD:
      return (
        <>
          {Question}
          <Checkbox.Group
            onChange={(value) => handleUpdate(question.id, value)}
          >
            <Group>
              <Checkbox value={LDResponse.Like} label="Like" size="xs" />
              <Checkbox value={LDResponse.Dislike} label="Dislike" size="xs" />
            </Group>
          </Checkbox.Group>
        </>
      );
    case QuestionType.YN:
      return (
        <>
          {Question}
          <Checkbox.Group
            onChange={(value) => handleUpdate(question.id, value)}
          >
            <Group>
              <Checkbox value={YNResponse.Yes} label="Yes" size="xs" />
              <Checkbox value={YNResponse.No} label="No" size="xs" />
            </Group>
          </Checkbox.Group>
        </>
      );
    case QuestionType.Opinion:
      return (
        <>
          {Question}
          <Checkbox.Group
            onChange={(value) => handleUpdate(question.id, value)}
          >
            <Group>
              <Checkbox value={"1"} label="1" size="xs" />
              <Checkbox value={"2"} label="2" size="xs" />
              <Checkbox value={"3"} label="3" size="xs" />
              <Checkbox value={"4"} label="4" size="xs" />
              <Checkbox value={"5"} label="5" size="xs" />
              <Checkbox value={"6"} label="6" size="xs" />
              <Checkbox value={"7"} label="7" size="xs" />
              <Checkbox value={"8"} label="8" size="xs" />
              <Checkbox value={"9"} label="9" size="xs" />
              <Checkbox value={"10"} label="10" size="xs" />
            </Group>
          </Checkbox.Group>
        </>
      );
    default:
      return <></>;
  }
};
