export const getFilteredTestimonials = (testimonials, filters) => {
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
      filters.rating ? t?.testimonial?.rating === filters.rating : t,
    );
  return filteredTestimonials;
};
