import React from "react";
import { QuestionType as Q } from "../../../../types/enums";
import { TextForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TextForm";
import { PhoneForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/PhoneForm";
import { NumberForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/NumberForm";
import { TextAreaForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/TextAreaForm";
import { EmailForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/EmailForm";
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
import TrustedBy from "../../../HomePage/pages/Home/OursolutionsSection/TrustedBy";
import { PCQForm } from "../../TakeSurvey/TakeSurveyComponent/QuestionForms/PCQForm";

const QuestionTypePreview = ({ type, choices, features }) => {
  switch (type) {
    case Q.Text:
      return <TextForm />;
    case Q.Phone:
      return <PhoneForm />;
    case Q.Number:
      return <NumberForm />;
    case Q.TextArea:
      return <TextAreaForm />;
    case Q.Email:
      return <EmailForm />;
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
      return <MCQForm previewChoices={choices} />;
    case Q.MSQ:
      return <MSQForm previewChoices={choices} />;
    case Q.DDSS:
      return <DDSSForm previewChoices={choices} />;
    case Q.DDMS:
      return <DDMSForm previewChoices={choices} />;
    case Q.Testimonial:
      return <TestimonialForm features={features} isPreview={true} />;
    case Q.EmailPhone:
      return <EmailPhoneForm />;
    case Q.DateTime:
      return <DateForm isPreview={true} />;
    case Q.CustomNPS:
      return <CustomNPSForm previewChoices={choices} />;
    case Q.PCQ:
      return <PCQForm previewChoices={choices} />;
    default:
      return <div>not implemented</div>;
  }
};

export default QuestionTypePreview;
