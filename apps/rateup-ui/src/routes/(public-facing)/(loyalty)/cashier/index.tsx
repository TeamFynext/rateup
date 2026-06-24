import { createFileRoute } from "@tanstack/react-router";
import { SessionAuth } from "supertokens-auth-react/recipe/session";

import { CashierPage } from "@/components/loyalty/CashierPage.tsx";

export const Route = createFileRoute("/(public-facing)/(loyalty)/cashier/")({
  component: CashierPortalPage,
});

function CashierPortalPage() {
  return (
    <SessionAuth>
      <CashierPage />
    </SessionAuth>
  );
}
