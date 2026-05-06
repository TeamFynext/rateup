export async function GET() {
  return new Response(
    JSON.stringify({
      linkset: [
        {
          anchor: "https://api.rateup.app/api",
          item: [
            {
              href: "https://docs.rateup.app",
              rel: "service-doc",
            },
            {
              href: "https://api.rateup.app/api/health",
              rel: "status",
            },
            {
              href: "https://api.rateup.app/api/campaign",
              rel: "item",
            },
            {
              href: "https://api.rateup.app/api/contact",
              rel: "item",
            },
            {
              href: "https://api.rateup.app/api/dashboard",
              rel: "item",
            },
          ],
        },
      ],
    }),
    {
      headers: {
        "Content-Type": "application/linkset+json",
      },
    },
  );
}
