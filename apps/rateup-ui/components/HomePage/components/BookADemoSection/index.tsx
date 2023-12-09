import {
  Center,
  Flex,
  Grid,
  NumberInput,
  TextInput,
  Title,
} from "@mantine/core";
import styles from "./BookADemoSection.module.css";
import commonStyles from "../../index/index.module.css";
import BookDemoContactForm from "../BookDemoContactForm";

function BookADemoSection() {
  return (
    <Flex className={styles["book-a-demo-container"]}>
      <Title className={commonStyles["gradient-text"]}>
        <span className={styles["heading-span"]}>
          Unlock the Power of Credibility
        </span>
        <span className={styles["heading-span"]}>
          Elevate Your Reputation with Rateup.
        </span>
      </Title>
      <BookDemoContactForm />
    </Flex>
  );
}

export default BookADemoSection;
