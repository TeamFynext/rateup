"use client";

import { motion } from "framer-motion";
import { Camera, CheckCircle, Heart, MessageSquare, Star } from "lucide-react";

import { Card } from "@/components/ui/card";

const TestimonialTemplate: React.FC<{
  type: string;
  delay: number;
  color?: string;
}> = ({ type, delay }) => {
  const getTemplateContent = () => {
    switch (type) {
      case "card":
        return (
          <div className="p-4 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center space-x-1 text-yellow-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} fill="currentColor" />
              ))}
            </div>
            <p className="text-sm italic">
              "The testimonial collection increased our response rates by 7x.
              Amazing service!"
            </p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold">
                JD
              </div>
              <div>
                <p className="text-xs font-semibold">John Doe</p>
                <p className="text-xs text-muted-foreground">
                  Marketing Director
                </p>
              </div>
            </div>
          </div>
        );
      case "minimal":
        return (
          <div className="p-4 rounded-xl bg-linear-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 space-y-2">
            <p className="text-sm">
              "Collecting testimonials has been a game-changer for our
              business."
            </p>
            <p className="text-xs text-right font-medium">- Sarah J., CEO</p>
          </div>
        );
      case "modern":
        return (
          <div className="p-4 rounded-xl bg-white dark:bg-gray-800 shadow-lg relative space-y-3">
            <div className="absolute -top-2 -left-2 bg-purple-500 text-white p-1 rounded-full">
              <MessageSquare size={14} />
            </div>
            <p className="text-sm">
              "The simplicity of giving feedback made it so easy for me to share
              my experience."
            </p>
            <div className="flex justify-between items-center">
              <p className="text-xs font-medium">Michael T.</p>
              <div className="flex items-center text-xs text-green-600">
                <CheckCircle size={12} className="mr-1" />
                Verified
              </div>
            </div>
          </div>
        );
      case "social":
        return (
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">
                  MT
                </div>
                <div>
                  <p className="text-xs font-bold">Maria Thomas</p>
                  <p className="text-xs opacity-80">@mariathomas</p>
                </div>
              </div>
              <Heart size={16} fill="white" />
            </div>
            <p className="text-sm">
              "This product completely transformed how we collect customer
              feedback!"
            </p>
            <div className="text-xs opacity-80 text-right">2 days ago</div>
          </div>
        );
      case "video":
        return (
          <div className="p-4 rounded-xl bg-linear-to-r from-amber-100 to-amber-200 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-300 dark:border-amber-700 shadow-lg space-y-3">
            <div className="relative bg-black/10 rounded-md p-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <div className="ml-1 w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-amber-500 border-b-[8px] border-b-transparent"></div>
                </div>
              </div>
              <Camera className="text-gray-400 opacity-20" size={40} />
            </div>
            <p className="text-sm font-medium">Video Testimonial</p>
            <p className="text-xs text-muted-foreground">Robert Johnson, CTO</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      viewport={{ once: true }}
    >
      {getTemplateContent()}
    </motion.div>
  );
};

export const TestimonialFeatureSection = () => {
  return (
    <section
      className="py-14 bg-gradient-to-b from-secondary/50 via-primary/5 to-background"
      id="how-it-works"
    >
      <div className="container max-w-7xl mx-auto px-4">
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-center pb-12 bg-linear-to-r from-[#01446b] to-[#0041a8] bg-clip-text text-transparent"
        >
          Showcase testimonials your way
        </motion.h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {["card", "minimal", "modern", "social"].map((type, index) => (
            <Card
              key={type}
              className="p-6 rounded-2xl bg-white/80 dark:bg-black/60 backdrop-blur-md border border-white/30 dark:border-white/10 shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              <h4 className="text-lg font-semibold mb-4 text-center capitalize">
                {type} Style
              </h4>
              <TestimonialTemplate type={type} delay={index * 0.1} />
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 rounded-2xl bg-white/80 dark:bg-black/60 backdrop-blur-md border border-white/30 dark:border-white/10 shadow-md hover:shadow-xl transition-shadow duration-300">
            <h4 className="text-lg font-semibold mb-4 text-center">
              Video Testimonials
            </h4>
            <TestimonialTemplate type="video" delay={0.4} />
          </Card>

          <Card className="p-6 rounded-2xl bg-white/80 dark:bg-black/60 backdrop-blur-md border border-white/30 dark:border-white/10 shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col justify-center items-center text-center">
            <h4 className="text-lg font-semibold mb-4">Fully Customizable</h4>
            <p className="text-muted-foreground mb-4">
              Create your own unique testimonial style with our flexible design
              options.
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              {[
                "bg-green-500",
                "bg-blue-500",
                "bg-purple-500",
                "bg-pink-500",
                "bg-amber-500",
                "bg-emerald-500",
              ].map((color, idx) => (
                <span
                  key={idx}
                  className={`inline-block h-6 w-6 rounded-full ${color}`}
                ></span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default TestimonialFeatureSection;
