import { createContext } from "react";

type ISelectedLangCtx = {
  selectedLanguage: string
}
const SelectedLanguageContext = createContext<ISelectedLangCtx>({selectedLanguage: ""})

export default SelectedLanguageContext;