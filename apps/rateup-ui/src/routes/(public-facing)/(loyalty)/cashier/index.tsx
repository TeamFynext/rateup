import { createFileRoute } from "@tanstack/react-router";
import { SessionAuth } from "supertokens-auth-react/recipe/session";

import { validateCashierSearch } from "@/components/loyalty/cashier/cashier.search.ts";
import { CashierPage } from "@/components/loyalty/cashier/CashierPage.tsx";
import { StandaloneShell } from "@/components/loyalty/cashier/StandaloneShell.tsx";
import { ConfirmProvider } from "@/context/confirm-provider";

/**
 * The staff-device cashier: the same screen as /dashboard/loyalty/cashier without the
 * dashboard around it. Signed in, and gated server-side by the loyalty team feature.
 */
export const Route = createFileRoute("/(public-facing)/(loyalty)/cashier/")({
  validateSearch: validateCashierSearch,
  component: CashierPortalPage,
});

function CashierPortalPage() {
  return (
    <SessionAuth>
      <ConfirmProvider>
        <StandaloneShell>
          <CashierPage standalone />
        </StandaloneShell>
      </ConfirmProvider>
    </SessionAuth>
  );
}
