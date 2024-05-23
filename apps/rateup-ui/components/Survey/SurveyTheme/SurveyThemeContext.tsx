import { createContext, useContext, useEffect, useState } from "react";
import { useImmerReducer } from "use-immer";
import surveyThemeReducer from "./surveyThemeReducer";

const SurveyThemeContext = createContext(null);
const SelectedPageTabContext = createContext(null);

const DispatchContext = createContext(null);

const SelectedEditorContext = createContext("Background");
const SetSelectedEditorContext = createContext(null);

const SelectedPreviewContext = createContext("desktop");
const SetSelectedPreviewContext = createContext(null);

function SurveyThemeContextProvider({ surveyTheme, children }) {
  const [state, dispatch] = useImmerReducer(surveyThemeReducer, {
    selectedPageTab: "surveyPage",
    surveyTheme,
  });
  const [selectedEditor, setSelectedEditor] = useState("");
  const [selectedPreview, setSelectedPreview] = useState("desktop");

  useEffect(() => {
    setSelectedEditor("Background");
  }, [state.selectedPageTab]);

  useEffect(() => {
    dispatch({
      type: "set-survey-theme",
      payload: surveyTheme,
    });
  }, [surveyTheme]);

  return (
    <SurveyThemeContext.Provider value={state.surveyTheme}>
      <SelectedPageTabContext.Provider value={state.selectedPageTab}>
        <DispatchContext.Provider value={dispatch}>
          <SelectedEditorContext.Provider value={selectedEditor}>
            <SetSelectedEditorContext.Provider value={setSelectedEditor}>
              <SelectedPreviewContext.Provider value={selectedPreview}>
                <SetSelectedPreviewContext.Provider value={setSelectedPreview}>
                  {children}
                </SetSelectedPreviewContext.Provider>
              </SelectedPreviewContext.Provider>
            </SetSelectedEditorContext.Provider>
          </SelectedEditorContext.Provider>
        </DispatchContext.Provider>
      </SelectedPageTabContext.Provider>
    </SurveyThemeContext.Provider>
  );
}

function useSurveyThemeContextValue() {
  return useContext(SurveyThemeContext);
}

function useSelectedPageTab() {
  return useContext(SelectedPageTabContext);
}

function useSurveyThemeStateDispatch() {
  return useContext(DispatchContext);
}

function useSelectedEditor() {
  return useContext(SelectedEditorContext);
}

function useSetSelectedEditor() {
  return useContext(SetSelectedEditorContext);
}

function useSelectedPreview() {
  return useContext(SelectedPreviewContext);
}

function useSetSelectedPreview() {
  return useContext(SetSelectedPreviewContext);
}

export {
  SurveyThemeContextProvider,
  useSurveyThemeContextValue,
  useSelectedPageTab,
  useSurveyThemeStateDispatch,
  useSelectedEditor,
  useSetSelectedEditor,
  useSelectedPreview,
  useSetSelectedPreview,
};
