"use client";

import { createFileRoute } from "@tanstack/react-router";

import { WpAmelia } from "@/components/app&services/WpAmelia.tsx";

export const Route = createFileRoute("/dashboard/apps&services/amelia/")({
  component: WpAmelia,
});
