import { createFileRoute } from "@tanstack/react-router";

import { RegisterPage } from "@/components/public-facing/loyalty/loyalty/register/RegisterPage.tsx";

export const Route = createFileRoute("/(public-facing)/(loyalty)/loyalty/$orgId/register/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <RegisterPage />;
}
