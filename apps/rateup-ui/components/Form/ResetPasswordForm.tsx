"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Anchor,
  Flex,
  Group,
  Image,
  NavLink,
  Text,
  Title,
} from "@mantine/core";
import { isEmail, useForm } from "@mantine/form";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import {
  IconArrowAutofitLeft,
  IconArrowLeft,
  IconChevronRight,
  IconSend,
  IconX,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useCheckEmailExistMutation } from "../../backend/user/user.query";
import { showNotification } from "../../utils/auth";
import {
  useSendResetEmail,
  useSetNewPassword,
} from "../../utils/auth/resetPassword";
import { SAVE_HOTKEY } from "../../utils/constants";
import { ResetSteps } from "../../utils/enums";
import { RateupButtonBlue } from "../Button/RateupButtons";
import { rateupLogoUrl } from "../HomePage/constants";
import {
  ContainedPasswordInput,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import ConfirmationModal from "../Modal/ConfirmationModal";
import styles from "./AuthForm.module.css";

const ResetPasswordForm = ({ mode }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const rid = searchParams.get("rid");
  const requestStatus = searchParams.get("requestStatus");
  const emailTo = searchParams.get("emailTo");
  const type = searchParams.get("type");

  const [page, setPage] = useState(
    token && token.length > 0 ? ResetSteps.STEP_THREE : mode,
  );
  const [opened, { open, close }] = useDisclosure(false);
  const translations = useTranslations();
  useEffect(() => {
    if (token && token.length > 0) {
      setPage(ResetSteps.STEP_THREE);
    } else {
      if (requestStatus === "success") {
        setPage(ResetSteps.STEP_TWO);
      } else {
        setPage(ResetSteps.STEP_ONE);
      }
    }
  }, [mode, token, rid, requestStatus, router]);

  const emailForm = useForm({
    initialValues: {
      email: "",
      password: "",
    },

    validate: {
      email: isEmail("Email is required"),
    },
  });

  const pwdForm = useForm({
    initialValues: {
      password: "",
      confirmPassword: "",
    },

    validate: {
      password: (value, values) => {
        if (!value) {
          return translations("Password is required");
        }
        if (value.length < 5) {
          return translations("Password should be at least 5 characters long");
        }
        if (!/\d/.test(value) || !/[a-zA-Z]/.test(value)) {
          return translations(
            "Password should contain at least one letter and one number!",
          );
        }
        if (values.confirmPassword && value !== values.confirmPassword) {
          return translations("Passwords do not match");
        }
        return null;
      },
      confirmPassword: (value, values) => {
        if (!value) {
          return translations("Confirm password is required");
        }
        if (value !== values.password) {
          return translations("Passwords do not match");
        }
        return null;
      },
    },
  });

  const sendResetEmail = useSendResetEmail();
  const setNewPassword = useSetNewPassword(open);
  const checkEmailMutaion = useCheckEmailExistMutation();
  const isEmailPage = page === ResetSteps.STEP_ONE;
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = isEmailPage
    ? async (values) => {
        try {
          const user = await checkEmailMutaion.mutateAsync({
            email: values.email,
          });
          if (!user?.success) {
            emailForm.setFieldError(
              "email",
              translations("User with this email does not exist!"),
            );
            showNotification(
              "error",
              "red",
              "Error",
              translations("User with this email does not exist!"),
              <IconX size="1rem" />,
            );
            return;
          }
          setIsLoading(true);
          sendResetEmail(values.email).finally(() => {
            setIsLoading(false);
          });
        } catch (error) {
          setIsLoading(false);
        }
      }
    : (values) => {
        setIsLoading(true);
        setNewPassword(values.confirmPassword).finally(() => {
          setIsLoading(false);
        });
      };

  return (
    <>
      {page !== ResetSteps.STEP_TWO ? (
        <Flex className={styles["auth-form-container"]}>
          <Flex justify="center">
            <Link href="/" className={styles["rateup-logo-link"]}>
              <Image
                className={styles["rateup-logo-img"]}
                src={rateupLogoUrl}
                alt="RateUp Logo"
              />
            </Link>
          </Flex>

          <Title className={`${styles["login-signup-form-heading"]}`} order={2}>
            {page !== ResetSteps.STEP_THREE
              ? translations("Reset your Password!")
              : translations("Create new password!")}
          </Title>
          <Text
            c="dimmed"
            size="sm"
            mt={5}
            mb="xl"
            style={{ textAlign: "center" }}
          >
            {isEmailPage ? (
              <>
                {translations(
                  "We will send you an email to reset your password",
                )}
              </>
            ) : (
              <>{translations("Enter your new password and confirm")} </>
            )}
          </Text>

          <form
            onSubmit={
              isEmailPage
                ? emailForm.onSubmit(onSubmit)
                : pwdForm.onSubmit(onSubmit)
            }
            onKeyDown={getHotkeyHandler([
              [
                SAVE_HOTKEY,
                (event: any) =>
                  isEmailPage
                    ? emailForm.onSubmit(onSubmit)(event)
                    : pwdForm.onSubmit(onSubmit)(event),
              ],
            ])}
          >
            {isEmailPage ? (
              <ContainedTextField
                placeholder={translations("Email ID")}
                {...emailForm.getInputProps("email")}
              />
            ) : (
              <>
                <ContainedPasswordInput
                  placeholder={translations("Password")}
                  required
                  {...pwdForm.getInputProps("password")}
                  mt="md"
                />

                <ContainedPasswordInput
                  placeholder={translations("Confirm Password")}
                  required
                  {...pwdForm.getInputProps("confirmPassword")}
                  mt="md"
                />
              </>
            )}

            <RateupButtonBlue
              mt="xl"
              size="md"
              fullWidth={true}
              type="submit"
              loading={isLoading || checkEmailMutaion?.isPending}
              title={
                isEmailPage
                  ? translations("Continue")
                  : translations("Change Password")
              }
            />
            <Group justify="center" mt="xl" pt="xl">
              <Anchor component="button" size="sm">
                <Link
                  href="/login"
                  style={{ textDecoration: "none", color: "black" }}
                >
                  <Group>
                    <IconArrowLeft size="1rem" />
                    <Text>{translations("Go Back to Login")}</Text>
                  </Group>
                </Link>
              </Anchor>
            </Group>
          </form>
        </Flex>
      ) : (
        <div className={styles["auth-form-container"]}>
          <Flex justify="center">
            <Link href="/" className={styles["rateup-logo-link"]}>
              <Image
                className={styles["rateup-logo-img"]}
                src={rateupLogoUrl}
                alt="RateUp Logo"
              />
            </Link>
          </Flex>
          <Title order={2} className={`${styles["login-signup-form-heading"]}`}>
            {translations("Check your email")}
          </Title>
          <Text style={{ textAlign: "center" }}>
            {translations("A password reset email has been sent to")}
            <Text span c="blue" inherit>
              {emailTo}
            </Text>{" "}
          </Text>

          <Group justify="center" py="xl">
            <Image
              src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email.svg`}
              alt="email"
              w={90}
              h={60}
            />
          </Group>

          <Link href="/login/reset-password" style={{ textDecoration: "none" }}>
            <NavLink
              className={styles["resend-change-email-navlink-component"]}
              component="div"
              label={translations("Resend or change email")}
              leftSection={<IconSend size="1rem" stroke={1.5} />}
              rightSection={<IconChevronRight size="0.8rem" stroke={1.5} />}
              variant="subtle"
            />
          </Link>

          <Link href="/login" style={{ textDecoration: "none" }}>
            <NavLink
              component="div"
              label={translations("Login")}
              leftSection={<IconArrowAutofitLeft size="1rem" stroke={1.5} />}
              variant="subtle"
            />
          </Link>
        </div>
      )}
      <ConfirmationModal
        opened={opened}
        onConfirm={() => router.push("/login")}
        confirmLabel={translations("Continue")}
        headerLabel={
          type === "invite"
            ? `${translations("Password Created successfully!")} <br/> ${translations("Please login with your email and new password")}`
            : `${translations("Password Updated Successfully!")}  <br/>  ${translations("Login with your new password")}`
        }
        headerTitle={translations("Success")}
        excludeCancelButton={true}
        onClose={close}
      />
    </>
  );
};

export default ResetPasswordForm;
