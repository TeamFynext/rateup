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

/** A survey row as the linktree editor's survey dropdown consumes it. */
interface LinktreeSurvey {
  id: string;
  title: string;
  teams: Array<{
    id: string;
    shortUrlId?: string;
    team: { name: string };
  }>;
}

const getLinkTypeLabel = (value: string) => {
  const { label } = linkTypeOptions.find((obj) => obj.value === value);
  return label;
};

const getSelectedSurveyTitleOptions = (surveysData: LinktreeSurvey[] | undefined) => {
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

const getSelectedTeamOptions = (
  surveysData: LinktreeSurvey[] | undefined,
  selectedSurveyTitle: string,
) => {
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

const getSurveyTitleWithId = (surveysData: LinktreeSurvey[] | undefined, surveyId: string) => {
  return surveysData?.find((surveyObj) => surveyObj.id === surveyId)?.title ?? "";
};

export {
  linkTypeOptions,
  getLinkTypeLabel,
  getSelectedSurveyTitleOptions,
  getSelectedTeamOptions,
  getSurveyTitleWithId,
};
