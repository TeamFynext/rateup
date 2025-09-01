"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Center, NavLink, Text, TextInput, Title } from "@mantine/core";
import { isEmail, useForm } from "@mantine/form";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import {
  IconArrowAutofitLeft,
  IconArrowNarrowRight,
  IconCheck,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useUserInfo } from "../../backend/user/user.query";
import { SAVE_HOTKEY } from "../../utils/constants";
import { showSuccessToast } from "../../utils/notifications";
import { RateupButtonBlue, RateupButtonPrimary } from "../Button/RateupButtons";
import FormModalLayout from "../Modal/FormModalLayout";
import styles from "./AuthForm.module.css";

function AuthTypeSignupForm({
  setIsLoading,
  createUserMutation,
  isLoading,
  authType,
}) {
  const { data: userInfo, isPending } = useUserInfo();
  const [opened, { close, open }] = useDisclosure(true);
  const [isUserExist, setIsUserExist] = useState(false);
  const router = useRouter();
  const translations = useTranslations();
  useEffect(() => {
    if (userInfo && "data" in userInfo) {
      if (userInfo?.data && userInfo.data?.userId) {
        setIsUserExist(true);
      }
    }
  }, [userInfo]);

  const isPhoneForm = authType === "phone";
  const signUpForm = useForm({
    initialValues: {
      name: "",
      orgName: "",
      email: "",
    },

    validate: {
      name: (value) => {
        if (value.length < 4) {
          return translations("Name should be at least 4 characters long");
        }
        return null; // Validation passed
      },
      orgName: (value) => {
        if (value.length < 4) {
          return translations(
            "Organization name should be at least 4 characters long",
          );
        }
        return null; // Validation passed
      },
      email: isPhoneForm && isEmail("Invalid email"),
    },
  });

  const handleSubmit = (values) => {
    setIsLoading(true);
    if (isUserExist) {
      showSuccessToast(
        "Sign up process is already completed",
        "",
        <IconCheck />,
      );
      router.push("/dashboard");
      return;
    }
    const data = {
      name: values?.name,
      orgName: values?.orgName,
      email: values?.email,
      type: authType,
    };
    createUserMutation.mutate(data);
  };
  return (
    <>
      <FormModalLayout
        centered={true}
        title={
          authType === "google"
            ? translations("Google Auth Success")
            : translations("Phone Number Auth Success")
        }
        opened={opened}
        onClose={() => {
          if (isUserExist) router.push("/dashboard");
          close();
        }}
      >
        <Text mt="xs" mb="xl" display={"inline-block"}>
          {translations("You are successfully authenticated,")}
          <Text display={isUserExist ? "none" : "inline-block"}>
            {translations(
              "please fill the information to complete the signup process",
            )}
          </Text>
        </Text>

        <Center mt="xl">
          <RateupButtonPrimary
            size="lg"
            rightIcon={<IconArrowNarrowRight />}
            title={translations("Continue")}
            onClick={() => {
              if (isUserExist) router.push("/dashboard");
              close();
            }}
          />
        </Center>
      </FormModalLayout>

      <Title className={styles["login-signup-form-heading"]} order={2}>
        {translations("Complete Signup Process")}
      </Title>

      <form
        className={`
          ${styles["login-sign-up-form"]}
        `}
        onSubmit={signUpForm.onSubmit(handleSubmit)}
        onKeyDown={getHotkeyHandler([
          [
            SAVE_HOTKEY,
            (event: any) => signUpForm.onSubmit(handleSubmit)(event),
          ],
        ])}
      >
        <TextInput
          classNames={styles}
          withAsterisk
          placeholder={translations("Name")}
          {...signUpForm.getInputProps("name")}
        />
        <TextInput
          classNames={styles}
          withAsterisk
          placeholder={translations("Organization Name")}
          {...signUpForm.getInputProps("orgName")}
        />
        {isPhoneForm && (
          <TextInput
            classNames={styles}
            withAsterisk
            placeholder={translations("Email")}
            {...signUpForm.getInputProps("email")}
          />
        )}
        <RateupButtonBlue
          type="submit"
          title={translations("Finish SignUp")}
          loading={isLoading}
          className={styles["login-signup-form-submit-btn"]}
        />

        <Center>
          <Text component="div" inline c="blue.6">
            <Link href="/auth/logout" style={{ textDecoration: "none" }}>
              <NavLink
                component="div"
                label={translations("Logout")}
                leftSection={<IconArrowAutofitLeft size="1rem" stroke={1.5} />}
                variant="subtle"
              />
            </Link>
          </Text>
        </Center>
      </form>
    </>
  );
}

export default AuthTypeSignupForm;
