"use client";

import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowLeft, Home } from "lucide-react";
import { motion } from "motion/react";

import { rateupLogoUrl } from "../HomePage/constants.tsx";

const NotFoundPage = () => {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const lastSegment = pathname.split("/").filter(Boolean).pop() || "page";
  const { history } = useRouter();

  return (
    <div className="flex items-center justify-center bg-[#FAFAFA] py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-[#FAFAFA] max-w-lg w-full p-10 text-center"
      >
        <Link to={"/"}>
          <Image
            src={rateupLogoUrl}
            alt="RateUp Logo"
            width={120}
            height={60}
            className="mx-auto mb-6"
            priority
          />
        </Link>

        <div className="text-6xl md:text-8xl font-bold text-[#004F98]">404</div>
        <p className="text-gray-700 text-lg md:text-xl font-semibold mt-2">
          Page Not Found
        </p>

        <p className="text-gray-500 mt-3 text-base leading-relaxed">
          The <span className="font-medium">{lastSegment}</span> you&apos;re
          looking for doesn&apos;t exist or has been moved. Please check the URL
          or use one of the options below.
        </p>
        <div className="flex justify-center gap-4 mt-8 flex-wrap">
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link
              to="/"
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#004F98] text-white font-medium shadow-md hover:shadow-lg hover:bg-[#003366] transition"
            >
              <Home size={18} />
              Go Home
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <button
              onClick={() => history.back()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-[#004F98] text-[#004F98] font-medium hover:bg-[#004F98]/10 transition"
            >
              <ArrowLeft size={18} />
              Go Back
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
