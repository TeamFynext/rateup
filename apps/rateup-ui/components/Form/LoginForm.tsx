import { PasswordInput, TextInput, Title } from "@mantine/core";
import LoginSignupLInks from "./LoginSignupLinks";
import { useForm } from "@mantine/form";
import Link from "next/link";
import { RateupButtonBlue } from "../Button/RateupButtons";
import GoogleSignInButton from "./GoogleSigninButton";
import styles from "./AuthForm.module.css";

function LoginForm({ setIsLoading, signIn, isLoading }) {
  const loginForm = useForm({
    initialValues: {
      email: "",
      password: "",
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
    },
  });

  const handleSubmit = (values) => {
    setIsLoading(true);
    signIn(values.email, values.password).finally(() => {
      setIsLoading(false);
    });
  };

  return (
    <>
      <Title className={styles["login-signup-form-heading"]} order={2}>
        Welcome Back
      </Title>
      <LoginSignupLInks isLogin />

      <form
        className={`
            ${styles["login-sign-up-form"]}
            ${styles["login-form"]}
          `}
        onSubmit={loginForm.onSubmit(handleSubmit)}
      >
        <TextInput
          classNames={styles}
          placeholder="Email ID"
          {...loginForm.getInputProps("email")}
        />
        <PasswordInput
          classNames={styles}
          placeholder="Enter Password"
          required
          {...loginForm.getInputProps("password")}
        />
        <Link
          className={styles["login-form-forgot-password-link"]}
          href="/login/reset-password"
        >
          Forgot password?
        </Link>

        <RateupButtonBlue
          type="submit"
          title="Login"
          loading={isLoading}
          className={styles["login-signup-form-submit-btn"]}
        />

        <GoogleSignInButton
          className={styles["login-signup-with-google-btn"]}
          buttonText={"Login with Google"}
        />
      </form>
    </>
  );
}

export default LoginForm;
