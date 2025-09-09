import { useCases } from "../TicketingConstants";

const UseCasesSection = () => {
  return (
    <section className="py-20 px-6 lg:px-8 bg-white" id="use-cases">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            More Than Just Ticketing
          </h2>
          <div className="mt-4 h-1 w-24 bg-[#0041a8] mx-auto"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center p-6 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
            >
              <div
                className={`w-14 h-14 ${useCase.color} rounded-lg flex items-center justify-center mb-4`}
              >
                <useCase.icon className="w-7 h-7" />
              </div>
              <h3 className="text-base font-medium text-center">
                {useCase.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCasesSection;
