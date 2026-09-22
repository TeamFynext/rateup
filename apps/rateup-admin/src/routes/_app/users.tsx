import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/users")({
  validateSearch: z.object({ q: z.string().optional() }),
  component: () => <ComingSoon title="Users" description="Every user across all organisations." />,
});
