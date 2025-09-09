"use client";

import { useEffect, useState } from "react";

import { ArrowUp } from "lucide-react";

const ScrollToTop = () => {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowButton(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    const scrollDuration = 800; // Scroll duration in ms
    const start = window.scrollY;
    const startTime = performance.now();

    const scrollStep = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const scrollProgress = Math.min(elapsed / scrollDuration, 1); // Normalize the scroll progress

      window.scrollTo(0, start - start * scrollProgress);

      if (elapsed < scrollDuration) {
        requestAnimationFrame(scrollStep); // Continue scrolling until the duration is complete
      }
    };

    requestAnimationFrame(scrollStep); // Start the scrolling process
  };

  if (!showButton) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-6 cursor-pointer z-50 bg-gradient-to-r
       from-[#00397b] to-[#1c518e]
       text-white p-2 rounded-md
       shadow-xl transform hover:scale-105  transition-all duration-500 ease-in-out"
    >
      <ArrowUp size={26} />
    </button>
  );
};

export default ScrollToTop;
