import { createFileRoute } from "@tanstack/react-router";

import ContactUsPage from "@/components/HomePage/pages/ContactUs/index.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/contact-us/")({
  component: ContactUs,
  head: () => buildPageHead("/contact-us"),
});

function ContactUs() {
  return (
    <Layout>
      <ContactUsPage />
    </Layout>
  );
}
