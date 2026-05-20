import { createContext } from "react";

type ISelectedLangCtx = {
  selectedLanguage: string;
  defaultLanguage: string;
};
const SelectedLanguageContext = createContext<ISelectedLangCtx>({
  selectedLanguage: "",
  defaultLanguage: "",
});

export default SelectedLanguageContext;
