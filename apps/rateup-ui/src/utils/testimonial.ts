import type { Testimonial, TestimonialStyleType } from "@/types/global";
import type { filterType } from "@/routes/dashboard/testimonial/$collectionId/index.tsx";

export const getFilteredTestimonials = (
  testimonials: Array<Testimonial>,
  filters: filterType,
  type: string,
) => {
  if (!type) return testimonials;
  switch (type) {
    case "date":
      return filterByDate(testimonials, filters.date);
    case "length":
      return filterByLength(testimonials, filters.length);
    case "teams":
      return filterByTeams(testimonials, filters.teams);
    case "surveys":
      return filterBySurveys(testimonials, filters.surveys, filters.teams);
    case "rating":
      return filterByRating(testimonials, filters.rating);
  }
};

export function filterByDate(testimonials: Array<Testimonial>, order: string) {
  return order
    ? testimonials?.sort((t1, t2) =>
        order === "new"
          ? new Date(t2?.createdAt).getTime() -
            new Date(t1?.createdAt).getTime()
          : new Date(t1?.createdAt).getTime() -
            new Date(t2?.createdAt).getTime(),
      )
    : testimonials;
}

export function filterByLength(
  testimonials: Array<Testimonial>,
  length: string,
) {
  return length
    ? testimonials?.sort((t1, t2) =>
        length == "longest"
          ? t2?.testimonial.testimonial.length -
            t1?.testimonial.testimonial.length
          : t1?.testimonial.testimonial.length -
            t2?.testimonial.testimonial.length,
      )
    : testimonials;
}

export function filterByTeams(testimonials: Array<Testimonial>, teams) {
  return testimonials?.filter((t) =>
    teams.length ? teams.includes(t.teamId) : true,
  );
}

export function filterBySurveys(
  testimonials: Array<Testimonial>,
  surveys,
  teams,
) {
  return testimonials?.filter((t) =>
    teams?.length
      ? teams?.includes(t.teamId)
      : surveys?.length
        ? surveys.includes(t.survey.id)
        : t,
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
