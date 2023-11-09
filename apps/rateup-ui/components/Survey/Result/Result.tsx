import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import StyledTabs from "../../styled/StyledTabs/StyledTabs";
import {
  Checkbox,
  Group,
  Loader,
  Stack,
  Tabs,
  Text,
  createTheme,
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
} from "@tabler/icons-react";
import { useImmer } from "use-immer";
import { useResponses } from "../../../backend/surveys/response/response.query";
import { filterResponses } from "../../../utils/response";
import SurveyContext from "../../../context/SurveyContext";
const Result = ({ survey }) => {
  const { surveyTeamMapId } = useContext(SurveyContext);
  //fetching the responses associated with the survey
  const {
    data: responses,
    error: responseFetchError,
    isLoading: isLoading,
  } = useResponses(surveyTeamMapId);
  const [filteredResponses, setFilteredResponses] = useState(responses);
  enum ResultTab {
    OverView = "overview",
    Analytics = "analytics",
    Responses = "responses",
  }
  const [resultTab, setActiveResultTab] = useState<
    ResultTab.Analytics | ResultTab.OverView | ResultTab.Responses
  >(ResultTab.OverView);

  //this useEffect is used to set the filtered responses to the responses when the responses are fetched
  useEffect(() => {
    setFilteredResponses(responses);
  }, [responses]);

  if (isLoading) return <Loader />;
  if (responseFetchError) return <Text>An error has occurred</Text>;
  return (
    <StyledTabs
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
        },
        panel: {
          minWidth: "300px",
          padding: "10px",
          height: "100%",
          overflow: "scroll",
        },
      }}
    >
      <Stack pb="sm" maw={200}>
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="responses">Responses</Tabs.Tab>
        </Tabs.List>
        {resultTab === ResultTab.Responses && (
          <ResultFilter
            survey={survey}
            responses={responses}
            setFilteredResponses={setFilteredResponses}
          />
        )}
      </Stack>
      <Tabs.Panel value="overview">
        <SurveyStats survey={survey} />
        <SurveySummary />
      </Tabs.Panel>
      <Tabs.Panel value="analytics">
        <ResultsOverview />
      </Tabs.Panel>
      <Tabs.Panel value="responses">
        <Responses survey={survey} responses={filteredResponses} />
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
}: {
  survey: Survey;
  responses: Array<SurveyResponse>;
  setFilteredResponses: (data: Array<SurveyResponse>) => void;
}) => {
  const quantitativeQuestionTypes = [
    QuestionType.Rating,
    QuestionType.Smiley,
    QuestionType.LD,
    QuestionType.YN,
    QuestionType.Opinion,
  ];
  const {
    isLoading: isQLoading,
    error: QError,
    data: questions,
  } = useQuestions(survey?.id);

  const quantitativeQuestions = questions?.filter((question) =>
    quantitativeQuestionTypes.includes(question?.type),
  );
  const [filters, setFilters] = useImmer<
    Array<{ question_id: string; responses: Array<string> }>
  >([]);

  const handleUpdate = useCallback(
    (question_id: string, responses: Array<string>) => {
      setFilters((draft) => {
        const question = draft.find(
          (question) => question.question_id === question_id,
        );
        if (question) {
          question.responses = responses;
          if (question.responses.length === 0) {
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
  if (quantitativeQuestions?.length !== 0) {
    return (
      <PaperLayout style={{ flex: 1 }} ml={2}>
        <Stack>
          <Text c={"dimmed"}>Filter By</Text>
          {quantitativeQuestions?.map((question) => (
            <ReturnSingleQuestionComponent
              question={question}
              handleUpdate={handleUpdate}
            />
          ))}
        </Stack>
      </PaperLayout>
    );
  }
};

//simple component based on switch case for returning questions for filter component based on question type
const ReturnSingleQuestionComponent = ({
  question,
  handleUpdate,
}: {
  question: Question;
  handleUpdate: (question_id: string, responses: Array<string>) => void;
}) => {
  const [language, setLanguage] = useState("English");
  const Question = (
    <Text size="xs" c={"dimmed"} fw={"bold"}>
      {question.title[language]}
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
                label={<IconMoodCry size={18} />}
                size="xs"
              />
              <Checkbox
                value={SmileyResponse.Sad}
                label={<IconMoodSad size={18} />}
                size="xs"
              />
              <Checkbox
                value={SmileyResponse.Neutral}
                label={<IconMoodSmile size={18} />}
                size="xs"
              />
              <Checkbox
                value={SmileyResponse.Happy}
                label={<IconMoodHappy size={18} />}
                size="xs"
              />
              <Checkbox
                value={SmileyResponse.VeryHappy}
                label={<IconMoodCrazyHappy size={18} />}
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
