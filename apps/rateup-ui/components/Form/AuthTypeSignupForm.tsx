import {
  Center,
  NavLink,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { RateupButtonBlue } from "../Button/RateupButtons";
import Link from "next/link";
import { IconArrowAutofitLeft } from "@tabler/icons";
import styles from "./AuthForm.module.css";

function AuthTypeSignupForm({ setIsLoading, createUserMutation, isLoading }) {
  const signUpForm = useForm({
    initialValues: {
      name: "",
      orgName: "",
      inviteCode: "",
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
    },
  });

  const handleSubmit = (values) => {
    setIsLoading(true);
    const data = {
      name: values?.name,
      orgName: values?.orgName,
      inviteCode: values?.inviteCode,
    };
    createUserMutation.mutate(data);
  };
  return (
    <>
      <Title className={styles["login-signup-form-heading"]} order={2}>
        Complete Signup Process
      </Title>

      <form
        className={`
          ${styles["login-sign-up-form"]}
        `}
        onSubmit={signUpForm.onSubmit(handleSubmit)}
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
