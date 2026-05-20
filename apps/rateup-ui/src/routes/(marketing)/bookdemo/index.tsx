import React from "react";

import { createFileRoute } from "@tanstack/react-router";

import { BookDemoComponent } from "@/components/RateupHomePage/helpers/BookDemoComponent.tsx";

export const Route = createFileRoute("/(marketing)/bookdemo/")({
  component: page,
});

function page() {
  return <BookDemoComponent />;
}
