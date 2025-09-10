import React from "react";

import { pageMetadata } from "@/lib/metadata";

import Page from "./page";

export const metadata = pageMetadata["/pricing"];
export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
