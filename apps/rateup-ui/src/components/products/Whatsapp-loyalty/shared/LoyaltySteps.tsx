"use client";

import { Image } from "@unpic/react";
import { CheckCircle } from "lucide-react";
import { easeOut, motion } from "motion/react";

import { steps } from "../constants.tsx";

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

const LoyaltySteps = () => {
  return (
    <section className="relative px-8 py-24 lg:px-28 bg-gradient-to-b from-white via-gray-50 to-white">
      <div className="text-center mb-16">
        <h2 className="text-4xl  text-white mb-4">
          <span
            className="font-bold bg-linear-to-r from-[#009987] to-[#008273] 
          bg-clip-text text-transparent"
          >
            Loyalty on WhatsApp
          </span>
        </h2>
        <p className="text-lg text-gray-400  mx-auto">
          Build loyalty that actually works — on WhatsApp.
        </p>
      </div>
      <div className="max-w-7xl mx-auto space-y-36">
        {steps.map((step, index) => {
          const isEven = index % 2 === 0;

          return (
            <motion.div
              key={index}
              className={`flex flex-col-reverse lg:flex-row ${
                !isEven ? "lg:flex-row-reverse" : ""
              } items-center gap-20`}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeInUp}
            >
              {/* Text Content */}
              <div className="lg:w-1/2 space-y-4">
                <div
                  className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full w-fit border shadow-sm ${step.badgeColor}`}
                >
                  {step.icon}
                  <span>{step.badgeText}</span>
                </div>

                <h3
                  className="text-3xl md:text-4xl font-bold
                 text-gray-800 tracking-tight leading-tight"
                >
                  {step.title}
                </h3>

                <p className="text-lg text-gray-600 font-medium  leading-relaxed max-w-xl">
                  {step.description}
                </p>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  {step.benefits.map((benefit, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-gray-700"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-base">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image Section */}
              <motion.div
                className="lg:w-1/2 w-full"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                viewport={{ once: true }}
              >
                <div
                  className={`relative group rounded-3xl 
                     overflow-hidden transition duration-300 ease-in-out shadow-lg hover:scale-[1.02] `}
                >
                  <Image
                    src={step.image}
                    alt={step.title}
                    className="relative z-10 rounded-xl w-full h-auto object-contain"
                    width={600}
                    height={400}
                  />
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default LoyaltySteps;
