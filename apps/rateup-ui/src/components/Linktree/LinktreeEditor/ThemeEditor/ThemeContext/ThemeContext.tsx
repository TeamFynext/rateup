import { createContext, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useImmerReducer } from "use-immer";

import { useLinktreeObj } from "../../LinktreeContext/LinktreeContext.tsx";
import { initialState } from "./constants.ts";
import type { LinktreeTheme, LinktreeThemeAction } from "./ThemeReducer.tsx";
import themeReducer from "./ThemeReducer.tsx";

// Only read inside `ThemeObjProvider`; the defaults stand in for
// "not yet provided".
const ThemeContext = createContext<LinktreeTheme>({} as LinktreeTheme);
const ThemeDispatchContext = createContext<Dispatch<LinktreeThemeAction>>(() => {});

const SelectedPreviewDeviceContext = createContext("desktop");
const SetSelectPreviewDeviceContext = createContext<Dispatch<SetStateAction<string>>>(() => {});

const SelectedEditorContext = createContext<string>("background");
const SetSelectedEditorContext = createContext<Dispatch<SetStateAction<string>>>(() => {});

function ThemeObjProvider({ children }: { children: ReactNode }) {
  let { theme } = useLinktreeObj();
  if (!theme) theme = initialState;
  const [themeObj, dispatch] = useImmerReducer(themeReducer, theme);
  const [selectedPreviewDevice, setSelectedPreviewDevice] = useState("desktop");
  const [selectedEditor, setSelectedEditor] = useState("background");

  return (
    <ThemeContext.Provider value={themeObj}>
      <ThemeDispatchContext.Provider value={dispatch}>
        <SelectedPreviewDeviceContext.Provider value={selectedPreviewDevice}>
          <SetSelectPreviewDeviceContext.Provider value={setSelectedPreviewDevice}>
            <SelectedEditorContext.Provider value={selectedEditor}>
              <SetSelectedEditorContext.Provider value={setSelectedEditor}>
                {children}
              </SetSelectedEditorContext.Provider>
            </SelectedEditorContext.Provider>
          </SetSelectPreviewDeviceContext.Provider>
        </SelectedPreviewDeviceContext.Provider>
      </ThemeDispatchContext.Provider>
    </ThemeContext.Provider>
  );
}

function useThemeObj() {
  return useContext(ThemeContext);
}

function useThemeDispatch() {
  return useContext(ThemeDispatchContext);
}

function useSelectedPreviewDevice() {
  return useContext(SelectedPreviewDeviceContext);
}

function useSetSelectedPreviewDevice() {
  return useContext(SetSelectPreviewDeviceContext);
}

function useSelectedEditor() {
  return useContext(SelectedEditorContext);
}

function useSetSelectedEditor() {
  return useContext(SetSelectedEditorContext);
}

export {
  ThemeObjProvider,
  useThemeObj,
  useThemeDispatch,
  useSelectedPreviewDevice,
  useSetSelectedPreviewDevice,
  useSetSelectedEditor,
  useSelectedEditor,
};
