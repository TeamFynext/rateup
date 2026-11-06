import { createFileRoute, Navigate } from "@tanstack/react-router";

import { useShopSetup } from "@/backend/commerce/shop.query";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/dashboard/commerce/")({
  component: CommerceIndex,
});

/** Lands on the guided setup until the shop is ready, then on the overview. */
function CommerceIndex() {
  const { data: setup, isPending } = useShopSetup();
  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <Spinner />
      </div>
    );
  }
  const incomplete = setup !== undefined && setup.done < setup.total;
  return (
    <Navigate
      to={incomplete ? "/dashboard/commerce/setup" : "/dashboard/commerce/overview"}
      replace
    />
  );
}
