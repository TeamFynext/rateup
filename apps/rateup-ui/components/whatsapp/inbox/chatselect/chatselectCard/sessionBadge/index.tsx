import { Avatar, Badge, Indicator, Tooltip } from "@mantine/core";

import useTranslations from "@/dictionaries/useTranslation";
import { isInboxSessionExpired } from "@/utils/whatsapp/inbox";

import classes from "./styles.module.css";

export default function WaInboxSessionBadge({
  timeStamp,
}: {
  timeStamp: string;
}) {
  const { translations } = useTranslations();
  let sessionExiped = isInboxSessionExpired(timeStamp);

  return (
    <Tooltip
      position="top-start"
      label={
        sessionExiped
          ? translations["Session Inactive"]
          : translations["Session Active"]
      }
    >
      <Badge
        className={`${classes.session_expiry_badge} ${sessionExiped ? classes.session_expiry_badge_expired : classes.session_expiry_badge_active}`}
      >
        {sessionExiped ? translations["Inactive"] : translations["Active"]}
      </Badge>
    </Tooltip>
  );
}

export function WaInboxSessionAvatar({
  timeStamp,
  title,
}: {
  timeStamp: string;
  title: string;
}) {
  const { translations } = useTranslations();
  let sessionExiped = isInboxSessionExpired(timeStamp);
  return (
    <Tooltip
      position="top-start"
      label={
        sessionExiped
          ? translations["Session Inactive"]
          : translations["Session Active"]
      }
    >
      <Indicator
        color={sessionExiped ? "#CC292C33" : "#69F0AE"}
        processing={!sessionExiped}
      >
        <Avatar
          name={title}
          color="initials"
          // bd={`2px solid ${sessionExiped ? "#CC292C33" : "#69F0AE"}`}
        />
      </Indicator>
    </Tooltip>
  );
}
