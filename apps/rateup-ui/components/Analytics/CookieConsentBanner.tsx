import { Dialog, Group, Text } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import Link from "next/link";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import { useEffect, useState } from "react";
import { setGAConsent } from "../../utils/gtag";
import { fbConsent } from "../../utils/fbpixel";
import dayjs from "dayjs";

const CookieConsentBanner = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [cookieConsent, setCookieConsent] = useState(false);
  const isMobile = useMediaQuery("(max-width: 480px)");

  useEffect(() => {
    const storedCookieConsent = JSON.parse(
      localStorage.getItem("cookie_consent"),
    );
    if (storedCookieConsent) {
      setCookieConsent(storedCookieConsent?.cookieConsent);
      if (
        dayjs().diff(dayjs(storedCookieConsent?.lastBannerShownDate), "day") >
        30
      )
        open();
    } else {
      open();
    }
  }, []);

  useEffect(() => {
    setGAConsent(cookieConsent ? "granted" : "denied");
    fbConsent(cookieConsent ? "grant" : "revoke");
  }, [cookieConsent]);

  return (
    <Dialog
      opened={opened}
      withCloseButton
      onClose={close}
      w={"100%"}
      p={"xl"}
      style={{ border: "1px solid var(--tertiary-color)" }}
      shadow="xl"
      position={{ bottom: 20, right: isMobile ? undefined : 90, left: 30 }}
      zIndex={150}
    >
      <Group justify="space-between">
        <Text fw={"bold"} fz={isMobile ? 14 : 16}>
          We use cookies in our site. See{" "}
          <Link href={"/privacy-policy"} style={{ textDecoration: "none" }}>
            our Privacy and policy
          </Link>{" "}
          for more details.
        </Text>
        <Group>
          <RateupButtonSecondary
            title="Decline"
            fw={"bold"}
            variant="light"
            onClick={() => {
              setCookieConsent(false);
              localStorage.setItem(
                "cookie_consent",
                JSON.stringify({
                  cookieConsent: false,
                  lastBannerShownDate: new Date(),
                }),
              );
              close();
            }}
            size={isMobile ? "xs" : "md"}
          />
          <RateupButtonBlue
            title="Accept"
            fw={"bold"}
            onClick={() => {
              setCookieConsent(true);
              localStorage.setItem(
                "cookie_consent",
                JSON.stringify({
                  cookieConsent: true,
                  lastBannerShownDate: new Date(),
                }),
              );
              close();
            }}
            size={isMobile ? "xs" : "md"}
          />
        </Group>
      </Group>
    </Dialog>
  );
};

export default CookieConsentBanner;
