export const updateKioskMode = (setKioskMode, editSurvey) => {
  setKioskMode((prev) => {
    const newKioskMode = !prev;
    editSurvey.mutate({ kioskMode: newKioskMode });
    return newKioskMode;
  });
};

export const updateRedirect = (setRedirect, editSurvey, updateData = {}) => {
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

export const updateGetLocation = (setLocation, editSurvey) => {
  setLocation((prev) => {
    const newGetLoc = !prev;
    editSurvey.mutate({ getLocation: newGetLoc });
    return newGetLoc;
  });
};

export const updateSkipPreview = (setPreview, editSurvey) => {
  setPreview((prev) => {
    const newPreview = !prev;
    editSurvey.mutate({ skipPreview: newPreview });
    return newPreview;
  });
};

export const updatewebSurveyAutoTransitionToNextQues = (
  setwebSurveyAutoTransitionToNextQues,
  editSurvey,
) => {
  setwebSurveyAutoTransitionToNextQues((prev) => {
    const newValue = !prev;
    editSurvey.mutateAsync({ webSurveyAutoTransitionToNextQues: newValue });
    return newValue;
  });
};

export const updatePwdSurvey = (
  updateSurveyPassword,
  setPasswordProtection,
  surveyId,
) => {
  setPasswordProtection((prev) => {
    const isProtected = !prev;
    if (!isProtected) {
      updateSurveyPassword.mutate({ surveyId, password: "_remove_pwd" });
    }
    return isProtected;
  });
};

export const updateEmailSurvey = (setEnabledNotificationEmail, editSurvey) => {
  setEnabledNotificationEmail((prev) => {
    const isEnabled = !prev;
    editSurvey.mutate({ enableNotificationEmail: isEnabled });
    return isEnabled;
  });
};

export const updateUniqueDevice = (setEnableUniqueDevice, editSurvey) => {
  setEnableUniqueDevice((prev) => {
    const isEnabled = !prev;
    editSurvey.mutate({ uniqueDeviceResponse: isEnabled });
    return isEnabled;
  });
};

export const updateEndToEndEncryption = (
  setEndToEndEncryption,
  publicKey,
  editSurvey,
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
