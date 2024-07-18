import { useState } from "react";

import { Box, Skeleton } from "@mantine/core";

export default function YoutubeEmbed({ embedId, sx }) {
  const [loading, setLoading] = useState(true);

  const handleLoad = () => {
    setLoading(false);
  };
  return (
    <Box>
      {loading && <Skeleton style={{ aspectRatio: 3 / 2, borderRadius: 12 }} />}
      <iframe
        style={{ ...sx, display: loading ? "none" : "block" }}
        src={`https://www.youtube.com/embed/${embedId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded youtube"
        onLoad={handleLoad}
      />
    </Box>
  );
}
