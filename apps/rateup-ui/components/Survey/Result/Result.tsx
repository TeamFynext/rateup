"use client";

import React, { useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useDisclosure } from "@mantine/hooks";
import { IconArrowLeft } from "@tabler/icons-react";
import { ChartNoAxesColumnIcon, GitCompare, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";

import { QuestionType2 } from "@/types/enums";
import { useQuestions } from "@/backend/surveys/questions/questions.query";
import { useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import SelectedLanguageContext from "../../../context/SelectedLanguage";
import SurveyContext from "../../../context/SurveyContext";
import { useUser } from "../../../context/UserContext";
import { decryptPrivateKey } from "../../../utils/encryption";
import { pushToSessionStorage } from "../../../utils/essential";
import { showErrorToast } from "../../../utils/notifications";
import { ContainedPasswordInput } from "../../input/ContainedInput/ContainedInput";
import SimpleModalLayout from "../../Modal/SimpleModalLayout";
import Responses from "../Response/Responses";
import WaResponses from "../Response/WaResponses";
import ResultComparison from "./ResultComparison";
import ResultsOverviewWebForm from "./ResultsOverviewWebForm";

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
    <div className="w-full">
      {/* tabs */}
      <Tabs
        className="w-full"
        defaultValue="responses"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ResultTab)}
      >
        <TabsList className="flex items-center gap-1 sm:gap-2 p-1">
          <TabsTrigger
            value="responses"
            className="data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-1 px-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">{translations("Response")}</span>
          </TabsTrigger>

          <TabsTrigger
            value="analytics"
            className="data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-1 px-2"
          >
            <ChartNoAxesColumnIcon className="w-4 h-4" />
            <span className="hidden sm:inline">
              {translations("Analytics")}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="comparison"
            className="data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-1 px-2"
          >
            <GitCompare className="w-4 h-4" />
            <span className="hidden sm:inline">
              {translations("Comparison")}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* content */}
        <TabsContent value="responses" className="w-full">
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
        </TabsContent>
        <TabsContent value="analytics" className="w-full">
          <ResultsOverviewWebForm
            surveyId={survey?.id}
            aiResponseSummary={survey?.aiResponseSummary}
            survey={survey}
            flowId={flowId}
            version={version}
            flowQuestions={flowQuestions}
            questions={questions}
          />
        </TabsContent>
        <TabsContent value="comparison" className="w-full">
          <ResultComparison
            surveyId={survey?.id}
            version={version}
            flowQuestions={flowQuestions}
            questions={questions}
          />
        </TabsContent>
      </Tabs>
      <EncryptionPasswordModal
        passwordModalOpened={passwordModalOpened}
        close={close}
        setPassword={setEncryptionPassword}
        surveyId={survey?.id}
      />
    </div>
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
      <div className="flex flex-col gap-2 p-2">
        <p>{translations("Enter the password to view the survey data")}</p>
        <ContainedPasswordInput
          label={translations("Password")}
          value={encryptionpassword}
          onChange={(e) => setEncryptionPassword(e.target.value)}
        />
        <div className="flex items-center justify-center gap-10">
          <Button variant="outline" onClick={handleGoback}>
            <IconArrowLeft />
            {translations("Go back")}
          </Button>

          <Button onClick={onSubmitPassword}>{translations("Submit")}</Button>
        </div>
      </div>
    </SimpleModalLayout>
  );
}
