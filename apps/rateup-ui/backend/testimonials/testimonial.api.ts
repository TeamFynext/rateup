import { axiosClient } from "../apiClient";

export async function getTestimonialSurveys() {
  let surveys = (await axiosClient.get("/survey/testimonialSurveys")).data;
  console.log("surveys", surveys);
  return surveys;
}
