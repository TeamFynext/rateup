import type { Dispatch, SetStateAction } from "react";

/**
 * Each helper flips a survey setting in local state and pushes the new value
 * through the survey-update mutation. Only the `mutate`/`mutateAsync` members
 * are used, so the mutation is modelled by what is called rather than by
 * react-query's full `UseMutationResult`.
 */
export interface SurveyUpdateMutation {
  mutate: (
    variables: Record<string, unknown>,
    options?: {
      onSuccess?: (data: unknown) => void;
      onError?: (error: unknown) => void;
      onSettled?: () => void;
    },
  ) => void;
  mutateAsync: (variables: Record<string, unknown>) => Promise<unknown>;
  isPending?: boolean;
}

/** Shape of the survey's redirect setting. */
interface RedirectSetting {
  enable?: boolean;
  url?: string;
  /** Seconds before redirecting; the settings form edits it as a number. */
  time?: string | number;
}

export const updateKioskMode = (
  setKioskMode: Dispatch<SetStateAction<boolean>>,
  editSurvey: SurveyUpdateMutation,
) => {
  setKioskMode((prev) => {
    const newKioskMode = !prev;
    editSurvey.mutate({ kioskMode: newKioskMode });
    return newKioskMode;
  });
};

export const updateRedirect = (
  setRedirect: Dispatch<SetStateAction<RedirectSetting>>,
  editSurvey: SurveyUpdateMutation,
  updateData: RedirectSetting = {},
) => {
  const otherUpdate = Object.keys(updateData)?.length > 0;
  setRedirect((prev) => {
    const newRedirect = {
      ...prev,
      enable: !(prev?.enable ?? false),
    };
    editSurvey.mutate({ redirect: otherUpdate ? updateData : newRedirect });
    return otherUpdate ? updateData : newRedirect;
  });
};

export const updateGetLocation = (
  setLocation: Dispatch<SetStateAction<boolean>>,
  editSurvey: SurveyUpdateMutation,
) => {
  setLocation((prev) => {
    const newGetLoc = !prev;
    editSurvey.mutate({ getLocation: newGetLoc });
    return newGetLoc;
  });
};

export const updateSkipPreview = (
  setPreview: Dispatch<SetStateAction<boolean>>,
  editSurvey: SurveyUpdateMutation,
) => {
  setPreview((prev) => {
    const newPreview = !prev;
    editSurvey.mutate({ skipPreview: newPreview });
    return newPreview;
  });
};

export const updatewebSurveyAutoTransitionToNextQues = (
  setwebSurveyAutoTransitionToNextQues: Dispatch<SetStateAction<boolean>>,
  editSurvey: SurveyUpdateMutation,
) => {
  setwebSurveyAutoTransitionToNextQues((prev) => {
    const newValue = !prev;
    editSurvey.mutateAsync({ webSurveyAutoTransitionToNextQues: newValue });
    return newValue;
  });
};

export const updatePwdSurvey = (
  updateSurveyPassword: SurveyUpdateMutation,
  setPasswordProtection: Dispatch<SetStateAction<boolean>>,
  surveyId: string,
) => {
  setPasswordProtection((prev) => {
    const isProtected = !prev;
    if (!isProtected) {
      updateSurveyPassword.mutate({ surveyId, password: "_remove_pwd" });
    }
    return isProtected;
  });
};

export const updateEmailSurvey = (
  setEnabledNotificationEmail: Dispatch<SetStateAction<boolean>>,
  editSurvey: SurveyUpdateMutation,
) => {
  setEnabledNotificationEmail((prev) => {
    const isEnabled = !prev;
    editSurvey.mutate({ enableNotificationEmail: isEnabled });
    return isEnabled;
  });
};

export const updateUniqueDevice = (
  setEnableUniqueDevice: Dispatch<SetStateAction<boolean>>,
  editSurvey: SurveyUpdateMutation,
) => {
  setEnableUniqueDevice((prev) => {
    const isEnabled = !prev;
    editSurvey.mutate({ uniqueDeviceResponse: isEnabled });
    return isEnabled;
  });
};

export const updateEndToEndEncryption = (
  setEndToEndEncryption: Dispatch<SetStateAction<boolean>>,
  publicKey: string | null | undefined,
  editSurvey: SurveyUpdateMutation,
) => {
  setEndToEndEncryption((prev) => {
    const newGetEte = !prev;
    const responsetoUpdate = {
      isEncrypted: newGetEte,
      publicKey: publicKey ?? "",
    };
    editSurvey.mutate(responsetoUpdate);
    return newGetEte;
  });
};
