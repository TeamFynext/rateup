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
        title: "Rateup docs",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});
  // title: {
  //   default: "RateUp Documentation",
  //   template: "RateUp Documentation", // will allow page-specific titles
  // },
  // description: "Welcome to the RateUp documentation",
  // openGraph: {
  //   title: "RateUp Documentation",
  //   description: "Welcome to the RateUp documentation",
  // },
  // icons: {
  //   icon: "/favicon.png",
  // },

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
