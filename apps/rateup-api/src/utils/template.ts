export function parseStringWithVariables(input: string) {
  const regex = /{{(.*?)}}/g;
  let match;
  const dynamicVariables: string[] = [];

  // Find all matches of dynamic variables in the string
  while ((match = regex.exec(input)) !== null) {
    dynamicVariables.push(match[1]);
  }

  return dynamicVariables;
}
