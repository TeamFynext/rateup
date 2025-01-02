import { Badge, Tooltip } from "@mantine/core";

import useTranslations from "@/dictionaries/useTranslation";

import { isInboxSessionExpired } from "../../../../../../utils/whatsapp/inbox";
import classes from "./styles.module.css";

export default function WaInboxSessionBadge({
  timeStamp,
}: {
  timeStamp: string;
}) {
  const { translations } = useTranslations();
  return (
    <Tooltip
      position="top-start"
      label={
        isInboxSessionExpired(timeStamp)
          ? translations["Session Inactive"]
          : translations["Session Active"]
      }
    >
      <Badge
        className={`${classes.session_expiry_badge} ${isInboxSessionExpired(timeStamp) ? classes.session_expiry_badge_expired : classes.session_expiry_badge_active}`}
      >
        {isInboxSessionExpired(timeStamp)
          ? translations["Inactive"]
          : translations["Active"]}
      </Badge>
    </Tooltip>
  );
}
