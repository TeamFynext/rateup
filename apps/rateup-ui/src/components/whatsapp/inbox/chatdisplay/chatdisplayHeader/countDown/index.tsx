import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { Clock, TimerIcon } from "lucide-react";
import { useEffect, useState } from "react";

import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { Loader } from "@/components/ui/loader.tsx";
import { isInboxSessionExpired } from "@/utils/whatsapp/inbox.ts";

dayjs.extend(utc);

export default function WaInboxCountdownTimer({ timeStamp }: { timeStamp: string }) {
  const calculateTimeLeft = () => dayjs(dayjs(timeStamp).add(24, "hour")).diff(dayjs(), "second");

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 5000);
    return () => clearInterval(intervalId);
  }, [timeStamp]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);

  const percentageDifference = (timeLeft / (24 * 3600)) * 100;

  if (!timeStamp || isInboxSessionExpired(timeStamp)) {
    return (
      <CustomTooltip
        trigger={<TimerIcon className="text-muted" />}
        content={<span>No Session</span>}
        side="bottom"
      />
    );
  }
  if (!percentageDifference || !timeStamp) {
    return <Loader className="text-xs" />;
  }
  const Timer = () => {
    return (
      <div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-primary text-sm font-medium">{`${hours ?? 0} : ${minutes ?? 0}`}</span>
        </div>
      </div>
    );
  };
  return (
    <CustomTooltip
      trigger={<Timer />}
      content={
        <span>
          Session: {hours}hrs and {minutes}m Left
        </span>
      }
      side="bottom"
    />
  );
}
