import { Center } from "@mantine/core";
import Image from "next/image";
import styles from "./decorative-image.module.css";

function LoginSignupDecorativeImage() {
  return (
    <Center className={styles["decorative-image-container"]}>
      <Image
        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/login-signup-pages/decorative-image.png`}
        alt="decorative image"
        width={400}
        height={400}
      />
    </Center>
  );
}

export default LoginSignupDecorativeImage;
