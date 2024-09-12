import { Blockquote, Box, Image, Rating, Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import styles from "./FeedbackCard.module.css";

const cx = classNames.bind(styles);

function FeedbackCard({ name, role, feedback, rating, imageUrl, imageAlt }) {
  return (
    <Stack className={cx("feedback-card-root-div")}>
      <Stack className={cx("name-and-role-div")}>
        <h2 className={cx("name-h2")}>{name}</h2>
        <Text className={cx("role-p")} lineClamp={2}>
          {role}
        </Text>
      </Stack>
      <Stack className={cx("block-quote-container")}>
        <Blockquote className={cx("feedback-blockquote")}>
          <Stack className={cx("blockquote-rating-text-container-div")}>
            <Rating
              className={cx("blockquote-rating")}
              value={rating}
              color="#FFD54C"
              size={16}
            />
            <Text className={cx("blockquote-text")} lineClamp={5}>
              {feedback}
            </Text>
          </Stack>
        </Blockquote>
      </Stack>

      <Box className={cx("avatar-div")}>
        <Image className={cx("avatar-image")} src={imageUrl} alt={imageAlt} />
      </Box>
    </Stack>
  );
}

export default FeedbackCard;
