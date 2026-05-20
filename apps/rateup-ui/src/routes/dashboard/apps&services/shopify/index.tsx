"use client";

import { createFileRoute } from "@tanstack/react-router";

import { Shopify } from "@/components/app&services/Shopify.tsx";

export const Route = createFileRoute("/dashboard/apps&services/shopify/")({
  component: Shopify,
});
