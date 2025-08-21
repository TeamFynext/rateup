import Link from "next/link";

import { Group, Image, NavLink, Space, Text, Title } from "@mantine/core";
import {
  IconArrowAutofitLeft,
  IconChevronRight,
  IconSend,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import styles from "./AuthForm.module.css";

function VerifyEmailPage({ sendEmail }) {
  const translations = useTranslations();
  return (
    <>
      <Title order={2} className={styles["login-signup-form-heading"]}>
        {translations("Verify your email address")}
      </Title>
      <Text className={styles["verify-email-para"]}>
        {translations(
          "Please click on the link in the email we just sent you to confirm your email address.",
        )}
      </Text>

      <Group justify="center" py="xl">
        <Image
          src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email.svg`}
          alt="email"
          w={90}
          h={60}
        />
      </Group>

      <NavLink
        className={styles["resend-change-email-navlink-component"]}
        onClick={sendEmail}
        component="div"
        label={translations("Resend or change email")}
        leftSection={<IconSend size="1rem" stroke={1.5} />}
        rightSection={<IconChevronRight size="0.8rem" stroke={1.5} />}
        variant="subtle"
      />

      <Link href="/auth/logout" style={{ textDecoration: "none" }}>
        <NavLink
          component="div"
          style={{ fontWeight: 620 }}
          label={translations("Logout")}
          leftSection={<IconArrowAutofitLeft size="1rem" stroke={1.5} />}
          variant="subtle"
        />
      </Link>
    </>
  );
}

export default VerifyEmailPage;
