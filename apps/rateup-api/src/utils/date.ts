export const formatDateT1 = (date) => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}; // Output:  February 27, 2024
