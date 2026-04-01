import { Redirect } from "next/dist/lib/load-custom-routes";

const pageRedirects: Redirect[] = [
  {
    source: "/shipping-and-delivery",
    destination: "/terms-of-service#shipping-and-delivery",
    permanent: false,
  },
  {
    source: "/cancellation-and-refund",
    destination: "/terms-of-service#cancellation-and-refund",
    permanent: false,
  },
  {
    source: "/blog/about",
    destination: "/blog",
    permanent: true,
  },
];

export default pageRedirects;
