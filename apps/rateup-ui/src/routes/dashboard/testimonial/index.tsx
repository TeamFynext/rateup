import { createFileRoute, redirect } from "@tanstack/react-router";

/** Testimonials moved under Surveys; old links keep working. */
export const Route = createFileRoute("/dashboard/testimonial/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/dashboard/surveys/testimonials",
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
