const linkTypeOptions = [
  {
    label: "Web Survey",
    value: "web-survey",
  },
  {
    label: "Whatsapp Survey",
    value: "whatsapp-survey",
  },
  {
    label: "Custom Link",
    value: "custom-link",
  },
];

const getLinkTypeLabel = (value) => {
  const { label } = linkTypeOptions.find((obj) => obj.value === value);
  return label;
};

const getSelectedSurveyTitleOptions = (surveysData) => {
  if (surveysData) {
    const data = surveysData.map((surveyObj) => {
      return {
        value: surveyObj.id,
        label: surveyObj.title,
      };
    });
    return data;
  }
  return [];
};

const getSelectedTeamOptions = (surveysData, selectedSurveyTitle) => {
  if (surveysData) {
    const data = surveysData.find((surveyObj) => surveyObj.id === selectedSurveyTitle);
    const options = data?.teams.map(({ id, shortUrlId, team: { name: teamName } }) => {
      return {
        label: teamName,
        value: shortUrlId || id,
      };
    });
    return options;
  }
};

const getSurveyTitleWithId = (surveysData, surveyId) => {
  return surveysData?.find((surveyObj) => surveyObj.id === surveyId)?.title ?? "";
};

export {
  linkTypeOptions,
  getLinkTypeLabel,
  getSelectedSurveyTitleOptions,
  getSelectedTeamOptions,
  getSurveyTitleWithId,
};
