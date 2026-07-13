import { createFileRoute, Outlet } from "@tanstack/react-router";

import { CommerceProvider } from "@/components/dashboard/commerce/CommerceContext";

export const Route = createFileRoute("/dashboard/commerce")({
  component: CommerceLayout,
});

function CommerceLayout() {
  return (
    <CommerceProvider>
      <div className="-m-4 flex min-h-[calc(100dvh)] flex-col bg-muted/40">
        <Outlet />
      </div>
    </CommerceProvider>
  );
}
