import { createContext, useContext } from "react";

const LandingPageContext = createContext(null);
const LandingPageEditorTabContext = createContext(null);
const LandingPageEditorSetTabContext = createContext(null);

function LandingPageContextProvider({
  landingPageData,
  children,
  activeTab,
  setActiveTab,
}) {
  return (
    <LandingPageContext.Provider value={landingPageData}>
      <LandingPageEditorTabContext.Provider value={activeTab}>
        <LandingPageEditorSetTabContext.Provider value={setActiveTab}>
          {children}
        </LandingPageEditorSetTabContext.Provider>
      </LandingPageEditorTabContext.Provider>
    </LandingPageContext.Provider>
  );
}

function useLandingPageObj() {
  return useContext(LandingPageContext);
}

function useSetLandingPageEditorTab() {
  return useContext(LandingPageEditorSetTabContext);
}

function useLandingPageEditorTab() {
  return useContext(LandingPageEditorTabContext);
}

export {
  LandingPageContextProvider,
  useLandingPageObj,
  useSetLandingPageEditorTab,
  useLandingPageEditorTab,
};
