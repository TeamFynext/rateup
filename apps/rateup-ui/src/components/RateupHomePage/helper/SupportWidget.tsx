"use client";

import { lazy, Suspense } from "react";

const SupportWidget = lazy(
  () => import("@/components/app&services/support-widget.tsx"),
);
export default function SupportWidgetWrapper() {
  return (
    <Suspense fallback={null}>
      <SupportWidget
        orgId={import.meta.env.VITE_ROOT_ORG || ""}
        token={import.meta.env.VITE_ROOT_TOKEN || ""}
      />
    </Suspense>
  );
}
