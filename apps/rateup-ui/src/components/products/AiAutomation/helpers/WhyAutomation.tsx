import { IconArrowRight, IconBrain, IconGlobe, IconStack2, IconWand } from "@tabler/icons-react";

const features = [
  {
    icon: IconWand,
    title: "Unmatched Simplicity",
    description:
      "Our no-code builder means anyone can create sophisticated AI workflows, regardless of technical skill. Focus on strategy, not syntax.",
  },
  {
    icon: IconBrain,
    title: "Intelligent & Adaptive",
    description:
      "Beyond basic automation, our AI agents learn, adapt, and personalize interactions, delivering a truly intelligent customer experience.",
  },
  {
    icon: IconStack2,
    title: "Scalable & Versatile",
    description:
      "From small businesses to large enterprises, RateUp scales with your needs and adapts to a wide range of use cases and industries.",
  },
  {
    icon: IconGlobe,
    title: "Seamless Multi-Channel Experience",
    description:
      "Ensure consistent, high-quality interactions across all your customer touchpoints, from web to WhatsApp.",
  },
];

export default function WhyAutomation() {
  return (
    <section id="why-us" className="py-24 px-6 sm:px-10 bg-white">
      <div className="flex flex-col justify-center items-center text-center mb-14">
        <h3 className="text-4xl max-w-5xl sm:text-5xl font-bold text-[#1c518e] mb-4">
          ✨ Why Choose RateUp for Your AI Automation?
        </h3>
        <p className="text-lg text-gray-600 max-w-2xl">
          RateUp isn't just another automation tool. We offer a unique blend of power, simplicity,
          and intelligence designed to give your business a competitive edge.
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 px-4 sm:px-6 lg:px-8">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex items-start p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-300 group"
          >
            <div className="shrink-0 w-14 h-14 mr-6 rounded-full bg-linear-to-br from-[#00397b] to-[#1c518e] text-white flex items-center justify-center shadow-md">
              <feature.icon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[#013553]">{feature.title}</h4>
              <p className="text-gray-600 pt-2 leading-relaxed">{feature.description}</p>
              <a
                href="https://rateup.app/login"
                className="text-[#009987] font-semibold inline-flex items-center mt-4 group"
              >
                Learn More
                <IconArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
