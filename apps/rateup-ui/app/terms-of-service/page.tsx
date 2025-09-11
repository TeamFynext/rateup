import { pageMetadata } from "@/lib/metadata";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import Layout from "@/components/RateupHomePage/Layout";

import TermsOfServicePage from "../../components/HomePage/pages/TermsOfService";

export const metadata = pageMetadata["/terms-of-service"];

function TermsOfService() {
  return (
    <Layout>
      <TermsOfServicePage />
      <HomePageFooter />
    </Layout>
  );
}

export default TermsOfService;
