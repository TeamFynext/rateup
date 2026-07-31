import { IconMessageCircle } from "@tabler/icons-react";

const CTABanner = () => {
  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#009987] flex items-center justify-center">
            <IconMessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-lg">
              Ready to generate more support tickets from WhatsApp?
            </h3>
            <p className="text-gray-600">
              Start converting customer conversations into actionable tickets
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="#"
            className="bg-[#009987] hover:bg-[#009987] text-white px-6 py-2 rounded-md font-medium flex items-center justify-center gap-2"
          >
            <IconMessageCircle className="w-4 h-4" />
            Get Started with WhatsApp Integration
          </a>
        </div>
      </div>
    </div>
  );
};

export default CTABanner;
