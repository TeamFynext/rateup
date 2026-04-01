"use client";

import dynamic from "next/dynamic";

const SupportWidget = dynamic(
  () => import("@/components/app&services/support-widget"),
  { ssr: false },
);
export default function SupportWidgetWrapper() {
  return (
    <SupportWidget
      orgId={process.env.NEXT_PUBLIC_ROOT_ORG}
      token={process.env.NEXT_PUBLIC_ROOT_TOKEN}
    />
  );
}
