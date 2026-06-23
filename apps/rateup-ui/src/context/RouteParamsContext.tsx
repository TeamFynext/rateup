import type { ReactNode } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";

interface RouteParamsState {
  team_code: string;
  surveyId: string;
  groupId: string;
  campaignId: string;
  collectionId: string;
  shortUrlId: string;
  menuId: string;
  templateId: string;
  dbFlowId: string;
  waAutomatedReplyId: string;
  actionId: string;
  rewardId: string;
  customerId: string; // loyalty customer
  ticketId: string;
}

interface RouteParamsContextData {
  state: RouteParamsState;
  update: (values: Partial<RouteParamsState>) => void;
}

const initialState: RouteParamsState = {
  team_code: "",
  surveyId: "",
  groupId: "",
  campaignId: "",
  collectionId: "",
  shortUrlId: "",
  menuId: "",
  templateId: "",
  dbFlowId: "",
  waAutomatedReplyId: "",
  actionId: "",
  rewardId: "",
  customerId: "",
  ticketId: "",
};

const RouteParamsContext = createContext<RouteParamsContextData>({
  state: initialState,
  update: () => {},
});

const reducer = (
  state: RouteParamsState,
  values: Partial<RouteParamsState>,
): RouteParamsState => ({
  ...state,
  ...values,
});

interface RouteParamsProviderProps {
  children: ReactNode;
}

const RouteParamsProvider: React.FC<RouteParamsProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const update = useCallback((values: Partial<RouteParamsState>) => {
    dispatch(values);
  }, []);

  const value = useMemo(() => ({ state, update }), [state, update]);

  return (
    <RouteParamsContext.Provider value={value}>
      {children}
    </RouteParamsContext.Provider>
  );
};

export const useRouteParams = () => useContext(RouteParamsContext);
