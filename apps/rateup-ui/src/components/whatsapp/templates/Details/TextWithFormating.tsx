import React from "react";

import { WaTemplateCategory } from "@/types/enums.ts";

export default function TextWithFormatting(text: string, examples?: string[], category?: string) {
  if (category === WaTemplateCategory.AUTHENTICATION) {
    return (
      <span>{`*{{1}}* is your OTP (One-Time Password). Do not share this code with anyone.`} </span>
    );
  }
  // Function to parse the text and apply formatting
  const parseText = (text: string): React.ReactNode[] => {
    return text
      .split(/\*(.*?)\*|_(.*?)_|~(.*?)~|```(.*?)```/g)
      .map((part: string | undefined, index: number) => {
        if (!part) return;
        const tt =
          part?.split(/\*(.*?)\*|_(.*?)_|~(.*?)~|```(.*?)```/g)?.length > 1
            ? parseText(part)
            : part;
        if (index % 5 === 1) {
          // Apply bold styling to text within *
          return <strong key={index}>{tt}</strong>;
        } else if (index % 5 === 2) {
          // Apply italic styling to text within _
          return <em key={index}>{tt}</em>;
        } else if (index % 5 === 3) {
          // Apply strikethrough styling to text within ~
          return <del key={index}>{tt}</del>;
        } else if (index % 5 === 4) {
          // Apply code styling to text within ```
          return <code key={index}>{tt}</code>;
        } else {
          return tt; // Return plain text for non-styled text parts
        }
      });
  };
  const parsedValue = parseText(text);

  return <span>{replacePlaceholdersWithValues(parsedValue, examples ?? [])}</span>;
}

function replacePlaceholdersWithValues(inputReactContent: React.ReactNode, values: string[]) {
  // Recursive function to process each node in the React element tree
  function processNode(node: React.ReactNode | string | number): any {
    if (typeof node === "string" || typeof node === "number") {
      // If the node is a string or number, perform placeholder replacement
      let processedNode = String(node);
      for (let index = 0; index < values.length; index++) {
        processedNode = processedNode.replace(
          new RegExp(`\\{\\{${index + 1}\\}\\}`, "g"),
          values[index],
        );
      }
      return processedNode;
    } else if (Array.isArray(node)) {
      // If the node is an array, recursively process each item in the array
      return node.map(processNode);
    } else if (React.isValidElement(node)) {
      // If the node is a React element, recursively process its children
      const { children, ...props } = node.props as React.PropsWithChildren;
      return React.cloneElement(node, props, React.Children.map(children, processNode));
    } else {
      // If the node is neither a string/number nor a React element, return it as is
      return node;
    }
  }

  // Process the input React content
  return processNode(inputReactContent);
}
