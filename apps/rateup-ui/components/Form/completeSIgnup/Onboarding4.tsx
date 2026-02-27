import React from "react";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkboxnew";
import { Loader } from "@/components/ui/loader";

function OnboardingStep4({
  data,
  handleBack,
  handleSubmit,
  handleIntegrationToggle,
  setActiveIntegration,
  integrations,
  loading,
}) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/30 mb-3 mx-auto"
        >
          <Zap className="w-6 h-6 text-white" />
        </motion.div>
        <h2 className="text-gray-900 mb-1.5">Connect Your Channels</h2>
        <p className="text-gray-600">
          Link your social media and messaging accounts to get started
        </p>
      </div>

      <div className="space-y-2.5">
        {integrations.map((integration) => (
          <Card
            key={integration.id}
            className={`p-3 border-2 transition-all duration-300 hover:shadow-md ${
              data.integrationsSelected.includes(integration.id)
                ? "border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50 shadow-lg shadow-blue-200/60"
                : "border-gray-200 bg-white hover:border-blue-300"
            }`}
          >
            <div className="flex sm:flex-row flex-col sm:items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={data.integrationsSelected.includes(integration.id)}
                  onCheckedChange={() =>
                    handleIntegrationToggle(integration.id)
                  }
                  className="border-2 border-gray-300"
                />
                <div className="flex items-center space-x-1 sm:space-x-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${integration.color} shadow-md`}
                  >
                    <integration.icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900">{integration.name}</span>
                      <div className="hidden sm:block">
                        {integration.required && (
                          <span className="bg-linear-to-r from-orange-400 to-pink-400 text-white px-2 py-0.5 rounded-full shadow-sm">
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600">{integration.description}</p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveIntegration(integration.id);
                  handleIntegrationToggle(integration.id);
                }}
                size="sm"
                className="border-2 border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-700 bg-white hover:bg-blue-50 shadow-sm"
              >
                Connect
              </Button>
            </div>
          </Card>
        ))}

        <div className="bg-linear-to-r from-green-100 to-emerald-100 border border-green-300/60 rounded-lg p-3 mt-4 shadow-sm backdrop-blur-sm">
          <div className="text-center">
            <Zap className="w-4 h-4 text-green-600 mx-auto mb-2" />
            <p className="text-green-700">No worries if you skip this step!</p>
            <p className="text-gray-700 mt-1">
              You can connect these accounts anytime from your dashboard
              settings
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-5 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center px-4 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex space-x-2">
          <Button
            onClick={handleSubmit}
            className={`flex items-center px-6 py-2 text-white shadow-lg hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? <Loader /> : "Continue"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingStep4;
