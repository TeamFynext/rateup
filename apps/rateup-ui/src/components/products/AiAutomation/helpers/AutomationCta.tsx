import React from "react";

import { Link } from "@tanstack/react-router";

export default function AutomationCta() {
  return (
    <section className="py-24 px-6 lg:px-8 bg-[linear-gradient(290deg,#004F98_0%,#001C57_100%)] text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold leading-snug">
          Ready to Revolutionize Your Workflows?
        </h2>
        <p className="pt-5 text-lg md:text-xl opacity-90">
          Experience the power of AI-enabled automation. Get started with RateUp
          today and build smarter, more efficient customer journeys.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to={"https://rateup.app/login"}
            className="bg-white  text-[#075E54] hover:bg-gray-100  
            text-lg px-8 py-4 rounded-lg shadow transition"
          >
            Get Started with RateUp Free
          </Link>
        </div>
      </div>
    </section>
  );
}
