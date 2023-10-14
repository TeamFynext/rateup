import React, { useEffect, useState } from "react";
import {
  IconSend,
  IconArrowAutofitLeft,
  IconChevronRight,
  IconChevronLeft,
  IconArrowLeft,
} from "@tabler/icons-react";
import {
  Container,
  Title,
  Space,
  Text,
  TextInput,
  PasswordInput,
  Anchor,
  Paper,
  Group,
  Image,
  NavLink,
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
import classes from "./FormStyle.module.css";

const ResetPasswordForm = ({ mode }) => {
  const router = useRouter();
  const { token, rid, requestStatus, emailTo } = router.query;
  const [page, setPage] = useState(
    token && rid === "emailpassword" ? ResetSteps.STEP_THREE : mode,
  );

  useEffect(() => {
    if (token && rid) {
      setPage(ResetSteps.STEP_THREE);
    } else {
      if (requestStatus === "success") {
        setPage(ResetSteps.STEP_TWO);
        //console.log("Activating page 2")
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
          return "Password should contain at least one letter and one number";
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
  const setNewPassword = useSetNewPassword();

  const isEmailPage = page === ResetSteps.STEP_ONE;
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = isEmailPage
    ? (values) => {
        setIsLoading(true);
        sendResetEmail(values.email).finally(() => {
          setIsLoading(false);
        });
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
        <Container size={420} my={40}>
          <Paper
            withBorder
            shadow="md"
            p={30}
            mt={30}
            radius="md"
            style={{ background: "#F7F7F7" }}
          >
            <Link href="/">
              <Image
                src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`}
                alt="RateUp Logo"
                w={140}
                h={36}
              />
            </Link>

            <Title
              mt="xl"
              order={2}
              style={(theme) => ({
                fontFamily: `Greycliff CF, ${theme.fontFamily}`,
                fontWeight: 900,
              })}
            >
              {page !== ResetSteps.STEP_THREE
                ? "Reset your Password!"
                : "Create new password!"}
            </Title>
            <Text color="dimmed" size="sm" mt={5} mb="xl">
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
            >
              {isEmailPage ? (
                <TextInput
                  withAsterisk
                  label="Email"
                  placeholder="your@email.com"
                  {...emailForm.getInputProps("email")}
                />
              ) : (
                <>
                  <PasswordInput
                    label="Password"
                    placeholder="Your password"
                    required
                    {...pwdForm.getInputProps("password")}
                    mt="md"
                  />

                  <PasswordInput
                    label="Confirm Password"
                    placeholder="Your password again"
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
                loading={isLoading}
                title={isEmailPage ? "Email Reset Link" : "Change Password"}
              />
              <Group justify="center" mt="xl" pt="xl">
                {/* <Checkbox label="Remember me" /> */}
                <Anchor component="button" size="sm">
                  <Link href="/login" className={classes.forgot}>
                    <Group>
                      <IconArrowLeft size="1rem" />
                      <Text> Go Back to Login</Text>
                    </Group>
                  </Link>
                </Anchor>
              </Group>
            </form>
          </Paper>
        </Container>
      ) : (
        <Container size={420} my={40}>
          <Paper
            withBorder
            shadow="md"
            p={30}
            mt={30}
            radius="md"
            style={{ background: "#F7F7F7" }}
          >
            <Link href="/">
              <Image
                src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`}
                alt="RateUp Logo"
                w={140}
                h={36}
              />
            </Link>
            <Space h="lg" />
            <Title order={2}>Check your email</Title>
            <Space h="xl" />
            <Text>
              A password reset email has been sent to{" "}
              <Text span c="blue" inherit>
                {emailTo}
              </Text>{" "}
              . If it exists in our system.{" "}
            </Text>
            <Space h="xl" />

            <Group justify="center" py="xl">
              <Image
                src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/email.svg`}
                alt="email"
                w={90}
                h={60}
              />
            </Group>

            <Space h="xl" />

            <Text c="blue.6" className={classes.txtStyle}>
              <Link
                href="/login/reset-password"
                style={{ textDecoration: "none" }}
              >
                <NavLink
                  label="Resend or change email"
                  leftSection={<IconSend size="1rem" stroke={1.5} />}
                  rightSection={<IconChevronRight size="0.8rem" stroke={1.5} />}
                  variant="subtle"
                />
              </Link>
            </Text>
            <Text inline c="blue.6" className={classes.txtStyle}>
              <Link href="/login" style={{ textDecoration: "none" }}>
                <NavLink
                  label="Login"
                  leftSection={
                    <IconArrowAutofitLeft size="1rem" stroke={1.5} />
                  }
                  variant="subtle"
                />
              </Link>
            </Text>
          </Paper>
        </Container>
      )}
    </>
  );
};

export default ResetPasswordForm;
