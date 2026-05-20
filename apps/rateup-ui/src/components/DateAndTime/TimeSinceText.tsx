"use client";

import { useEffect, useState } from "react";

import { getTimeSince } from "@/utils/index.ts";

function TimeSinceText({ isoDateString }) {
  const [timeSinceStr, setTimeSinceStr] = useState("");
  useEffect(() => {
    if (isoDateString) {
      setTimeSinceStr(getTimeSince(isoDateString));
      const timeoutID = setInterval(
        () => setTimeSinceStr(getTimeSince(isoDateString)),
        5000,
      );
      return () => clearInterval(timeoutID);
    }
  }, []);
  return <span>{timeSinceStr}</span>;
}

export default TimeSinceText;
