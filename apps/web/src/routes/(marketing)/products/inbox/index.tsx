import { createFileRoute } from "@tanstack/react-router";

import InboxFooter from "@/components/products/Inbox/helpers/InboxFooter.tsx";
import InboxHeader from "@/components/products/Inbox/helpers/InboxHeader.tsx";
// import InboxPricing from '@/components/products/Inbox/helpers/InboxPricing'
import InboxReview from "@/components/products/Inbox/helpers/InboxReview.tsx";
import InboxFaq from "@/components/products/Inbox/shared/InboxFaq.tsx";
import { InboxFeatures } from "@/components/products/Inbox/shared/InboxFeatures.tsx";
import InboxFeatures2 from "@/components/products/Inbox/shared/InboxFeatures2.tsx";
import InboxHero from "@/components/products/Inbox/shared/InboxHero.tsx";
import InboxWorks from "@/components/products/Inbox/shared/InboxWorks.tsx";
import ClientLogos from "@/components/products/LandingPage/helpers/ClientLogos.tsx";
import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/products/inbox/")({
  component: page,
  head: () => buildPageHead("/products/inbox"),
});

function page() {
  return (
    <div className="min-h-screen flex flex-col">
      <InboxHeader />
      <main className="grow">
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
