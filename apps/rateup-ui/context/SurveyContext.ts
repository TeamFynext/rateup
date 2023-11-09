import { createContext } from "react";

type ISurveyCtx = {
  selectedTeamId: string;
  selectedTeamName: string;
  surveyTeamMapId: string;
};

const SurveyContext = createContext<ISurveyCtx>({
  selectedTeamId: "",
  selectedTeamName: "",
  surveyTeamMapId: "",
});

export default SurveyContext;
