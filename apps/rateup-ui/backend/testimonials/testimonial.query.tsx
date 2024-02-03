import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTestimonialCollection,
  getAllTestimonialBySurvey,
  getAllTestimonialCollectionBySurvey,
  getAllTestimonialsByCollection,
  getTestimonialSurveys,
} from "./testimonial.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";

export function useTestimonialSurveys() {
  return useQuery({
    queryKey: ["testimonialSurveys"],
    queryFn: getTestimonialSurveys,
  });
}

export function useGetAllTestimonials(surveyId) {
  return useQuery({
    queryKey: ["alltestimonialbysurvey", surveyId],
    queryFn: () => getAllTestimonialBySurvey(surveyId),
    enabled: !!surveyId,
  });
}

export function useGetAllCollections(surveyId) {
  return useQuery({
    queryKey: ["alltestimonialcollectionsbysurvey", surveyId],
    queryFn: () => getAllTestimonialCollectionBySurvey(surveyId),
    enabled: !!surveyId,
  });
}

export function useCreateTestimonialCollection(surveyId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTestimonialCollection,
    onSuccess: () => {
      showSuccessToast("Collection created", "create-collection");
      queryClient.invalidateQueries({
        queryKey: ["alltestimonialcollectionsbysurvey", surveyId],
      });
    },
    onError: (error) => {
      showErrorToast("Error creating collection", error.message);
    },
  });
}

export function useGetAllTestimonialsByCollection(collectionId) {
  return useQuery({
    queryKey: ["alltestimonialsbyCollection", collectionId],
    queryFn: () => getAllTestimonialsByCollection(collectionId),
    enabled: !!collectionId,
    staleTime: Infinity,
  });
}
