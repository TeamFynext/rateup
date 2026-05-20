"use client";

import { createFileRoute } from "@tanstack/react-router";

import { PetpoojaIntegration } from "@/components/app&services/PetpoojaIntegration.tsx";

export const Route = createFileRoute("/dashboard/apps&services/petpooja/")({
  component: PetpoojaIntegration,
});
