"use client";

import React from "react";

import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";

import { imagePath } from "@/components/HomePage/pages/constants.tsx";
import { Button } from "@/components/ui/button.tsx";

const error = () => {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <Link to="/">
        <Image
          width={80}
          height={24}
          src={`${imagePath}/rateup-logo-blue-text.svg`}
          alt="Rateup logo"
          className="h-auto w-20"
        />
      </Link>
      <p className="max-w-xl text-balance text-2xl font-semibold text-muted-foreground">
        Unable to get Menu, please try again later
      </p>
      <Button
        variant="outline"
        className="rounded-xl"
        onClick={() => globalThis.location.reload()}
      >
        Reload the page
      </Button>
    </div>
  );
};

export default error;
