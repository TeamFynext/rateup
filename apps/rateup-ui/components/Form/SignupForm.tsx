import { PasswordInput, TextInput, Title } from "@mantine/core";
import LoginSignupLinks from "./LoginSignupLinks";
import { useForm } from "@mantine/form";
import { RateupButtonBlue } from "../Button/RateupButtons";
import GoogleSignInButton from "./GoogleSigninButton";
import styles from "./AuthForm.module.css";

function SignupForm({ setIsLoading, signUp, isLoading }) {
  const signUpForm = useForm({
    initialValues: {
      email: "",
      password: "",
      name: "",
      orgName: "",
      inviteCode: "",
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) => {
        if (!value) {
          return "Password is required";
        }
        if (value.length < 5) {
          return "Password should be at least 5 characters long";
        }
        if (!/\d/.test(value) || !/[a-zA-Z]/.test(value)) {
          return "Password should contain at least one letter and one number";
        }
        return null; // Validation passed
      },
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
    signUp(
      values.email,
      values.password,
      values.name,
      values.orgName,
      values.inviteCode,
    ).finally(() => {
      setIsLoading(false);
    });
  };
  return (
    <>
      <Title
        className={`${styles["login-signup-form-heading"]}
           ${styles["signup-form-heading"]}
          `}
        order={2}
      >
        <span>Sign up now</span>
        <span>Start engaging with your cutomers</span>
      </Title>

      <LoginSignupLinks isSignup />

      <form
        className={`
            ${styles["login-sign-up-form"]}
            ${styles["signup-form"]}
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
          placeholder={"Email ID"}
          {...signUpForm.getInputProps("email")}
        />

        <PasswordInput
          classNames={styles}
          placeholder="Enter Password"
          required
          {...signUpForm.getInputProps("password")}
        />

        <TextInput
          classNames={styles}
          withAsterisk
          placeholder="Invite Code *"
          {...signUpForm.getInputProps("inviteCode")}
        />

        <RateupButtonBlue
          type="submit"
          title="Sign Up"
          loading={isLoading}
          className={styles["login-signup-form-submit-btn"]}
        />

        <GoogleSignInButton
          className={styles["login-signup-with-google-btn"]}
          buttonText={"SignUp with Google"}
        />
      </form>
    </>
  );
}

export default SignupForm;
