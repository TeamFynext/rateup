import { createContext, useContext, useReducer, ReactNode } from 'react';

interface RouteParamsState {
  team_id: string;
  surveyId: string;
}

interface RouteParamsContextData {
  state: RouteParamsState;
  update: (values: Partial<RouteParamsState>) => void;
}

const RouteParamsContext = createContext<RouteParamsContextData>({
  state: {
    team_id: '',
    surveyId: '',
  },
  update: () => {},
});

const reducer = (state: RouteParamsState, values: Partial<RouteParamsState>) => ({
  ...state,
  ...values,
});

interface RouteParamsProviderProps {
  children: ReactNode;
}

export const RouteParamsProvider: React.FC<RouteParamsProviderProps> = ({ children }) => {
  const [state, update] = useReducer(reducer, {
    team_id: 'Team Name',
    surveyId: 'Survey Name',
  });

  return (
    <RouteParamsContext.Provider value={{ state, update }}>
      {children}
    </RouteParamsContext.Provider>
  );
};

export const useRouteParams = () => useContext(RouteParamsContext);
