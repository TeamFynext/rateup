import { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";
import AboutUsPage from "@/components/HomePage/pages/AboutUs";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import Layout from "@/components/RateupHomePage/Layout";

export const metadata: Metadata = pageMetadata["/about-us"];

function AboutUs() {
  return (
    <Layout>
      <AboutUsPage />
      <HomePageFooter />
    </Layout>
  );
}

export default AboutUs;
