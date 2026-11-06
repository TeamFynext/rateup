import React from "react";
import { Text } from "react-native";

interface Props {
  text: string | any;
  examples?: string[] | any;
}

export default function TextWithFormatting({ text, examples = [] }: Props) {
  const parsedValue = parseText(text);
  return (
    <Text className="flex flex-wrap text-base">
      {replacePlaceholdersWithValues(parsedValue, examples)}
    </Text>
  );
}

function parseText(text: string): React.ReactNode[] {
  return text.split(/\*(.*?)\*|_(.*?)_|~(.*?)~|```(.*?)```/g).map((part, index) => {
    if (part === undefined) return null;

    const isNested = part.split(/\*(.*?)\*|_(.*?)_|~(.*?)~|```(.*?)```/g).length > 1;
    const parsedPart = isNested ? parseText(part) : part;

    switch (index % 5) {
      case 1:
        return (
          <Text key={index} className="font-bold">
            {parsedPart}
          </Text>
        );
      case 2:
        return (
          <Text key={index} className="italic">
            {parsedPart}
          </Text>
        );
      case 3:
        return (
          <Text key={index} className="line-through">
            {parsedPart}
          </Text>
        );
      case 4:
        return (
          <Text key={index} className="font-mono bg-gray-100 px-1 rounded">
            {parsedPart}
          </Text>
        );
      default:
        return parsedPart;
    }
  });
}

function replacePlaceholdersWithValues(
  inputReactContent: React.ReactNode,
  values: string[],
): React.ReactNode {
  function processNode(node: React.ReactNode): any {
    if (typeof node === "string" || typeof node === "number") {
      let result = String(node);
      for (let i = 0; i < values.length; i++) {
        result = result.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, "g"), values[i]);
      }
      return result;
    } else if (Array.isArray(node)) {
      return node.map(processNode);
    } else if (React.isValidElement(node)) {
      const { children, ...props } = node.props as React.PropsWithChildren;
      return React.cloneElement(node, props, React.Children.map(children, processNode));
    } else {
      return node;
    }
  }

  return processNode(inputReactContent);
}
