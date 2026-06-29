import { createContext } from "react";

interface ISelectedLangCtx {
  selectedLanguage: string;
  defaultLanguage: string;
}
const SelectedLanguageContext = createContext<ISelectedLangCtx>({
  selectedLanguage: "",
  defaultLanguage: "",
});

export default SelectedLanguageContext;
