
import { createFileRoute } from "@tanstack/react-router";

import { pageMetadata } from "@/lib/metadata.ts";
import ContactUsPage from "@/components/HomePage/pages/ContactUs/index.tsx";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";

export const Route = createFileRoute("/(marketing)/contact-us/")({
  component: ContactUs,
  head: () => ({
    meta: [pageMetadata["/contact-us"]],
  }),
});


function ContactUs() {
  return (
    <Layout>
      <ContactUsPage />
      <HomePageFooter />
    </Layout>
  );
}
