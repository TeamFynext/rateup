import { QuestionType } from "../types/enums";
import dayjs from "dayjs";

export function getResponse(qId: string, response: SurveyResponse) {
  const qResponse = response.responses.find((r) => r.questionId === qId);
  if (!qResponse) return null;
  const { type } = qResponse;

  if (type === QuestionType.Testimonial) {
    return qResponse.response[type].testimonial;
  } else if (type === "DateTime") {
    const dateTimeValue = qResponse.response.DateTime;
    const date = dayjs(dateTimeValue);

    const formattedDate = date.format("D, MMM YYYY");
    //const formattedTime = date.format("h:mm A");  
   // return `${formattedDate}, ${formattedTime}`;

    return `${formattedDate}`;
  }

  return qResponse.response[type];
}
