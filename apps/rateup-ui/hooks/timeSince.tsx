import { useEffect, useState } from "react";
import { getTimeSince } from "../utils";

export function useTimeSince(date: Date) {
  const [timeSince, setTimeSince] = useState("");
  useEffect(() => {
    if (date) {
      setTimeSince(getTimeSince(new Date(date).toString()));
      const timeoutID = setInterval(
        () => setTimeSince(getTimeSince(new Date(date).toString())),
        5000,
      );
      return () => clearInterval(timeoutID);
    }
  }, [date]);
  return timeSince;
}
