import { useEffect, useState } from "react";
import { getTimeSince } from "../../../utils/index";

function TimeSinceText({ isoDateString }) {
  const [timeSinceStr, setTimeSinceStr] = useState("");
  useEffect(() => {
    if (isoDateString) {
      setTimeSinceStr(getTimeSince(new Date(isoDateString).toString()));
      const timeoutID = setInterval(
        () => setTimeSinceStr(getTimeSince(new Date(isoDateString).toString())),
        5000,
      );
      return () => clearInterval(timeoutID);
    }
  }, []);
  return <span>{timeSinceStr}</span>;
}

export default TimeSinceText;
