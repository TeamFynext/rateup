import { useEffect, useState } from "react";
import Link from "next/link";

import { Dialog, Group, Text } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import dayjs from "dayjs";

import useTranslations from "@/dictionaries/useTranslation";

import { fbConsent } from "../../utils/fbpixel";
import { setGAConsent } from "../../utils/gtag";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";

const CookieConsentBanner = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [cookieConsent, setCookieConsent] = useState(false);
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { translations } = useTranslations();
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
      w={"850px"}
      p={"xl"}
      style={{ border: "1px solid var(--tertiary-color)" }}
      shadow="xl"
      mx="auto"
      position={{ bottom: 20, right: isMobile ? undefined : 90, left: 30 }}
      zIndex={150}
    >
      <Group justify="space-between">
        <Text fw={"bold"} fz={isMobile ? 14 : 16}>
          {translations["We use cookies in our site. See "]}
          <Link href={"/privacy-policy"} style={{ textDecoration: "none" }}>
            {translations["our Privacy and policy"]}
          </Link>{" "}
          {translations["for more details."]}
        </Text>
        <Group>
          <RateupButtonSecondary
            title={translations["Decline"]}
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
            title={translations["Accept"]}
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
