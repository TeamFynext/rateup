import React, { useCallback, useContext, useEffect, useState } from "react";
import StyledTabs from "../../styled/StyledTabs/StyledTabs";
import {
  ActionIcon,
  Box,
  Checkbox,
  Group,
  Loader,
  MultiSelect,
  Popover,
  Radio,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  Tooltip,
} from "@mantine/core";
import Responses from "../Response/Responses";
import SurveyStats from "./SurveyStats";
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
  IconFilter,
} from "@tabler/icons-react";
import { useImmer } from "use-immer";
import { useAllResponses } from "../../../backend/surveys/response/response.query";
import {
  filterResponses,
  getFilteredResponseUsingTags,
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
import { RateupButtonBlue } from "../../Button/RateupButtons";
import { ContainedPasswordInput } from "../../input/ContainedInput/ContainedInput";
import { useDisclosure } from "@mantine/hooks";
import SimpleModalLayout from "../../Modal/SimpleModalLayout";
import styles from "./Result.module.css";
import { pushToSessionStorage } from "../../../utils/essential";
import { useUser } from "../../../context/UserContext";
import { decryptPrivateKey } from "../../../utils/encryption";
import { showErrorToast } from "../../../utils/notifications";

enum ResultTab {
  OverView = "overview",
  Analytics = "analytics",
  Responses = "responses",
  Comparison = "comparison",
}

const Result = ({
  survey,
  setSelectedLanguage,
  setFilterTags,
  encryptionpassword,
  setEncryptionPassword,
}) => {
  const { filterTeams, filterTags } = useContext(SurveyContext);
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );
  const [resultTab, setActiveResultTab] = useState<ResultTab>(
    ResultTab.OverView,
  );
  //.
  //.
  //end to end encryption logic for result page begins here
  const passwordModalOpenedCondition =
    (survey?.isEncrypted || !!survey?.publicKey) && !encryptionpassword;
  const [passwordModalOpened, { close, open }] = useDisclosure(
    passwordModalOpenedCondition,
  );
  //end to end encryption logic for result page ends here
  //.
  //.
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
  const { filteredResponsesByTags } = getFilteredResponseUsingTags(
    filteredResponsesByLanguage,
    filterTags,
  );
  //this useEffect is used to set the filtered responses to the responses when the responses are fetched
  useEffect(() => {
    setFilteredResponses(filteredResponsesByTags);
  }, [teamWiseResponses, filterTeams, selectedLanguage, filterTags]);

  if (isLoading) return <Loader type="bars" />;
  if (responseFetchError) return <Text>An error has occurred</Text>;

  return (
    <StyledTabs
      value={resultTab}
      onChange={(value) => setActiveResultTab(value as ResultTab)}
      defaultValue="overview"
      placement="left"
      orientation="horizontal"
      styles={{
        root: {
          flexDirection: "column",
          flexWrap: "wrap",
        },
        list: {
          position: "sticky",
          display: "flex",
          flexDirection: "row",
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
          width: "100%",
          overflow: "auto",
        },
      }}
    >
      <Box className={styles["result-page-tabs-and-filter-btn-container"]}>
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="responses">Responses</Tabs.Tab>
          <Tabs.Tab value="comparison">Comparison</Tabs.Tab>
        </Tabs.List>
        {resultTab === "responses" && (
          <Popover
            width={300}
            position="bottom-start"
            withArrow
            shadow="md"
            classNames={{
              dropdown: styles["filters-popover-dropdown-div"],
            }}
          >
            <Popover.Target>
              <ActionIcon
                className={styles["filter-icon-to-open-filter-popover"]}
              >
                <IconFilter />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <ResultFilter
                activeTab={resultTab}
                survey={survey}
                responses={filteredResponsesByTags}
                setFilteredResponses={setFilteredResponses}
                setSelectedLanguage={setSelectedLanguage}
                setFilterTags={setFilterTags}
              />
            </Popover.Dropdown>
          </Popover>
        )}
      </Box>
      <Box className={styles["panels-container"]}>
        <Tabs.Panel value="overview">
          <SurveyStats survey={survey} />
        </Tabs.Panel>
        <Tabs.Panel value="analytics">
          <ResultsOverview />
        </Tabs.Panel>
        <Tabs.Panel value="responses">
          <Responses
            survey={survey}
            responses={filteredResponses}
            allResponses={teamWiseResponses}
            defaultLanguage={defaultLanguage}
            isLoading={isLoading}
          />
        </Tabs.Panel>
        <Tabs.Panel value="comparison">
          <ResultComparison />
        </Tabs.Panel>
      </Box>
      <EncryptionPasswordModal
        passwordModalOpened={passwordModalOpened}
        close={close}
        setPassword={setEncryptionPassword}
        surveyId={survey?.id}
      />
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
  setFilterTags,
}: {
  survey: Survey;
  responses: Array<SurveyResponse>;
  setFilteredResponses: (data: Array<SurveyResponse>) => void;
  setSelectedLanguage: (language: string) => void;
  activeTab: string;
  setFilterTags: (data: Array<string>) => void;
}) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { filterTags } = useContext(SurveyContext);
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
  let tagSelectSet = new Set(
    survey?.teams
      ?.map((team) => team.tags)
      .reduce((acc, val) => acc.concat(val), []),
  );
  let tagSelectData = Array.from(tagSelectSet).map((tag) => ({
    value: tag,
    label: tag,
  }));
  const {
    isLoading: isQLoading,
    error: QError,
    data: questions,
  } = useQuestions(survey?.id);

  const quantitativeQuestions = questions?.filter((question) =>
    quantitativeQuestionTypes?.includes(question?.type),
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
    languageSelectionOptions?.length > 1 ||
    tagSelectData.length > 0 ||
    (quantitativeQuestions?.length !== 0 && activeTab === ResultTab.Responses)
  ) {
    return (
      <PaperLayout p={5} style={{ flex: 1 }} py={"sm"}>
        <ScrollArea scrollbarSize={5} h={"100%"} maw={"100%"}>
          <Stack>
            <Text c={"dark"} fw={900}>
              Filter By
            </Text>
            {tagSelectData.length > 0 && (
              <>
                <Group justify="space-between">
                  <Text size="xs" c={"dark.3"} fw={"bold"} maw={130} truncate>
                    Tags
                  </Text>
                  <Tooltip
                    label="The tag filter works only when response includes tags"
                    position="bottom-start"
                  >
                    <ActionIcon variant="subtle">
                      <IconInfoCircle size={15} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <MultiSelect
                  radius={"10px"}
                  maw={180}
                  searchable
                  clearable
                  data={tagSelectData}
                  onChange={setFilterTags}
                  placeholder={filterTags.length > 0 ? "" : "All Tags"}
                />
              </>
            )}
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
      {question.title[selectedLanguage ? selectedLanguage : defaultLanguage] ||
        question.description[
          selectedLanguage ? selectedLanguage : defaultLanguage
        ]}
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

interface EncryptionPasswordModalProps {
  passwordModalOpened: boolean;
  close: () => void;
  setPassword: (password: string) => void;
  surveyId: string;
}
function EncryptionPasswordModal({
  setPassword,
  passwordModalOpened,
  surveyId,
  close,
}: EncryptionPasswordModalProps) {
  const {
    user: { encryptionKeys },
  } = useUser();
  const [encryptionpassword, setEncryptionPassword] = useState("");
  async function onSubmitPassword() {
    const { privateKey } = await decryptPrivateKey(
      encryptionKeys?.privateKey,
      encryptionpassword,
    );
    if (privateKey) {
      close();
      pushToSessionStorage(`${surveyId}_ete_passkey`, encryptionpassword);
      setPassword(encryptionpassword);
    } else {
      showErrorToast("Invalid Password");
    }
  }
  return (
    <SimpleModalLayout
      centered
      opened={passwordModalOpened}
      onClose={close}
      title="Enter the password"
      withCloseButton={false}
    >
      <Stack>
        <Text>Enter the password to view the survey data</Text>
        <ContainedPasswordInput
          label="Password"
          value={encryptionpassword}
          onChange={(e) => setEncryptionPassword(e.target.value)}
        />
        <RateupButtonBlue
          title="Submit"
          onClick={() => {
            onSubmitPassword();
          }}
        />
      </Stack>
    </SimpleModalLayout>
  );
}
