export const updateKioskMode = (setKioskMode, editSurvey) => {
  setKioskMode((prev) => {
    const newKioskMode = !prev;
    editSurvey.mutate({ kioskMode: newKioskMode });
    return newKioskMode;
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
