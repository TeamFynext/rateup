import { IconArrowRight } from "@tabler/icons-react";
import { Image } from "@unpic/react";

import { BookDemoLink } from "@/components/RateupHomePage/helper/BookDemoLink.tsx";
import { Button } from "@/components/ui/button.tsx";
import { imagesPath } from "@/utils/constants.ts";

const ReviewAiHero = () => {
  return (
    <section className="py-20 px-6 lg:px-8">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-gray-900 leading-tight">
              Turn Happy Customers into{" "}
              <span className="text-[#009987] font-bold">5-Star Google Reviews </span> with AI
            </h1>
            <p className="pt-6 text-md sm:text-xl text-[#374151] max-w-2xl">
              {
                "Effortlessly boost your online reputation, filter feedback intelligently, and improve SEO with RateUp's smart QR codes and AI-powered insights."
              }
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a href={"https://rateup.app/login"}>
                <Button
                  size="lg"
                  className="bg-[#009987] cursor-pointer hover:bg-[#009987] text-[#ffffff] font-medium px-8"
                >
                  Get Started Free
                </Button>
              </a>
              <BookDemoLink>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[#009987] text-[#009987] cursor-pointer hover:bg-[#e6f7ff] group"
                >
                  Learn More
                  <IconArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </BookDemoLink>
            </div>
          </div>
          <div className="hidden lg:flex justify-center">
            <Image
              src={`${imagesPath}/ai-powered-insights/AI Powered Insights.png`}
              width={600}
              height={600}
              alt="ticket hero"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewAiHero;
