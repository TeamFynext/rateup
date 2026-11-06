import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

import type { CashierSearch, CashierStep } from "./cashier.search.ts";

/**
 * The cashier's step and customer live in the URL, so a refresh keeps the customer and a
 * staff phone can be deep-linked to `?phone=…&step=purchase`. Shared by the dashboard route
 * and the standalone one, hence the non-strict search and the relative navigation.
 */
export function useCashierNavigation() {
  const search = useSearch({ strict: false }) as CashierSearch;
  const navigate = useNavigate();

  const phone = search.phone ? String(search.phone).replace(/\D/g, "") : undefined;
  const step: CashierStep = search.step ?? (phone ? "customer" : "search");

  const go = useCallback(
    (nextStep: CashierStep, nextPhone?: string | null) => {
      const resolvedPhone = nextPhone === undefined ? phone : (nextPhone ?? undefined);
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          phone: resolvedPhone && resolvedPhone.length > 0 ? resolvedPhone : undefined,
          step: nextStep === "search" ? undefined : nextStep,
        }),
        replace: true,
      });
    },
    [navigate, phone],
  );

  const reset = useCallback(() => go("search", null), [go]);

  return { phone, step, go, reset };
}
