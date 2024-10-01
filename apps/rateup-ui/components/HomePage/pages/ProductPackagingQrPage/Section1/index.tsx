import { Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import TextIllustration from "@/components/HomePage/components/TextIllustration";
import { imagesPath } from "@/utils/constants";

import styles from "./Section1.module.css";

const cx = classNames.bind(styles);

function Section1() {
  return (
    <Stack
      className={cx("landing-page-section-root-common-styles", "section1-div")}
    >
      <TextIllustration>
        <Stack>
          <h2 className={cx("section-heading")}>
            Educate customer with custom landing pages
          </h2>
          <Text className={cx("description")}>
            Create landing pages in minutes using{" "}
            <span>our landing page builder</span> in the platform. Add{" "}
            <span>
              product details, nutritional information ,Food traceability,
            </span>{" "}
            and more the landing page
          </Text>
        </Stack>

        <Stack>
          <picture>
            <source
              type="image/webp"
              srcSet={`${imagesPath}/product-packaging-qr-page/section1/landing-pages.webp`}
            />
            <img
              src={`${imagesPath}/product-packaging-qr-page/section1/landing-pages.png`}
              alt="Educate customer with custom landing pages"
            />
          </picture>
        </Stack>
      </TextIllustration>
      <TextIllustration imageAsFirstElement>
        <Stack>
          <h2 className={cx("section-heading")}>Instant Customer Feedback</h2>
          <Text className={cx("description")}>
            Let customers <span>scan the QR code</span> and{" "}
            <span>submit product feedback.</span> Customize questions to gain
            insights and <span>boost customer retention</span> and{" "}
            <span>service quality</span>
          </Text>
        </Stack>

        <Stack>
          <picture>
            <source
              type="image/webp"
              srcSet={`${imagesPath}/product-packaging-qr-page/section1/instant-customer-feedback.webp`}
            />
            <img
              src={`${imagesPath}/product-packaging-qr-page/section1/instant-customer-feedback.png`}
              alt="Instant Customer Feedback"
            />
          </picture>
        </Stack>
      </TextIllustration>
    </Stack>
  );
}

export default Section1;
