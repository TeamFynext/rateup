import { features } from "../TicketingConstants.tsx";

const TicketFeatureSection = () => {
  return (
    <section className="relative py-20 px-6 lg:px-10 bg-[#1c518e] overflow-hidden" id="features">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Enterprise-Grade WhatsApp Business Integration
          </h2>
          <p className="mt-4 text-lg sm:text-xl text-gray-200 max-w-3xl mx-auto">
            Transform WhatsApp into your most powerful customer engagement and lead generation
            channel.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {features.map((step, index) => (
            <div
              key={index}
              className="relative group bg-white/10 border border-white/20 rounded-3xl p-8 backdrop-blur-xl transition-all duration-300 hover:ring-2 hover:ring-white/30"
            >
              {/* Floating Icon */}
              <div className="absolute -top-6 left-6">
                <div className="w-16 h-16 rounded-full bg-linear-to-br from-[#e6f0ff] to-[#d0e4ff] border border-white/40 shadow-lg flex items-center justify-center text-[#0041a8]">
                  <step.icon className="w-6 h-6" />
                </div>
              </div>

              {/* Content */}
              <div className="pt-10">
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-base text-gray-200 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Background Gradient Orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-linear-to-br from-white/10 to-transparent rounded-full blur-3xl opacity-30 z-0" />
      <div className="absolute bottom-0 -right-20 w-72 h-72 bg-gradient-to-tr from-[#3b82f6]/30 to-transparent rounded-full blur-2xl opacity-20 z-0" />
    </section>
  );
};

export default TicketFeatureSection;
