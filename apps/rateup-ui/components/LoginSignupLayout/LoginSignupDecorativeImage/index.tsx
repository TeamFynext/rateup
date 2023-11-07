import { Center } from "@mantine/core";
import Image from "next/image";
import styles from "./decorative-image.module.css";

function LoginSignupDecorativeImage() {
  return (
    <Center className={styles["decorative-image-container"]}>
      <Image
        src="/images/login-signup-pages/decorative-image.png"
        alt="decorative image"
        width={400}
        height={400}
      />
    </Center>
  );
}

export default LoginSignupDecorativeImage;
