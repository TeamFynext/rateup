import { Bot, Rocket, Workflow } from "lucide-react";

export const Surveysteps = [
  {
    number: 1,
    title: "Design Your Flow",
    description:
      "Use our visual drag-and-drop builder to map out your customer journey. Define triggers, actions, and decision points with ease.",
    icon: <Workflow size={36} />,
  },
  {
    number: 2,
    title: "Integrate Smart AI Agents",
    description:
      "Drag and drop pre-built or custom AI agents into your flow. Train them with your business data and set their specific tasks.",
    icon: <Bot size={36} />,
  },
  {
    number: 3,
    title: "Deploy & Optimize",
    description:
      "Go live across your chosen channels (WhatsApp, Web, etc.). Monitor performance, gather insights, and continuously optimize your AI-driven automations.",
    icon: <Rocket size={36} />,
  },
];

export default function AutomationSteps() {
  return (
    <section className="bg-[#F0F9FF] py-24 md:py-32" id="how-it-works">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="max-w-5xl mx-auto text-center mb-24 px-4">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#013553] leading-tight mb-4">
            How RateUp's AI-Enabled Automation Builder Works
          </h2>
          <p className="text-lg text-[#4B5563] max-w-2xl mx-auto">
            Building powerful AI-driven workflows is simple with our intuitive
            no-code platform. Follow these easy steps to get started.
          </p>
        </div>

        {/* Steps */}
        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-16 relative z-10">
            {Surveysteps.map((step, index) => (
              <div
                key={step.number}
                className="relative flex flex-col items-center text-center group max-w-xs px-4 transition-transform hover:-translate-y-1 duration-300"
              >
                {/* Step Circle */}
                <div className="relative z-10 mb-6 transition transform duration-300">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#00397b] to-[#1c518e] text-white flex items-center justify-center shadow-lg">
                    {step.icon}
                  </div>
                </div>

                {/* Connector */}
                {index < Surveysteps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 right-[-100px] w-[100px] h-1 rounded-full bg-[#1c518e]"></div>
                )}

                {/* Title & Description */}
                <h3 className="text-xl font-semibold text-[#013553] mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-base leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
