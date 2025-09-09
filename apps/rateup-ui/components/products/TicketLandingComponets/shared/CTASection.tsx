import Link from "next/link";

import { BookDemoModal } from "@/components/RateupHomePage/helpers/BookDemoModal";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-24 px-6 lg:px-8 bg-gradient-to-br from-[#00397b] via-[#013553] to-[#1c518e] text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold leading-snug">
          Ready to Power Smarter Ticketing on WhatsApp?
        </h2>
        <p className="pt-5 text-lg md:text-xl opacity-90">
          Join 500+ businesses using RateUp to streamline customer support and
          boost satisfaction — all on WhatsApp.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <BookDemoModal>
            <Button
              size="lg"
              className="bg-white cursor-pointer  text-[#2564ae] hover:bg-gray-100  text-base px-8 py-5 rounded-lg shadow transition"
            >
              Book a Demo
            </Button>
          </BookDemoModal>
          <Link href={"/pricing"}>
            <Button
              size="lg"
              variant="default"
              className="border-white w-full text-[#ffffff] bg-[#1c518e] hover:bg-[#2564ae] font-medium text-base px-8 py-5 rounded-lg transition"
            >
              Get Pricing
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
