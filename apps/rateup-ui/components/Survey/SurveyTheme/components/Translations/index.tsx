import { useSurveyContext } from "@/context/SurveyObjContext";

import { getSurveyThemeKeyOf } from "../../SurveyTheme.constants";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
} from "../../SurveyThemeContext";

function Translations() {
  const selectedPageTab = useSelectedPageTab();
  const surveyTheme = useSurveyThemeContextValue();
  const { translations = {} } =
    surveyTheme[getSurveyThemeKeyOf(selectedPageTab)];

  const { languages } = useSurveyContext();

  return <h1>translations</h1>;
}

export default Translations;
