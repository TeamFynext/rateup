import { ratingObjectType } from "./election.types";

export function compareByRating(a: ratingObjectType, b: ratingObjectType) {
  return b.rating - a.rating;
}

export function average(array: Array<number>) {
  return array.reduce((x, y) => x + y) / array.length;
}

export function retrieveTag(array: Array<string>, toSearch: string) {
  const tag = array.filter((x) => x.includes(toSearch))[0];
  if (tag.length > 0) {
    return tag.split("_")[1];
  } else {
    return "";
  }
}

export function retrieveRating(array:any):number{
  return array.find(ele=>ele.type === "Rating")?.response?.Rating
}