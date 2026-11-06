import { createFileRoute } from "@tanstack/react-router";

import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection.tsx";
import QrCTA from "@/components/products/Qr/helpers/QrCTA.tsx";
import QrGrids from "@/components/products/Qr/helpers/QrGrids.tsx";
import QrHeader from "@/components/products/Qr/helpers/QrHeader.tsx";
import QrItsAsEasy from "@/components/products/Qr/helpers/QrItsAsEasy.tsx";
import QrNewFooter from "@/components/products/Qr/helpers/QrNewFooter.tsx";
import SuggestionBox from "@/components/products/Qr/helpers/QrSuggestion.tsx";
import QrWhyIsStillStuck from "@/components/products/Qr/helpers/QrWhyIsStillStuck.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/products/qr/")({
  component: page,
  head: () => buildPageHead("/products/qr"),
});

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
