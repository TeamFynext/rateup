import { createContext, useContext, useEffect, useState } from "react";
import { useImmerReducer } from "use-immer";
import surveyThemeReducer from "./surveyThemeReducer";
import { verifyAndConvertSurveyThemeObj } from "./SurveyTheme.utils";
import { useIsFirstRender } from "@mantine/hooks";

const SurveyThemeContext = createContext(null);
const SelectedPageTabContext = createContext(null);

const DispatchContext = createContext(null);

const SelectedEditorContext = createContext("Background");
const SetSelectedEditorContext = createContext(null);

const SelectedPreviewContext = createContext("desktop");
const SetSelectedPreviewContext = createContext(null);

function SurveyThemeContextProvider({ surveyTheme, children }) {
  const isFirstRender = useIsFirstRender();

  const [state, dispatch] = useImmerReducer(surveyThemeReducer, {
    selectedPageTab: "surveyPage",
    surveyTheme: isFirstRender
      ? verifyAndConvertSurveyThemeObj(surveyTheme)
      : surveyTheme,
    selectedEditor: "Background",
    selectedPreview: "desktop",
  });

  const setSelectedEditor = (value) => {
    dispatch({
      type: "selected-editor-change",
      payload: value,
    });
  };

  const setSelectedPreview = (value) => {
    dispatch({
      type: "selected-preview-change",
      payload: value,
    });
  };

  useEffect(() => {
    setSelectedEditor("Background");
  }, [state.selectedPageTab]);

  useEffect(() => {
    if (!isFirstRender)
      dispatch({
        type: "set-survey-theme",
        payload: surveyTheme,
      });
  }, [surveyTheme]);

  return (
    <SurveyThemeContext.Provider value={state.surveyTheme}>
      <SelectedPageTabContext.Provider value={state.selectedPageTab}>
        <DispatchContext.Provider value={dispatch}>
          <SelectedEditorContext.Provider value={state.selectedEditor}>
            <SetSelectedEditorContext.Provider value={setSelectedEditor}>
              <SelectedPreviewContext.Provider value={state.selectedPreview}>
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
