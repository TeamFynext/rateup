import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";

import {
  Box,
  Flex,
  Loader,
  ScrollArea,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowLeft } from "@tabler/icons-react";

import { QuestionType2 } from "@/types/enums";
import useTranslations from "@/dictionaries/useTranslation";

import { useAllResponses } from "../../../backend/surveys/response/response.query";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import SurveyContext from "../../../context/SurveyContext";
import { useUser } from "../../../context/UserContext";
import { decryptPrivateKey } from "../../../utils/encryption";
import { pushToSessionStorage } from "../../../utils/essential";
import { showErrorToast } from "../../../utils/notifications";
import {
  getfilteredResponseUsingLanguage,
  getFilteredResponseUsingTags,
} from "../../../utils/response";
import {
  getFilteredResponsesUsingTeam,
  mergeResponsesFromTeams,
} from "../../../utils/team/surveyTeam";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import { ContainedPasswordInput } from "../../input/ContainedInput/ContainedInput";
import SimpleModalLayout from "../../Modal/SimpleModalLayout";
import StyledTabs from "../../styled/StyledTabs/StyledTabs";
import Responses from "../Response/Responses";
import WaResponses from "../Response/WaResponses";
import styles from "./Result.module.css";
import ResultComparison from "./ResultComparison";
import ResultsOverview from "./ResultsOverview";
import SurveyStats from "./SurveyStats";
import WaResultsOverviewV2 from "./WaResultsOverview";

enum ResultTab {
  OverView = "overview",
  Analytics = "analytics",
  Responses = "responses",
  Comparison = "comparison",
}

const Result = ({
  survey,
  encryptionpassword,
  setEncryptionPassword,
  subscription = null,
  flowId = null,
  translations,
  flow,
  version = 1,
}) => {
  const { filterTeams, filterTags, selectedTeamId } = useContext(SurveyContext);
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );
  const [resultTab, setActiveResultTab] = useState<ResultTab>(
    flowId ? ResultTab.Responses : ResultTab.OverView,
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
  const questions = flow?.json?.screens?.flatMap((screen) =>
    screen.layout.children
      .filter((child) => child.type !== QuestionType2.Footer)
      .map(
        ({ id, label, metaType, name, "data-source": dataSource, header }) => ({
          id,
          label,
          metaType,
          dataSource,
          name,
          header,
        }),
      )
      .filter(({ name }) => name),
  );

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
          padding: 5,
          paddingRight: 10,
          height: "100%",
          width: "100%",
          overflow: "auto",
        },
      }}
    >
      <Box className={styles["result-page-tabs-container"]}>
        <ScrollArea offsetScrollbars={true}>
          <Tabs.List classNames={{ list: styles["result-page-tabs-list"] }}>
            {!flowId && (
              <Tabs.Tab value="overview">{translations["Overview"]}</Tabs.Tab>
            )}
            <Tabs.Tab value="responses">{translations["Response"]}</Tabs.Tab>
            <Tabs.Tab value="analytics">{translations["Analytics"]}</Tabs.Tab>
            <Tabs.Tab value="comparison">{translations["Comparison"]}</Tabs.Tab>
          </Tabs.List>
        </ScrollArea>
      </Box>
      <Box className={styles["panels-container"]}>
        <Tabs.Panel value="overview">
          <SurveyStats
            survey={survey}
            flowId={flowId}
            translations={translations}
          />
        </Tabs.Panel>
        <Tabs.Panel value="responses">
          {version === 1 ? (
            <Responses
              survey={survey}
              responses={filteredResponses}
              defaultLanguage={defaultLanguage}
              isLoading={isLoading}
              selectedTeamId={selectedTeamId}
              subscription={subscription}
            />
          ) : (
            <WaResponses
              survey={survey}
              responses={filteredResponses}
              defaultLanguage={defaultLanguage}
              isLoading={isLoading}
              selectedTeamId={selectedTeamId}
              subscription={subscription}
              questions={questions}
            />
          )}
        </Tabs.Panel>
        <Tabs.Panel value="analytics">
          {version === 1 ? (
            <ResultsOverview surveyId={survey?.id} />
          ) : (
            <WaResultsOverviewV2 surveyId={survey?.id} />
          )}
        </Tabs.Panel>
        <Tabs.Panel value="comparison">
          <ResultComparison surveyId={survey?.id} />
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
  const { translations } = useTranslations();
  const router = useRouter();
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
      showErrorToast(translations["Invalid Password"]);
    }
  }

  const handleGoback = () => {
    router.push(`/dashboard/surveys`);
  };

  return (
    <SimpleModalLayout
      centered
      opened={passwordModalOpened}
      onClose={close}
      title={translations["Enter the password"]}
      withCloseButton={false}
    >
      <Stack>
        <Text>
          {translations["Enter the password to view the survey data"]}
        </Text>
        <ContainedPasswordInput
          label={translations["Password"]}
          value={encryptionpassword}
          onChange={(e) => setEncryptionPassword(e.target.value)}
        />
        <Flex style={{ justifyContent: "center", gap: "40px" }}>
          <RateupButtonSecondary
            title={translations["Go back"]}
            leftIcon={<IconArrowLeft />}
            onClick={() => {
              handleGoback();
            }}
          />
          <RateupButtonBlue
            title={translations["Submit"]}
            onClick={() => {
              onSubmitPassword();
            }}
          />
        </Flex>
      </Stack>
    </SimpleModalLayout>
  );
}
