// TanStack Start does not support declarative redirects via config files.
// Use route handlers or redirect() in server functions instead.
// Example: Use a route loader to detect and redirect conditions.

const pageRedirects = [
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
