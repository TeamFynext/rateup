import { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";
import ContactUsPage from "@/components/HomePage/pages/ContactUs";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import Layout from "@/components/RateupHomePage/Layout";

export const metadata: Metadata = pageMetadata["/contact-us"];

function ContactUs() {
  return (
    <Layout>
      <ContactUsPage />
      <HomePageFooter />
    </Layout>
  );
}

export default ContactUs;
