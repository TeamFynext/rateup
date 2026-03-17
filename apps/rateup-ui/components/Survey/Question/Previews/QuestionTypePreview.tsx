"use client";

import React from "react";

import { useExtracted } from "next-intl";

import { PageType as Page, QuestionType as Q } from "../../../../types/enums";
import CustomHTML from "../../Page/Previews/CustomHTML";
import ContactForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/ContactForm";
import { CustomNPSForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/CustomNPSForm";
import { DateForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/DateForm";
import { DDMSForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/DDMSForm";
import { DDSSForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/DDSSForm";
import EmailOTPForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/EmailOTPForm";
import { EmailPhoneForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/EmailPhoneForm";
import FileInputForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/FileInputForm";
import { ImageForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/ImageForm";
import { InfoMessage } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/InfoMessageForm";
import { LDForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/LDForm";
import { MCQForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/MCQForm";
import MCQGridForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/MCQGridForm";
import { MSQForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/MSQForm";
import MultiTextInputForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/MultiTextInputForm";
import { NumberForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/NumberForm";
import { OpinionScaleForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/OpinionScaleForm";
import { PCQForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/PCQForm";
import { RatingForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/RatingForm";
import { SmileyForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/SmileyForm";
import { TermsNConditionsForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TermsNConditionsForm";
import { TestimonialForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TestimonialForm";
import { TextAreaForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TextAreaForm";
import { TextForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TextForm";
import WOPForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/WOPForm";
import { YNForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/YNForm";

const QuestionTypePreview = ({
  type,
  choices,
  features,
  tnc,
  wop,
  htmlContent = null,
}) => {
  const translations = useExtracted();
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
      return (
        <MCQGridForm
          features={features}
          previewChoices={choices}
          isPreview={true}
        />
      );
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
