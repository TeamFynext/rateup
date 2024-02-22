import { UserRole } from "../enums";

export function retrieveRole(
  role: typeof UserRole.ADM | typeof UserRole.SUPADM,
): string | "Super Admin" | "Admin" {
  if (role === UserRole.SUPADM)
    return UserRole.SUPADM.split("_")
      .map(
        (str) =>
          str.toLowerCase().charAt(0).toUpperCase() +
          str.toLowerCase().slice(1),
      )
      .join(" ");
  if (role === UserRole.ADM)
    return (
      UserRole.ADM.toLowerCase().charAt(0).toUpperCase() +
      UserRole.ADM.toLowerCase().slice(1)
    );
}

export function mergeNames(first: string, last: string) {
  return `${first.trim()} ${last.trim()}`;
}

export var stringToColour = function (str: string) {
  var hash = 0;
  for (var i = 0; i < str?.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var colour = "#";
  for (var i = 0; i < 3; i++) {
    var value = (hash >> (i * 8)) & 0xff;
    colour += ("00" + value.toString(16)).substr(-2);
  }
  return colour;
};

export function pushToSessionStorage(key: string, value: any) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function getFromSessionStorage(key: string) {
  const json = sessionStorage.getItem(key);
  if (json) {
    return JSON.parse(json);
  }
}
