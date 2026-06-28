import { createFileRoute } from "@tanstack/react-router";

import AboutUsPage from "@/components/HomePage/pages/AboutUs/index.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

import { aboutUsMarkdown } from "../../../markdown/about-us";
import { createMarkdownMiddleware } from "../../../markdown/serveMarkdown";

export const Route = createFileRoute("/(marketing)/about-us/")({
  server: {
    middleware: createMarkdownMiddleware(aboutUsMarkdown),
  },
  component: AboutUs,
  head: () => buildPageHead("/about-us"),
});

function AboutUs() {
  return (
    <Layout>
      <AboutUsPage />
    </Layout>
  );
}
