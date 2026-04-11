import { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";
import PrivacyPolicyPage from "@/components/HomePage/pages/PrivacyPolicy";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import Layout from "@/components/RateupHomePage/Layout";

export const metadata: Metadata = pageMetadata["/privacy-policy"];

function PrivacyPolicy() {
  return (
    <Layout>
      <PrivacyPolicyPage />
      <HomePageFooter />
    </Layout>
  );
}

export default PrivacyPolicy;
