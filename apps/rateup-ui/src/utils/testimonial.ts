import type { filterType } from "@/routes/dashboard/testimonial/$collectionId/index.tsx";
import type { Testimonial, TestimonialStyleType } from "@/types/global";

/**
 * Works on both a survey's testimonials and a collection's, which omit the
 * team and survey fields.
 */
type FilterableTestimonial = Omit<Testimonial, "teamId" | "survey"> & {
  teamId?: string;
  survey?: { id: string; name: string };
};

export const getFilteredTestimonials = (
  testimonials: Array<FilterableTestimonial>,
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

function filterByDate(testimonials: Array<FilterableTestimonial>, order: string) {
  return order
    ? testimonials?.sort((t1, t2) =>
        order === "new"
          ? new Date(t2?.createdAt).getTime() - new Date(t1?.createdAt).getTime()
          : new Date(t1?.createdAt).getTime() - new Date(t2?.createdAt).getTime(),
      )
    : testimonials;
}

function filterByLength(testimonials: Array<FilterableTestimonial>, length: string) {
  return length
    ? testimonials?.sort((t1, t2) =>
        length == "longest"
          ? t2?.testimonial.testimonial.length - t1?.testimonial.testimonial.length
          : t1?.testimonial.testimonial.length - t2?.testimonial.testimonial.length,
      )
    : testimonials;
}

function filterByTeams(testimonials: Array<FilterableTestimonial>, teams: string[]) {
  return testimonials?.filter((t) => (teams.length ? teams.includes(t.teamId ?? "") : true));
}

function filterBySurveys(
  testimonials: Array<FilterableTestimonial>,
  surveys: string[],
  teams: string[],
) {
  return testimonials?.filter((t) =>
    teams?.length
      ? teams?.includes(t.teamId ?? "")
      : surveys?.length
        ? surveys.includes(t.survey?.id ?? "")
        : t,
  );
}

function filterByRating(testimonials: Array<FilterableTestimonial>, rating: number) {
  return testimonials?.filter((t) => (rating ? t?.testimonial?.rating === rating : t));
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
