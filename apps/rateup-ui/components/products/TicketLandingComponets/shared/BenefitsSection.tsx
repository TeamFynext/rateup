import { benefits } from "../TicketingConstants";

const BenefitsSection = () => {
  return (
    <section className="py-20 px-6 lg:px-8 bg-blue-50" id="benefits">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16 flex flex-col items-center">
          <h2 className="text-3xl md:text-4xl max-w-5xl font-bold text-[#013553]">
            From understanding your business goals to delivering real results,
            RateUp is built for your success.
          </h2>
          <div className="mt-4 h-1 w-24 bg-[#1c518e] rounded-full" />
        </div>

        {/* Benefit Cards */}
        <div className="grid grid-cols-1  md:grid-cols-2 lg:grid-cols-3 gap-10">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-12 h-12 flex items-center justify-center rounded-md bg-[#e6f0ff] mb-5 shadow-sm group-hover:scale-110 transition-transform duration-300">
                <benefit.icon className="w-6 h-6 text-[#1c518e]" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-[#013553] mb-2">
                {benefit.title}
              </h3>

              {/* Description */}
              <p className="text-base text-[#1c518e] leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
