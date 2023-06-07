import { QuestionType } from "../types/enums";

// TODO: Add return type
export function getResponse(qId:string, response: SurveyResponse) {
  const qResponse = response.responses.find(r => r.questionId === qId);
  if (!qResponse) return null;
  const { type } = qResponse;
  if(type === QuestionType.Testimonial) return qResponse.response[type].testimonial;
  return qResponse.response[type];
}