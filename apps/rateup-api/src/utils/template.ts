export function parseStringWithVariables(string) {
  const regex = /{{(.*?)}}/g;
  let match;
  const dynamicVariables = [];

  // Find all matches of dynamic variables in the string
  while ((match = regex.exec(string)) !== null) {
    dynamicVariables.push(match[1]);
  }

  return dynamicVariables;
}
