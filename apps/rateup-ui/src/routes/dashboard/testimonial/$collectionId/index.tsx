import { createFileRoute, redirect } from "@tanstack/react-router";

/** Testimonials moved under Surveys; old links keep working. */
export const Route = createFileRoute("/dashboard/testimonial/$collectionId/")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: "/dashboard/surveys/testimonials/$collectionId",
      params: { collectionId: params.collectionId },
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
