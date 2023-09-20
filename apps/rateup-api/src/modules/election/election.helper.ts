import { ratingObjectType } from "./election.types";

export function compareByRating(a: ratingObjectType, b: ratingObjectType) {
  return b.rating - a.rating;
}

export function average(array: Array<number>) {
  return array.reduce((x, y) => x + y) / array.length;
}
