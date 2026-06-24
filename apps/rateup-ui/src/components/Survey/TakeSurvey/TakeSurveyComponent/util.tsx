import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";

import { createResponsePublic } from "@/backend/surveys/response/response.api";
import { useGetSurveyVariables } from "@/backend/surveys/surveys.query";
import { PageType, QuestionType as Q, QuestionType, SurveyVariableType } from "@/types/enums.ts";
import { emailPattern } from "@/utils/constants.ts";
import { getContent } from "@/utils/index.ts";

import ContactForm from "./QuestionForms/ContactForm.tsx";
import { CustomNPSForm } from "./QuestionForms/CustomNPSForm.tsx";
import { DateForm } from "./QuestionForms/DateForm.tsx";
import { DDMSForm } from "./QuestionForms/DDMSForm.tsx";
import { DDSSForm } from "./QuestionForms/DDSSForm.tsx";
import EmailOTPForm from "./QuestionForms/EmailOTPForm.tsx";
import { EmailPhoneForm } from "./QuestionForms/EmailPhoneForm.tsx";
import FileInputForm from "./QuestionForms/FileInputForm.tsx";
import { ImageForm } from "./QuestionForms/ImageForm.tsx";
import { LDForm } from "./QuestionForms/LDForm.tsx";
import { MCQForm } from "./QuestionForms/MCQForm.tsx";
import MCQGridForm from "./QuestionForms/MCQGridForm.tsx";
import { MSQForm } from "./QuestionForms/MSQForm.tsx";
import MultiTextInputForm from "./QuestionForms/MultiTextInputForm.tsx";
import { NumberForm } from "./QuestionForms/NumberForm.tsx";
import { OpinionScaleForm } from "./QuestionForms/OpinionScaleForm.tsx";
import { PCQForm } from "./QuestionForms/PCQForm.tsx";
import { RatingForm } from "./QuestionForms/RatingForm.tsx";
import { SmileyForm } from "./QuestionForms/SmileyForm.tsx";
import { TermsNConditionsForm } from "./QuestionForms/TermsNConditionsForm.tsx";
import { TestimonialForm } from "./QuestionForms/TestimonialForm.tsx";
import { TextAreaForm } from "./QuestionForms/TextAreaForm.tsx";
import { TextForm } from "./QuestionForms/TextForm.tsx";
import WOPForm from "./QuestionForms/WOPForm.tsx";
import { YNForm } from "./QuestionForms/YNForm.tsx";

const shouldShowGoogleReview = (question, userResponse) => {
  switch (question.type) {
    case QuestionType.Rating:
      return userResponse.response.Rating >= question.reviewPageOptions.minRating;
    case QuestionType.Opinion:
      return userResponse.response["Opinion Scale"] >= question.reviewPageOptions.minOpinion;
    case QuestionType.Smiley:
      return question.reviewPageOptions.reqOptions.includes(userResponse.response.Smiley);
    default:
      return false;
  }
};

export const checkGoogleReviewForQuestion = (questions, responses) => {
  for (const question of questions) {
    if (question?.reviewPageOptions) {
      const userResponse = responses.find((r) => r?.questionId === question?.id);
      if (userResponse && shouldShowGoogleReview(question, userResponse)) {
        return true;
      }
    }
  }
  return false;
};

const shouldRaiseTicket = (question, userResponse, selectedLanguage) => {
  if (question.ticketIssue.submissionTicket) return true;
  switch (question.type) {
    case QuestionType.Rating:
      return userResponse.response.Rating <= question.ticketIssue.minRating;
    case QuestionType.Opinion:
      return userResponse.response["Opinion Scale"] <= question.ticketIssue.minOpinion;
    case QuestionType.Smiley:
      return question.ticketIssue.reqOptions.includes(userResponse.response.Smiley);
    case QuestionType.CustomNPS:
    case QuestionType.DDMS:
    case QuestionType.DDSS:
    case QuestionType.MCQ:
    case QuestionType.MSQ:
      const response = userResponse.response[userResponse.type];
      let flag = false;
      if (Array.isArray(response)) {
        response.forEach((res) => {
          const index = question.choices[selectedLanguage].findIndex((c) => c.value === res.value);
          flag = question.ticketIssue.reqOptions.includes(index.toString());
          if (flag) return;
        });
      } else {
        const index = question.choices[selectedLanguage].findIndex(
          (c) => c.value === response.value,
        );
        flag = question.ticketIssue.reqOptions.includes(index.toString());
      }
      return flag;
    default:
      return false;
  }
};

export const checkRaiseTicketIssueQuestion = (questions, responses, selectedLanguage) => {
  for (const question of questions) {
    if (question?.ticketIssue) {
      const userResponse = responses.find((r) => r?.questionId === question?.id);
      if (userResponse && shouldRaiseTicket(question, userResponse, selectedLanguage)) {
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
  checkUniqueDevice,
  selectedColumnId,
}) {
  return createResponsePublic({
    surveyTeamMapId,
    responses,
    encryptedResponses,
    language: selectedLanguage,
    location: { coordinates },
    tag: tag || null,
    shouldRaiseTicket,
    checkUniqueDevice,
    selectedColumnId,
  })
    .then(() => {
      // notifications.show({
      //   message: "Survey completed!",
      //   color: "teal",
      // });
      // setIsSavingResponses(false);
    })
    .catch((e) => {
      console.error(e);
      toast.error("Something went wrong while submitting the survey.");
      setIsSavingResponses(false);
      if (e?.response?.data === "ALREADY_RESPONDED") {
        throw new Error("ALREADY_RESPONDED");
      }
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
      return <SmileyForm key={selectedQ?.id} features={selectedQ?.features} />;
    case Q.Photo:
      return <ImageForm key={selectedQ?.id} />;
    case Q.MCQ:
      return <MCQForm key={selectedQ?.id} features={selectedQ?.features} />;
    case Q.MSQ:
      return <MSQForm key={selectedQ?.id} features={selectedQ?.features} />;
    case Q.DDSS:
      return <DDSSForm key={selectedQ?.id} />;
    case Q.DDMS:
      return <DDMSForm key={selectedQ?.id} />;
    case Q.Testimonial:
      return <TestimonialForm key={selectedQ?.id} features={selectedQ?.features} />;
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
      return <TermsNConditionsForm key={selectedQ?.id} tncData={selectedQ?.tnc} />;
    case Q.InfoMessage:
      return <></>;
    case Q.MultiTextInput:
      return <MultiTextInputForm key={selectedQ?.id} features={selectedQ?.features} />;
    case Q.MCQGrid:
      return <MCQGridForm key={selectedQ?.id} features={selectedQ?.features} />;
    case Q.File:
      return <FileInputForm />;
    case Q.EmailOtp:
      return <EmailOTPForm key={selectedQ?.id} />;
    case Q.WOP:
      return <WOPForm wop={selectedQ?.wop} isPreview={false} />;
    default:
      return <div>not implemented</div>;
  }
}

export const validateResponse = (response, selectedQ, selectedLanguage) => {
  let errMsg = "";
  if (!selectedQ.required && !response) return errMsg;
  switch (selectedQ.type) {
    case QuestionType.Contact:
    case QuestionType.Email:
    case QuestionType.Phone:
      if (!selectedQ.required && response) {
        if (response?.phone && !isValidPhoneNumber(response?.phone)) {
          errMsg = "Invalid phone number";
          break;
        }
        if (response?.email && !emailPattern.test(response?.email)) {
          errMsg = "Invalid email";
          break;
        }
      } else {
        if (selectedQ.features?.[selectedLanguage]?.name.isEnabled && !response?.name?.length) {
          errMsg = "Name cannot be blank";
        } else if (
          selectedQ.features?.[selectedLanguage]?.phone.isEnabled &&
          (!response?.phone || !isValidPhoneNumber(response?.phone))
        ) {
          if (!response?.phone) errMsg = "phone number cannot be blank";
          else if (!isValidPhoneNumber(response?.phone)) errMsg = "Enter a valid phone number";
        } else if (
          selectedQ.features?.[selectedLanguage]?.email.isEnabled &&
          (!response?.email?.length || !emailPattern.test(response?.email))
        ) {
          if (!response?.email?.length) errMsg = "Email cannot be blank";
          else if (!emailPattern.test(response?.email)) errMsg = "Enter a valid email";
        }
      }
      break;
    case QuestionType.Testimonial:
      if (!selectedQ.required) break;
      if (
        !response?.name ||
        !response?.testimonial ||
        response?.name?.length < 3 ||
        response?.testimonial?.length < 5
      )
        errMsg = "Name - min 3 characters, and \n testimonial - min 5 characters";
      break;
    case QuestionType.MCQGrid:
      if (!selectedQ.required) break;
      const questions = selectedQ?.features?.[selectedLanguage]?.questions;
      const responsedQuestions = response ? Object.keys(response) : [];
      if (!responsedQuestions.length || !questions.every((q) => responsedQuestions.includes(q)))
        errMsg = "All questions are mandatory";
      break;
    case QuestionType.EmailOtp:
      if (response?.isValid === false) errMsg = "Incorrect OTP";
      break;
    default:
      errMsg = "";
  }
  return errMsg;
};

export const handleInputScrollIntoView = (e) => {
  const domEle = e.currentTarget;
  domEle.style.scrollMarginTop = "40px";
  setTimeout(() => {
    domEle.scrollIntoView({ block: "start" });
  }, 700);
};

export const getPropValueFromQuestionCustomComponent = (
  str,
  componentName = "variable-component",
  prop = "label",
) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, "text/html");
  const labels = [];
  const customComponents = doc.querySelectorAll(componentName);
  if (!customComponents?.length) return null;
  customComponents.forEach((component) => {
    const label = component.getAttribute(prop);
    if (label) {
      labels.push(label);
    }
  });
  return labels;
};

interface IReplaceTitleForVar {
  title: string;
  prop?: string;
  componentName?: string;
  responses?: QuestionResponse[];
  surveyId: string;
  isPublicPage?: boolean;
}

export const getReplacedTitleFromVariable = ({
  title,
  prop = "label",
  componentName = "variable-component",
  responses,
  surveyId,
  isPublicPage,
}: IReplaceTitleForVar) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(title, "text/html");
  const variables = getPropValueFromQuestionCustomComponent(title, componentName, prop);
  if (!variables) return isPublicPage ? title : getContent(title) || title;
  variables.forEach((value) => {
    const component = Array.from(doc.querySelectorAll(componentName)).find(
      (el) => el.getAttribute(prop) === value,
    );
    if (component) {
      const parent = component.parentNode;
      const replacementNode = doc.createTextNode(
        isPublicPage ? getValueFromVariable(value, responses, surveyId) : `{${value}}`,
      );
      parent.replaceChild(replacementNode, component);
    }
  });
  return doc.body.innerHTML;
};

function getValueFromVariable(variable: string, responses: QuestionResponse[], surveyId) {
  const { data: variables } = useGetSurveyVariables(surveyId, true);
  const variableObj = variables && variables?.find((val) => val?.name === variable);
  if (variableObj) {
    if (variableObj.type === SurveyVariableType.CUSTOM) return variableObj.value;
    const response = responses?.find((res) => res?.questionId === variableObj.value);
    return response
      ? getFormattedResponseForVariable(
          response.response?.[response?.type],
          response?.type,
          variable,
        )
      : "";
  }
  return "";
}

function getFormattedResponseForVariable(response, questionType, variable) {
  switch (questionType) {
    case QuestionType.Contact:
      return variable.includes("name")
        ? (response?.name ?? "")
        : variable.includes("phone")
          ? (response?.phone ?? "")
          : variable.includes("email")
            ? (response?.email ?? "")
            : "";
    case QuestionType.Testimonial:
      return variable.includes("name")
        ? (response?.name ?? "")
        : variable.includes("testimonial")
          ? (response?.testimonial ?? "")
          : variable.includes("jobTitle")
            ? (response?.jobTitle ?? "")
            : variable.includes("rating")
              ? (response?.rating ?? "")
              : "";
    case QuestionType.Text:
    case QuestionType.Date:
    case QuestionType.LD:
    case QuestionType.Number:
    case QuestionType.Opinion:
    case QuestionType.YN:
    case QuestionType.Rating:
    case QuestionType.Smiley:
    case QuestionType.TextArea:
    case QuestionType.TnC:
    case QuestionType.WOP:
      return response;
    default:
      return "";
  }
}
export const DEFAULT_WOP = {
  imageSrc: "",
  primaryColor: "#ffffff",
  primaryColoraround: "#000000",
  contrastColor: "#ffffff",
  size: 200,
  segments: ["$200 Gift Card", "$100 Gift Card"],
  segColors: ["#1c518e", "#06ac6e"],
};

const pageTypeStrsWithoutCustomPageStr = Object.values(PageType).filter(
  (str) => str !== PageType.Custom,
);

function getQuestionsArrWithoutPageTypeQuestions(survey) {
  return survey?.questions?.filter((questionObj) => {
    return !pageTypeStrsWithoutCustomPageStr.includes(questionObj?.type);
  });
}

export function getFirstQuestion(survey) {
  const firstQuestion = survey?.questions?.find((questionObj) => {
    return !pageTypeStrsWithoutCustomPageStr.includes(questionObj?.type);
  });
  return firstQuestion;
}

export function getLastQuestion(survey) {
  const questions = survey?.questions;
  if (questions?.length > 0) {
    for (let i = questions.length - 1; i >= 0; i--) {
      const question = questions[i];
      if (!pageTypeStrsWithoutCustomPageStr.includes(question?.type)) {
        return question;
      }
    }
  }
}

export function getQuestionsLength(survey) {
  const questions = getQuestionsArrWithoutPageTypeQuestions(survey);
  if (questions && questions?.length >= 0) {
    return questions.length;
  } else {
    return 0;
  }
}

export function getSelectedQPos(survey, selectedQ) {
  if (survey?.questions && selectedQ) {
    const questions = getQuestionsArrWithoutPageTypeQuestions(survey);
    const selectedQuestionIndex = questions.findIndex((question) => question.id === selectedQ.id);
    return selectedQuestionIndex + 1;
  } else {
    return 1;
  }
}
