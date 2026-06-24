export function getNestedProperty(sourceObject: object, path: string) {
  return path
    .split(".")
    .reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), sourceObject);
}
