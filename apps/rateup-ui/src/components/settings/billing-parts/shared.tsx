// Shared helpers for the modules in `./`.
// Extracted verbatim from `billing.tsx`. Behaviour is unchanged.

import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";

/** A payment order row, as the orders endpoint returns it. */
export interface PaymentOrder {
  id: string;
  subscriptionId?: string;
  hasTrial?: boolean;
  subExpiry?: string;
  amount?: number;
  currency?: string;
  createdAt?: string;
  status?: string;
  paymentStatus?: string;
  subscriptionStatus?: string;
  subscriptionChargeAt?: string;
  subscriptionEndedAt?: string;
}

export const OrderStatusBadge = ({ order }: { order: PaymentOrder }) => {
  const { t: translations } = useTranslation();
  let color, statusText;

  switch (order?.status) {
    case "PENDING":
      if (order?.paymentStatus === "SUCCESS") {
        color = "blue";
        statusText = translations("PROCESSING");
      } else if (order?.paymentStatus === "FAILED") {
        color = "red";
        statusText = translations("FAILED");
      } else {
        color = "yellow";
        statusText = order?.status;
      }
      break;
    case "FAILED":
      color = "red";
      statusText = order?.status;
      break;
    default:
      color = "green";
      statusText = order?.status;
  }

  return <Badge style={{ backgroundColor: color }}>{statusText}</Badge>;
};
