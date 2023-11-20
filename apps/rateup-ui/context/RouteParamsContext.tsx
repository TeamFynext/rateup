import { createContext, useContext, useReducer, ReactNode } from "react";

interface RouteParamsState {
  team_code: string;
  surveyId: string;
  groupId: string;
  campaignId: string;
}

interface RouteParamsContextData {
  state: RouteParamsState;
  update: (values: Partial<RouteParamsState>) => void;
}

const RouteParamsContext = createContext<RouteParamsContextData>({
  state: {
    team_code: "",
    surveyId: "",
    groupId: "",
    campaignId: "",
  },
  update: () => {},
});

const reducer = (
  state: RouteParamsState,
  values: Partial<RouteParamsState>,
) => ({
  ...state,
  ...values,
});

interface RouteParamsProviderProps {
  children: ReactNode;
}

export const RouteParamsProvider: React.FC<RouteParamsProviderProps> = ({
  children,
}) => {
  const [state, update] = useReducer(reducer, {
    team_code: "Team Name",
    surveyId: "Survey Name",
    groupId: "Group Name",
    campaignId: "Campaign Name",
  });

  return (
    <RouteParamsContext.Provider value={{ state, update }}>
      {children}
    </RouteParamsContext.Provider>
  );
};

export const useRouteParams = () => useContext(RouteParamsContext);
