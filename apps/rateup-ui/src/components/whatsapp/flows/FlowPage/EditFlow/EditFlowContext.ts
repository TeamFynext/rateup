import { createContext } from "react";
import type { Updater } from "use-immer";

import type { WaFlowJson, WaFlowMap } from "@/types/global";

interface IEditFlowContext {
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
export const EditFlowContext = createContext<IEditFlowContext>({
  flowJson: undefined,
  updateFlowJson: () => {},
  map: undefined,
  updateMap: () => {},
  survey: undefined,
  updateSurvey: () => {},
  selectedLang: "en",
  selectedFormElementId: undefined,
  setSelectedFormElementId: () => {},
  selectedScreenId: undefined,
  setSelectedScreenId: () => {},
  screenNumber: undefined,
  setScreenNumber: () => {},
});
