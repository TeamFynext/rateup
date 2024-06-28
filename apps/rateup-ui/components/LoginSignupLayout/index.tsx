import { Box, Flex, ScrollArea, useMantineColorScheme } from "@mantine/core";
import LoginSignupDecorativeImage from "./LoginSignupDecorativeImage";
import styles from "./login-signup-layout.module.css";

function LoginSignupLayout({ children }) {
  const { colorScheme } = useMantineColorScheme();

  return (
    <Flex className={styles["decorative-image-form-container"]}>
      <LoginSignupDecorativeImage />

      <Box className={styles["form-container"]}>
        <Box
          className={`${styles["form-wrapper"]} ${styles[`color-scheme-${colorScheme}`]}`}
        >
          <ScrollArea
            className={styles["scroll-area-div"]}
            h={"100%"}
            w={"100%"}
            scrollbarSize={5}
            type="hover"
          >
            {children}
          </ScrollArea>
        </Box>
      </Box>
    </Flex>
  );
}

export default LoginSignupLayout;
