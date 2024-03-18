import React, { useContext, useEffect, useState } from "react";
import StyledTabs from "../../styled/StyledTabs/StyledTabs";
import { Box, Loader, Stack, Tabs, Text } from "@mantine/core";
import Responses from "../Response/Responses";
import SurveyStats from "./SurveyStats";
import ResultsOverview from "./ResultsOverview";
import { useAllResponses } from "../../../backend/surveys/response/response.query";
import {
  getFilteredResponseUsingTags,
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
  subscription,
}) => {
  const { filterTeams, filterTags, selectedTeamId } = useContext(SurveyContext);
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
        <Tabs.List classNames={{ list: styles["result-page-tabs-list"] }}>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="responses">Responses</Tabs.Tab>
          <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          <Tabs.Tab value="comparison">Comparison</Tabs.Tab>
        </Tabs.List>
      </Box>
      <Box className={styles["panels-container"]}>
        <Tabs.Panel value="overview">
          <SurveyStats survey={survey} />
        </Tabs.Panel>
        <Tabs.Panel value="responses">
          <Responses
            survey={survey}
            responses={filteredResponses}
            defaultLanguage={defaultLanguage}
            isLoading={isLoading}
            selectedTeamId={selectedTeamId}
            subscription={subscription}
          />
        </Tabs.Panel>
        <Tabs.Panel value="analytics">
          <ResultsOverview surveyId={survey?.id} />
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
