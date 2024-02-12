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
import { IconCheck, IconX } from "@tabler/icons-react";

export function useGetAllTestimonials(surveyId) {
  return useQuery({
    queryKey: ["allTestimonialBySurvey", surveyId],
    queryFn: () => getAllTestimonialBySurvey(surveyId),
    enabled: !!surveyId,
  });
}

export function useGetAllCollections(surveyId) {
  return useQuery({
    queryKey: ["allTestimonialCollectionsBySurvey", surveyId],
    queryFn: () => getAllTestimonialCollectionBySurvey(surveyId),
    enabled: !!surveyId,
  });
}
export function useGetAllCollectionsByOrg() {
  return useQuery({
    queryKey: ["allTestimonialCollections"],
    queryFn: getAllTestimonialCollections,
  });
}

export function useCreateTestimonialCollection(surveyId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTestimonialCollection,
    onSuccess: (data) => {
      showSuccessToast(
        "Collection created",
        "create-collection",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({
        queryKey: ["allTestimonialCollectionsBySurvey", surveyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["allTestimonialCollections"],
      });
    },
    onError: (error) => {
      showErrorToast("Error creating collection", error.message, <IconX />);
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
      showSuccessToast(
        "Collection updated",
        "update-collection",
        <IconCheck />,
      );
      queryClient.invalidateQueries({
        queryKey: ["alltestimonialsbyCollection", collectionId],
      });
    },
    onError: (error) => {
      showErrorToast("Error updating collection", error.message, <IconX />);
    },
  });
}

export function useDeleteTestimonialsFromCollections(collectionId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTestimonialsFromCollection,
    onSuccess: () => {
      showSuccessToast(
        "Testimonials deleted",
        "update-collection",
        <IconCheck />,
      );
      queryClient.invalidateQueries({
        queryKey: ["alltestimonialsbyCollection", collectionId],
      });
    },
    onError: (error) => {
      showErrorToast("Error deleting collection", error.message, <IconX />);
    },
  });
}
