import { Testimonial, TestimonialStyleType } from "../../types/global";
import { axiosClient } from "../apiClient";

const TESTIMONIAL_BASE_URL = "/testimonials";
const TESTIMONIAL_COLLECTION_BASE_URL = "/testimonial/collections";

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

type TestiomonialCollection = {
  id: string;
  createdAt: string;
  name: string;
  teamId: string;
  theme: TestimonialStyleType;
  testimonials: Omit<
    Testimonial & { responseId: string },
    "teamId" | "survey"
  >[];
};
export async function getAllTestimonialsByCollection(collectionId: string) {
  let collection = (
    await axiosClient.get(`/testimonial/collections/${collectionId}`)
  ).data;
  console.log("collection", collection);
  return collection as TestiomonialCollection;
}
export async function updateTestimonialCollection({ data, collectionId }) {
  let testimonials = await axiosClient.put(
    `/testimonial/collections/update/${collectionId}`,
    data,
  );
  return testimonials.data;
}

export async function deleteTestimonialCollection(collectionId) {
  return (await axiosClient.delete(`/testimonial/collections/${collectionId}`))
    .data;
}

//all these below listed functions are for managing multiple testimonials in a collection
export async function addMultipleTestimonialsToCollection(
  collection_id: string,
  testimonialIds: string[],
) {
  return await axiosClient.post(
    `${TESTIMONIAL_COLLECTION_BASE_URL}/${collection_id}/testimonials`,
    { testimonialIds },
  );
}

export async function deleteMultipleTestimonialsFromCollection(
  collection_id: string,
  testimonialIds: string[],
) {
  return await axiosClient.delete(
    `${TESTIMONIAL_COLLECTION_BASE_URL}/${collection_id}/testimonials`,
    { data: { testimonialIds } },
  );
}
