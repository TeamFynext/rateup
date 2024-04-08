export default function TextWithFormatting(text, examples) {
  // Function to parse the text and apply formatting
  const parseText = (text) => {
    return text
      .split(/\*(.*?)\*|_(.*?)_|~(.*?)~|```(.*?)```/g)
      .map((part, index) => {
        if (index % 5 === 1) {
          // Apply bold styling to text within *
          return <strong key={index}>{part}</strong>;
        } else if (index % 5 === 2) {
          // Apply italic styling to text within _
          return <em key={index}>{part}</em>;
        } else if (index % 5 === 3) {
          // Apply strikethrough styling to text within ~
          return <del key={index}>{part}</del>;
        } else if (index % 5 === 4) {
          // Apply strikethrough styling to text within ~
          return <code key={index}>{part}</code>;
        } else {
          return part;
        }
      });
  };
  const parsedValue = parseText(text);
  return <div>{replacePlaceholdersWithValues(parsedValue?.[0], examples)}</div>;
}

function replacePlaceholdersWithValues(inputString: string, values: string[]) {
  for (let index = 0; index < values.length; index++) {
    inputString = inputString?.replace(
      new RegExp(`\\{\\{${index + 1}\\}\\}`, "g"),
      values?.[index],
    );
  }
  return inputString;
}
