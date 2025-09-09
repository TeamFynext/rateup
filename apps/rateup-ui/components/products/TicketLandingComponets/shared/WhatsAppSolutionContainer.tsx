import ChatInterface from "../helpers/ChatInterface";
import CTABanner from "../helpers/CTABanner";
import RecentActivityCard from "../helpers/RecentActivityCard";
import StepsSection from "../helpers/StepsSection";

const WhatsAppSolutionContainer = () => {
  return (
    <section className="py-20 px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16 flex flex-col justify-center items-center ">
          <h2 className="text-3xl md:text-4xl font-bold pb-3 text-[#1c518e]">
            WhatsApp Solution for Lead Generation and Customer Support
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Convert conversations into tickets and leads to drive growth and
            enhance customer experience
          </p>
          <div className="mt-6 h-1 w-24 bg-whatsapp mx-auto"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="order-2 lg:order-1">
            <StepsSection />
          </div>

          <div className="order-1 lg:order-2">
            <ChatInterface />

            <div className="mt-8">
              <RecentActivityCard />
            </div>
          </div>
        </div>

        <div className="mt-16">
          <CTABanner />
        </div>
      </div>
    </section>
  );
};

export default WhatsAppSolutionContainer;
