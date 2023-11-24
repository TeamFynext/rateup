import React from "react";
import { QuestionType as Q } from "../../../../types/enums";
import {
  DateForm,
  EmailForm,
  ImageForm,
  LDForm,
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

const QuestionTypePreview = ({ type }) => {
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
      return <ImageForm />;
    case Q.MCQ:
      return null;
    case Q.MSQ:
      return null;
    case Q.DDSS:
      return null;
    case Q.DDMS:
      return null;
    case Q.Testimonial:
      return <TestimonialForm />;
    case Q.DateTime:
      return <DateForm />;
    default:
      return <div>not implemented</div>;
  }
};

export default QuestionTypePreview;
