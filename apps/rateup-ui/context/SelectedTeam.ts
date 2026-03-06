import { createContext } from "react";

type ISelectedTeamCtx = {
  selectedTeamId: string;
};
const SelectedTeamContext = createContext<ISelectedTeamCtx>({
  selectedTeamId: "",
});

export default SelectedTeamContext;
