import { QuestionType } from "../../../../types/enums";

const shouldShowGoogleReview = (question, userResponse) => {
  switch (question.type) {
    case QuestionType.Rating:
      return userResponse.response.Rating >= question.googleReview.minRating;
    case QuestionType.Opinion:
      return (
        userResponse.response["Opinion Scale"] >=
        question.googleReview.minOpinion
      );
    case QuestionType.Smiley:
      return question.googleReview.reqOptions.includes(
        userResponse.response.Smiley,
      );
    default:
      return false;
  }
};

export const checkGoogleReviewForQuestion = (questions, responses) => {
  for (let question of questions) {
    if (question?.googleReview) {
      let userResponse = responses.find((r) => r?.questionId === question?.id);
      if (userResponse && shouldShowGoogleReview(question, userResponse)) {
        return true;
      }
    }
  }
  return false;
};

const shouldRaiseTicket = (question, userResponse) => {
  switch (question.type) {
    case QuestionType.Rating:
      return userResponse.response.Rating <= question.ticketIssue.minRating;
    case QuestionType.Opinion:
      return (
        userResponse.response["Opinion Scale"] <=
        question.ticketIssue.minOpinion
      );
    case QuestionType.Smiley:
      return question.ticketIssue.reqOptions.includes(
        userResponse.response.Smiley,
      );
    default:
      return false;
  }
};

export const checkRaiseTicketIssueQuestion = (questions, responses) => {
  for (let question of questions) {
    if (question?.ticketIssue) {
      let userResponse = responses.find((r) => r?.questionId === question?.id);
      if (userResponse && shouldRaiseTicket(question, userResponse)) {
        return true;
      }
    }
  }
  return false;
};
