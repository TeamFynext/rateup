import { axiosClient } from "../apiClient";

export async function getTestimonialSurveys() {
  let surveys = (await axiosClient.get("/survey/testimonialSurveys")).data;
  console.log("surveys", surveys);
  return surveys;
}

export async function getAllTestimonialBySurvey(surveyId: string) {
  let testimonials = await axiosClient.get(`/testimonials/${surveyId}`);
  return testimonials.data;
}

export async function createTestimonialCollection(data) {
  let testimonials = await axiosClient.post(
    `/testimonial/collections/create`,
    data,
  );
  return testimonials.data;
}

export async function getAllTestimonialCollectionBySurvey(surveyId: string) {
  let collections = (
    await axiosClient.get(`/testimonial/collections?surveyId=${surveyId}`)
  ).data;
  return collections;
}
export async function getAllTestimonialCollections() {
  let collections = (await axiosClient.get(`/testimonial/collections`)).data;
  return collections;
}

export async function getAllTestimonialsByCollection(collectionId: string) {
  let collection = (
    await axiosClient.get(`/testimonial/collections/${collectionId}`)
  ).data;
  return collection;
}
export async function updateTestimonialCollection({ data, collectionId }) {
  let testimonials = await axiosClient.put(
    `/testimonial/collections/update/${collectionId}`,
    data,
  );
  return testimonials.data;
}
export async function deleteTestimonialsFromCollection({ data, collectionId }) {
  let testimonials = await axiosClient.put(
    `/testimonial/collections/delete-testimonials/${collectionId}`,
    data,
  );
  return testimonials.data;
}
