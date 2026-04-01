import { imagesPath } from "@/utils/constants";

import AppStoreButtons from "../components/btn";

export function FeaturesGrid() {
  const features = [
    {
      title: "WhatsApp AI Chatbot",
      description:
        "Train and deploy your chatbot. Handles FAQs, order queries, and feedback 24/7 in multiple languages. Escalates to a human when it matters.",
      image: `${imagesPath}/landing/grid/grid1.png`,
    },
    {
      title: "CX & Feedback Analytics",
      description:
        "AI-powered surveys and feedback with sentiment analysis, web status updates, NPS, and trust scores. Identify where experience breaks.",
      image: `${imagesPath}/landing/grid/grid2.png`,
    },
    {
      title: "Campaign Management",
      description:
        "Bulk WhatsApp messaging and personalized campaigns. Time-based, milestone-based, and drip triggers. Re-engage customers at the right moment.",
      image: `${imagesPath}/landing/grid/grid3.png`,
    },
    {
      title: "Ticketing & Escalation",
      description:
        "Convert chats into structured tickets. Auto-assign to the right team member or department. Resolve issues faster with full visibility.",
      image: `${imagesPath}/landing/grid/grid4.png`,
    },
    {
      title: "QR Studio",
      description:
        "Turn notices, posters, tables, and packaging into digital touchpoints. QR codes that trigger feedback flows, loyalty sign-ups, or offers.",
      image: `${imagesPath}/landing/grid/grid5.png`,
    },
    {
      title: "Your Analytics & Reports, on the go",
      description:
        "Manage your inbox, view live dashboards, track loyalty performance, and receive escalation alerts — from any device, in any time zone. Full platform power on iOS and Android.",
      image: `${imagesPath}/landing/grid/grid6.png`,
    },
  ];

  return (
    <section className="py-12" id="features">
      <div className="w-full px-8 xl:px-0 xl:max-w-6xl xl:mx-auto xl:w-[calc(100%-4rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative flex flex-col rounded-[2rem] border border-white/10 bg-[#000A1F] overflow-hidden hover:border-rateup-blue/30 transition-all duration-300"
            >
              {/* Card top - Image area */}
              <div className="rounded-t-[2rem] overflow-hidden translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-full object-cover rounded-t-[2rem]"
                />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-rateup-dark-blue-3 to-transparent pointer-events-none z-10" />
              </div>

              {/* Card bottom - Text content */}
              <div className="p-8 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>

                {index === 5 && <AppStoreButtons />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
