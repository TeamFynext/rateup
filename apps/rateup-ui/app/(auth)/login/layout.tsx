import React from "react";

import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata["/login"];

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
