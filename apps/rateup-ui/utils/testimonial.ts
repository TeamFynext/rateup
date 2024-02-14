import { filterType } from "../pages/dashboard/testimonial/[collectionId]";
import { Testimonial, TestimonialStyleType } from "../types/global";

export const getFilteredTestimonials = (
  testimonials: Array<Testimonial>,
  filters: filterType,
  type: string,
) => {
  let filteredTestimonials = testimonials;
  switch (type) {
    case "date":
      return filterByDate(filteredTestimonials, filters.date);
    case "length":
      return filterByLength(filteredTestimonials, filters.length);
    case "teams":
      return filterByTeams(filteredTestimonials, filters.teams);
    case "surveys":
      return filterBySurveys(filteredTestimonials, filters.surveys);
    case "rating":
      return filterByRating(filteredTestimonials, filters.rating);
  }
};

export function filterByDate(testimonials: Array<Testimonial>, order: string) {
  return testimonials?.sort((t1, t2) =>
    order === "new"
      ? new Date(t2?.createdAt).getTime() - new Date(t1?.createdAt).getTime()
      : new Date(t1?.createdAt).getTime() - new Date(t2?.createdAt).getTime(),
  );
}

export function filterByLength(
  testimonials: Array<Testimonial>,
  length: string,
) {
  return testimonials?.sort((t1, t2) =>
    length == "longest"
      ? t2?.testimonial.testimonial.length - t1?.testimonial.testimonial.length
      : t1?.testimonial.testimonial.length - t2?.testimonial.testimonial.length,
  );
}

export function filterByTeams(testimonials: Array<Testimonial>, teams) {
  return testimonials?.filter((t) =>
    teams.length ? teams.includes(t.teamId) : true,
  );
}

export function filterBySurveys(testimonials: Array<Testimonial>, surveys) {
  return testimonials?.filter((t) =>
    surveys.length ? surveys.includes(t.survey.id) : true,
  );
}

export function filterByRating(testimonials: Array<Testimonial>, rating) {
  return testimonials?.filter((t) =>
    rating ? t?.testimonial?.rating === rating : t,
  );
}

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
      fontSize: "14px",
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
      fontSize: "14px",
      fontWeight: "400",
    },
  },
  ratingBlock: {
    bg: "#ffffff",
    isRemoved: false,
  },
  date: {
    color: "#282828",
    fontSize: "14px",
    fontWeight: "400",
    isRemoved: false,
  },
  layout: "horizontal",
};
