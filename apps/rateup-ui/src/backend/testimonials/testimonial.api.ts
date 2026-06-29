import type { Testimonial, TestimonialStyleType } from "@/types/global";

import { axiosClient } from "../apiClient";

const TESTIMONIAL_BASE_URL = "/testimonials";
const TESTIMONIAL_COLLECTION_BASE_URL = "/testimonial/collections";

export async function getAllTestimonialBySurvey(surveyId: string) {
  const testimonials = await axiosClient.get(`/testimonials/${surveyId}`);
  return testimonials.data;
}

export async function getAllTestimonials() {
  return (await axiosClient.get(TESTIMONIAL_BASE_URL)).data as Array<Testimonial>;
}

export async function getAllTestimonialSurveys() {
  const surveys = await axiosClient.get(`${TESTIMONIAL_BASE_URL}/surveys`);
  return surveys.data;
}

export async function createTestimonialCollection(data) {
  const testimonials = await axiosClient.post(`${TESTIMONIAL_COLLECTION_BASE_URL}/create`, data);
  return testimonials.data;
}

export async function getAllTestimonialCollections() {
  const collections = (await axiosClient.get(TESTIMONIAL_COLLECTION_BASE_URL)).data;
  return collections;
}

interface TestiomonialCollection {
  id: string;
  createdAt: string;
  name: string;
  teamId: string;
  theme: TestimonialStyleType;
  testimonials: Omit<Testimonial & { responseId: string }, "teamId" | "survey">[];
}
export async function getAllTestimonialsByCollection(collectionId: string) {
  const collection = (await axiosClient.get(`/public/testimonials/${collectionId}`)).data;

  return collection as TestiomonialCollection;
}
export async function updateTestimonialCollection({ data, collectionId }) {
  const testimonials = await axiosClient.put(
    `${TESTIMONIAL_COLLECTION_BASE_URL}/update/${collectionId}`,
    data,
  );
  return testimonials.data;
}

export async function deleteTestimonialCollection(collectionId) {
  return (await axiosClient.delete(`${TESTIMONIAL_COLLECTION_BASE_URL}/${collectionId}`)).data;
}

// all these below listed functions are for managing multiple testimonials in a collection
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
