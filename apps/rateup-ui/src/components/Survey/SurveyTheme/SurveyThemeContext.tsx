"use client";

import { createContext, useContext, useEffect } from "react";

import { useIsFirstRender } from "@mantine/hooks";
import { useImmerReducer } from "use-immer";

import { ThemeTabEnum } from "./SurveyTheme.enums";
import surveyThemeReducer from "./surveyThemeReducer.ts";

const SurveyThemeContext = createContext(null);
const SelectedPageTabContext = createContext(null);

const DispatchContext = createContext(null);

const OpenEditorsContext = createContext([]);
const SetOpenEditorsContext = createContext(null);

const SelectedPreviewContext = createContext("desktop");
const SetSelectedPreviewContext = createContext(null);

const SelectedQuestionContext = createContext<Question>(null);

function SurveyThemeContextProvider({
  surveyTheme,
  children,
  selectedPageTab = ThemeTabEnum.SURVEY,
  editSurveySelectedQuestion = null,
  surveyThemeContextProviderValueRef = null,
}) {
  // console.log({ selectedPageTab, theme: surveyThemeContextProviderValueRef.current})
  const isFirstRender = useIsFirstRender();

  const [state, dispatch] = useImmerReducer(surveyThemeReducer, {
    selectedPageTab,
    surveyTheme,
    openEditors: [],
    selectedPreview: "desktop",
  });

  const setOpenEditors = (value) => {
    dispatch({
      type: "open-editors-change",
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
    setOpenEditors([]);
  }, [state.selectedPageTab]);

  useEffect(() => {
    if (!isFirstRender) {
      dispatch({
        type: "set-survey-theme",
        payload: surveyTheme,
      });
    }
  }, [surveyTheme]);

  useEffect(() => {
    dispatch({
      type: "selected-page-tab-change",
      payload: selectedPageTab,
    });
  }, [selectedPageTab]);

  useEffect(() => {
    if (surveyThemeContextProviderValueRef) {
      surveyThemeContextProviderValueRef["current"] = state.surveyTheme;
    }
  }, [state.surveyTheme]);

  return (
    <SurveyThemeContext.Provider value={state.surveyTheme}>
      <SelectedQuestionContext.Provider value={editSurveySelectedQuestion}>
        <SelectedPageTabContext.Provider value={state.selectedPageTab}>
          <DispatchContext.Provider value={dispatch}>
            <OpenEditorsContext.Provider value={state.openEditors}>
              <SetOpenEditorsContext.Provider value={setOpenEditors}>
                <SelectedPreviewContext.Provider value={state.selectedPreview}>
                  <SetSelectedPreviewContext.Provider
                    value={setSelectedPreview}
                  >
                    {children}
                  </SetSelectedPreviewContext.Provider>
                </SelectedPreviewContext.Provider>
              </SetOpenEditorsContext.Provider>
            </OpenEditorsContext.Provider>
          </DispatchContext.Provider>
        </SelectedPageTabContext.Provider>
      </SelectedQuestionContext.Provider>
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

function useOpenEditors() {
  return useContext(OpenEditorsContext);
}

function useSetOpenEditors() {
  return useContext(SetOpenEditorsContext);
}

function useSelectedPreview() {
  return useContext(SelectedPreviewContext);
}

function useSetSelectedPreview() {
  return useContext(SetSelectedPreviewContext);
}

function useEditSurveySelectedQuestion() {
  return useContext(SelectedQuestionContext);
}

export {
  SurveyThemeContextProvider,
  useEditSurveySelectedQuestion,
  useOpenEditors,
  useSelectedPageTab,
  useSelectedPreview,
  useSetOpenEditors,
  useSetSelectedPreview,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
};
