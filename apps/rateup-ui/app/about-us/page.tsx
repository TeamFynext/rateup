import { pageMetadata } from "@/lib/metadata";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import Layout from "@/components/RateupHomePage/Layout";

import AboutUsPage from "../../components/HomePage/pages/AboutUs";

export const metadata = pageMetadata["/about-us"];

function AboutUs() {
  return (
    <Layout>
      <AboutUsPage />
      <HomePageFooter />
    </Layout>
  );
}

export default AboutUs;
