import { pageMetadata } from "@/lib/metadata";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import Layout from "@/components/RateupHomePage/Layout";

import ContactUsPage from "../../components/HomePage/pages/ContactUs";

export const metadata = pageMetadata["/contact-us"];

function ContactUs() {
  return (
    <Layout>
      <ContactUsPage />
      <HomePageFooter />
    </Layout>
  );
}

export default ContactUs;
