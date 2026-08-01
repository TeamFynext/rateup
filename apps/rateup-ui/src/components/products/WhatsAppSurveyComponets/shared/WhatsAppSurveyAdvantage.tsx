import { IconBell, IconChartBar, IconClock, IconLink } from "@tabler/icons-react";

export default function WhatsAppSurveyAdvantage() {
  return (
    <section className="bg-white py-14 px-4">
      <div className="max-w-6xl flex flex-col items-center mx-auto text-center">
        <h2 className="text-4xl font-semibold text-[#009987]">The RateUp Advantage</h2>
        <p className="pt-3 text-gray-600 text-lg max-w-2xl mx-auto">
          Experience the difference with features designed for maximum impact and minimum effort.
        </p>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Card 1 */}
          <div className="bg-blue-50 p-6 rounded-2xl shadow-md hover:shadow-lg transition duration-300 flex flex-col items-center text-center">
            <IconChartBar className="text-[#009987] w-10 h-10 mb-4" />
            <p className="text-3xl font-bold text-[#009987]">35%</p>
            <p className="text-gray-700 mt-2">Increase in Feedback Response Rates</p>
          </div>

          {/* Card 2 */}
          <div className="bg-blue-50 p-6 rounded-2xl shadow-md hover:shadow-lg transition duration-300 flex flex-col items-center text-center">
            <IconClock className="text-[#009987] w-10 h-10 mb-4" />
            <p className="text-3xl font-bold text-[#009987]">24/7</p>
            <p className="text-gray-700 mt-2">Automated Feedback Collection & Analysis</p>
          </div>

          {/* Card 3 */}
          <div className="bg-blue-50 p-6 rounded-2xl shadow-md hover:shadow-lg transition duration-300 flex flex-col items-center text-center">
            <IconBell className="text-[#009987] w-10 h-10 mb-4" />
            <p className="text-lg font-semibold text-gray-800">Real-Time Alerts</p>
            <p className="text-gray-700">for Urgent Issues</p>
          </div>

          {/* Card 4 */}
          <div className="bg-blue-50 p-6 rounded-2xl shadow-md hover:shadow-lg transition duration-300 flex flex-col items-center text-center">
            <IconLink className="text-[#009987] w-10 h-10 mb-4" />
            <p className="text-lg font-semibold text-gray-800">Seamless Integration</p>
            <p className="text-gray-700">CRM/Billing Systems</p>
          </div>
        </div>
      </div>
    </section>
  );
}
