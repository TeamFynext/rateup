import { createFileRoute } from "@tanstack/react-router";

import { CollectionById } from "@/components/dashboard/testimonial/CollectionById.tsx";

export const Route = createFileRoute("/dashboard/testimonial/$collectionId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CollectionById />;
}
