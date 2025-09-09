"use client";

import React from "react";
import { usePathname } from "next/navigation";

const NotFoundPage = () => {
  const pathname = usePathname();
  const lastSegment = pathname?.split("/")?.filter(Boolean)?.pop() || "page";

  return (
    <div
      className={
        "min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center"
      }
    >
      <svg
        width="80"
        height="80"
        fill="none"
        viewBox="0 0 24 24"
        className="mb-6"
      >
        <circle cx="12" cy="12" r="10" fill="#f0f9ff" />
        <path
          d="M8 15h8M8 11h8M12 7h0"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <h2 className="text-blue-500 text-3xl md:text-4xl font-bold mb-3">
        404 – Page Not Found
      </h2>
      <p className="text-gray-600 max-w-md">
        The <span className="font-medium">{lastSegment}</span> you are looking
        for doesn&apos;t exist or has been moved.
      </p>
    </div>
  );
};

export default NotFoundPage;
