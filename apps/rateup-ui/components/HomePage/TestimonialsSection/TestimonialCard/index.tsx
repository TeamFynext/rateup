import { Flex, Rating, Text, Title } from "@mantine/core";
import styles from "./TestimonialCard.module.css";

function TestimonialCard({ testimonialObj }) {
  const {
    rating,
    testimonialHeading,
    testimonial,
    name,
    avatarUrl,
    jobRole,
    companyName,
  } = testimonialObj;
  return (
    <Flex className={styles["testimonial-card"]}>
      <Rating
        className={styles["testimonial-rating"]}
        value={rating}
        readOnly
      />
      <Flex className={styles["testimonial-heading-text-container"]}>
        <Title order={1} className={styles["testimonial-heading"]}>
          {testimonialHeading}
        </Title>
        <Text className={styles["testimonial-text"]}>{testimonial}</Text>
      </Flex>

      <div className={styles["avatar-and-name-role-container"]}>
        <div className={styles["avatar-img-container"]}>
          <img src={avatarUrl} alt="User Profile" />
        </div>
        <div className={styles["name-role-container"]}>
          <Text className={styles["name-para"]}>{name}</Text>
          <Text className={styles["role-para"]}>{jobRole}</Text>
        </div>
      </div>
    </Flex>
  );
}

export default TestimonialCard;
