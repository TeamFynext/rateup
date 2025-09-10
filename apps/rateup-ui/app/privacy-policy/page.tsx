import { pageMetadata } from "@/lib/metadata";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import Layout from "@/components/RateupHomePage/Layout";

import PrivacyPolicyPage from "../../components/HomePage/pages/PrivacyPolicy";

export const metadata = pageMetadata["/pricing"];

function PrivacyPolicy() {
  return (
    <Layout>
      <PrivacyPolicyPage />
      <HomePageFooter />
    </Layout>
  );
}

export default PrivacyPolicy;
