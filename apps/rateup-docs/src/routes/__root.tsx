import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

import { RootProvider } from "fumadocs-ui/provider/tanstack";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "RateUp Documentation",
      },
      {
        name: "description",
        content: "Welcome to the RateUp documentation",
      },
      {
        property: "og:title",
        content: "RateUp Documentation",
      },
      {
        property: "og:description",
        content: "Welcome to the RateUp documentation",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon.png",
      },
    ],
  }),
  shellComponent: RootDocument,
});


function RootDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <RootProvider>{children}</RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
