import { Testimonial } from "../../types/global";
import { axiosClient } from "../apiClient";

export async function getAllTestimonialBySurvey(surveyId: string) {
  let testimonials = await axiosClient.get(`/testimonials/${surveyId}`);
  return testimonials.data;
}

export async function getAllTestimonials() {
  return (await axiosClient.get(`/testimonials/`)).data as Array<Testimonial>;
}

export async function getAllTestimonialSurveys() {
  let surveys = await axiosClient.get(`/testimonials/surveys`);
  return surveys.data;
}

export async function createTestimonialCollection(data) {
  let testimonials = await axiosClient.post(
    `/testimonial/collections/create`,
    data,
  );
  return testimonials.data;
}

export async function getAllTestimonialCollections() {
  let collections = (await axiosClient.get(`/testimonial/collections`)).data;
  return collections;
}

export async function getAllTestimonialsByCollection(collectionId: string) {
  let collection = (
    await axiosClient.get(`/testimonial/collections/${collectionId}`)
  ).data;
  // console.log("collection",collection)
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

export async function deleteTestimonialCollection(collectionId) {
  return (await axiosClient.delete(`/testimonial/collections/${collectionId}`))
    .data;
}
