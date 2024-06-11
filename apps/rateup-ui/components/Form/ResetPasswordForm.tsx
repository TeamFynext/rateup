import React, { useEffect, useState } from "react";
import {
  IconSend,
  IconArrowAutofitLeft,
  IconChevronRight,
  IconArrowLeft,
  IconX,
} from "@tabler/icons-react";
import {
  Title,
  Text,
  Anchor,
  Group,
  Image,
  NavLink,
  Flex,
} from "@mantine/core";
import { useRouter } from "next/router";
import { useForm } from "@mantine/form";
import Link from "next/link";
import {
  useSendResetEmail,
  useSetNewPassword,
} from "../../utils/auth/resetPassword";
import { ResetSteps } from "../../utils/enums";
import { RateupButtonBlue } from "../Button/RateupButtons";
import styles from "./AuthForm.module.css";
import { useCheckEmailExistMutation } from "../../backend/user/user.query";
import { showNotification } from "../../utils/auth";
import { rateupLogoUrl } from "../HomePage/constants";
import {
  ContainedPasswordInput,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import { SAVE_HOTKEY } from "../../utils/constants";
import ConfirmationModal from "../Modal/ConfirmationModal";

const ResetPasswordForm = ({ mode }) => {
  const router = useRouter();
  const { token, rid, requestStatus, emailTo } = router.query;
  const [page, setPage] = useState(
    token && rid === "emailpassword" ? ResetSteps.STEP_THREE : mode,
  );
  const [opened, { open, close }] = useDisclosure(false);

  useEffect(() => {
    if (token && rid) {
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
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
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
          return "Password is required";
        }
        if (value.length < 5) {
          return "Password should be at least 5 characters long";
        }
        if (!/\d/.test(value) || !/[a-zA-Z]/.test(value)) {
          return "Password should contain at least one letter and one number!";
        }
        if (values.confirmPassword && value !== values.confirmPassword) {
          return "Passwords do not match";
        }
        return null;
      },
      confirmPassword: (value, values) => {
        if (!value) {
          return "Confirm password is required";
        }
        if (value !== values.password) {
          return "Passwords do not match";
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
              "User with this email does not exist!",
            );
            showNotification(
              "error",
              "red",
              "Error",
              "User with this email does not exist!",
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
              ? "Reset your Password!"
              : "Create new password!"}
          </Title>
          <Text
            color="dimmed"
            size="sm"
            mt={5}
            mb="xl"
            style={{ textAlign: "center" }}
          >
            {isEmailPage ? (
              <>We will send you an email to reset your password.</>
            ) : (
              <>Enter your new password and confirm </>
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
                placeholder="Email ID"
                {...emailForm.getInputProps("email")}
              />
            ) : (
              <>
                <ContainedPasswordInput
                  placeholder="Password"
                  required
                  {...pwdForm.getInputProps("password")}
                  mt="md"
                />

                <ContainedPasswordInput
                  placeholder="Confirm Password"
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
              title={isEmailPage ? "Email Reset Link" : "Change Password"}
            />
            <Group justify="center" mt="xl" pt="xl">
              <Anchor component="button" size="sm">
                <Link
                  href="/login"
                  style={{ textDecoration: "none", color: "black" }}
                >
                  <Group>
                    <IconArrowLeft size="1rem" />
                    <Text>Go Back to Login</Text>
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
            Check your email
          </Title>
          <Text style={{ textAlign: "center" }}>
            A password reset email has been sent to{" "}
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
              label="Resend or change email"
              leftSection={<IconSend size="1rem" stroke={1.5} />}
              rightSection={<IconChevronRight size="0.8rem" stroke={1.5} />}
              variant="subtle"
            />
          </Link>

          <Link href="/login" style={{ textDecoration: "none" }}>
            <NavLink
              component="div"
              label="Login"
              leftSection={<IconArrowAutofitLeft size="1rem" stroke={1.5} />}
              variant="subtle"
            />
          </Link>
        </div>
      )}
      <ConfirmationModal
        opened={opened}
        onConfirm={() => router.push("/login")}
        confirmLabel="Continue"
        headerLabel="Password reset successfull!"
        headerTitle="Success"
        excludeCancelButton={true}
        onClose={close}
      />
    </>
  );
};

export default ResetPasswordForm;
