import React, { useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { Box, Flex, ScrollArea, Stack, Tabs, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowLeft } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { QuestionType2 } from "@/types/enums";
import { useQuestions } from "@/backend/surveys/questions/questions.query";
import { useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import RateupLoader from "@/components/Loaders/RateupLoader";

import SelectedLanguageContext from "../../../context/SelectedLanguage";
import SurveyContext from "../../../context/SurveyContext";
import { useUser } from "../../../context/UserContext";
import { decryptPrivateKey } from "../../../utils/encryption";
import { pushToSessionStorage } from "../../../utils/essential";
import { showErrorToast } from "../../../utils/notifications";
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
import ResultsOverviewWebForm from "./ResultsOverviewWebForm";
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
  flow = null,
  version = 1,
}) => {
  const { selectedTeamId } = useContext(SurveyContext);
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );
  const [activeTab, setActiveTab] = useState(ResultTab.Responses);
  //end to end encryption logic for result page begins here
  const passwordModalOpenedCondition =
    (survey?.isEncrypted || !!survey?.publicKey) && !encryptionpassword;
  const [passwordModalOpened, { close, open }] = useDisclosure(
    passwordModalOpenedCondition,
  );
  const {
    isLoading: isQLoading,
    error: QError,
    data: questions,
    refetch,
    isRefetching,
  } = useQuestions(survey.id);
  //end to end encryption logic for result page ends here
  //.
  //.
  const flowQuestions = useMemo(() => {
    return flow?.json?.screens?.flatMap((screen) =>
      screen.layout.children
        .filter((child) => child.type !== QuestionType2.Footer)
        .map(
          ({
            id,
            label,
            metaType,
            name,
            "data-source": dataSource,
            header,
          }) => ({
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
  }, [flow]);
  if (isQLoading) return <RateupLoader />;

  if (QError)
    return <ErrorComponent refetch={refetch} isRefetching={isRefetching} />;

  return (
    <StyledTabs
      defaultValue={ResultTab.Responses}
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
      value={activeTab}
      onChange={(value) => setActiveTab(value as ResultTab)}
    >
      <Box className={styles["result-page-tabs-container"]}>
        <ScrollArea offsetScrollbars={true}>
          <Tabs.List classNames={{ list: styles["result-page-tabs-list"] }}>
            <Tabs.Tab value="responses">{translations("Response")}</Tabs.Tab>
            <Tabs.Tab value="analytics">{translations("Analytics")}</Tabs.Tab>
            <Tabs.Tab value="comparison">{translations("Comparison")}</Tabs.Tab>
          </Tabs.List>
        </ScrollArea>
      </Box>
      <Box className={styles["panels-container"]}>
        <Tabs.Panel value="responses">
          {version === 1 ? (
            <Responses
              survey={survey}
              defaultLanguage={defaultLanguage}
              subscription={subscription}
              questions={questions}
            />
          ) : (
            <WaResponses
              survey={survey}
              defaultLanguage={defaultLanguage}
              selectedTeamId={selectedTeamId}
              subscription={subscription}
              questions={flowQuestions}
            />
          )}
        </Tabs.Panel>
        <Tabs.Panel value="analytics">
          <ResultsOverviewWebForm
            surveyId={survey?.id}
            aiResponseSummary={survey?.aiResponseSummary}
            survey={survey}
            flowId={flowId}
            version={version}
            flowQuestions={flowQuestions}
            questions={questions}
          />
        </Tabs.Panel>
        <Tabs.Panel value="comparison">
          <ResultComparison
            surveyId={survey?.id}
            version={version}
            flowQuestions={flowQuestions}
            questions={questions}
          />
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
  const translations = useTranslations();
  const router = useRouter();
  const [encryptionpassword, setEncryptionPassword] = useState("");

  const onSubmitPassword = useCallback(async () => {
    const { privateKey } = await decryptPrivateKey(
      encryptionKeys?.privateKey,
      encryptionpassword,
    );
    if (privateKey) {
      close();
      pushToSessionStorage(`${surveyId}_ete_passkey`, encryptionpassword);
      setPassword(encryptionpassword);
    } else {
      showErrorToast(translations("Invalid Password"));
    }
  }, [
    encryptionpassword,
    encryptionKeys,
    close,
    setPassword,
    surveyId,
    translations,
  ]);

  const handleGoback = useCallback(() => {
    router.push(`/dashboard/surveys`);
  }, [router]);

  return (
    <SimpleModalLayout
      centered
      opened={passwordModalOpened}
      onClose={close}
      title={translations("Enter the password")}
      withCloseButton={false}
    >
      <Stack>
        <Text>
          {translations("Enter the password to view the survey data")}
        </Text>
        <ContainedPasswordInput
          label={translations("Password")}
          value={encryptionpassword}
          onChange={(e) => setEncryptionPassword(e.target.value)}
        />
        <Flex style={{ justifyContent: "center", gap: "40px" }}>
          <RateupButtonSecondary
            title={translations("Go back")}
            leftIcon={<IconArrowLeft />}
            onClick={handleGoback}
          />
          <RateupButtonBlue
            title={translations("Submit")}
            onClick={onSubmitPassword}
          />
        </Flex>
      </Stack>
    </SimpleModalLayout>
  );
}
