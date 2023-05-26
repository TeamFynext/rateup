// TODO: Add return type
export function getResponse(qId:string, response: SurveyResponse) {
  const qResponse = response.responses.find(r => r.questionId === qId);
  if (!qResponse) return null;
  const { type } = qResponse;
  return qResponse.response[type];
}