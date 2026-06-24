import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React from "react";

export const Route = createFileRoute("/dashboard/payment/")({
  component: Payment,
});

function Payment() {
  const navigate = useNavigate();
  navigate({
    to: `/dashboard/settings/billing`,
  });
  return <div></div>;
}
