// TanStack Start does not support declarative redirects via config files.
// Use route handlers or redirect() in server functions instead.
// Example: Use a route loader to detect and redirect conditions.

const blogRedirects = [
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
