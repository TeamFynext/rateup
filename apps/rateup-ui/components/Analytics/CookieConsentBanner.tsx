import { useEffect, useState } from "react";
import Link from "next/link";

import {
  ActionIcon,
  Card,
  Dialog,
  Divider,
  Group,
  Stack,
  Text,
  Transition,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconCookie, IconShieldCheck, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { fbConsent } from "../../utils/fbpixel";
import { setGAConsent } from "../../utils/gtag";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";

const CookieConsentBanner = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [cookieConsent, setCookieConsent] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const translations = useTranslations();

  useEffect(() => {
    setMounted(true);
    const storedCookieConsent = localStorage.getItem("cookie_consent");

    if (storedCookieConsent) {
      const parsed = JSON.parse(storedCookieConsent);
      setCookieConsent(parsed.cookieConsent);

      // Show banner again after 30 days
      if (dayjs().diff(dayjs(parsed.lastBannerShownDate), "day") > 30) {
        setTimeout(() => open(), 1000); // Delay for better UX
      }
    } else {
      setTimeout(() => open(), 1500); // Show after page loads
    }
  }, [open]);

  useEffect(() => {
    if (cookieConsent !== null) {
      setGAConsent(cookieConsent ? "granted" : "denied");
      fbConsent(cookieConsent ? "grant" : "revoke");
    }
  }, [cookieConsent]);

  const handleConsent = (consent: boolean) => {
    setCookieConsent(consent);
    localStorage.setItem(
      "cookie_consent",
      JSON.stringify({
        cookieConsent: consent,
        lastBannerShownDate: new Date().toISOString(),
      }),
    );
    close();
  };

  if (!mounted) return null;

  return (
    <Transition
      mounted={opened}
      transition="slide-up"
      duration={400}
      timingFunction="ease"
    >
      {(styles) => (
        <Dialog
          opened={opened}
          withCloseButton={false}
          onClose={close}
          size={isMobile ? "calc(100vw - 32px)" : "420px"}
          position={{
            bottom: isMobile ? 16 : 24,
            right: isMobile ? 16 : undefined,
            left: isMobile ? 16 : 24,
          }}
          zIndex={1000}
          style={styles}
          p={0}
          shadow="xl"
          radius="lg"
        >
          <Card
            shadow="lg"
            radius="lg"
            style={{
              border: "1px solid var(--mantine-color-gray-3)",
              background: "var(--mantine-color-white)",
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start">
                <Group gap="xs" align="center">
                  <IconCookie size={24} color="var(--mantine-color-blue-6)" />
                  <Text fw={600} size="lg" c="dark">
                    {
                      // translations("Cookie Preferences") ||
                      "Cookie Preferences"
                    }
                  </Text>
                </Group>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={close}
                  aria-label="Close cookie banner"
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>

              <Stack gap="xs">
                <Text size="sm" c="dimmed" lh={1.5}>
                  {
                    // translations("We use cookies to enhance your browsing experience and analyze our traffic.") ||
                    "We use cookies to enhance your browsing experience and analyze our traffic."
                  }
                </Text>

                <Group gap={4} wrap="wrap">
                  <Text size="sm" c="dimmed">
                    {/* {translations("Read our") || */}
                    Read our
                  </Text>
                  <Link
                    href="/privacy-policy"
                    style={{
                      textDecoration: "none",
                      color: "var(--mantine-color-blue-6)",
                      // fontWeight: 500,
                    }}
                  >
                    <Text size="sm">Privacy Policy</Text>
                  </Link>
                  <Text size="sm" c="dimmed">
                    for more details.
                  </Text>
                </Group>
              </Stack>

              <Divider />

              <Group gap="sm" justify={isMobile ? "stretch" : "flex-end"}>
                <RateupButtonSecondary
                  title={translations("Decline")}
                  variant="light"
                  size={isMobile ? "sm" : "sm"}
                  onClick={() => handleConsent(false)}
                  styles={{ flex: isMobile ? 1 : undefined }}
                  leftIcon={<IconX size={16} />}
                />
                <RateupButtonBlue
                  title={"Accept All"}
                  size={isMobile ? "sm" : "sm"}
                  onClick={() => handleConsent(true)}
                  styles={{ flex: isMobile ? 1 : undefined }}
                  leftIcon={<IconShieldCheck size={16} />}
                />
              </Group>
            </Stack>
          </Card>
        </Dialog>
      )}
    </Transition>
  );
};

export default CookieConsentBanner;
