import { Box, Stack } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import RateupLoader from "@/components/Loaders/RateupLoader.tsx";

export function Redirect({ tag = null, res }: any) {
  const navigate = useNavigate();

  useEffect(() => {
    const url = tag ? res?.shareUrl + encodeURIComponent(`?t=${tag}`) : res?.shareUrl;
    if (url)
      navigate({
        href: url,
        replace: true,
      });
  }, [res?.shareUrl, tag]);

  return (
    <Stack justify="center" align="center" h={"100dvh"}>
      <Box>
        <RateupLoader />
        <div>Redirecting to whatsapp...</div>
      </Box>
    </Stack>
  );
}
