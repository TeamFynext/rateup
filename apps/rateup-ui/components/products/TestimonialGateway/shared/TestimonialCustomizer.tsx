"use client";

import { useState } from "react";

import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import TestimonialCard from "../helpers/TestimonialCard";

export default function TestimonialCustomizer() {
  const [customTheme, setCustomTheme] = useState("default");

  const themes = [
    { value: "modern", label: "Modern" },
    { value: "minimal", label: "Minimal" },
    { value: "colorful", label: "Colorful" },
  ];

  const previewText = (
    <>
      <div className="mb-4 text-xl font-medium leading-relaxed">
        "The WhatsApp integration made collecting testimonials so simple. Our
        response rate went through the roof!"
      </div>
      <div className="text-sm">John Smith, CEO at Acme Inc</div>
    </>
  );

  return (
    <section className="py-24 bg-secondary/50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-16 flex flex-col items-center text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="inline-block text-sm tracking-wider uppercase text-primary font-semibold mb-3 bg-primary/10 px-3 py-1 rounded-full"
          >
            Customization
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold py-4 text-[#00397b]"
          >
            Make testimonials match your brand
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Customize the look and feel of your testimonials to seamlessly
            integrate with your website
          </motion.p>
        </div>

        {/* Customization Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: Controls + Tabs */}
          <Tabs
            defaultValue="modern"
            className="w-full"
            onValueChange={setCustomTheme}
          >
            <TabsList className="grid w-full  grid-cols-3 mb-6">
              {themes.map(({ value, label }) => (
                <TabsTrigger
                  className="cursor-pointer"
                  key={value}
                  value={value}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Style Controls */}
            <div className="space-y-6">
              {[
                {
                  label: "Background Color",
                  colors: ["white", "gray-100", "green-50", "blue-50"],
                },
                {
                  label: "Text Color",
                  colors: ["gray-900", "gray-600", "green-700", "blue-700"],
                },
              ].map(({ label, colors }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex items-center space-x-2">
                    {colors.map((color) => (
                      <span
                        key={color}
                        className={`h-6 w-6 rounded-full bg-${color} border border-gray-200 cursor-pointer`}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {[
                {
                  label: "Border Style",
                  options: ["None", "Thin", "Rounded", "Shadow"],
                },
                {
                  label: "Display Format",
                  options: ["Grid", "Carousel", "List"],
                },
              ].map(({ label, options }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex items-center space-x-4">
                    {options.map((option) => (
                      <span
                        key={option}
                        className={`text-sm text-muted-foreground cursor-pointer ${
                          option === "Grid" ? "text-primary font-medium" : ""
                        }`}
                      >
                        {option}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              <Button className="w-full mt-4 bg-[#00397b] hover:bg-[#00397b]">
                Apply Changes
              </Button>
            </div>

            {/* Main Preview (for mobile) */}
          </Tabs>

          {/* Right: Static Preview (desktop only) */}
          <div className=" p-6 bg-white/60 dark:bg-black/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-white/10 shadow-soft">
            <div className="text-sm font-medium text-muted-foreground mb-4">
              Preview
            </div>
            {customTheme === "modern" ? (
              <TestimonialCard
                quote="The WhatsApp integration made collecting testimonials so simple. Our response rate went through the roof!"
                author="John Smith"
                role="CEO"
                company="Acme Inc"
                channel="whatsapp"
                verified={true}
                rating={5}
              />
            ) : (
              <div
                className={`p-6 rounded-lg ${
                  customTheme === "colorful"
                    ? "bg-linear-to-r from-green-400 to-blue-400 text-white"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                {previewText}
              </div>
            )}
            <div className="mt-4 text-xs text-muted-foreground">
              *This is how your testimonial will appear on your website
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
