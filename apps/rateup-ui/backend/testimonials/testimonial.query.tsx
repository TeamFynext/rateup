import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTestimonialCollection,
  deleteTestimonialsFromCollection,
  getAllTestimonialBySurvey,
  getAllTestimonialCollectionBySurvey,
  getAllTestimonialCollections,
  getAllTestimonialsByCollection,
  updateTestimonialCollection,
} from "./testimonial.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";

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
export function useGetAllCollectionsByOrg() {
  return useQuery({
    queryKey: ["alltestimonialcollections"],
    queryFn: getAllTestimonialCollections,
  });
}

export function useCreateTestimonialCollection(surveyId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTestimonialCollection,
    onSuccess: (data) => {
      showSuccessToast("Collection created", "create-collection");
      queryClient.invalidateQueries({
        queryKey: ["alltestimonialcollectionsbysurvey", surveyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["alltestimonialcollections"],
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

export function useUpdateCollection(collectionId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTestimonialCollection,
    onSuccess: () => {
      showSuccessToast("Collection updated", "update-collection");
      queryClient.invalidateQueries({
        queryKey: ["alltestimonialsbyCollection", collectionId],
      });
    },
    onError: (error) => {
      showErrorToast("Error updating collection", error.message);
    },
  });
}

export function useDeleteTestimonialsFromCollections(collectionId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTestimonialsFromCollection,
    onSuccess: () => {
      showSuccessToast("Testimonials deleted", "update-collection");
      queryClient.invalidateQueries({
        queryKey: ["alltestimonialsbyCollection", collectionId],
      });
    },
    onError: (error) => {
      showErrorToast("Error deleting collection", error.message);
    },
  });
}
