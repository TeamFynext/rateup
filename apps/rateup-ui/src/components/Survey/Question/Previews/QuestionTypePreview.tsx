import { useTranslation } from "react-i18next";

import { PageType as Page, QuestionType as Q } from "@/types/enums.ts";

import CustomHTML from "../../Page/Previews/CustomHTML.tsx";
import ContactForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/ContactForm.tsx";
import { CustomNPSForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/CustomNPSForm.tsx";
import { DateForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/DateForm.tsx";
import { DDMSForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/DDMSForm.tsx";
import { DDSSForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/DDSSForm.tsx";
import EmailOTPForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/EmailOTPForm.tsx";
import { EmailPhoneForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/EmailPhoneForm.tsx";
import FileInputForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/FileInputForm.tsx";
import { ImageForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/ImageForm.tsx";
import { InfoMessage } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/InfoMessageForm.tsx";
import { LDForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/LDForm.tsx";
import { MCQForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/MCQForm.tsx";
import MCQGridForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/MCQGridForm.tsx";
import { MSQForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/MSQForm.tsx";
import MultiTextInputForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/MultiTextInputForm.tsx";
import { NumberForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/NumberForm.tsx";
import { OpinionScaleForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/OpinionScaleForm.tsx";
import { PCQForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/PCQForm.tsx";
import { RatingForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/RatingForm.tsx";
import { SmileyForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/SmileyForm.tsx";
import { TermsNConditionsForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TermsNConditionsForm.tsx";
import { TestimonialForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TestimonialForm.tsx";
import { TextAreaForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TextAreaForm.tsx";
import { TextForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TextForm.tsx";
import WOPForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/WOPForm.tsx";
import { YNForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/YNForm.tsx";

const QuestionTypePreview = ({ type, choices, features, tnc, wop, htmlContent = null }) => {
  const { t: translations } = useTranslation();
  switch (type) {
    case Q.Text:
      return <TextForm />;
    case Q.Phone:
      return <ContactForm features={features} />;
    case Q.Number:
      return <NumberForm />;
    case Q.TextArea:
      return <TextAreaForm />;
    case Q.Email:
      return <ContactForm features={features} />;
    case Q.Rating:
      return <RatingForm />;
    case Q.LD:
      return <LDForm />;
    case Q.YN:
      return <YNForm />;
    case Q.Opinion:
      return <OpinionScaleForm />;
    case Q.Smiley:
      return <SmileyForm features={features} />;
    case Q.Photo:
      return <ImageForm isPreview={true} />;
    case Q.MCQ:
      return <MCQForm previewChoices={choices} features={features} />;
    case Q.MSQ:
      return <MSQForm previewChoices={choices} features={features} />;
    case Q.DDSS:
      return <DDSSForm previewChoices={choices} />;
    case Q.DDMS:
      return <DDMSForm previewChoices={choices} />;
    case Q.Testimonial:
      return <TestimonialForm features={features} isPreview={true} />;
    case Q.EmailPhone:
      return <EmailPhoneForm />;
    case Q.Date:
      return <DateForm isPreview={true} />;
    case Q.CustomNPS:
      return <CustomNPSForm previewChoices={choices} />;
    case Q.PCQ:
      return <PCQForm previewChoices={choices} />;
    case Q.Contact:
      return <ContactForm features={features} />;
    case Q.InfoMessage:
      return <InfoMessage />;
    case Q.TnC:
      return <TermsNConditionsForm tncData={tnc} />;
    case Q.MultiTextInput:
      return <MultiTextInputForm features={features} />;
    case Q.MCQGrid:
      return <MCQGridForm features={features} previewChoices={choices} isPreview={true} />;
    case Q.File:
      return <FileInputForm isPreview={true} />;
    case Q.EmailOtp:
      return <EmailOTPForm isPreview={true} />;
    case Q.WOP:
      return <WOPForm isPreview={true} wop={wop} />;
    // case Page.Welcome:
    //   return <WOPForm isPreview={true} wop={wop} />;
    // case Page.ThankYou:
    //   return <WOPForm isPreview={true} wop={wop} />;
    case Page.Custom:
      return <CustomHTML content={htmlContent} />;
    default:
      return <div>{translations("not previews")}</div>;
  }
};

export default QuestionTypePreview;
