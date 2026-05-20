"use client";

import { createFileRoute } from "@tanstack/react-router";

import { ResponseSubmitted } from "@/components/(public-facing)/ws/$shortId/ResponseSubmitted";

export const Route = createFileRoute(
  "/(public-facing)/ws/$shortId/response-submitted/",
)({
  component: ResponseSubmitted,
});
