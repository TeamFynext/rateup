import { createFileRoute } from "@tanstack/react-router";

import { Testimonials } from "@/components/dashboard/testimonial/Testimonials.tsx";

export const Route = createFileRoute("/dashboard/testimonial/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Testimonials />;
}
