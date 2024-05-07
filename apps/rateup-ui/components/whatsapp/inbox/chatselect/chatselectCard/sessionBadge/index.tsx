import { Badge, Tooltip } from "@mantine/core";
import classes from "./styles.module.css";
import { isInboxSessionExpired } from "../../../../../../utils/whatsapp/inbox";
export default function WaInboxSessionBadge({
  timeStamp,
}: {
  timeStamp: string;
}) {
  return (
    <Tooltip
      position="top-start"
      label={
        isInboxSessionExpired(timeStamp) ? "Session Expired" : "Session Active"
      }
    >
      <Badge
        className={`${classes.session_expiry_badge} ${isInboxSessionExpired(timeStamp) ? classes.session_expiry_badge_expired : classes.session_expiry_badge_active}`}
      >
        {isInboxSessionExpired(timeStamp) ? "Expired" : "Active"}
      </Badge>
    </Tooltip>
  );
}
