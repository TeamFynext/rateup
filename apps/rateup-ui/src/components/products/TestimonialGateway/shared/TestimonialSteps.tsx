import { steps } from "../TestimonialContants.tsx";

const TestimonialSteps = () => {
  return (
    <section className="w-full bg-gray-50 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-800 pb-2">
            Collect testimonials in four simple steps
          </h2>
          <p className="text-gray-600 max-w-3xl ">
            Our streamlined process makes it easy to collect and highlight authentic customer
            feedback
          </p>
        </div>

        <div className="relative flex flex-col md:flex-row justify-between items-center md:items-start mt-12">
          {/* Connector lines - only visible on medium screens and up */}
          <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-[2px] bg-[#0041a8] z-0"></div>

          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center w-full md:w-1/4 mb-10 md:mb-0 relative z-10"
            >
              <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mb-5">
                <div className="text-[#0041a8]">{step.icon}</div>
              </div>

              <h3 className="font-semibold text-xl text-gray-800 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 max-w-[250px] mx-auto">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSteps;
