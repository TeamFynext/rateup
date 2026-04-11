import React from "react";

import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection";
import QrCTA from "@/components/products/Qr/helpers/QrCTA";
import QrGrids from "@/components/products/Qr/helpers/QrGrids";
import QrHeader from "@/components/products/Qr/helpers/QrHeader";
import QrItsAsEasy from "@/components/products/Qr/helpers/QrItsAsEasy";
import QrNewFooter from "@/components/products/Qr/helpers/QrNewFooter";
import SuggestionBox from "@/components/products/Qr/helpers/QrSuggestion";
import QrWhyIsStillStuck from "@/components/products/Qr/helpers/QrWhyIsStillStuck";

function page() {
  return (
    <section className="min-h-screen flex flex-col">
      <QrHeader />
      <SuggestionBox />
      <QrWhyIsStillStuck />
      <QrItsAsEasy />
      <QrGrids />
      <PricingSection />
      <QrCTA />
      <QrNewFooter />
    </section>
  );
}

export default page;
