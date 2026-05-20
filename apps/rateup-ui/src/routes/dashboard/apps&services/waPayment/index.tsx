"use client";

import { createFileRoute } from "@tanstack/react-router";

import { WhatsappPayment } from "@/components/app&services/WhatsappPayment.tsx";

export const Route = createFileRoute("/dashboard/apps&services/waPayment/")({
  component: WhatsappPayment,
});
