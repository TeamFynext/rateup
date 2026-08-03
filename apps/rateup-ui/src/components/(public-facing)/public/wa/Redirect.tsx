import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import RateupLoader from "@/components/Loaders/RateupLoader.tsx";

export function Redirect({
  tag = null,
  res,
}: Readonly<{ tag?: string | null; res?: { shareUrl?: string } }>) {
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
    <div className="flex flex-col items-center justify-center" style={{ height: "100dvh" }}>
      <div>
        <RateupLoader />
        <div>Redirecting to whatsapp...</div>
      </div>
    </div>
  );
}
