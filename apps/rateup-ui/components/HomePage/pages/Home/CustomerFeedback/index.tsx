import { Center, Loader, ScrollArea, Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import { useGetAllTestimonialsByCollection } from "@/backend/testimonials/testimonial.query";

import styles from "./CustomerFeedback.module.css";
import { devCustomerFeedbackData } from "./devCustomerFeedbackData";
import FeedbackCardsList from "./FeedbackCardsList";

const cx = classNames.bind(styles);

function CustomerFeedback() {
  const { data, isPending, isError } = useGetAllTestimonialsByCollection(
    "627b32db-3edb-42b5-bb39-bf98e8d3de95",
  );

  let jsxToBeRendered = null;
  let feedbacks = data?.testimonials;

  if (isPending) {
    jsxToBeRendered = (
      <Center>
        <Loader />
      </Center>
    );
  }

  if (isError || data?.testimonials.length === 0) {
    feedbacks = devCustomerFeedbackData["testimonials"];
    jsxToBeRendered = <FeedbackCardsList feedbacks={feedbacks} />;
  }

  if (!isError && !isPending) {
    jsxToBeRendered = <FeedbackCardsList feedbacks={feedbacks} />;
  }

  return (
    <Stack className={cx("customer-feedback-root-div")}>
      <h1 className={cx("heading")}>Customer Feedback</h1>
      <ScrollArea.Autosize
        className={cx("customer-feedback-cards-scroll-area")}
        mah={700}
        scrollbars={"y"}
        scrollbarSize={8}
      >
        {jsxToBeRendered}
      </ScrollArea.Autosize>
    </Stack>
  );
}

export default CustomerFeedback;
