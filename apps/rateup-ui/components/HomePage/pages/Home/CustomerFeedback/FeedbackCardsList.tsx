import { imagesPath } from "@/utils/constants";

import FeedbackCard from "./FeedbackCard";

function FeedbackCardsList({ feedbacks }) {
  const imagesUrl = `https://d1y5kzki4npqx9.cloudfront.net/`;

  return (
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

export default FeedbackCardsList;
