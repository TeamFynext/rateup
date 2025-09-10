import React from "react";

import InboxFooter from "@/components/products/Inbox/helpers/InboxFooter";
import InboxHeader from "@/components/products/Inbox/helpers/InboxHeader";
// import InboxPricing from '@/components/products/Inbox/helpers/InboxPricing'
import InboxReview from "@/components/products/Inbox/helpers/InboxReview";
import InboxFaq from "@/components/products/Inbox/shared/InboxFaq";
import { InboxFeatures } from "@/components/products/Inbox/shared/InboxFeatures";
import InboxFeatures2 from "@/components/products/Inbox/shared/InboxFeatures2";
import InboxHero from "@/components/products/Inbox/shared/InboxHero";
import InboxWorks from "@/components/products/Inbox/shared/InboxWorks";
import ClientLogos from "@/components/products/LandingPage/helpers/ClientLogos";
import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection";

function page() {
  return (
    <div className="min-h-screen flex flex-col">
      <InboxHeader />
      <main className="flex-grow">
        <InboxHero />
        <ClientLogos />
        <InboxWorks />
        <InboxFeatures />
        <InboxFeatures2 />
        <InboxReview />
        {/* <InboxPricing/> */}
        <PricingSection />
        <InboxFaq />
      </main>
      <InboxFooter />
    </div>
  );
}

export default page;
