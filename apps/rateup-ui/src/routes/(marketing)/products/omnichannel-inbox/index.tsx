import { createFileRoute } from "@tanstack/react-router";

import Comparison from "@/components/products/OmnichannelInbox/Comparison";
import CTABand from "@/components/products/OmnichannelInbox/CTABand";
import Features from "@/components/products/OmnichannelInbox/Features";
import Hero from "@/components/products/OmnichannelInbox/Hero";
import HowItWorks from "@/components/products/OmnichannelInbox/HowItWorks";
import Integrations from "@/components/products/OmnichannelInbox/Integrations";
import Problem from "@/components/products/OmnichannelInbox/Problem";
import ProductIntro from "@/components/products/OmnichannelInbox/ProductIntro";
import SocialProof from "@/components/products/OmnichannelInbox/SocialProof";
import UseCases from "@/components/products/OmnichannelInbox/UseCases";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import styles from "@/styles/commonCssModules/homepagecss.module.css";

export const Route = createFileRoute(
  "/(marketing)/products/omnichannel-inbox/",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const openAccess = () => {};

  return (
    <Layout contentClassName={styles.themeOmnichannel}>
      <Hero onAccess={openAccess} />
      <SocialProof />
      <Problem />
      <ProductIntro />
      <Features />
      <Integrations />
      <HowItWorks />
      <UseCases />
      <Comparison />
      <CTABand onAccess={openAccess} />
    </Layout>
  );
}
