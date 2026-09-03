import { motion } from "motion/react";

import { BookDemoLink } from "@/components/RateupHomePage/helper/BookDemoLink.tsx";
import { Button } from "@/components/ui/button.tsx";

const TestimonialCTASection = () => {
  return (
    <section className="py-24 max-w-6xl mx-auto px-4 md:px-6 overflow-hidden">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative p-8 md:p-12 lg:p-16 rounded-2xl 10 bg-linear-to-br from-[#e0f2ffca] via-[#e0f2ffa5] to-[#cce4ff9c]  text-center "
        >
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold pb-6 text-[#00397b]">
              Start collecting powerful testimonials today
            </h2>
            <p className="text-lg md:text-xl pb-10 text-[#013553]">
              Join thousands of businesses that use Testimonique to build trust and drive
              conversions
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="https://rateup.app/login">
                <Button
                  size="lg"
                  className="bg-[#00397b]  cursor-pointer hover:bg-[#00397b] text-white font-semibold px-6 py-3 text-base transition"
                >
                  Get Started for Free
                </Button>
              </a>
              <BookDemoLink>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary cursor-pointer text-primary hover:bg-primary/10 font-semibold px-6 py-3 text-base transition"
                >
                  Schedule a Demo
                </Button>
              </BookDemoLink>
            </div>
            <p className="pt-6 text-sm text-primary">
              No credit card required. Free plan available on every tier.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialCTASection;
