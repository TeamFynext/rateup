import { useState } from "react";

import { Box, Skeleton } from "@mantine/core";
import { useTranslations } from "next-intl";

export default function YoutubeEmbed({ embedId, sx }) {
  const [loading, setLoading] = useState(true);

  const handleLoad = () => {
    setLoading(false);
  };
  const translations = useTranslations();
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
