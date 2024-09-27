import { Text } from "@mantine/core";

import { imagesPath } from "@/utils/constants";

import styles from "./Section2.module.css";

const data = [
  {
    id: 684758671,
    heading: (
      <h2 className={`${styles["section-heading"]} landing-page-s-h-c`}>
        Ticketing Escalation System
      </h2>
    ),
    description: (
      <Text className={styles["description"]}>
        Create tickets based on the feedback and track them until resolution to{" "}
        <span>provide a greater customer experience.</span>
      </Text>
    ),
    image: (
      <picture>
        <source
          type="image/webp"
          srcSet={`${imagesPath}/product-packaging-qr-page/section2/ticketing-escalating-system.webp`}
        />
        <img
          src={`${imagesPath}/product-packaging-qr-page/section2/ticketing-escalating-system.png`}
          alt={`Ticketing Escalation System`}
        />
      </picture>
    ),
  },
  {
    id: 684758672,
    heading: (
      <h2 className={`${styles["section-heading"]} landing-page-s-h-c`}>
        AI - Powered Analytics
      </h2>
    ),
    description: (
      <Text className={styles["description"]}>
        Understand <span>overall customers sentiment</span> from the{" "}
        <span>platform dashboard using AI,</span>
        while gaining valuables insights into <span>
          customer engagement
        </span>{" "}
        and <span>campaign effectiveness</span> through detailed analytics of QR
        code scans.
      </Text>
    ),
    image: (
      <picture>
        <source
          type="image/webp"
          srcSet={`${imagesPath}/product-packaging-qr-page/section2/ai-powered-analytics.webp`}
        />
        <img
          src={`${imagesPath}/product-packaging-qr-page/section2/ai-powered-analytics.png`}
          alt={`AI - Powered Analytics`}
          loading="lazy"
        />
      </picture>
    ),
  },
];

export { data };
