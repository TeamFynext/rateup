"use client";

import { Image } from "@unpic/react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { imagesPath } from "@/utils/constants.ts";

const WhatsAppTemplate = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left column - Text content */}
          <div>
            <h2 className="text-3xl sm:text-5xl font-bold text-[#009987] mb-4 sm:mb-8">
              Start the conversation <br />
              before your customers do
            </h2>
            <p className="text-gray-600 text-lg px-1 pb-4">
              Emails get ignored and back-and-forth replies waste precious time.
              Take control with WhatsApp templates. Share updates, reminders,
              and key info before your customers ask.
            </p>
            <p className="text-lg text-gray-600">
              Instead of last-minute stress customers will experience timely,
              personalised service, and remember you for it.
            </p>
          </div>

          {/* Right column - WhatsApp template mockup */}
          <div className="shadow-2xl sm:p-8 rounded-3xl">
            <div className="bg-white p-5 rounded-2xl">
              <h3 className="font-semibold text-gray-900 mb-3">
                WhatsApp template
              </h3>

              {/* Header Section with Tabs */}
              <p className="text-sm text-gray-600 mb-1">Header</p>
              <Tabs defaultValue="text" className="mb-4">
                <TabsList
                  className="grid w-full grid-cols-2 p-0 h-auto
                 bg-gray-100 rounded-lg"
                >
                  <TabsTrigger
                    value="text"
                    className="text-sm py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                  >
                    Text
                  </TabsTrigger>
                  <TabsTrigger
                    value="image"
                    className="text-sm py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                  >
                    Image
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Body Section */}
              <p className="text-sm text-gray-600 mb-1">Body</p>
              <div className="bg-gray-100 p-4 rounded-lg text-sm mb-4">
                <p className="mb-2">
                  Hi <span className="text-green-500">{"{Customer Name}"}</span>
                  ,
                </p>
                <p className="mb-2">
                  Your order{" "}
                  <span className="text-green-500">{"{Order Number}"}</span> is
                  on its way. Expected delivery date:{" "}
                  <span className="text-green-500">{"{Date}"}</span>.
                </p>
                <p className="mb-2">
                  If you have any questions, please reply to this message.
                </p>
              </div>

              {/* Preview Section */}
              <div className="bg-gray-100 rounded-lg overflow-hidden mb-2">
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-700">
                      New order received
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-md m-3 overflow-hidden shadow-sm mb-3">
                  <Image
                    src={`${imagesPath}/whatsapp-loyalty/box1.png`}
                    width={300}
                    height={300}
                    alt="Delivery person with package"
                    className="w-full h-32 object-cover"
                  />
                </div>

                <div className="px-3 pb-3 text-xs">
                  <p className="font-medium mb-1">Hi Paul,</p>
                  <p className="mb-1">
                    Your order (#14567) is on its way.
                    <br />
                    Expected delivery date: March 12.
                  </p>
                  <p className="mb-3">
                    If you have any questions, please reply to this message.
                  </p>
                </div>

                <div className="p-2 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-700">New event</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatsAppTemplate;
