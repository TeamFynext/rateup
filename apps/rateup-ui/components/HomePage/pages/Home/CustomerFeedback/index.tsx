import {
  Box,
  Center,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import classNames from "classnames/bind";

import { useGetAllTestimonialsByCollection } from "@/backend/testimonials/testimonial.query";
import { imagesPath } from "@/utils/constants";

import styles from "./CustomerFeedback.module.css";
import FeedbackCard from "./FeedbackCard";

const cx = classNames.bind(styles);

function CustomerFeedback() {
  const { data, isPending, isError } = useGetAllTestimonialsByCollection(
    "627b32db-3edb-42b5-bb39-bf98e8d3de95",
  );

  let jsxToBeRendered = null;
  if (isPending) {
    jsxToBeRendered = (
      <Center>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    jsxToBeRendered = (
      <Center>
        <Text>Something went wrong, please try again later</Text>
      </Center>
    );
  }

  if (!isError && !isPending) {
    const feedbacks = data?.testimonials;
    const imagesUrl = `https://d1y5kzki4npqx9.cloudfront.net/`;
    jsxToBeRendered = (
      <>
        {feedbacks.map(
          ({
            id,
            testimonial: { name, jobTitle, rating, testimonial, photo },
          }) => {
            return (
              <FeedbackCard
                key={id}
                name={name}
                role={jobTitle}
                rating={rating}
                feedback={testimonial}
                imageUrl={
                  photo
                    ? `${imagesUrl}/${photo}`
                    : `${imagesPath}/homepage/customer-feedback/blank-user.png`
                }
                imageAlt={name}
              />
            );
          },
        )}
      </>
    );
  }

  if (!isError && !isPending && data?.testimonials.length === 0) {
    jsxToBeRendered = "No Feedback found";
  }

  return (
    <Stack className={cx("customer-feedback-root-div")}>
      <h1 className={cx("heading")}>Customer Feedback</h1>
      <ScrollArea.Autosize
        className={cx("customer-feedback-cards-scroll-area")}
        mah={600}
        scrollbars={"y"}
      >
        {jsxToBeRendered}
      </ScrollArea.Autosize>
    </Stack>
  );
}

export default CustomerFeedback;
