import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { BookDemoModal } from "@/components/RateupHomePage/helpers/BookDemoModal";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-[#c0e8d4] to-[#e5f8ed]">
      <div className="max-w-5xl mx-auto px-6 lg:px-10 text-center">
        <h2 className="text-3xl md:text-4xl text-gray-900 mb-4">
          <span className="font-bold">
            Grow Repeat Business — Without the Hassle.
          </span>
        </h2>
        <p className="text-lg text-gray-600 py-4  mx-auto">
          Join the businesses turning casual buyers into loyal fans with RateUp.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href={"https://rateup.app/login"}>
            <Button className="py-6 w-full px-6 bg-[#009987] text-base shadow-md hover:shadow-lg transition-transform hover:scale-105">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <BookDemoModal>
            <Button
              size="lg"
              variant="outline"
              className="px-4 py-6 text-base border-gray-300 text-gray-800 hover:bg-gray-50 transition-transform hover:scale-105"
            >
              Book a Demo
            </Button>
          </BookDemoModal>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
