import { createContext } from "react";

type ISurveyCtx = {
  surveyId?: string;
  selectedTeamId: string;
  selectedTeamName: string;
  surveyTeamMapId: string;
  filterTeams: Array<string>;
  setFilterTeams?: (teams: Array<string>) => void;
  filterTags: Array<string>;
  encryptionpassword: string;
  variables?: Array<SurveyVariable>;
  teams: Array<{ value: string; label: string }>;
};

const SurveyContext = createContext<ISurveyCtx>({
  surveyId: "",
  selectedTeamId: "",
  selectedTeamName: "",
  surveyTeamMapId: "",
  filterTeams: [],
  filterTags: [],
  encryptionpassword: "",
  setFilterTeams: () => {},
  variables: [],
  teams: [],
});

export default SurveyContext;
