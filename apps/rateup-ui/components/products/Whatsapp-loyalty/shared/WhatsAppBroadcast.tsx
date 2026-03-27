"use client";

import { ChevronRight } from "lucide-react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";
import { Button } from "@/components/ui/button";

const WhatsAppBroadcast = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left column - WhatsApp broadcast mockup */}
          <div className="shadow-2xl sm:p-8 rounded-3xl">
            <div className="bg-gray-100 p-5 rounded-2xl">
              <h3 className="font-semibold text-gray-900 mb-3">
                New Broadcast
              </h3>

              {/* Sender Section */}
              <p className="text-sm text-gray-700 mb-1">Sender</p>
              <div className="flex items-center bg-white rounded-md p-3 mb-4">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full mr-2 flex items-center justify-center">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-white"
                    >
                      <path
                        d="M20 12L4 4L6 12M20 12L4 20L6 12M20 12H6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-sm">WhatsApp channel</span>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
              </div>

              {/* Message template Section */}
              <p className="text-sm text-gray-700 mb-1">Message template</p>
              <div className="flex items-center bg-white rounded-md p-3 mb-4">
                <span className="text-sm">50% discount winter collection</span>
                <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
              </div>

              {/* Recipients Section */}
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <p className="text-sm text-gray-700">Recipients:</p>
                  <span className="text-sm text-gray-500">124</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  {["Ryan", "James", "Laura", "Joe", "Peterson", "Jessica"].map(
                    (name, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-full px-3 py-1 text-xs flex items-center border border-gray-200"
                      >
                        {name} <span className="ml-1 text-gray-400">×</span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Preview Card */}
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <p className="text-xs font-medium">Don't miss out!</p>
                  </div>
                </div>

                <div className="p-3">
                  <div className="text-xs">
                    <p className="mb-2">
                      <span className="font-medium">Hi {"{Name}"}</span>, for
                      the next 24 hours only, all winter jackets are 50% off!
                    </p>
                    <p className="mb-2">
                      🛍️ Shop the collection now:{" "}
                      <span className="text-green-500">{"{Website Link}"}</span>
                      . Sale ends on{" "}
                      <span className="text-green-500">{"{End Date}"}</span>.
                    </p>
                    <p className="text-green-500 mb-1">{"{Brand Name}"}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 p-2 bg-gray-50 text-right text-xs text-gray-500 italic">
                  11:24 AM
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Text content */}
          <div>
            <div
              className="inline-block bg-gray-100 px-4 py-2 rounded-full text-sm
             text-gray-700 mb-3"
            >
              Customer re-engagement
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 my-4">
              Turn conversations into
              <br />a sales opportunity
            </h2>
            <p className="text-gray-600 text-lg pb-6">
              Low engagement doesn't have to equal lost sales. With WhatsApp
              Broadcasts, you can re-engage customers, keep conversations alive,
              and open the door to upsells.
            </p>
            <BookDemoModal>
              <Button
                size="lg"
                className=" bg-[#009987] hover:bg-[#34605b] text-white rounded-full px-5 py-2 flex items-center"
              >
                Know more about Customer re-engagement
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <ChevronRight className="h-4 w-4 ml-1" />
            </BookDemoModal>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatsAppBroadcast;
