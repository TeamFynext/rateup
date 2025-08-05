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
  profile,
}: {
  timeStamp: string;
  title: string;
  profile?: string;
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
      color={sessionExiped ? "#CC292C33" : "var(--wa-green)"}
    >
      <Indicator
        color={sessionExiped ? "#CC292C33" : "#69F0AE"}
        processing={!sessionExiped}
      >
        <Avatar
          name={title}
          src={profile}
          color="var(--mantine-primary-color-6)"
          // bd={`2px solid ${sessionExiped ? "#CC292C33" : "#69F0AE"}`}
        />
      </Indicator>
    </Tooltip>
  );
}
