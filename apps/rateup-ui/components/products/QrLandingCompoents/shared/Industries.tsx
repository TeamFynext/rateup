import { industries } from "../QrConstants";

const Industries = () => {
  return (
    <section
      className="bg-gradient-to-br from-gray-50 via-gray-100 to-white py-16 md:py-24"
      id="platform"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center flex flex-col items-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 pb-4">
            Powering Growth Across Industries
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {
              " RateUp is versatile and delivers value whether you're selling products, managing services, or running events."
            }
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {industries.map((industry) => (
            <div
              key={industry.name}
              className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transform transition-all duration-300 ease-in-out hover:scale-105"
            >
              <div className="mx-auto flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-[#0041a8] to-purple-500 text-white mb-6 shadow-lg">
                {industry.icon}
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                {industry.name}
              </h3>
              <p className="text-gray-600 text-sm">{industry.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Industries;
