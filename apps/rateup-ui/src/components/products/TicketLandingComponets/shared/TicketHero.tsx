import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowRight } from "lucide-react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal.tsx";
import { Button } from "@/components/ui/button.tsx";
import { imagesPath } from "@/utils/constants.ts";

const TicketHero = () => {
  return (
    <section className="py-20 px-6 lg:px-8 bg-gradient-to-b from-white to-[#e6f7ff]">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl  text-[#1f2937] font-semibold leading-tight">
              <span className="text-[#1c518e] font-bold">Transform</span>{" "}
              WhatsApp into Your Complete Support Hub
            </h1>
            <p className="pt-6 text-md sm:text-xl text-[#374151] max-w-2xl">
              Connect with over 2 billion customers where they already are. Our
              official WhatsApp Business API integration turns everyday
              conversations into powerful support experiences.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link to={"https://rateup.app/login"}>
                <Button
                  size="lg"
                  className="bg-[#1c518e] w-full cursor-pointer hover:bg-[#1c518e] text-[#ffffff] font-medium px-8"
                >
                  Start For Free
                </Button>
              </Link>
              <BookDemoModal>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[#1c518e] cursor-pointer text-[#1c518e] hover:bg-[#e6f7ff] group"
                >
                  Book a Demo
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </BookDemoModal>
            </div>
            <div className="mt-10 flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-[#fbbf24] flex items-center justify-center text-[#ffffff] text-xs font-bold">
                  S
                </div>
                <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center text-[#ffffff] text-xs font-bold">
                  M
                </div>
                <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center text-[#ffffff] text-xs font-bold">
                  K
                </div>
                <div className="w-8 h-8 rounded-full bg-[#8b5cf6] flex items-center justify-center text-[#ffffff] text-xs font-bold">
                  R
                </div>
              </div>
              <span className="text-sm text-[#4b5563]">
                Trusted by 500+ businesses worldwide
              </span>
            </div>
          </div>
          <div className="hidden lg:flex justify-center ">
            <Image
              src={`${imagesPath}/ticketing/ticketcover.png`}
              width={600}
              height={600}
              priority
              alt="ticket hero"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default TicketHero;
