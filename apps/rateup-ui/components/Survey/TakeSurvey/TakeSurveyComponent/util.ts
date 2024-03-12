import { isValidPhoneNumber } from "react-phone-number-input";
import { QuestionType } from "../../../../types/enums";
import { emailPattern } from "../../../../utils/constants";

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

export const validateResponse = (
  response,
  selectedQ: Question,
  selectedLanguage,
) => {
  let errMsg = "";
  switch (selectedQ.type) {
    case QuestionType.Contact:
    case QuestionType.Email:
    case QuestionType.Phone:
      if (
        selectedQ.features?.[selectedLanguage]?.name.isEnabled &&
        !response?.name?.length &&
        selectedQ.required
      ) {
        errMsg = "Name cannot be blank";
      } else if (
        selectedQ.features?.[selectedLanguage]?.phone.isEnabled &&
        (!response?.phone ||
          (!isValidPhoneNumber(response?.phone) && selectedQ.required))
      ) {
        if (!response?.phone) errMsg = "phone number cannot be blank";
        else if (!isValidPhoneNumber(response?.phone))
          errMsg = "Enter a valid phone number";
      } else if (
        selectedQ.features?.[selectedLanguage]?.email.isEnabled &&
        (!response?.email?.length || !emailPattern.test(response?.email))
      ) {
        if (!response?.email?.length && selectedQ.required)
          errMsg = "Email cannot be blank";
        else if (!emailPattern.test(response?.email))
          errMsg = "Enter a valid email";
      }
      break;
    case QuestionType.Address:
      const { address1, city, postalCode, country } = response;
      if (selectedQ.required) {
        if (!address1?.length) errMsg = "Address 1 cannot be blank";
        else if (!city?.length) errMsg = "City cannot be blank";
        else if (!postalCode?.length) errMsg = "Postal code cannot be blank";
        else if (postalCode?.length < 5)
          errMsg = "Please enter valid postal code";
        else if (!country?.length) errMsg = "Country cannot be blank";
      }
      break;
    case QuestionType.Testimonial:
      const { name, testimonial } = response;
      if ((selectedQ.required && name?.length < 3) || testimonial?.length < 5)
        errMsg =
          "Name - min 3 characters, and \n testimonial - min 5 characters";
      break;
    default:
      errMsg = "";
  }
  return errMsg;
};
