import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  addMultipleTestimonialsToCollection,
  createTestimonialCollection,
  deleteMultipleTestimonialsFromCollection,
  deleteTestimonialCollection,
  getAllTestimonialBySurvey,
  getAllTestimonialCollections,
  getAllTestimonials,
  getAllTestimonialsByCollection,
  getAllTestimonialSurveys,
  updateTestimonialCollection,
} from "./testimonial.api";

function _useGetAllTestimonials(surveyId) {
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
    onSuccess: (_data) => {
      toast.success("Collection created", {
        id: "create-collection",
      });
      queryClient.invalidateQueries({
        queryKey: ["allTestimonialCollections"],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating collection", {
        id: error.message,
      });
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
      toast.success("Collection updated", {
        id: "update-collection",
      });
      queryClient.invalidateQueries({
        queryKey: ["allTestimonialsByCollection", collectionId],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating collection", {
        id: error.message,
      });
    },
  });
}

export function useDeleteTestimonialCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTestimonialCollection,
    onSuccess: () => {
      toast.success("Collection deleted", {
        id: "delete-collection",
      });
      queryClient.invalidateQueries({
        queryKey: ["allTestimonialCollections"],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting collection", {
        id: error.message,
      });
    },
  });
}

function _useGetAllTestimonialSurveys() {
  return useQuery({
    queryKey: ["alltestimonialSurveys"],
    queryFn: getAllTestimonialSurveys,
  });
}

// all the below metioned queries are used for managing multiple testimonials in a collection
export function useAddMultipleTestimonialsToCollection(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testimonialIds: string[]) =>
      addMultipleTestimonialsToCollection(collectionId, testimonialIds),
    onSuccess: () => {
      toast.success("Testimonials added", {
        id: "add-testimonials",
      });
      queryClient.invalidateQueries({
        queryKey: ["allTestimonialsByCollection", collectionId],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error adding testimonials", {
        id: error.message,
      });
    },
  });
}

export function useDeleteMultipleTestimonialsFromCollection(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testimonialIds: string[]) =>
      deleteMultipleTestimonialsFromCollection(collectionId, testimonialIds),
    onSuccess: () => {
      toast.success("Testimonials deleted", {
        id: "delete-testimonials",
      });
      queryClient.invalidateQueries({
        queryKey: ["allTestimonialsByCollection", collectionId],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting testimonials", {
        id: error.message,
      });
    },
  });
}
