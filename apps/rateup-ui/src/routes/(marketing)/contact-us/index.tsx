import { createFileRoute } from "@tanstack/react-router";

import { buildPageHead } from "@/lib/metadata.ts";
import ContactUsPage from "@/components/HomePage/pages/ContactUs/index.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import HomePageFooter from "@/components/RateupHomePage/shared/HomePageFooter";

export const Route = createFileRoute("/(marketing)/contact-us/")({
  component: ContactUs,
  head: () => buildPageHead("/contact-us"),
});

function ContactUs() {
  return (
    <Layout>
      <ContactUsPage />
      <HomePageFooter />
    </Layout>
  );
}
