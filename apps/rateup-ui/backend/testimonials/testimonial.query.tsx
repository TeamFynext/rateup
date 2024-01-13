import { useQuery } from "@tanstack/react-query";
import { getTestimonialSurveys } from "./testimonial.api";

export function useTestimonialSurveys() {
  return useQuery({
    queryKey: ["testimonialSurveys"],
    queryFn: getTestimonialSurveys,
  });
}
