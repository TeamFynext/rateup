import { createContext, useContext, useEffect, useRef } from "react";
import type { Dispatch, MutableRefObject, ReactNode } from "react";
import { useImmerReducer } from "use-immer";

import { ThemeTabEnum } from "./SurveyTheme.enums";
import surveyThemeReducer from "./surveyThemeReducer.ts";
import type { SurveyThemeAction, SurveyThemePage, SurveyThemeState } from "./surveyThemeReducer.ts";

function useIsFirstRender(): boolean {
  const renderRef = useRef(true);
  useEffect(() => {
    renderRef.current = false;
  }, []);
  return renderRef.current;
}

// These contexts are only read inside `SurveyThemeContextProvider`, so their
// defaults stand in for "not yet provided" rather than a usable value.
const SurveyThemeContext = createContext<Record<string, SurveyThemePage>>(
  {} as Record<string, SurveyThemePage>,
);
const SelectedPageTabContext = createContext<string>(ThemeTabEnum.SURVEY);

const DispatchContext = createContext<Dispatch<SurveyThemeAction>>(() => {});

const OpenEditorsContext = createContext<string[]>([]);
const SetOpenEditorsContext = createContext<(value: string[]) => void>(() => {});

const SelectedPreviewContext = createContext("desktop");
const SetSelectedPreviewContext = createContext<(value: string) => void>(() => {});

const SelectedQuestionContext = createContext<Question | null>(null);

function SurveyThemeContextProvider({
  surveyTheme,
  children,
  selectedPageTab = ThemeTabEnum.SURVEY,
  editSurveySelectedQuestion = null,
  surveyThemeContextProviderValueRef = null,
}: {
  surveyTheme: Record<string, SurveyThemePage>;
  children: ReactNode;
  selectedPageTab?: ThemeTabEnum;
  editSurveySelectedQuestion?: Question | null;
  surveyThemeContextProviderValueRef?: MutableRefObject<unknown> | null;
}) {
  // console.log({ selectedPageTab, theme: surveyThemeContextProviderValueRef.current})
  const isFirstRender = useIsFirstRender();

  const [state, dispatch] = useImmerReducer<SurveyThemeState, SurveyThemeAction>(
    surveyThemeReducer,
    {
      selectedPageTab,
      surveyTheme,
      openEditors: [],
      selectedPreview: "desktop",
    },
  );

  const setOpenEditors = (value: string[]) => {
    dispatch({
      type: "open-editors-change",
      payload: value,
    });
  };

  const setSelectedPreview = (value: string) => {
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
                  <SetSelectedPreviewContext.Provider value={setSelectedPreview}>
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
