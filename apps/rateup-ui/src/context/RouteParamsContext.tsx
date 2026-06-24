import { createContext, useContext } from "react";

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

export const useRouteParams = () => useContext(RouteParamsContext);
