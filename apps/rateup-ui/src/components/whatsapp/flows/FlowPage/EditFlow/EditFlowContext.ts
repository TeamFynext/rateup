import { createContext } from "react";
import type { Updater } from "use-immer";

import type { WaFlowJson, WaFlowMap } from "@/types/global";

export interface IEditFlowContext {
  flowJson: WaFlowJson;
  updateFlowJson: Updater<WaFlowJson>;

  map: WaFlowMap;
  updateMap: Updater<WaFlowMap>;

  survey: Survey;
  updateSurvey: Updater<Survey>;

  selectedLang: string;
  selectedFormElementId: string;
  setSelectedFormElementId: (id: string) => void;

  selectedScreenId: string;
  setSelectedScreenId: (screenId: string) => void;
  screenNumber: number;
  setScreenNumber: (value: number) => void;
}
/**
 * There is no meaningful default: every consumer renders inside the flow
 * editor's provider, so the empty object stands in for "not yet provided".
 */
export const EditFlowContext = createContext<IEditFlowContext>({} as IEditFlowContext);
