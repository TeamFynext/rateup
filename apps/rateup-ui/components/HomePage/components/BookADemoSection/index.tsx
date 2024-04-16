import {
  Center,
  Flex,
  Grid,
  NumberInput,
  TextInput,
  Title,
} from "@mantine/core";
import styles from "./BookADemoSection.module.css";
import commonStyles from "../../index.module.css";
import BookDemoContactForm from "../BookDemoContactForm";
import Button from "../Button";
import { useRouter } from "next/router";

function BookADemoSection() {
  const router = useRouter();
  return (
    <div className={styles["book-a-demo-wrapper"]}>
      <div></div>
      <div className={styles["book-a-demo-container"]}>
        <Title>
          <span className={styles["heading-span"]}>
            Unlock the Power of Credibility
          </span>
          <span className={styles["heading-span"]}>
            Elevate Your Reputation with Rateup.
          </span>
        </Title>
        <div className={styles["book-demo-pricing-buttons-container"]}>
          <BookDemoContactForm
            buttonProps={{ whiteBackgroundGradientText: true }}
          />
          <Button
            className={styles["get-pricing-btn"]}
            onClick={() => router.push("/pricing")}
            whiteBackgroundGradientText
          >
            Get Pricing
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BookADemoSection;
