import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useImmerReducer } from "use-immer";

import { useLinktreeObj } from "../../LinktreeContext/LinktreeContext.tsx";
import { initialState } from "./constants.ts";
import themeReducer from "./ThemeReducer.tsx";

const ThemeContext = createContext(null);
const ThemeDispatchContext = createContext(null);

const SelectedPreviewDeviceContext = createContext("desktop");
const SetSelectPreviewDeviceContext = createContext(null);

const SelectedEditorContext = createContext(null);
const SetSelectedEditorContext = createContext(null);

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
