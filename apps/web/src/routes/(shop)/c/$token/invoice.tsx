import { createFileRoute, redirect } from "@tanstack/react-router";

// The invoice is the PDF the API renders; this address stays for links already shared.
export const Route = createFileRoute("/(shop)/c/$token/invoice")({
  beforeLoad: async ({ params }) => {
    // Imported here: route options land in the client entry, and the API client is axios.
    const { publicInvoiceUrl } = await import("@/backend/commerce/shop.api");
    throw redirect({ href: publicInvoiceUrl(params.token), statusCode: 302 });
  },
});
