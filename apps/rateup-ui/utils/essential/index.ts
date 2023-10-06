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
