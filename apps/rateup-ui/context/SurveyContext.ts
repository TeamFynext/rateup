import { createContext } from "react";

type ISurveyCtx = {
  selectedTeamId: string;
  selectedTeamName: string;
  surveyTeamMapId: string;
  filterTeams: Array<string>;
  filterTags: Array<string>;
};

const SurveyContext = createContext<ISurveyCtx>({
  selectedTeamId: "",
  selectedTeamName: "",
  surveyTeamMapId: "",
  filterTeams: [],
  filterTags: [],
});

export default SurveyContext;
