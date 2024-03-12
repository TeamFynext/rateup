import React from "react";
import { notifications } from "@mantine/notifications";
import { createResponsePublic } from "../../../../backend/surveys/response/response.api";
import { QuestionType, QuestionType as Q } from "../../../../types/enums";
import { TextForm } from "./QuestionForms/TextForm";
import { TextAreaForm } from "./QuestionForms/TextAreaForm";
import { NumberForm } from "./QuestionForms/NumberForm";
import { RatingForm } from "./QuestionForms/RatingForm";
import { LDForm } from "./QuestionForms/LDForm";
import { YNForm } from "./QuestionForms/YNForm";
import { OpinionScaleForm } from "./QuestionForms/OpinionScaleForm";
import { SmileyForm } from "./QuestionForms/SmileyForm";
import { ImageForm } from "./QuestionForms/ImageForm";
import { MCQForm } from "./QuestionForms/MCQForm";
import { MSQForm } from "./QuestionForms/MSQForm";
import { DDSSForm } from "./QuestionForms/DDSSForm";
import { DDMSForm } from "./QuestionForms/DDMSForm";
import { TestimonialForm } from "./QuestionForms/TestimonialForm";
import { EmailPhoneForm } from "./QuestionForms/EmailPhoneForm";
import { DateForm } from "./QuestionForms/DateForm";
import { CustomNPSForm } from "./QuestionForms/CustomNPSForm";
import { PCQForm } from "./QuestionForms/PCQForm";
import ContactForm from "./QuestionForms/ContactForm";
import { TermsNConditionsForm } from "./QuestionForms/TermsNConditionsForm";
import { isValidPhoneNumber } from "react-phone-number-input";
import { emailPattern } from "../../../../utils/constants";
import AddressForm from "./QuestionForms/AddressForm";

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

export function submitSurvey({
  surveyTeamMapId,
  responses,
  selectedLanguage,
  setIsSavingResponses,
  coordinates,
  tag,
  encryptedResponses,
  shouldRaiseTicket,
}) {
  return createResponsePublic({
    surveyTeamMapId,
    responses,
    encryptedResponses,
    language: selectedLanguage,
    location: { coordinates },
    tag: tag || null,
    shouldRaiseTicket,
  })
    .then(() => {
      // notifications.show({
      //   message: "Survey completed!",
      //   color: "teal",
      // });
      //setIsSavingResponses(false);
    })
    .catch((e) => {
      console.error(e);
      notifications.show({
        message: "Something went wrong",
        color: "red",
      });
      setIsSavingResponses(false);
    });
}

export function getQuestionForm(type, selectedQ) {
  switch (type) {
    case Q.Text:
      return <TextForm key={selectedQ?.id} />;
    case Q.TextArea:
      return <TextAreaForm key={selectedQ?.id} />;
    case Q.Number:
      return <NumberForm key={selectedQ?.id} />;
    case Q.Phone:
      return <ContactForm key={selectedQ?.id} features={selectedQ.features} />;
    case Q.Email:
      return <ContactForm key={selectedQ?.id} features={selectedQ.features} />;
    case Q.Rating:
      return <RatingForm key={selectedQ?.id} />;
    case Q.LD:
      return <LDForm key={selectedQ?.id} />;
    case Q.YN:
      return <YNForm key={selectedQ?.id} />;
    case Q.Opinion:
      return <OpinionScaleForm key={selectedQ?.id} />;
    case Q.Smiley:
      return <SmileyForm key={selectedQ?.id} />;
    case Q.Photo:
      return <ImageForm key={selectedQ?.id} />;
    case Q.MCQ:
      return <MCQForm key={selectedQ?.id} />;
    case Q.MSQ:
      return <MSQForm key={selectedQ?.id} />;
    case Q.DDSS:
      return <DDSSForm key={selectedQ?.id} />;
    case Q.DDMS:
      return <DDMSForm key={selectedQ?.id} />;
    case Q.Testimonial:
      return (
        <TestimonialForm key={selectedQ?.id} features={selectedQ?.features} />
      );
    case Q.EmailPhone:
      return <EmailPhoneForm key={selectedQ?.id} />;
    case Q.Date:
      return <DateForm key={selectedQ?.id} />;
    case Q.CustomNPS:
      return <CustomNPSForm key={selectedQ?.id} />;
    case Q.PCQ:
      return <PCQForm key={selectedQ?.id} />;
    case Q.Contact:
      return <ContactForm key={selectedQ?.id} features={selectedQ?.features} />;
    case Q.TnC:
      return (
        <TermsNConditionsForm key={selectedQ?.id} tncData={selectedQ?.tnc} />
      );
    case Q.InfoMessage:
      return <></>;
    case Q.Address:
      return <AddressForm key={selectedQ?.id} />;
    default:
      return <div>not implemented</div>;
  }
}

export const validateResponse = (response, selectedQ, selectedLanguage) => {
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
