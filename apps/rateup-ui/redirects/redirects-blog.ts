import { Redirect } from "next/dist/lib/load-custom-routes";

const blogRedirects: Redirect[] = [
  {
    source:
      "/blog/whatsapp-based-loyalty-programs-the-smartest-way-to-reward-customers-in-2025",
    destination:
      "/blog/whatsapp-based-loyalty-programs-the-smartest-way-to-reward-customers",
    // permanent: true,
    statusCode: 301,
  },
];

export default blogRedirects;
