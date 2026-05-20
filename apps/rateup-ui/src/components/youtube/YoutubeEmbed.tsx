"use client";

import { useState } from "react";

import { Box, Skeleton } from "@mantine/core";
import { useTranslation } from "react-i18next";

export default function YoutubeEmbed({ embedId, sx }) {
  const [loading, setLoading] = useState(true);

  const handleLoad = () => {
    setLoading(false);
  };
  const { t: translations } = useTranslation();
  return (
    <Box>
      {loading && <Skeleton style={{ aspectRatio: 3 / 2, borderRadius: 12 }} />}
      <iframe
        style={{ ...sx, display: loading ? "none" : "block" }}
        src={`https://www.youtube.com/embed/${embedId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={translations("Embedded youtube")}
        onLoad={handleLoad}
      />
    </Box>
  );
}
