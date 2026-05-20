import { createFileRoute } from "@tanstack/react-router";

import Zoho from "@/components/app&services/Zoho";

export const Route = createFileRoute("/dashboard/apps&services/zoho/")({
  component: Zoho,
});
