"use client";

import React from "react";

import { useRouterState } from "@tanstack/react-router";
import { cx } from "class-variance-authority";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";

const CommonError = ({
  error,
  reset,
  className = "",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  className?: string;
}) => {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const lastSegment = pathname?.split("/")?.filter(Boolean)?.pop() || "page";

  const handleRetry = () => {
    reset();
  };

  return (
    <div
      className={cx(
        "h-full flex flex-col items-center justify-center p-8",
        className,
      )}
    >
      <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="#fdecea" />
        <path
          d="M8 15h8M8 11h8M12 7h0"
          stroke="#f87171"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <h2 className="text-red-400 mt-4 mb-2 text-xl font-semibold">
        Something went wrong
      </h2>
      <p className="text-gray-600 mb-6 text-center">
        We couldn&apos;t load your {lastSegment}. Please try again.
      </p>
      <RateupButtonPrimary
        title="Retry"
        onClick={handleRetry}
        className="mt-5"
        size="md"
      />
    </div>
  );
};

export default CommonError;
