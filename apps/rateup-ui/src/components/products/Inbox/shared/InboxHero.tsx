"use client";

import { useEffect, useState } from "react";

import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowRight } from "lucide-react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal.tsx";
import { Button } from "@/components/ui/button.tsx";
import { imagesPath } from "@/utils/constants.ts";

const rotatingTexts = ["Drive Growth.", "Empower Teams.", "Start Resolving."];

const TYPING_SPEED = 100;
const PAUSE_DURATION = 1500;

const InboxHero = () => {
  const [index, setIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = rotatingTexts[index];

    if (!isDeleting && displayedText === fullText) {
      const pause = setTimeout(() => setIsDeleting(true), PAUSE_DURATION);
      return () => clearTimeout(pause);
    }

    if (isDeleting && displayedText === "") {
      setIsDeleting(false);
      setIndex((prev) => (prev + 1) % rotatingTexts.length);
      return;
    }

    const timeout = setTimeout(() => {
      const updatedText = isDeleting
        ? fullText.substring(0, displayedText.length - 1)
        : fullText.substring(0, displayedText.length + 1);
      setDisplayedText(updatedText);
    }, TYPING_SPEED);

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, index]);

  return (
    <section
      className="w-full bg-gradient-to-b
     from-[#e6f7ffde] to-[#ffffffde] pb-10 min-h-[70vh] flex items-center"
    >
      <div className="w-full grid grid-cols-1 md:grid-cols-2 items-center gap-x-1 ">
        {/* Left Content */}
        <div className="px-3 sm:px-16 sm:pt-0 pt-8 ">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-gray-900 leading-tight">
            Go Beyond Feedback{" "}
            <span className="inline-block text-[#1c518e] font-bold">
              <span className="inline-block min-w-[12ch]">{displayedText}</span>
            </span>
          </h1>

          <p className="pt-6 text-md sm:text-xl text-[#374151] max-w-2xl">
            RateUp is your all-in-one platform to listen, understand, and act on
            employee feedback through WhatsApp. Drive real change and build a
            culture of trust across all your teams and locations.
          </p>

          <div className="mt-10 flex flex-row gap-4">
            <Link to="https://rateup.app/login">
              <Button
                size="lg"
                className="bg-[#1c518e] cursor-pointer hover:bg-[#1c518e] text-white font-medium px-8"
              >
                Start Your Free Trial
              </Button>
            </Link>
            <BookDemoModal>
              <Button
                size="lg"
                variant="outline"
                className="border-[#1c518e] text-[#1c518e] cursor-pointer hover:bg-[#e6f7ff] group"
              >
                Learn More
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </BookDemoModal>
          </div>
        </div>

        {/* Right Image */}
        <div className="flex justify-end pr-0">
          <Image
            src={`${imagesPath}/inbox/inboxHero.png`}
            height={700}
            width={500}
            alt="Dashboard showing testimonial management system"
            className="w-full "
            priority
          />
        </div>
      </div>
    </section>
  );
};

export default InboxHero;
