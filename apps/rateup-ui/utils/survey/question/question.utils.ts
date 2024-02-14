export function getQuestionLabel(
  question: Question,
  selectedLanguage?: string,
) {
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
