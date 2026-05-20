"use client";

import { createFileRoute } from "@tanstack/react-router";

import { Zapier } from "@/components/app&services/Zapier.tsx";

export const Route = createFileRoute("/dashboard/apps&services/zapier/")({
  component: Zapier,
});
