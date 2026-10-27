import { TemplateType } from "@/types/enums.ts";

/** A RateUp-written starter: prefills the editor, then goes through Meta review like any template. */
export interface StarterTemplate {
  type: string;
  name: string;
  description: string;
  category: string;
  body?: string;
  templateType?: TemplateType;
  format?: string;
  header?: string | null;
  footer?: string;
  buttons?: Array<{ text?: string }>;
  example?: string[];
  isBlank?: boolean;
}

const ALL_STARTERS: StarterTemplate[] = [
  {
    type: "Blank",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "Blank Template",
    body: "Create a custom template from scratch.",
    description: "Start with a clean slate and build your own WhatsApp template.",
    isBlank: true,
    category: "MARKETING",
  },
  {
    type: "Payment Confirmed",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_payment_confirmed",
    body: "Payment Confirmed for Order #{{1}}\n\nHello {{2}},\n\nGreat news! We've received your payment for Order #{{3}}.\n\nPayment Details\n\nOrder Number: {{4}}\nAmount Paid: {{5}}\nPayment Method: {{6}}\nPayment Date: {{7}}\n\nYour order is now being prepared for fulfilment.\n\nThank you,\nSupport Team",
    description: "Confirm order payment receipt with transactional details",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "10023", "₹999.00", "UPI", "2026-06-18"],
  },
  {
    type: "Order Created (Promo)",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_received_promo",
    body: "Your Order #{{1}} Has Been Received 🎉\n\nHello {{2}},\n\nThank you for shopping with us!\n\nWe've successfully received your order #{{3}}\n\nOrder Summary\n\nOrder Number: {{4}}\nTotal Amount: {{5}}\nPayment Status: {{6}}\n\nWe'll notify you once your order is processed and ready for shipment.\n\nThank you,\nSupport Team",
    description: "Confirm order receipt and details (Marketing category)",
    category: "MARKETING",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "10023", "₹1,999.00", "Paid"],
  },
  {
    type: "Order Cancelled",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_cancelled",
    body: "Order #{{1}} Has Been Cancelled\n\nHello {{2}},\n\nYour order #{{3}} has been cancelled.\n\nCancellation Details\n\nOrder Number: {{4}}\nCancellation Date: {{5}}\nReason: {{6}}\n\nIf payment has already been received, any applicable refund will be processed according to our refund policy.\n\nThank you,\nSupport Team",
    description: "Notify transaction cancellation and refund terms for order",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "10023", "2026-06-18", "Out of stock"],
  },
  {
    type: "Draft Order Created",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "draft_order_created",
    body: "Your Draft Order Is Ready\n\nHello {{1}},\n\nWe've created a draft order for you.\n\nDraft Order Details\n\nDraft Order Number: {{2}}\nTotal Amount: {{3}}\n\nComplete your purchase using the link below:\n\n{{4}}\n\nThank you,\nSupport Team",
    description: "Provide invoice and link to complete draft order purchase",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["Customer", "DFT-10023", "₹1,499.00", "https://www.example.com/checkout"],
  },
  {
    type: "Order Confirmation",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_received_utility",
    body: "Your Order #{{1}} Has Been Received 🎉\n\nHello {{2}},\n\nThank you for shopping with us!\n\nWe've successfully received your order #{{3}} placed on {{4}}.\n\nOrder Summary\n\nOrder Number: {{5}}\nTotal Amount: {{6}}\nPayment Status: {{7}}\n\nWe'll notify you once your order is processed and ready for shipment.\n\nThank you,\nSupport Team",
    description: "Confirm order receipt and details (Utility category)",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "2026-06-18", "10023", "₹1,999.00", "Pending"],
  },
  {
    type: "Abandoned Cart",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "abandoned_checkout",
    body: "You Left Something Behind 🛒\n\nHello {{1}},\n\nLooks like you left some items in your cart.\n\nCheckout Details\n\nCheckout Number: {{2}}\nCart Value: {{3}}\n\nComplete your purchase before your items go out of stock.\n\nResume Checkout:\n{{4}}\n\nNeed assistance? We're happy to help.\n\nThank you,\nSupport Team",
    description: "Send cart check out reminder link to complete checkout",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["Customer", "CHK-92834", "₹2,500.00", "https://www.example.com/checkout"],
  },
  {
    type: "Order Partially Fulfilled",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_partially_shipped",
    body: "Part of Your Order #{{1}} Has Been Shipped\n\nHello {{2}},\n\nA portion of your order #{{3}} has been fulfilled and shipped.\n\nItems Shipped\n{{4}}\n\nPending Items\n{{5}}\n\nWe'll notify you once the remaining items are shipped.\n\nThank you,\nSupport Team",
    description: "Notify shipment updates for partial order fulfillments",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "1x Face Cream", "1x Sunscreen"],
  },
  {
    type: "Order Shipped",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_shipped",
    body: "Your Order #{{1}} Has Been Shipped 🚚\n\nHello {{2}},\n\nYour order #{{3}} has been fulfilled and shipped.\n\nShipping Details\n\nTracking Number: {{4}}\nCourier: {{5}}\nTracking URL: {{6}}\n\nYou can track your shipment using the details above.\n\nThank you,\nSupport Team",
    description: "Notify shipment fulfillment with courier and tracking url",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "TRK928374", "FedEx", "https://www.example.com/track"],
  },
  {
    type: "Order Returned/Cancelled",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_returned_or_cancelled",
    body: "Fulfilled Order #{{1}} Has Been Cancelled\n\nHello {{2}},\n\nYour previously fulfilled order #{{3}} has been cancelled.\n\nDetails\n\nOrder Number: {{4}}\nCancellation Date: {{5}}\nReason: {{6}}\n\nIf applicable, refund details will be communicated separately.\n\nThank you,\nSupport Team",
    description: "Acknowledge return or cancellation of already fulfilled order",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["10023", "Customer", "10023", "10023", "2026-06-18", "Customer request"],
  },
  {
    type: "Refund Processed",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "order_refund_processed",
    body: "Your Refund Has Been Processed\n\nHello {{1}},\n\nWe've processed a refund of {{2}} {{3}} for your order {{4}}.\n\nIt will be credited back to your original payment method within 5–7 business days.\n\nThank you,\nSupport Team",
    description: "Confirm a refund to the customer's original payment method",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["Customer", "INR", "499.00", "#10023"],
  },
  {
    type: "Store Credit Issued",
    templateType: TemplateType.GENERAL_NOTIFICATION,
    name: "store_credit_issued",
    body: "Store Credit Added to Your Account 💳\n\nHello {{1}},\n\nWe've added {{2}} {{3}} in store credit to your account for order {{4}}.\n\nYou can use it on your next purchase with us.\n\nThank you,\nSupport Team",
    description: "Tell the customer a refund was added to their store credit",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    example: ["Customer", "INR", "499.00", "#10023"],
  },
];

/** The starters, without the blank one: the wizard has its own "Start from scratch" card. */
export const STARTER_TEMPLATES: readonly StarterTemplate[] = ALL_STARTERS.filter(
  (starter) => !starter.isBlank,
);
