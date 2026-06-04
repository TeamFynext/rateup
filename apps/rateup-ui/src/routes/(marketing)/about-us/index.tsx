import { createFileRoute } from "@tanstack/react-router";

import { pageMetadata } from "@/lib/metadata.ts";
import AboutUsPage from "@/components/HomePage/pages/AboutUs/index.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import HomePageFooter from "@/components/RateupHomePage/shared/HomePageFooter";

import { aboutUsMarkdown } from "../../../markdown/about-us";
import { createMarkdownMiddleware } from "../../../markdown/serveMarkdown";

export const Route = createFileRoute("/(marketing)/about-us/")({
  server: {
    middleware: [createMarkdownMiddleware(aboutUsMarkdown)],
  },
  component: AboutUs,
  head: () => ({
    meta: [pageMetadata["/about-us"]],
  }),
});

function AboutUs() {
  return (
    <Layout>
      <AboutUsPage />
      <HomePageFooter />
    </Layout>
  );
}
