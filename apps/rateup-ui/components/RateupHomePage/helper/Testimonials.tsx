"use client";

import { useState } from "react";
import Image from "next/image";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";

interface Testimonial {
  companyLogo: string;
  companyName: string;
  category: string;
  categoryIcon: React.ReactNode;
  quote: string;
  author: string;
  role: string;
  image: string;
  stats: { value: string; label: string }[];
}

const testimonials: Testimonial[] = [
  {
    companyLogo: "/images/customerLogos/entri-logo.png",
    companyName: "entri",
    category: "Education",
    categoryIcon: <GraduationCap className="w-4 h-4 text-white" />,
    quote:
      "RateUp Made Collecting Feedback Effortless. The WhatsApp Flows Feel Natural, And Response Rates Improved Instantly.",
    author: "Rahul Menon",
    role: "Operations Head At Entri",
    image: "/images/customerLogos/entri-photo.png",
    stats: [
      { value: "77%", label: "Growth In Leads" },
      { value: "80%", label: "Business Growth Generation" },
      { value: "64%", label: "Higher Team Productivity" },
    ],
  },
];

export function Testimonials() {
  const [current, setCurrent] = useState(0);
  const total = testimonials.length;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  const t = testimonials[current];

  return (
    <section className="py-24 bg-rateup-dark-blue-3 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 ">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-[44px] font-semibold text-white leading-tight">
            From 100+ businesses <br />
            that made the switch
          </h2>
        </div>

        {/* Slider wrapper */}
        <div className="relative flex items-center">
          {/* Left arrow */}
          <button
            onClick={prev}
            className="absolute -left-6 z-20 w-11 h-11 rounded-full bg-[#2D74E0] hover:bg-[#2D74E0]/80 flex items-center justify-center shadow-lg transition-colors"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          {/* Card */}
          <div className="w-full rounded-[28px] bg-[#0a1629] border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex flex-col md:flex-row">
              {/* Left: content */}
              <div className="flex-1 p-10 md:p-12 flex flex-col justify-between">
                {/* Company logo */}
                <div>
                  <div className="inline-flex items-center gap-2 bg-white rounded-xl px-4 py-2 mb-8 w-fit">
                    <img
                      src={t.companyLogo}
                      alt={t.companyName}
                      className="h-7 w-7 object-contain"
                    />
                    <span className="text-[#111] font-semibold text-[17px]">
                      {t.companyName}
                    </span>
                  </div>

                  {/* Big quotation marks */}
                  <div className="text-[#2D74E0] text-5xl font-serif leading-none mb-3 select-none">
                    "
                  </div>

                  {/* Quote */}
                  <p className="text-white text-[15px] leading-relaxed mb-4 max-w-sm">
                    {t.quote}
                  </p>

                  {/* Author */}
                  <p className="text-white/50 text-sm mb-8">
                    - {t.author}, {t.role}
                  </p>
                </div>

                {/* Read Story */}
                <div>
                  <button className="inline-flex items-center gap-2 bg-[#2D74E0] hover:bg-[#2D74E0]/90 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                    Read Story <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Right: image */}
              <div className="relative w-full md:w-[380px] shrink-0 min-h-[300px] md:min-h-0">
                {/* Category badge */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-[#2D74E0] text-white text-xs font-medium px-3 py-1.5 rounded-full">
                  {t.categoryIcon}
                  {t.category}
                </div>
                <img
                  src={t.image}
                  alt={t.companyName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
              {t.stats.map((stat) => (
                <div key={stat.label} className="py-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#2D74E0] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-white text-sm font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right arrow */}
          <button
            onClick={next}
            className="absolute -right-6 z-20 w-11 h-11 rounded-full bg-[#2D74E0] hover:bg-[#2D74E0]/80 flex items-center justify-center shadow-lg transition-colors"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${
                i === current ? "bg-[#2D74E0] w-6" : "bg-white/20 w-2"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
