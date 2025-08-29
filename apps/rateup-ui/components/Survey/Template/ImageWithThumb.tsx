"use client";

import React, { useState } from "react";

import { Image, ImageProps } from "@mantine/core";

import { fallbackImage, THUMBNAIL_URL } from "../../../utils/constants";

export const ImageWithThumb = ({
  src,
  fit = "fill",
  h,
  radius,
}: ImageProps) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };
  return imageError ? (
    <Image
      radius={radius}
      fit={fit}
      h={h}
      src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${src}`}
      fallbackSrc={fallbackImage}
    />
  ) : (
    <Image
      radius={radius}
      fit={fit}
      h={h}
      src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${THUMBNAIL_URL}${src}`}
      onError={handleImageError}
    />
  );
};
