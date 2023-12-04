import React from "react";
import { QuestionType as Q } from "../../../../types/enums";
import {
  CustomNPSForm,
  DDMSForm,
  DDSSForm,
  DateForm,
  EmailForm,
  EmailPhoneForm,
  ImageForm,
  LDForm,
  MCQForm,
  MSQForm,
  NumberForm,
  OpinionScaleForm,
  PhoneForm,
  RatingForm,
  SmileyForm,
  TestimonialForm,
  TextAreaForm,
  TextForm,
  YNForm,
} from "../../TakeSurvey/TakeSurveyComponent/QuestionForms";

const QuestionTypePreview = ({ type, choices }) => {
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
      return <TestimonialForm />;
    case Q.EmailPhone:
      return <EmailPhoneForm />;
    case Q.DateTime:
      return <DateForm />;
    case Q.CustomNPS:
      return <CustomNPSForm previewChoices={choices} />;
    default:
      return <div>not implemented</div>;
  }
};

export default QuestionTypePreview;
