

import { createFileRoute } from "@tanstack/react-router";
import { aboutUsMarkdown } from "../../../markdown/about-us";
import { createMarkdownMiddleware } from "../../../markdown/serveMarkdown";

import { pageMetadata } from "@/lib/metadata.ts";
import AboutUsPage from "@/components/HomePage/pages/AboutUs/index.tsx";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";


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
