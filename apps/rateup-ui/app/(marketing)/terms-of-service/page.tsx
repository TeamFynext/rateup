import { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";
import TermsOfServicePage from "@/components/HomePage/pages/TermsOfService";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import Layout from "@/components/RateupHomePage/Layout";

export const metadata: Metadata = pageMetadata["/terms-of-service"];

function TermsOfService() {
  return (
    <Layout>
      <TermsOfServicePage />
      <HomePageFooter />
    </Layout>
  );
}

export default TermsOfService;
