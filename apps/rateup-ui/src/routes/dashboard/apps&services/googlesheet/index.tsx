"use client";

import { createFileRoute } from "@tanstack/react-router";

import { GoogleSheet } from "@/components/app&services/GoogleSheet.tsx";

export const Route = createFileRoute("/dashboard/apps&services/googlesheet/")({
  component: GoogleSheet,
});
