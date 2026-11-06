import { createFileRoute } from "@tanstack/react-router";

import { Testimonials } from "@/components/dashboard/testimonial/Testimonials.tsx";

export const Route = createFileRoute("/dashboard/surveys/testimonials/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Testimonials />;
}
