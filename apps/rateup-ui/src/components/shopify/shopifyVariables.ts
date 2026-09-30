export const shopifyVariablePresets = [
  { label: "Order Name", value: "name" },
  // { label: "Order Number", value: "order_number" },
  { label: "Customer First Name", value: "customer.first_name" },
  { label: "Customer Last Name", value: "customer.last_name" },
  { label: "Customer Email", value: "customer.email" },
  { label: "Total Price", value: "total_price" },
  { label: "Currency", value: "currency" },
  { label: "Order URL", value: "order_status_url" },
  { label: "Shipping Address City", value: "shipping_address.city" },
  { label: "Billing Address City", value: "billing_address.city" },
  { label: "Financial Status", value: "financial_status" },
  { label: "Fulfillment Status", value: "fulfillment_status" },
  { label: "Order Date", value: "created_at" },
  { label: "Payment Method", value: "payment_gateway_names" },
  { label: "Tracking URL", value: "tracking_url" },
  { label: "Items Fulfilled", value: "items_fulfilled" },
  { label: "Pending Items", value: "pending_items" },
  { label: "Cancellation Reason", value: "cancel_reason" },
  { label: "Draft Order Invoice URL", value: "invoice_url" },
  { label: "Checkout Recovery Link", value: "abandoned_checkout_url" },
  // The code alone, for a URL button approved with the tracked-link base (see VariableMapping).
  { label: "Checkout Recovery Link — button code", value: "recovery_link_code" },
  { label: "Cancellation Date", value: "cancelled_at" },
  { label: "Refund Amount", value: "refund_amount" },
  { label: "Store Credit Amount", value: "store_credit_amount" },
  { label: "Refund Note", value: "note" },
];

export const contactVariablePresets = [
  { label: "Contact Name", value: "contact.name" },
  { label: "Contact Email", value: "contact.email" },
  { label: "Contact Phone", value: "contact.phone" },
];
