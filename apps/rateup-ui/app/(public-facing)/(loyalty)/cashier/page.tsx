"use client";

import CashierPage from "@/app/dashboard/loyalty/cashier/page";
import { SessionAuthForNextJS } from "@/components/SuperToken/sessionAuthForNextJS";

export default function CashierPortalPage() {
  return (
    <SessionAuthForNextJS>
      <CashierPage />
    </SessionAuthForNextJS>
  );
}
