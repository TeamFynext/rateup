import { createContext } from "react";

import type { TFields, TSettings } from "./settings.ts";
import { fields } from "./settings.ts";

export type TSettingsContext = {
  fields: TFields;
  settings: TSettings;
  update: (args: Partial<TSettings>) => void;
  reset: () => void;
};

const defaultSettings: TSettings = {
  isBoardMoreObvious: false,
  isOverElementAutoScrollEnabled: true,
  boardScrollSpeed: "fast",
  columnScrollSpeed: "standard",
  isFPSPanelEnabled: false,
  isCPUBurnEnabled: false,
  isOverflowScrollingEnabled: true,
};

export const SettingsContext = createContext<TSettingsContext>({
  fields,
  settings: defaultSettings,
  update: () => {},
  reset: () => {},
});
