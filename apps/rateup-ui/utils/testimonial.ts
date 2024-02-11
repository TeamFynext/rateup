import { TestimonialStyleType } from "../types/global";

export const getFilteredTestimonials = (
  testimonials,
  filters,
  selectedTeamId,
) => {
  let filteredTestimonials = testimonials;
  filteredTestimonials = filteredTestimonials
    ?.sort((t1, t2) =>
      filters.date == "new"
        ? t2?.createdAt - t1?.createdAt
        : t1?.createdAt - t2?.createdAt,
    )
    .sort((t1, t2) =>
      filters.testimonialLength == "longest"
        ? t2?.testimonial.testimonial.length -
          t1?.testimonial.testimonial.length
        : t1?.testimonial.testimonial.length -
          t2?.testimonial.testimonial.length,
    )
    .filter((t) =>
      selectedTeamId == "all"
        ? t
        : t.surveyResponse.surveyTeamMap.teamId === selectedTeamId,
    )
    .filter((t) =>
      filters.rating ? t?.testimonial?.rating === filters.rating : t,
    );
  return filteredTestimonials;
};

export const defaultTestimonialStyle: TestimonialStyleType = {
  root: {
    bg: "#ffffff",
  },
  profileBlock: {
    bg: "#ffffff",
    profileName: {
      color: "#282828",
      fontSize: "18px",
      fontWeight: "700",
    },
    profilePos: {
      color: "#282828",
      fontSize: "16px",
      fontWeight: "500",
    },
    profilePic: {
      isRemoved: false,
    },
  },
  descBlock: {
    bg: "#ffffff",
    desc: {
      color: "#282828",
      fontSize: "16px",
      fontWeight: "400",
    },
  },
  ratingBlock: {
    bg: "#ffffff",
    isRemoved: false,
  },
  date: {
    color: "#282828",
    fontSize: "16px",
    fontWeight: "400",
    isRemoved: false,
  },
  layout: "horizontal",
};
