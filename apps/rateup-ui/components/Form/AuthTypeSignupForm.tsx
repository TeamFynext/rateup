import { Center, NavLink, Text, TextInput, Title } from "@mantine/core";
import { isEmail, useForm } from "@mantine/form";
import { RateupButtonBlue, RateupButtonPrimary } from "../Button/RateupButtons";
import Link from "next/link";
import { IconArrowAutofitLeft } from "@tabler/icons-react";
import styles from "./AuthForm.module.css";
import FormModalLayout from "../Modal/FormModalLayout";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import { IconArrowNarrowRight } from "@tabler/icons-react";
import { SAVE_HOTKEY } from "../../utils/constants";

function AuthTypeSignupForm({
  setIsLoading,
  createUserMutation,
  isLoading,
  authType,
}) {
  const [opened, { close, open }] = useDisclosure(true);
  const isPhoneForm = authType === "phone";
  const signUpForm = useForm({
    initialValues: {
      name: "",
      orgName: "",
      inviteCode: "",
      email: "",
    },

    validate: {
      name: (value) => {
        if (value.length < 4) {
          return "Name should be at least 4 characters long";
        }
        return null; // Validation passed
      },
      orgName: (value) => {
        if (value.length < 4) {
          return "Organization name should be at least 4 characters long";
        }
        return null; // Validation passed
      },
      inviteCode: (value) => {
        if (value.length < 5) {
          return "Invalid invite code";
        }
        return null; // Validation passed
      },
      email: isPhoneForm && isEmail("Invalid email"),
    },
  });

  const handleSubmit = (values) => {
    setIsLoading(true);
    const data = {
      name: values?.name,
      orgName: values?.orgName,
      inviteCode: values?.inviteCode,
      email: values?.email,
      type: authType,
    };
    createUserMutation.mutate(data);
  };
  return (
    <>
      <FormModalLayout
        title={
          authType === "google"
            ? "Google Auth Success"
            : "Phone Number Auth Success"
        }
        opened={opened}
        onClose={() => {
          close();
        }}
      >
        <Text mt="xs" mb="xl">
          You are successfully authenticated, please fill the information to
          complete the signup process.
        </Text>

        <Center mt="xl">
          <RateupButtonPrimary
            size="lg"
            rightIcon={<IconArrowNarrowRight />}
            title="Continue"
            onClick={() => {
              close();
            }}
          />
        </Center>
      </FormModalLayout>

      <Title className={styles["login-signup-form-heading"]} order={2}>
        Complete Signup Process
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
          placeholder="Name"
          {...signUpForm.getInputProps("name")}
        />
        <TextInput
          classNames={styles}
          withAsterisk
          placeholder="Organization Name"
          {...signUpForm.getInputProps("orgName")}
        />
        <TextInput
          classNames={styles}
          withAsterisk
          placeholder="Invite Code *"
          {...signUpForm.getInputProps("inviteCode")}
        />
        {isPhoneForm && (
          <TextInput
            classNames={styles}
            withAsterisk
            placeholder="Email"
            {...signUpForm.getInputProps("email")}
          />
        )}
        <RateupButtonBlue
          type="submit"
          title="Finish SignUp"
          loading={isLoading}
          className={styles["login-signup-form-submit-btn"]}
        />

        <Center>
          <Text component="div" inline c="blue.6">
            <Link href="/auth/logout" style={{ textDecoration: "none" }}>
              <NavLink
                component="div"
                label="Logout"
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
