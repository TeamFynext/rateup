import { businesses } from "../constants.tsx";

const BusinessTypes = () => {
  return (
    <section id="businesses" className="py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-16 flex flex-col items-center justify-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#009987]">
            Made for Every Kind of Business
          </h2>
          <p className="text-gray-600 max-w-2xl pt-3 mx-auto">
            Whether you're running a store, spa, café, or clinic — RateUp helps
            you turn one-time buyers into loyal fans
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {businesses.map((business, index) => (
            <div
              key={index}
              className="feature-card bg-white p-6 rounded-xl shadow-sm border"
            >
              <div className="mb-4">{business.icon}</div>
              <h3 className="text-xl font-bold mb-2">{business.title}</h3>
              <p className="text-gray-600">{business.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BusinessTypes;
