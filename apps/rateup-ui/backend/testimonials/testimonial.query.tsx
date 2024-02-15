import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMultipleTestimonialsToCollection,
  createTestimonialCollection,
  deleteMultipleTestimonialsFromCollection,
  deleteTestimonialCollection,
  getAllTestimonialBySurvey,
  getAllTestimonialCollections,
  getAllTestimonialSurveys,
  getAllTestimonials,
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

export function useGetAllTestimonialsByOrg() {
  return useQuery({
    queryKey: ["allTestimonialByOrg"],
    queryFn: getAllTestimonials,
    refetchOnMount: "always",
  });
}

export function useGetAllCollectionsByOrg() {
  return useQuery({
    queryKey: ["allTestimonialCollections"],
    queryFn: getAllTestimonialCollections,
  });
}

export function useCreateTestimonialCollection() {
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
    queryKey: ["allTestimonialsByCollection", collectionId],
    queryFn: () => getAllTestimonialsByCollection(collectionId),
    enabled: !!collectionId,
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
        queryKey: ["allTestimonialsByCollection", collectionId],
      });
    },
    onError: (error) => {
      showErrorToast("Error updating collection", error.message, <IconX />);
    },
  });
}

export function useDeleteTestimonialCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTestimonialCollection,
    onSuccess: () => {
      showSuccessToast(
        "Collection deleted",
        "delete-collection",
        <IconCheck />,
      );
      queryClient.invalidateQueries({
        queryKey: ["allTestimonialCollections"],
      });
    },
    onError: (error) => {
      showErrorToast("Error deleting collection", error.message, <IconX />);
    },
  });
}

export function useGetAllTestimonialSurveys() {
  return useQuery({
    queryKey: ["alltestimonialSurveys"],
    queryFn: getAllTestimonialSurveys,
  });
}

//all the below metioned queries are used for managing multiple testimonials in a collection
export function useAddMultipleTestimonialsToCollection(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testimonialIds: string[]) =>
      addMultipleTestimonialsToCollection(collectionId, testimonialIds),
    onSuccess: () => {
      showSuccessToast("Testimonials added", "add-testimonials", <IconCheck />);
      queryClient.invalidateQueries({
        queryKey: ["allTestimonialsByCollection", collectionId],
      });
    },
    onError: (error) => {
      showErrorToast("Error adding testimonials", error.message, <IconX />);
    },
  });
}

export function useDeleteMultipleTestimonialsFromCollection(
  collectionId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testimonialIds: string[]) =>
      deleteMultipleTestimonialsFromCollection(collectionId, testimonialIds),
    onSuccess: () => {
      showSuccessToast(
        "Testimonials deleted",
        "delete-testimonials",
        <IconCheck />,
      );
      queryClient.invalidateQueries({
        queryKey: ["allTestimonialsByCollection", collectionId],
      });
    },
    onError: (error) => {
      showErrorToast("Error deleting testimonials", error.message, <IconX />);
    },
  });
}
