import React from "react";
import { QuestionType as Q } from "../../../../types/enums";
import { TextForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TextForm";
import { NumberForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/NumberForm";
import { TextAreaForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TextAreaForm";
import { RatingForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/RatingForm";
import { LDForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/LDForm";
import { YNForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/YNForm";
import { OpinionScaleForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/OpinionScaleForm";
import { SmileyForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/SmileyForm";
import { ImageForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/ImageForm";
import { MCQForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/MCQForm";
import { MSQForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/MSQForm";
import { DDSSForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/DDSSForm";
import { DDMSForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/DDMSForm";
import { TestimonialForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TestimonialForm";
import { EmailPhoneForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/EmailPhoneForm";
import { DateForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/DateForm";
import { CustomNPSForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/CustomNPSForm";
import { PCQForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/PCQForm";
import ContactForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/ContactForm";
import { TermsNConditionsForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TermsNConditionsForm";
import { InfoMessage } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/InfoMessageForm";
import MultiTextInputForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/MultiTextInputForm";
import MCQGridForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/MCQGridForm";
import FileInputForm from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/FileInputForm";

const QuestionTypePreview = ({ type, choices, features, tnc }) => {
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
      return <SmileyForm />;
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
    default:
      return <div>not implemented</div>;
  }
};

export default QuestionTypePreview;
