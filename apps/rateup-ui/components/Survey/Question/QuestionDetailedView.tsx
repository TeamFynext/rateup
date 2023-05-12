import { useContext } from "react"
import SelectedLanguageContext from "../../../context/SelectedLanguage"

export function QuestionDetailedView({question}) {
  const {selectedLanguage} = useContext(SelectedLanguageContext)
  return(
    <>
    <h2>Detailed view: {question.title[selectedLanguage]}</h2>
    </>
  )
}