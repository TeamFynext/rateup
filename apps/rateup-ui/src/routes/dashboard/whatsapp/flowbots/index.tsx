import { createFileRoute, redirect } from "@tanstack/react-router";

/** Chatbots moved to their own section; old links land on it, filtered to WhatsApp. */
export const Route = createFileRoute("/dashboard/whatsapp/flowbots/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/chatbots", search: { channel: "whatsapp" }, replace: true });
  },
});
