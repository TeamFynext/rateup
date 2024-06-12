import { Center, Flex, useMantineColorScheme } from "@mantine/core";
import LoginSignupDecorativeImage from "./LoginSignupDecorativeImage";
import styles from "./login-signup-layout.module.css";

function LoginSignupLayout({ children }) {
  const { colorScheme } = useMantineColorScheme();

  return (
    <Flex className={styles["decorative-image-form-container"]}>
      <LoginSignupDecorativeImage />

      <Center className={styles["form-container"]}>
        <Center
          className={`${styles["form-wrapper"]} ${styles[`color-scheme-${colorScheme}`]}`}
        >
          {children}
        </Center>
      </Center>
    </Flex>
  );
}

export default LoginSignupLayout;
