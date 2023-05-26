// Any modification to this file should be reflected in the frontend

export enum QuestionType {
  Rating = "Rating",
  Smiley = "Smiley",
  LD = "Like or Dislike",
  YN = "Yes or No",
  Opinion = "Opinion Scale",
  Email = "Email",
  MCQ = "Multiple Choice",
  MSQ = "Multiple Select",
  Phone = "Phone",
  Photo = "Photo",
  Testimonial = "Testimonial",
  Text = "Text",
  DateTime = "DateTime",
}

export enum LDResponse {
  Like = "Like",
  Dislike = "Dislike",
}
export enum YNResponse {
  Yes = "Yes",
  No = "No",
}
export enum SmileyResponse {
  VeryHappy = "Very Happy",
  Happy = "Happy",
  Neutral = "Neutral",
  Sad = "Sad",
  VerySad = "Very Sad",
}
export enum LogicAction {
  NextQ = "NextQ",
  EndSurvey = "EndSurvey",
}