import { steps } from "../TicketingConstants";

const StepsSection = () => {
  return (
    <div className="space-y-10">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-5 items-start">
          <div
            className={`w-12 h-12 rounded-full bg-[#1c518e] text-white flex items-center justify-center shrink-0 mt-1`}
          >
            <step.icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1c518e]">
              {step.title}
            </h3>
            <p className="mt-1 text-gray-600">{step.description}</p>
            <div
              className={
                index < steps.length - 1
                  ? "h-8 w-0.5 bg-gray-200 ml-6 mt-4"
                  : ""
              }
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StepsSection;
