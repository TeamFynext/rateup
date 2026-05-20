"use client";

import { useCallback, useContext, useMemo, useState } from "react";

import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { QuestionType2 } from "@/types/enums.ts";
import { useQuestions } from "@/backend/surveys/questions/questions.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { decryptPrivateKey } from "@/utils/encryption/index.ts";
import { pushToSessionStorage } from "@/utils/essential/index.ts";

import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";
import { useUser } from "@/context/UserContext.tsx";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons.tsx";
import { ContainedPasswordInput } from "../../input/ContainedInput/ContainedInput.tsx";
import SimpleModalLayout from "../../Modal/SimpleModalLayout.tsx";
import Responses from "../Response/Responses.tsx";
import WaResponses from "../Response/WaResponses.tsx";

const Result = ({
  survey,
  encryptionpassword,
  setEncryptionPassword,
  subscription = null,
  flowId = null,
  flow = null,
  version = 1,
}) => {
  const { selectedTeamId } = useContext(SurveyContext);
  const { selectedLanguage, defaultLanguage } = useContext(
    SelectedLanguageContext,
  );
  // end to end encryption logic for result page begins here
  const passwordModalOpenedCondition =
    (survey?.isEncrypted || !!survey?.publicKey) && !encryptionpassword;
  const [passwordModalOpened, setPasswordModalOpened] = useState(
    passwordModalOpenedCondition,
  );
  const close = () => setPasswordModalOpened(false);
  const {
    isLoading: isQLoading,
    error: QError,
    data: questions,
    refetch,
    isRefetching,
  } = useQuestions(survey.id);
  // end to end encryption logic for result page ends here
  // .
  // .
  const flowQuestions = useMemo(() => {
    return flow?.json?.screens?.flatMap((screen) =>
      screen.layout.children
        .filter((child) => child.type !== QuestionType2.Footer)
        .map(
          ({
            id,
            label,
            metaType,
            type,
            name,
            "data-source": dataSource,
            header,
          }) => ({
            id,
            label,
            metaType: type || metaType,
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
    <>
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
      <EncryptionPasswordModal
        passwordModalOpened={passwordModalOpened}
        close={close}
        setPassword={setEncryptionPassword}
        surveyId={survey?.id}
      />
    </>
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
  const { t: translations } = useTranslation();
  const navigate = useNavigate();
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
      toast.error(translations("Invalid Password"));
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
    navigate({
      to: `/dashboard/surveys`,
    });
  }, []);

  return (
    <SimpleModalLayout
      centered
      opened={passwordModalOpened}
      onClose={close}
      title={translations("Enter the password")}
      withCloseButton={false}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {translations("Enter the password to view the survey data")}
        </p>
        <ContainedPasswordInput
          label={translations("Password")}
          value={encryptionpassword}
          onChange={(e) => setEncryptionPassword(e.target.value)}
        />
        <div className="flex justify-center gap-10">
          <RateupButtonSecondary
            title={translations("Go back")}
            leftIcon={<IconArrowLeft />}
            onClick={handleGoback}
          />
          <RateupButtonBlue
            title={translations("Submit")}
            onClick={onSubmitPassword}
          />
        </div>
      </div>
    </SimpleModalLayout>
  );
}
