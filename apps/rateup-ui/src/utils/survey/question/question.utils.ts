import { getPropValueFromQuestionCustomComponent } from "@/components/Survey/TakeSurvey/TakeSurveyComponent/util.tsx";
import { QuestionType, SurveyVariableType } from "@/types/enums.ts";

export function getQuestionLabel(question: Question, selectedLanguage?: string) {
  if (!selectedLanguage) {
    selectedLanguage = Object.keys(question.title)[0];
  }
  return (
    question.title[selectedLanguage] ||
    question.description[selectedLanguage] ||
    question.label[selectedLanguage] ||
    ""
  );
}

export const getFormattedTitleFromVariable = (title, variables) => {
  const variablesInQuestion = getPropValueFromQuestionCustomComponent(title);
  if (!variablesInQuestion) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(title, "text/html");
  variablesInQuestion.forEach((value) => {
    if (variables.map((variable) => variable.name).includes(value)) return;
    const component = Array.from(doc.querySelectorAll("variable-component")).find(
      (el) => el.getAttribute("label") === value,
    );
    if (component) {
      const parent = component.parentNode;
      const replacementNode = doc.createTextNode("");
      parent.replaceChild(replacementNode, component);
    }
  });
  return doc.body.innerHTML;
};

export const getFilteredVariablesForQuestion = (
  variables: SurveyVariable[],
  selectedLanguage: string,
  questions: Question[],
  question: Question,
) => {
  const questionIndex = questions.findIndex((q) => q.id == question.id);
  const previousQuestionIds = questions.slice(0, questionIndex).map((q) => q.id);
  return variables?.filter((val) => {
    if (val?.type === SurveyVariableType.DEFAULT) {
      const questionObj = questions?.find((q) => q?.id == val?.value);
      if (
        questionObj?.required &&
        val?.value !== question?.id &&
        previousQuestionIds.includes(val?.value)
      ) {
        let flag = false;
        switch (questionObj.type) {
          case QuestionType.Contact:
            if (
              (val.name.includes("name") &&
                questionObj?.features?.[selectedLanguage]?.name?.isEnabled) ||
              (val.name.includes("email") &&
                questionObj?.features?.[selectedLanguage]?.email?.isEnabled) ||
              (val.name.includes("phone") &&
                questionObj?.features?.[selectedLanguage]?.phone?.isEnabled)
            )
              flag = true;
            break;
          case QuestionType.Testimonial:
            if (
              (val.name.includes("jobTitle") &&
                questionObj?.features?.[selectedLanguage]?.jobTitle) ||
              (val.name.includes("rating") && questionObj?.features?.[selectedLanguage]?.rating)
            )
              flag = true;
            break;
          default:
            flag = true;
        }
        return flag;
      }
      return false;
    }
    return true;
  });
};
